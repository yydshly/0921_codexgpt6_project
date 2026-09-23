import test from 'node:test';
import assert from 'node:assert/strict';
import { saveProject, listProjects, getProject, deleteProject, exportProject, importProject } from '../src/projectStore.js';

const config = () => ({
  poemId: 'wang', message: '愿你今夜，心有归处。', customPoem: '',
  moonX: 0.7, moonY: 0.3, moonSize: 0.12, brightness: 0.8,
  response: 'message', trigger: 'moon', spacing: 0.5, intensity: 0.5,
  textX: 0.2, textY: 0.25,
});
const project = () => ({
  id: 'source-project', title: '海上共此时', mode: 'sea', config: config(),
  audioBlob: null, audioLabel: '', updatedAt: 1234,
});
const envelope = () => ({ version: 1, project: { title: '海上共此时', mode: 'sea', config: config(), audioLabel: '' } });

test('silent project roundtrip retains the complete editable configuration and assigns fresh identity', async () => {
  const original = project();
  const exported = await exportProject(original);
  const parsed = JSON.parse(exported);
  assert.equal(parsed.version, 1);
  assert.equal(Object.hasOwn(parsed.project, 'id'), false);
  assert.equal(Object.hasOwn(parsed.project, 'audioDataUrl'), false);
  const first = await importProject(exported);
  const second = await importProject(exported);
  assert.deepEqual(first.config, original.config);
  assert.equal(first.title, original.title);
  assert.equal(first.audioBlob, null);
  assert.equal(first.originTitle, original.title);
  assert.notEqual(first.id, original.id);
  assert.notEqual(first.id, second.id);
  assert.match(first.id, /^[a-f0-9-]{36}$/);
  assert.ok(first.updatedAt >= original.updatedAt);
  first.config.message = '新的一句';
  assert.equal(original.config.message, '愿你今夜，心有归处。');
});

test('audio roundtrip preserves all bytes, media type, label and original attribution', async () => {
  const bytes = Uint8Array.from({ length: 65003 }, (_, i) => i % 256);
  const original = { ...project(), mode: 'sound', audioBlob: new Blob([bytes], { type: 'audio/webm;codecs=opus' }), audioLabel: '我的朗读.webm', originTitle: '初作' };
  const exported = await exportProject(original);
  assert.match(JSON.parse(exported).project.audioDataUrl, /^data:audio\/webm;codecs=opus;base64,/);
  const restored = await importProject(exported);
  assert.deepEqual(new Uint8Array(await restored.audioBlob.arrayBuffer()), bytes);
  assert.equal(restored.audioBlob.type, original.audioBlob.type);
  assert.equal(restored.audioLabel, original.audioLabel);
  assert.equal(restored.originTitle, '初作');
});

test('all modes and supported triggers, including paper flowers, survive export', async () => {
  for (const mode of ['sea', 'paper', 'sound']) {
    for (const trigger of ['moon', 'stage', 'flower']) {
      const value = project();
      value.mode = mode;
      value.config.trigger = trigger;
      const restored = await importProject(await exportProject(value));
      assert.equal(restored.mode, mode);
      assert.equal(restored.config.trigger, trigger);
    }
  }
});

test('rejects malformed envelopes and unsupported file shapes', async () => {
  for (const value of [null, 3, [], {}, { version: 2, project: {} }, { version: '1', project: {} }, { ...envelope(), execute: 'alert(1)' }]) {
    await assert.rejects(importProject(JSON.stringify(value)), Error);
  }
  await assert.rejects(importProject('{'), /JSON/);
  await assert.rejects(importProject({}), /JSON/);
  await assert.rejects(importProject(''), /JSON/);
  const withId = envelope();
  withId.project.id = 'source-project';
  await assert.rejects(importProject(JSON.stringify(withId)), /不支持的字段/);
});

test('rejects markup and prototype pollution without executing or mutating prototypes', async () => {
  const cases = [
    { field: 'title', text: '<img src=x onerror=alert(1)>' },
    { field: 'audioLabel', text: '</script><script>alert(1)</script>' },
    { field: 'originTitle', text: '<svg onload=alert(1)>' },
  ];
  for (const { field, text } of cases) {
    const value = envelope();
    value.project[field] = text;
    await assert.rejects(importProject(JSON.stringify(value)), /HTML/);
  }
  for (const field of ['message', 'customPoem']) {
    const value = envelope();
    value.project.config[field] = '<script>alert(1)</script>';
    await assert.rejects(importProject(JSON.stringify(value)), /HTML/);
  }
  const text = JSON.stringify(envelope()).replace('"poemId":"wang"', '"__proto__":{"polluted":true},"poemId":"wang"');
  await assert.rejects(importProject(text), /不支持的字段/);
  assert.equal({}.polluted, undefined);
});

test('rejects missing, unknown, non-finite, incorrectly typed and out-of-range config values', async () => {
  const changes = [
    ['poemId', 'other'], ['poemId', 1], ['response', 'eval'], ['trigger', 'onclick'],
    ['moonX', NaN], ['moonX', Infinity], ['moonX', -Infinity], ['moonX', '0.5'],
    ['moonX', 0.099], ['moonY', 0.481], ['moonSize', 0.25], ['brightness', 1.01],
    ['spacing', -0.1], ['intensity', false], ['textX', 0.81], ['textY', 0.05],
    ['message', '字'.repeat(201)], ['customPoem', '字'.repeat(101)], ['message', {}],
    ['html', 'unknown'], ['message', '隐藏\u0000字符'],
  ];
  for (const [key, value] of changes) {
    const original = project();
    original.config[key] = value;
    await assert.rejects(exportProject(original), Error, `${key}=${String(value)}`);
  }
  const missing = envelope();
  delete missing.project.config.textY;
  await assert.rejects(importProject(JSON.stringify(missing)), /缺少 textY/);
  const inherited = project();
  inherited.config = Object.create(config());
  await assert.rejects(exportProject(inherited), /有效对象/);
});

