import {assetUrl} from './assetUrl.js';
const DB_NAME = 'moon-story-studio';
const STORE_NAME = 'stories';
const RECORD_KEY = 'current';
const MAX_JSON_BYTES = 40 * 1024 * 1024;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_AUDIO_BYTES = 12 * 1024 * 1024;
const PRESET_ASSETS = {
  '/assets/story-room-closed.png': 'image/png',
  '/assets/story-room-open.png': 'image/png',
  '/assets/story-memory.png': 'image/png',
  '/assets/moon-sea.png': 'image/png',
  '/assets/moon.png': 'image/png',
  '/assets/demo-music.mp3': 'audio/mpeg',
  '/assets/paper-scene.png': 'image/png',
};
const STORY_KEYS = ['format', 'version', 'id', 'title', 'subtitle', 'assets', 'layers', 'rules', 'ending'];
const LAYER_KEYS = ['id', 'name', 'kind', 'assetId', 'text', 'x', 'y', 'width', 'height', 'rotation', 'opacity', 'visible', 'fit'];
const ACTION_FIELDS = {
  show: ['target'], hide: ['target'], move: ['target', 'x', 'y'], text: ['target', 'text'],
  audio: ['assetId', 'volume', 'loop'], stopAudio: ['assetId'], narrate: ['text'], finish: [],
};
const REQUIRED_ACTION_FIELDS = {
  show: ['target'], hide: ['target'], move: ['target', 'x', 'y'], text: ['target', 'text'],
  audio: ['assetId'], stopAudio: [], narrate: ['text'], finish: [],
};
const AUDIO_MIME = /^(audio\/(?:mpeg|mp3|wav|x-wav|ogg|webm|mp4|aac|flac|x-flac))(?:;codecs=[a-z0-9., -]+)?$/i;

function fail(message) { throw new Error(message); }
function object(value, keys, label, required = keys) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
      || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) fail(`${label}必须是有效对象。`);
  if (Reflect.ownKeys(value).some(key => typeof key !== 'string' || !keys.includes(key))) fail(`${label}包含不支持的字段。`);
  for (const key of required) if (!Object.hasOwn(value, key)) fail(`${label}缺少 ${key}。`);
}
function list(value, max, label, min = 0) {
  if (!Array.isArray(value) || value.length < min || value.length > max) fail(`${label}数量必须在 ${min} 至 ${max} 个之间。`);
  for (let index = 0; index < value.length; index += 1) if (!Object.hasOwn(value, index)) fail(`${label}不能包含空项。`);
  return value;
}
function text(value, limit, label, required = false) {
  if (typeof value !== 'string') fail(`${label}必须是文字。`);
  if (Array.from(value).length > limit) fail(`${label}不能超过 ${limit} 个字。`);
  if (/[<>\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/u.test(value)) fail(`${label}不能包含 HTML 标记或不可见控制字符。`);
  if (required && !value.trim()) fail(`${label}不能为空。`);
  return value;
}
function id(value, label = '编号') {
  if (typeof value !== 'string' || !/^[a-z0-9][a-z0-9_-]{0,127}$/i.test(value)) fail(`${label}无效。`);
  return value;
}
function numeric(value, label, min = -Infinity, max = Infinity) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) fail(`${label}必须是 ${min} 至 ${max} 范围内的有限数字。`);
  return value;
}
function boolean(value, label) {
  if (typeof value !== 'boolean') fail(`${label}必须是布尔值。`);
  return value;
}
function choice(value, options, label) {
  if (!options.includes(value)) fail(`${label}无效。`);
  return value;
}
function unique(entries, label) {
  const map = new Map();
  for (const entry of entries) {
    if (map.has(entry.id)) fail(`${label}编号不能重复。`);
    map.set(entry.id, entry);
  }
  return map;
}
function checkSize(jsonText) {
  if (jsonText.length > MAX_JSON_BYTES || new TextEncoder().encode(jsonText).byteLength > MAX_JSON_BYTES) fail('完整作品文件不能超过 40 MB，请压缩图片或缩短音频。');
}
function source(value, kind) {
  if (typeof value !== 'string') fail('素材地址必须是文字。');
  if (Object.hasOwn(PRESET_ASSETS, value)) {
    if (!PRESET_ASSETS[value].startsWith(`${kind}/`)) fail('素材类型与预设文件不一致。');
    return value;
  }
  const comma = value.indexOf(',');
  if (!value.startsWith('data:') || comma < 0 || comma > 160 || !value.slice(0, comma).endsWith(';base64')) fail('素材仅支持预设本地文件或内嵌图片、音频，不支持外部链接。');
  const mime = value.slice(5, comma - 7);
  if (kind === 'image' ? !/^image\/(png|jpeg|webp)$/.test(mime) : !AUDIO_MIME.test(mime)) fail('素材的图片或音频格式不受支持。');
  const encoded = value.slice(comma + 1);
  const limit = kind === 'image' ? MAX_IMAGE_BYTES : MAX_AUDIO_BYTES;
  if (encoded.length > 4 * Math.ceil(limit / 3)) fail(kind === 'image' ? '单张图片不能超过 8 MB。' : '单段音频不能超过 12 MB。');
  if (!encoded.length || encoded.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(encoded)) fail('素材的 base64 数据已损坏。');
  const decodedLength = encoded.length / 4 * 3 - (encoded.endsWith('==') ? 2 : encoded.endsWith('=') ? 1 : 0);
  if (decodedLength > limit) fail(kind === 'image' ? '单张图片不能超过 8 MB。' : '单段音频不能超过 12 MB。');
  return value;
}

