import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createStory, validateStory, embedStoryAssets, exportStoryJSON, importStoryJSON, createStoryStore,
} from '../src/storyModel.js';

function storage() {
  let data = null;
  return { read: async () => structuredClone(data), write: async value => { data = structuredClone(value); } };
}
const media = path => Uint8Array.from(new TextEncoder().encode(`media bytes for ${path}`));
const fetchAsset = async path => ({ ok: true, blob: async () => new Blob([media(path)], { type: path.endsWith('.mp3') ? 'audio/mpeg' : 'image/png' }) });
const embedded = () => {
  const story = createStory();
  for (const asset of story.assets) asset.src = `data:${asset.kind === 'audio' ? 'audio/mpeg' : 'image/png'};base64,AQIDBA==`;
  return story;
};

test('templates use one schema and different generic event sequences; validation detaches nested data', () => {
  const reunion = createStory();
  const poetry = createStory('poetry');
  assert.notEqual(reunion.id, createStory().id);
  assert.deepEqual(reunion.rules.map(rule => rule.trigger.type), ['swipe', 'drop', 'drop']);
  assert.deepEqual(poetry.rules.map(rule => rule.trigger.type), ['click', 'swipe', 'drop']);
  assert.deepEqual(poetry.rules.map(rule => rule.requires.length), [0, 1, 1]);
  const copy = validateStory(reunion);
  copy.layers[0].x = 0;
  copy.rules[0].actions[0].target = 'moon';
  assert.equal(reunion.layers[0].x, .5);
  assert.equal(reunion.rules[0].actions[0].target, 'window');
  assert.throws(() => createStory('unknown'), /模板/);
});

test('complete media survive different-storage save/export/import roundtrip byte for byte', async () => {
  const a = createStoryStore({ storage: storage(), fetchAsset });
  const b = createStoryStore({ storage: storage(), fetchAsset: () => { throw Error('offline'); } });
  assert.equal(await a.loadStory(), null);
  assert.equal(await b.loadStory(), null);
  const initial = createStory();
  const saved = await a.saveStory(initial);
  for (let index = 0; index < saved.assets.length; index += 1) {
    const source = initial.assets[index].src;
    assert.ok(saved.assets[index].src.startsWith(`data:${initial.assets[index].kind}/`));
    assert.deepEqual(Buffer.from(saved.assets[index].src.split(',')[1], 'base64'), Buffer.from(media(source)));
    assert.ok(initial.assets[index].src.startsWith('/assets/'));
  }
  const backup = await exportStoryJSON(saved);
  const imported = importStoryJSON(backup);
  await b.saveStory(imported);
  assert.deepEqual(await b.loadStory(), await a.loadStory());
  saved.layers[0].name = '调用者的修改';
  assert.notEqual((await a.loadStory()).layers[0].name, saved.layers[0].name);
});

test('embedding fetches only whitelisted local paths, forbids redirects, and preserves existing data URLs', async () => {
  const previousFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (path, options) => { calls.push({ path, options }); return fetchAsset(path); };
  try {
    const story = createStory('poetry');
    story.assets.push({ ...story.assets[0], id: 'same-paper' });
    const result = await embedStoryAssets(story);
    assert.equal(calls.length, 2);
    assert.ok(calls.every(call => call.path.startsWith('/assets/') && call.options.redirect === 'error'));
    assert.deepEqual(await embedStoryAssets(result), result);
    assert.equal(calls.length, 2);
    assert.ok((await exportStoryJSON(result)).includes('data:image/png;base64,'));
  } finally { globalThis.fetch = previousFetch; }
});

test('broken references, duplicate ids and prerequisite cycles are rejected before playback', () => {
  const mutations = [
    story => { story.layers[0].assetId = 'missing'; },
    story => { story.layers[0].assetId = 'music'; },
    story => { story.rules[0].trigger.source = 'missing'; },
    story => { story.rules[1].trigger.target = 'missing'; },
    story => { story.rules[0].actions[0].target = 'missing'; },
    story => { story.rules[0].actions.at(-1).assetId = 'room-open'; },
    story => { story.rules[0].requires = ['missing']; },
    story => { story.rules[0].requires = ['reunion']; },
    story => { story.rules[1].requires = ['memory']; },
    story => { story.layers[1].id = story.layers[0].id; },
    story => { story.assets[1].id = story.assets[0].id; },
    story => { story.rules[1].id = story.rules[0].id; },
  ];
  for (const mutate of mutations) { const story = createStory(); mutate(story); assert.throws(() => validateStory(story), Error); }
  const cycle = createStory();
  cycle.rules[0].requires = ['reunion'];
  assert.throws(() => validateStory(cycle), /循环依赖/);
});