test('allows exact text limits, line breaks, quotation marks and boundary numbers', async () => {
  const original = project();
  original.config.message = '🌕'.repeat(200);
  original.config.customPoem = '字'.repeat(100);
  original.config.moonX = 0.1;
  original.config.moonY = 0.48;
  original.config.moonSize = 0.07;
  original.config.textX = 0.8;
  original.config.textY = 0.06;
  assert.deepEqual((await importProject(await exportProject(original))).config, original.config);
  original.config.message = '月下\n“我在这里”\t与你同看';
  assert.equal((await importProject(await exportProject(original))).config.message, original.config.message);
});

test('rejects unsafe, remote and damaged embedded audio', async () => {
  const audioCases = [
    'https://example.com/audio.mp3', 'javascript:alert(1)',
    'data:text/html;base64,PHNjcmlwdD4=', 'data:image/svg+xml;base64,PHN2Zz4=',
    'data:audio/wav,raw', 'data:audio/wav;base64,?AAA',
    'data:audio/wav;base64,A', 'data:audio/wav;base64,AA=A', 42, {},
  ];
  for (const audioDataUrl of audioCases) {
    const value = envelope();
    value.project.audioDataUrl = audioDataUrl;
    await assert.rejects(importProject(JSON.stringify(value)), /音频|文件/);
  }
  await assert.rejects(exportProject({ ...project(), audioBlob: 'not a Blob' }), /音频/);
  await assert.rejects(exportProject({ ...project(), audioBlob: new Blob(['<svg/>'], { type: 'image/svg+xml' }) }), /音频格式/);
});

test('30 MB import limit uses UTF-8 bytes, not only JavaScript string length', async () => {
  await assert.rejects(importProject(' '.repeat(30 * 1024 * 1024 + 1)), /30 MB/);
  const utf8Oversized = '字'.repeat(11 * 1024 * 1024);
  assert.ok(utf8Oversized.length < 30 * 1024 * 1024);
  await assert.rejects(importProject(utf8Oversized), /30 MB/);
});

test('oversized audio export fails before returning an invalid backup', async () => {
  const original = { ...project(), audioBlob: new Blob([new Uint8Array(24 * 1024 * 1024)], { type: 'audio/wav' }) };
  await assert.rejects(exportProject(original), /30 MB/);
});

test('no IndexedDB never reports a fake save, read, or delete success', async () => {
  assert.equal(globalThis.indexedDB, undefined);
  await assert.rejects(saveProject(project()), /不支持本地作品库/);
  await assert.rejects(listProjects(), /不支持本地作品库/);
  await assert.rejects(getProject('known-id'), /不支持本地作品库/);
  await assert.rejects(deleteProject('known-id'), /不支持本地作品库/);
});

test('rejects invalid record metadata before attempting storage', async () => {
  for (const patch of [{ title: '' }, { title: 3 }, { title: 'x'.repeat(121) }, { mode: 'unknown' }, { updatedAt: NaN }, { updatedAt: -1 }, { id: '<script>' }, { audioLabel: null }]) {
    await assert.rejects(saveProject({ ...project(), ...patch }), Error);
  }
  await assert.rejects(getProject(''), /编号/);
  await assert.rejects(deleteProject({}), /编号/);
});

test('blocked storage access reports a Chinese error instead of a raw browser exception', async (t) => {
  Object.defineProperty(globalThis, 'indexedDB', {
    configurable: true,
    get() { throw new DOMException('Permission denied', 'SecurityError'); },
  });
  t.after(() => { delete globalThis.indexedDB; });
  await assert.rejects(saveProject(project()), /浏览器未允许使用本地作品库，保存未完成/);
});

test('save waits for the transaction commit and rejects a later quota abort', async (t) => {
  let transaction;
  let putRequest;
  let savedRecord;
  let closeCount = 0;
  globalThis.indexedDB = {
    open() {
      const request = {};
      queueMicrotask(() => {
        request.result = {
          close() { closeCount += 1; },
          transaction() {
            transaction = {
              objectStore() {
                return { put(record) { savedRecord = record; putRequest = {}; return putRequest; } };
              },
            };
            return transaction;
          },
        };
        request.onsuccess();
      });
      return request;
    },
  };
  t.after(() => { delete globalThis.indexedDB; });
  let fulfilled = false;
  const pendingSave = saveProject(project()).then((record) => { fulfilled = true; return record; });
  await new Promise((resolve) => setImmediate(resolve));
  putRequest.result = savedRecord.id;
  putRequest.onsuccess();
  await Promise.resolve();
  assert.equal(fulfilled, false, 'request success alone is not a committed save');
  transaction.oncomplete();
  assert.equal((await pendingSave).id, 'source-project');
  assert.ok(savedRecord.updatedAt > 1234);
  assert.equal(closeCount, 1);

  const failedSave = saveProject(project());
  const rejection = assert.rejects(failedSave, /本地存储空间不足，保存未完成/);
  await new Promise((resolve) => setImmediate(resolve));
  putRequest.onsuccess();
  transaction.error = new DOMException('Out of quota', 'QuotaExceededError');
  transaction.onabort();
  await rejection;
  assert.equal(closeCount, 2);
});