/** Strict plain-data validation; no HTML or executable expressions are accepted. */
export function validateStory(input) {
  object(input, STORY_KEYS, '互动故事');
  if (input.format !== 'moon-story' || input.version !== 1) fail('互动故事格式或版本不受支持。');
  const assets = list(input.assets, 32, '素材').map(asset => {
    object(asset, ['id', 'name', 'kind', 'src'], '素材');
    const kind = choice(asset.kind, ['image', 'audio'], '素材类型');
    return { id: id(asset.id, '素材编号'), name: text(asset.name, 100, '素材名称'), kind, src: source(asset.src, kind) };
  });
  const assetMap = unique(assets, '素材');
  const layers = list(input.layers, 64, '图层', 1).map(layer => {
    object(layer, LAYER_KEYS, '图层');
    const kind = choice(layer.kind, ['image', 'text', 'zone'], '图层类型');
    if (typeof layer.assetId !== 'string') fail('图层素材编号必须是文字。');
    if (kind === 'image') {
      if (!assetMap.has(layer.assetId) || assetMap.get(layer.assetId).kind !== 'image') fail('图片图层引用的图片素材不存在。');
    } else if (layer.assetId !== '') fail('文字与热区图层的素材编号应为空。');
    return {
      id: id(layer.id, '图层编号'), name: text(layer.name, 80, '图层名称'), kind, assetId: layer.assetId,
      text: text(layer.text, 1200, '图层文字'), x: numeric(layer.x, '横向位置', 0, 1), y: numeric(layer.y, '纵向位置', 0, 1),
      width: numeric(layer.width, '图层宽度', 0, 1), height: numeric(layer.height, '图层高度', 0, 1),
      rotation: numeric(layer.rotation, '旋转角度'), opacity: numeric(layer.opacity, '图层透明度', 0, 1),
      visible: boolean(layer.visible, '图层可见状态'), fit: choice(layer.fit, ['cover', 'contain'], '图片适配方式'),
    };
  });
  const layerMap = unique(layers, '图层');
  const requireLayer = value => {
    id(value, '目标图层编号');
    if (!layerMap.has(value)) fail('规则引用的图层不存在。');
    return value;
  };
  const requireAudio = value => {
    id(value, '音频素材编号');
    if (!assetMap.has(value) || assetMap.get(value).kind !== 'audio') fail('动作引用的音频素材不存在。');
    return value;
  };
  const rules = list(input.rules, 64, '规则').map(rule => {
    object(rule, ['id', 'name', 'hint', 'trigger', 'requires', 'once', 'actions'], '规则');
    object(rule.trigger, ['type', 'source', 'target'], '触发事件');
    const type = choice(rule.trigger.type, ['click', 'swipe', 'drop'], '触发事件类型');
    const trigger = { type, source: requireLayer(rule.trigger.source), target: '' };
    if (type === 'drop') trigger.target = requireLayer(rule.trigger.target);
    else if (rule.trigger.target !== '') fail('点击与划动事件的目标应为空。');
    if (rule.once !== true) fail('当前规则必须只执行一次。');
    const requires = list(rule.requires, 64, '前置规则').map(value => id(value, '前置规则编号'));
    if (new Set(requires).size !== requires.length) fail('前置规则不能重复。');
    const actions = list(rule.actions, 32, '动作', 1).map(action => {
      if (!action || typeof action.type !== 'string' || !Object.hasOwn(ACTION_FIELDS, action.type)) fail('动作类型无效。');
      object(action, ['type', ...ACTION_FIELDS[action.type], 'delay'], '动作', ['type', ...REQUIRED_ACTION_FIELDS[action.type]]);
      const result = { type: action.type };
      if (Object.hasOwn(action, 'target')) result.target = requireLayer(action.target);
      if (Object.hasOwn(action, 'x')) result.x = numeric(action.x, '动作横向位置', 0, 1);
      if (Object.hasOwn(action, 'y')) result.y = numeric(action.y, '动作纵向位置', 0, 1);
      if (Object.hasOwn(action, 'text')) result.text = text(action.text, 1200, '动作文字');
      if (action.type === 'text' && layerMap.get(result.target).kind !== 'text') fail('改写文字的动作必须指向文字图层。');
      if (Object.hasOwn(action, 'assetId')) result.assetId = requireAudio(action.assetId);
      if (Object.hasOwn(action, 'volume')) result.volume = numeric(action.volume, '音量', 0, 1);
      if (Object.hasOwn(action, 'loop')) result.loop = boolean(action.loop, '循环播放');
      if (Object.hasOwn(action, 'delay')) result.delay = numeric(action.delay, '动作延时（毫秒）', 0, 300000);
      return result;
    });
    return { id: id(rule.id, '规则编号'), name: text(rule.name, 80, '规则名称'), hint: text(rule.hint, 200, '操作提示'), trigger, requires, once: true, actions };
  });
  const ruleMap = unique(rules, '规则');
  const states = new Map();
  const visit = ruleId => {
    if (states.get(ruleId) === 'visiting') fail('前置规则存在循环依赖，故事无法继续。');
    if (states.get(ruleId) === 'visited') return;
    states.set(ruleId, 'visiting');
    for (const requiredId of ruleMap.get(ruleId).requires) {
      if (!ruleMap.has(requiredId)) fail('引用的前置规则不存在。');
      visit(requiredId);
    }
    states.set(ruleId, 'visited');
  };
  for (const ruleId of ruleMap.keys()) visit(ruleId);
  object(input.ending, ['title', 'message'], '故事结尾');
  const story = {
    format: 'moon-story', version: 1, id: id(input.id, '故事编号'),
    title: text(input.title, 100, '故事标题'), subtitle: text(input.subtitle, 240, '故事引言'), assets, layers, rules,
    ending: { title: text(input.ending.title, 100, '结尾标题'), message: text(input.ending.message, 1200, '结尾文字') },
  };
  checkSize(JSON.stringify(story));
  return story;
}