test('strict fields, finite coordinates, action arguments, types and safe text are enforced', () => {
  const mutations = [
    story => { story.html = '<script>'; },
    story => { story.title = '<img onerror=alert(1)>'; },
    story => { story.layers[0].x = NaN; },
    story => { story.layers[0].rotation = Infinity; },
    story => { story.layers[0].width = 1.01; },
    story => { story.layers[0].visible = 'true'; },
    story => { story.layers[0].onclick = 'run'; },
    story => { story.rules[0].once = false; },
    story => { story.rules[0].trigger.target = 'moon'; },
    story => { story.rules[0].actions[0].delay = -1; },
    story => { story.rules[0].actions[0].delay = NaN; },
    story => { story.rules[0].actions[0].script = 'run'; },
    story => { story.rules[0].actions.at(-1).volume = 2; },
    story => { story.rules[0].actions.at(-1).loop = 1; },
    story => { delete story.rules[2].actions[0].x; },
    story => { story.rules[0].actions = [{ type: 'text', target: 'moon', text: '不能写到图片' }]; },
  ];
  for (const mutate of mutations) { const story = createStory(); mutate(story); assert.throws(() => validateStory(story), Error); }
  const pollution = JSON.stringify(createStory()).replace('"version":1', '"version":1,"__proto__":{"polluted":true}');
  assert.throws(() => importStoryJSON(pollution), /不支持的字段/);
  assert.equal({}.polluted, undefined);
  assert.throws(() => validateStory(Object.create(createStory())), /有效对象/);
});

test('remote, unsafe and oversized media and malformed files cannot enter a story', () => {
  for (const src of ['https://example.com/image.png', '/assets/unknown.png', '/assets/moon.png?x=1', 'data:image/svg+xml;base64,PHN2Zz4=', 'data:text/html;base64,AAAA', 'data:image/png;base64,AAA', 'data:image/png;base64,AA=A']) {
    const story = createStory(); story.assets[0].src = src;
    assert.throws(() => validateStory(story), Error);
  }
  const tooLarge = createStory();
  tooLarge.assets[0].src = 'data:image/png;base64,' + 'A'.repeat(4 * Math.ceil((8 * 1024 * 1024 + 3) / 3));
  assert.throws(() => validateStory(tooLarge), /8 MB/);
  for (const value of [null, '', '{', 'null', '[]', '{}', JSON.stringify({ ...createStory(), version: 2 })]) assert.throws(() => importStoryJSON(value), Error);
  assert.throws(() => importStoryJSON(' '.repeat(40 * 1024 * 1024 + 1)), /40 MB/);
});

test('failed asset fetch does not write an incomplete story or overwrite existing media', async () => {
  const backing = storage();
  const good = createStoryStore({ storage: backing, fetchAsset });
  const before = await good.saveStory(createStory('poetry'));
  let writes = 0;
  const broken = createStoryStore({ storage: { read: backing.read, write: async value => { writes += 1; await backing.write(value); } }, fetchAsset: async () => ({ ok: false }) });
  await assert.rejects(broken.saveStory(createStory()), /读取失败/);
  assert.equal(writes, 0);
  assert.deepEqual(await good.loadStory(), before);
});

test('quota and access failures are explicit, and corrupt local records never masquerade as an empty library', async () => {
  const quota = createStoryStore({ storage: { read: async () => null, write: async () => { throw new DOMException('full', 'QuotaExceededError'); } } });
  await assert.rejects(quota.saveStory(embedded()), /空间不足.*未完成/);
  const denied = createStoryStore({ storage: { read: async () => { throw new DOMException('denied', 'SecurityError'); }, write: async () => {} } });
  await assert.rejects(denied.loadStory(), /未允许/);
  const corrupt = createStoryStore({ storage: { read: async () => createStory(), write: async () => {} } });
  await assert.rejects(corrupt.loadStory(), /媒体不完整/);
  const unavailable = createStoryStore({ indexedDB: null });
  await assert.rejects(unavailable.loadStory(), /不支持本地故事库/);
});

test('IndexedDB save waits for transaction commit; request success followed by quota abort is a failure', async () => {
  let transaction;
  let closed = 0;
  let requestSucceeded;
  const requestDone = new Promise(resolve => { requestSucceeded = resolve; });
  const factory = { open() {
    const request = {};
    queueMicrotask(() => {
      request.result = {
        close() { closed += 1; },
        transaction() {
          transaction = { objectStore: () => ({ put() {
            const put = {};
            queueMicrotask(() => { put.result = 'current'; put.onsuccess(); requestSucceeded(); });
            return put;
          } }) };
          return transaction;
        },
      };
      request.onsuccess();
    });
    return request;
  } };
  const store = createStoryStore({ indexedDB: factory });
  let settled = false;
  const saving = store.saveStory(embedded());
  saving.then(() => { settled = true; }, () => { settled = true; });
  await requestDone;
  await Promise.resolve();
  assert.equal(settled, false);
  transaction.error = new DOMException('late quota', 'QuotaExceededError');
  transaction.onabort();
  await assert.rejects(saving, /空间不足.*未完成/);
  assert.equal(closed, 1);
});
