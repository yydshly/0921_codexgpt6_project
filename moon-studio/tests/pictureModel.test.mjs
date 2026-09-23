import test from 'node:test';
import assert from 'node:assert/strict';
import {
  defaultProject, validateProject, createPictureStore,
  exportProjectJSON, importProjectJSON, pointOnRoute,
} from '../src/pictureModel.js';

function memory() {
  const values = new Map();
  return { values, getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
}

test('default and custom projects roundtrip across persistence and JSON without retaining object references', () => {
  const storage = memory();
  const store = createPictureStore(storage);
  const blank = store.loadProject();
  assert.deepEqual(blank, defaultProject());
  assert.equal(storage.values.size, 0);
  const project = defaultProject();
  project.title = '我们自己的月光';
  project.imageUrl = 'data:image/png;base64,iVBORw0KGgo=';
  project.audioName = '我的朗读.mp3';
  project.music = false;
  project.points.push({ id: 'custom-12345678-1234-1234-abcd-123456789abc', label: '想念', x: 0, y: 1, action: 'sound', text: '听一听这段声音。' });
  const saved = store.saveProject(project);
  assert.equal(storage.values.has('moon-picture-v1'), true);
  assert.deepEqual(importProjectJSON(exportProjectJSON(project)), project);
  project.points[0].text = '未保存的修改';
  saved.points[1].text = '另一个外部修改';
  const loaded = store.loadProject();
  assert.notEqual(loaded.points[0].text, project.points[0].text);
  assert.notEqual(loaded.points[1].text, saved.points[1].text);
  assert.equal(loaded.audioName, '我的朗读.mp3');
  assert.equal(Object.keys(loaded).some(key => /blob|bytes|audioUrl/i.test(key)), false);
  const anotherDefault = defaultProject();
  blank.points[0].x = 0;
  assert.equal(anotherDefault.points[0].x, 0.76);
});

test('schema rejects unknown/missing fields, prototype pollution, invalid values and point ids', () => {
  const invalid = [
    { version: 2 }, { version: '1' }, { music: 1 }, { title: 5 }, { points: [] },
    { title: '<script>alert(1)</script>' }, { audioName: 'bad\u0000name' }, { audioBlob: {} },
    { points: Array(3) },
  ];
  for (const change of invalid) assert.throws(() => validateProject({ ...defaultProject(), ...change }), Error);
  for (const change of [{ x: NaN }, { x: Infinity }, { x: '0.1' }, { x: -0.01 }, { y: 1.01 }, { action: 'eval' }, { id: 'custom-malformed' }, { onclick: 'bad' }, { text: null }]) {
    const project = defaultProject();
    project.points[0] = { ...project.points[0], ...change };
    assert.throws(() => validateProject(project), Error);
  }
  const duplicate = defaultProject();
  duplicate.points[1].id = 'moon';
  assert.throws(() => validateProject(duplicate), /不能重复/);
  const missing = defaultProject();
  delete missing.imageName;
  assert.throws(() => validateProject(missing), /缺少/);
  const polluted = exportProjectJSON(defaultProject()).replace('"version":1', '"version":1,"__proto__":{"polluted":true}');
  assert.throws(() => importProjectJSON(polluted), /不支持的字段/);
  assert.equal({}.polluted, undefined);
  assert.throws(() => validateProject(Object.create(defaultProject())), /有效对象/);
});

test('imports reject missing built-in journey points and changed built-in actions before reaching the app', () => {
  const customOnly = defaultProject();
  customOnly.points = customOnly.points.map((point, index) => ({
    ...point, id: `custom-12345678-1234-1234-abcd-${String(index).padStart(12, '0')}`,
  }));
  assert.throws(() => importProjectJSON(JSON.stringify(customOnly)), /必须保留月亮、水面和纸船/);
  for (const id of ['moon', 'water', 'boat']) {
    const altered = defaultProject();
    altered.points.find(point => point.id === id).action = 'sound';
    assert.throws(() => importProjectJSON(JSON.stringify(altered)), /内置动作不能更改/, id);
  }
  const valid = defaultProject();
  valid.points.push({ ...customOnly.points[0], action: 'sound' });
  assert.equal(importProjectJSON(JSON.stringify(valid)).points.at(-1).action, 'sound');
});

test('text and point count limits use Unicode characters and enforce the specified boundaries', () => {
  const project = defaultProject();
  project.title = '🌕'.repeat(60);
  project.imageName = '字'.repeat(100);
  project.audioName = '字'.repeat(100);
  project.points[0].label = '字'.repeat(30);
  project.points[0].text = '🌕'.repeat(500);
  for (let index = 0; index < 12; index += 1) {
    project.points.push({ id: `custom-12345678-1234-1234-abcd-${String(index).padStart(12, '0')}`, label: '', x: 0, y: 1, action: 'ripple', text: '' });
  }
  assert.equal(validateProject(project).points.length, 15);
  assert.throws(() => validateProject({ ...project, title: project.title + '字' }), /60/);
  assert.throws(() => validateProject({ ...project, imageName: project.imageName + '字' }), /100/);
  assert.throws(() => validateProject({ ...project, audioName: project.audioName + '字' }), /100/);
  const tooMany = { ...project, points: [...project.points, project.points[0]] };
  assert.throws(() => validateProject(tooMany), /3 至 15/);
  project.points[0].text += '字';
  assert.throws(() => validateProject(project), /500/);
  project.points[0].text = '';
  project.points[0].label += '字';
  assert.throws(() => validateProject(project), /30/);
});

test('image input allows only known assets or bounded base64 PNG/JPEG/WebP data', () => {
  for (const imageUrl of ['/assets/moon-sea.png', '/assets/paper-scene.png', '/assets/sound-pool.png', 'data:image/jpeg;base64,/9j/2Q==', 'data:image/webp;base64,UklGRg==']) {
    assert.equal(validateProject({ ...defaultProject(), imageUrl }).imageUrl, imageUrl);
  }
  for (const imageUrl of ['https://example.com/photo.png', '/assets/other.png', 'javascript:alert(1)', 'data:image/svg+xml;base64,PHN2Zz4=', 'data:image/png;base64,', 'data:image/png;base64,abc', 'data:image/png;base64,a===', 'data:image/png;base64,AAAA\n', 'data:image/png;base64,' + 'A'.repeat(2 * 1024 * 1024)]) {
    assert.throws(() => validateProject({ ...defaultProject(), imageUrl }), Error);
  }
  for (const value of ['', '{', 'null', '[]', '{}', 5]) assert.throws(() => importProjectJSON(value), Error);
});

test('storage quota and access failures are explicit and never replace previously saved data', () => {
  const storage = memory();
  const good = createPictureStore(storage);
  good.saveProject(defaultProject());
  const before = storage.getItem('moon-picture-v1');
  const failing = createPictureStore({ getItem: storage.getItem, setItem() { throw new DOMException('full', 'QuotaExceededError'); } });
  assert.throws(() => failing.saveProject({ ...defaultProject(), title: '不能丢的修改' }), /空间不足.*未完成/);
  assert.equal(storage.getItem('moon-picture-v1'), before);
  const denied = createPictureStore({ getItem() { throw new DOMException('denied', 'SecurityError'); }, setItem() {} });
  assert.throws(() => denied.loadProject(), /未允许本地存储/);
  assert.throws(() => createPictureStore(null).loadProject(), /无法使用本地存储/);
});

test('corrupt persisted data throws without falling back to defaults or silently overwriting it', () => {
  for (const raw of ['{', JSON.stringify({ ...defaultProject(), version: 9 }), '']) {
    let writes = 0;
    const store = createPictureStore({ getItem: () => raw, setItem() { writes += 1; } });
    assert.throws(() => store.loadProject(), /已损坏.*未覆盖/);
    assert.throws(() => store.saveProject(defaultProject()), /已损坏.*未覆盖/);
    assert.equal(writes, 0);
  }
});

test('route interpolation follows arc length, skips repeated points and clamps progress', () => {
  const route = [{ x: 0, y: 0 }, { x: 0.25, y: 0 }, { x: 0.25, y: 0 }, { x: 0.25, y: 0.75 }];
  assert.deepEqual(pointOnRoute(route, 0.125), { x: 0.125, y: 0 });
  assert.deepEqual(pointOnRoute(route, 0.5), { x: 0.25, y: 0.25 });
  assert.deepEqual(pointOnRoute(route, 0.75), { x: 0.25, y: 0.5 });
  assert.deepEqual(pointOnRoute(route, -1), route[0]);
  assert.deepEqual(pointOnRoute(route, 2), route.at(-1));
  const diagonal = pointOnRoute([{ x: 0, y: 0 }, { x: 1, y: 1 }], 0.5);
  assert.deepEqual(diagonal, { x: 0.5, y: 0.5 });
  assert.equal(pointOnRoute([], 0.5), null);
  const single = [{ x: 0.4, y: 0.6 }];
  assert.deepEqual(pointOnRoute(single, 0.5), single[0]);
  assert.notEqual(pointOnRoute(single, 0.5), single[0]);
  assert.deepEqual(pointOnRoute([single[0], single[0]], 0.8), single[0]);
  for (const progress of [NaN, Infinity, '0.5']) assert.throws(() => pointOnRoute(route, progress), /有限数字/);
  for (const points of [null, Array(2), [{ x: 2, y: 0 }], [{ x: 0, y: 0, html: 'bad' }]]) assert.throws(() => pointOnRoute(points, 0.5), Error);
});