function layer(id, name, kind, assetId, text, x, y, width, height, visible = true, fit = 'contain') {
  return { id, name, kind, assetId, text, x, y, width, height, rotation: 0, opacity: 1, visible, fit };
}
function rule(id, name, hint, type, source, target, requires, actions) {
  return { id, name, hint, trigger: { type, source, target }, requires, once: true, actions };
}
function asset(id, name, kind, src) { return { id, name, kind, src }; }

/** Two structurally different templates share exactly the same generic model. */
export function createStory(template = 'reunion') {
  if (!['reunion', 'poetry'].includes(template)) fail('没有找到这个故事模板。');
  if (typeof globalThis.crypto?.randomUUID !== 'function') fail('当前浏览器无法创建故事编号，请使用安全连接或本地预览。');
  const shared = { format: 'moon-story', version: 1, id: globalThis.crypto.randomUUID() };
  if (template === 'poetry') return validateStory({
    ...shared, title: '给月亮留半句诗', subtitle: '揭开诗笺，读一句古诗，再把月光放进自己的句子。',
    assets: [asset('paper', '桂花诗笺', 'image', '/assets/paper-scene.png'), asset('moon-image', '一轮月亮', 'image', '/assets/moon.png')],
    layers: [
      layer('paper', '诗笺底图', 'image', 'paper', '', .5, .5, 1, 1, true, 'cover'),
      layer('seal', '轻触诗笺', 'zone', '', '', .5, .45, .65, .5),
      layer('classic', '古诗引子', 'text', '', '但愿人长久，千里共婵娟。\n宋 · 苏轼《水调歌头》', .5, .3, .78, .2, false),
      layer('moon', '可移动的月亮', 'image', 'moon-image', '', .21, .57, .16, .2, false),
      layer('first', '我写的上句', 'text', '', '我把晚风折进信里，', .56, .53, .6, .15, false),
      layer('second', '等月光落笔', 'text', '', '下一句，等月光来到这里。', .56, .73, .64, .2, false),
    ],
    rules: [
      rule('unseal', '轻触，打开诗笺', '轻触画面中央，读一句古诗。', 'click', 'seal', '', [], [{ type: 'hide', target: 'seal' }, { type: 'show', target: 'classic' }]),
      rule('turn-page', '划过古诗，写到今天', '划过古诗，让你自己的句子出现。', 'swipe', 'classic', '', ['unseal'], [{ type: 'show', target: 'moon' }, { type: 'show', target: 'first' }, { type: 'show', target: 'second' }]),
      rule('write-together', '让月光补完下一句', '把月亮拖到下方的留白句子。', 'drop', 'moon', 'second', ['turn-page'], [
        { type: 'hide', target: 'moon' }, { type: 'text', target: 'second', text: '你让远方，也有了归处。' },
        { type: 'narrate', text: '我把晚风折进信里，你让远方，也有了归处。' }, { type: 'finish', delay: 800 },
      ]),
    ],
    ending: { title: '月光替你补完了诗', message: '古诗是引子，后两句是可替换的原创示例。改成你的句子，再把这张诗笺交给想念的人。' },
  });
  return validateStory({
    ...shared, title: '给团圆留一盏灯', subtitle: '推开一扇窗，让旧时的记忆与今天相遇。',
    assets: [
      asset('room-open', '窗外月色', 'image', '/assets/story-room-open.png'),
      asset('room-closed', '还未推开的窗', 'image', '/assets/story-room-closed.png'),
      asset('memory-image', '旧时的团圆', 'image', '/assets/story-memory.png'),
      asset('moon-image', '一轮月亮', 'image', '/assets/moon.png'),
      asset('music', '原创示例配乐', 'audio', '/assets/demo-music.mp3'),
    ],
    layers: [
      layer('room', '此刻的家', 'image', 'room-open', '', .5, .5, 1, 1, true, 'cover'),
      layer('window', '推开这扇窗', 'image', 'room-closed', '', .5, .5, 1, 1, true, 'cover'),
      layer('moon', '从窗外借来的月光', 'image', 'moon-image', '', .72, .28, .12, .18, false),
      layer('memory', '旧照片', 'image', 'memory-image', '', .24, .7, .24, .27, false, 'cover'),
      layer('today', '今天的家', 'image', 'room-open', '', .73, .7, .24, .27, false, 'cover'),
      layer('poem', '月色里的古诗', 'text', '', '海上生明月，天涯共此时。\n唐 · 张九龄《望月怀远》', .5, .43, .8, .18, false),
      layer('ending', '给此刻的一句话', 'text', '', '走过许多地方，月光还是把我们带回家。', .5, .88, .84, .14, false),
    ],
    rules: [
      rule('open', '推开窗，借一束月光', '在窗上划一下，让月光进来。', 'swipe', 'window', '', [], [
        { type: 'hide', target: 'window' }, { type: 'show', target: 'moon' }, { type: 'show', target: 'memory' },
        { type: 'audio', assetId: 'music', volume: .24, loop: true },
      ]),
      rule('memory', '让月光照到旧照片', '把月光拖到左下方的旧照片。', 'drop', 'moon', 'memory', ['open'], [
        { type: 'hide', target: 'moon' }, { type: 'show', target: 'today' }, { type: 'show', target: 'poem' },
        { type: 'narrate', text: '示例回忆：小时候，最盼望的是一家人围坐在窗边，分一块月饼，等月亮慢慢升起。' },
      ]),
      rule('reunion', '让旧时与今天相遇', '把旧照片拖到右边今天的家。', 'drop', 'memory', 'today', ['memory'], [
        { type: 'move', target: 'memory', x: .38, y: .66 }, { type: 'move', target: 'today', x: .62, y: .66 },
        { type: 'show', target: 'ending' }, { type: 'finish', delay: 800 },
      ]),
    ],
    ending: { title: '这一次，月光带我们回了家', message: '旧照片与今天的家，在同一轮月光下相遇。你可以换成自己的照片与回忆，让团圆有自己的写法。' },
  });
}

