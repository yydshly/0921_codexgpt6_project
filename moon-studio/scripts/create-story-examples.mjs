import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Script } from 'node:vm';
import { createServer } from 'vite';
import { createStory, exportStoryJSON, importStoryJSON } from '../src/storyModel.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.join(root, 'public', 'story-examples');
const media = new Map([
  ['/assets/story-room-closed.png', 'image/png'],
  ['/assets/story-room-open.png', 'image/png'],
  ['/assets/story-memory.png', 'image/png'],
  ['/assets/moon-sea.png', 'image/png'],
  ['/assets/moon.png', 'image/png'],
  ['/assets/demo-music.mp3', 'audio/mpeg'],
  ['/assets/paper-scene.png', 'image/png'],
]);

function verifyStandalone(html, editableJSON, name) {
  const editable = importStoryJSON(editableJSON);
  assert.ok(editable.assets.length > 0, `${name}: missing media`);
  for (const asset of editable.assets) {
    assert.match(asset.src, /^data:(?:image\/(?:png|jpeg|webp)|audio\/[a-z0-9.+-]+(?:;codecs=[a-z0-9., -]+)?);base64,[A-Za-z0-9+/]+={0,2}$/i, `${name}: media not embedded`);
  }
  const blocks = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)];
  const dataBlocks = blocks.filter(([, attributes]) => /\btype\s*=\s*["']application\/json["']/i.test(attributes));
  assert.equal(dataBlocks.length, 1, `${name}: expected one story data block`);
  assert.deepEqual(JSON.parse(dataBlocks[0][2]), editable, `${name}: HTML and editable JSON must carry identical stories/media`);
  const runtimeBlocks = blocks.filter(([, attributes]) => !/\btype\s*=\s*["']application\/json["']/i.test(attributes));
  assert.ok(runtimeBlocks.length > 0, `${name}: missing player script`);
  for (const [, attributes, javascript] of runtimeBlocks) {
    assert.doesNotMatch(attributes, /\bsrc\s*=/i, `${name}: external script found`);
    assert.doesNotMatch(javascript, /__vite_ssr_(?:import|dynamic_import)/, `${name}: SSR module references leaked into exported player`);
    new Script(javascript, { filename: `${name}.inline.js` });
  }
  // Check authored HTML URL attributes as well as the embedded media above.
  for (const [, value] of html.matchAll(/\b(?:src|href)\s*=\s*["']([^"']+)["']/gi)) {
    assert.match(value, /^(?:data:|#)/, `${name}: external or app-local dependency ${value}`);
  }
  assert.doesNotMatch(html, /@import\s+(?:url\(|["'])/i, `${name}: external stylesheet import found`);
  for (const [, value] of html.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/gi)) {
    assert.match(value, /^(?:data:|#)/, `${name}: external CSS dependency ${value}`);
  }
  return { assets: editable.assets.length, scriptsParsed: runtimeBlocks.length };
}

function makeTestChime() {
  // A short, clearly synthetic sine tone for media persistence tests, not speech.
  const rate = 22050;
  const samples = Math.round(rate * 0.45);
  const dataBytes = samples * 2;
  const wav = Buffer.alloc(44 + dataBytes);
  wav.write('RIFF', 0);
  wav.writeUInt32LE(36 + dataBytes, 4);
  wav.write('WAVE', 8);
  wav.write('fmt ', 12);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(rate, 24);
  wav.writeUInt32LE(rate * 2, 28);
  wav.writeUInt16LE(2, 32);
  wav.writeUInt16LE(16, 34);
  wav.write('data', 36);
  wav.writeUInt32LE(dataBytes, 40);
  for (let index = 0; index < samples; index += 1) {
    const envelope = Math.sin(Math.PI * index / (samples - 1)) ** 2;
    const value = Math.sin(2 * Math.PI * 880 * index / rate) * envelope * 0.11;
    wav.writeInt16LE(Math.round(value * 32767), 44 + index * 2);
  }
  return wav;
}

const originalFetch = globalThis.fetch;
let server;
try {
  server = await createServer({
    root,
    configFile: false,
    server: { middlewareMode: true, hmr: false, watch: null },
    appType: 'custom',
    logLevel: 'error',
  });
  const { exportStoryHTML } = await server.ssrLoadModule('/src/storyExport.js');
  globalThis.fetch = async input => {
    if (typeof input !== 'string' || !media.has(input)) throw new Error('Example generation only reads preset /assets paths.');
    const absolute = path.join(root, 'public', input.slice(1));
    const bytes = await readFile(absolute);
    return new Response(bytes, { status: 200, headers: { 'Content-Type': media.get(input), 'Content-Length': String(bytes.length) } });
  };
  await mkdir(output, { recursive: true });
  for (const name of ['reunion', 'poetry']) {
    const story = createStory(name);
    // Export once to embed media; HTML reuses this exact portable snapshot.
    const json = await exportStoryJSON(story);
    const html = await exportStoryHTML(importStoryJSON(json));
    const checks = verifyStandalone(html, json, name);
    const htmlPath = path.join(output, `${name}.html`);
    const jsonPath = path.join(output, `${name}.moonstory.json`);
    await writeFile(htmlPath, html, 'utf8');
    await writeFile(jsonPath, json, 'utf8');
    console.log(JSON.stringify({ template: name, htmlBytes: Buffer.byteLength(html), jsonBytes: Buffer.byteLength(json), ...checks, verification: 'passed' }));
  }
  const chime = makeTestChime();
  const design = path.join(root, 'design');
  await mkdir(design, { recursive: true });
  await writeFile(path.join(design, 'test-chime.wav'), chime);
  console.log(JSON.stringify({ audio: 'design/test-chime.wav', bytes: chime.length, seconds: 0.45, source: 'procedural sine tone, not speech' }));
} finally {
  globalThis.fetch = originalFetch;
  await server?.close();
}