async function blobDataUrl(blob, mime, kind) {
  const limit = kind === 'image' ? MAX_IMAGE_BYTES : MAX_AUDIO_BYTES;
  if (!blob.size || blob.size > limit) fail(kind === 'image' ? '图片为空或超过 8 MB。' : '音频为空或超过 12 MB。');
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const chunks = [];
  for (let offset = 0; offset < bytes.length; offset += 24576) chunks.push(btoa(String.fromCharCode(...bytes.subarray(offset, offset + 24576))));
  return `data:${mime};base64,${chunks.join('')}`;
}
async function embed(input, fetchAsset) {
  const story = validateStory(input);
  const fetched = new Map();
  let embeddedChars = 0;
  for (const asset of story.assets) {
    if (!asset.src.startsWith('data:')) {
      if (typeof fetchAsset !== 'function') fail('当前环境无法读取预设媒体，作品未保存。');
      let data = fetched.get(asset.src);
      if (!data) {
        let response;
        try { response = await fetchAsset(assetUrl(asset.src), { redirect: 'error', credentials: 'same-origin' }); }
        catch (error) { throw new Error(`无法读取预设素材“${asset.name}”，请确认素材已就绪后重试。`, { cause: error }); }
        if (!response?.ok || typeof response.blob !== 'function') fail(`预设素材“${asset.name}”读取失败，作品未保存。`);
        const blob = await response.blob();
        const expectedMime = PRESET_ASSETS[asset.src];
        // MIME is determined by the fixed local whitelist, not arbitrary URLs.
        const actualMime = blob.type?.split(';')[0].toLowerCase();
        if (actualMime && actualMime !== 'application/octet-stream'
            && !(asset.kind === 'image' ? /^image\/(png|jpeg|webp)$/.test(actualMime) : AUDIO_MIME.test(actualMime))) fail(`预设素材“${asset.name}”不是有效的图片或音频。`);
        data = await blobDataUrl(blob, actualMime && actualMime !== 'application/octet-stream' ? actualMime : expectedMime, asset.kind);
        fetched.set(asset.src, data);
      }
      asset.src = data;
    }
    embeddedChars += asset.src.length;
    if (embeddedChars > MAX_JSON_BYTES) fail('完整作品文件不能超过 40 MB，请压缩图片或缩短音频。');
  }
  return validateStory(story);
}

export async function embedStoryAssets(story) {
  return embed(story, globalThis.fetch?.bind(globalThis));
}
export async function exportStoryJSON(story) {
  return JSON.stringify(await embedStoryAssets(story));
}
export function importStoryJSON(jsonText) {
  if (typeof jsonText !== 'string') fail('请选择 JSON 格式的互动故事文件。');
  checkSize(jsonText);
  let story;
  try { story = JSON.parse(jsonText); } catch { fail('互动故事文件不是有效的 JSON，或文件已损坏。'); }
  return validateStory(story);
}

function storageError(error, action) {
  if (error?.name === 'QuotaExceededError') return new Error(`本地存储空间不足，${action}未完成。请先导出作品备份，再压缩媒体。`, { cause: error });
  if (error?.name === 'SecurityError' || error?.name === 'InvalidStateError') return new Error(`浏览器未允许使用本地故事库，${action}未完成。请导出文件保留作品。`, { cause: error });
  return new Error(`本地故事${action}失败，操作未完成。请保留当前内容并重试。`, { cause: error });
}
function openDatabase(factory, action) {
  return new Promise((resolve, reject) => {
    let request;
    let rejected = false;
    const refuse = error => { rejected = true; reject(error); };
    try {
      const indexedDB = factory === undefined ? globalThis.indexedDB : factory;
      if (!indexedDB) return refuse(new Error('当前浏览器不支持本地故事库，操作未完成。请导出文件备份。'));
      request = indexedDB.open(DB_NAME, 1);
    } catch (error) { refuse(storageError(error, action)); return; }
    request.onupgradeneeded = () => {
      try { if (!request.result.objectStoreNames.contains(STORE_NAME)) request.result.createObjectStore(STORE_NAME); }
      catch (error) { request.transaction?.abort(); refuse(storageError(error, action)); }
    };
    request.onerror = () => refuse(storageError(request.error, action));
    request.onblocked = () => refuse(new Error('本地故事库被其他页面占用，操作未完成。请关闭其他创作页面后重试。'));
    request.onsuccess = () => {
      const database = request.result;
      if (rejected) { database.close(); return; }
      database.onversionchange = () => database.close();
      resolve(database);
    };
  });
}
async function transaction(factory, mode, action, operation) {
  const database = await openDatabase(factory, action);
  try {
    return await new Promise((resolve, reject) => {
      let tx, result, requestError;
      try {
        tx = database.transaction(STORE_NAME, mode);
        tx.oncomplete = () => resolve(result);
        tx.onabort = () => reject(storageError(tx.error ?? requestError, action));
        tx.onerror = () => { requestError ??= tx.error; };
        const request = operation(tx.objectStore(STORE_NAME));
        request.onsuccess = () => { result = request.result; };
        request.onerror = () => { requestError = request.error; };
      } catch (error) {
        try { tx?.abort(); } catch { /* Transaction already ended. */ }
        reject(storageError(error, action));
      }
    });
  } finally { database.close(); }
}

/** Optional test adapter: storage.read()/write(story) must resolve after commit. */
export function createStoryStore({ storage, indexedDB, fetchAsset } = {}) {
  const read = storage ? () => storage.read() : () => transaction(indexedDB, 'readonly', '读取', store => store.get(RECORD_KEY));
  const write = storage ? value => storage.write(value) : value => transaction(indexedDB, 'readwrite', '保存', store => store.put(value, RECORD_KEY));
  const fetcher = (...args) => (fetchAsset ?? globalThis.fetch)?.(...args);
  return {
    async saveStory(story) {
      const complete = await embed(story, fetcher);
      try { await write(validateStory(complete)); } catch (error) { if (!storage) throw error; throw storageError(error, '保存'); }
      return validateStory(complete);
    },
    async loadStory() {
      let stored;
      try { stored = await read(); } catch (error) { if (!storage) throw error; throw storageError(error, '读取'); }
      if (stored === null || stored === undefined) return null;
      try {
        const result = validateStory(stored);
        if (result.assets.some(asset => !asset.src.startsWith('data:'))) fail('媒体未内嵌');
        return result;
      } catch (error) { throw new Error('本地故事内容损坏或媒体不完整，未覆盖已有数据。请尝试导入完整备份。', { cause: error }); }
    },
  };
}
const defaultStore = createStoryStore();
export const saveStory = defaultStore.saveStory;
export const loadStory = defaultStore.loadStory;
