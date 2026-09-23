const STORAGE_KEY = 'moon-picture-v1';
const MAX_IMAGE_URL_CHARS = 2 * 1024 * 1024;
// Even a fully JSON-escaped valid image/text fits this input parsing bound.
const MAX_JSON_CHARS = MAX_IMAGE_URL_CHARS * 6 + 128 * 1024;
const PROJECT_KEYS = ['version', 'title', 'imageName', 'imageUrl', 'music', 'audioName', 'points'];
const POINT_KEYS = ['id', 'label', 'x', 'y', 'action', 'text'];
const ASSETS = ['/assets/moon-sea.png', '/assets/paper-scene.png', '/assets/sound-pool.png'];
const ACTIONS = ['poem', 'message', 'sound', 'ripple'];
const BUILT_IN_ACTIONS = { moon: 'message', water: 'poem', boat: 'message' };
const CUSTOM_ID = /^custom-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function fail(message) { throw new Error(message); }

function object(value, keys, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
      || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) fail(`${label}必须是有效对象。`);
  if (Reflect.ownKeys(value).some(key => typeof key !== 'string' || !keys.includes(key))) fail(`${label}包含不支持的字段。`);
  for (const key of keys) if (!Object.hasOwn(value, key)) fail(`${label}缺少 ${key}。`);
}

function text(value, max, label) {
  if (typeof value !== 'string') fail(`${label}必须是文字。`);
  if (Array.from(value).length > max) fail(`${label}不能超过 ${max} 个字。`);
  if (/[<>\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/u.test(value)) fail(`${label}不能包含 HTML 标记或不可见控制字符。`);
  return value;
}

function coordinate(value, label) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1) fail(`${label}必须是 0 至 1 之间的数字。`);
  return value;
}

function imageUrl(value) {
  if (typeof value !== 'string') fail('图片地址必须是文字。');
  if (value.length > MAX_IMAGE_URL_CHARS) fail('图片内容不能超过 2 MB 字符，请压缩图片后再试。');
  if (ASSETS.includes(value)) return value;
  const match = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
  if (!match || match[2].length % 4 !== 0) fail('仅支持内置图片，或内嵌的 PNG、JPEG、WebP 图片。');
  return value;
}

function pointValue(value) {
  object(value, POINT_KEYS, '互动点');
  if (typeof value.id !== 'string' || (!['moon', 'water', 'boat'].includes(value.id) && !CUSTOM_ID.test(value.id))) fail('互动点编号无效。');
  if (!ACTIONS.includes(value.action)) fail('互动点动作无效。');
  return {
    id: value.id, label: text(value.label, 30, '互动点名称'),
    x: coordinate(value.x, '横向位置'), y: coordinate(value.y, '纵向位置'),
    action: value.action, text: text(value.text, 500, '互动文字'),
  };
}

/** Validate all fields and return a detached, plain-data snapshot. */
export function validateProject(value) {
  object(value, PROJECT_KEYS, '互动图片');
  if (value.version !== 1) fail('暂不支持这个互动图片版本。');
  if (typeof value.music !== 'boolean') fail('配乐开关必须是开启或关闭。');
  if (!Array.isArray(value.points) || value.points.length < 3 || value.points.length > 15) fail('互动点数量必须在 3 至 15 个之间。');
  const points = [];
  for (let index = 0; index < value.points.length; index += 1) {
    if (!Object.hasOwn(value.points, index)) fail('互动点列表不能包含空项。');
    points.push(pointValue(value.points[index]));
  }
  if (new Set(points.map(point => point.id)).size !== points.length) fail('互动点编号不能重复。');
  for (const [id, action] of Object.entries(BUILT_IN_ACTIONS)) {
    const point = points.find(entry => entry.id === id);
    if (!point) fail('互动图片必须保留月亮、水面和纸船三个内置互动点。');
    if (point.action !== action) fail('月亮、水面和纸船的内置动作不能更改；可以添加自定义互动点。');
  }
  return {
    version: 1, title: text(value.title, 60, '图片标题'),
    imageName: text(value.imageName, 100, '图片名称'), imageUrl: imageUrl(value.imageUrl),
    music: value.music, audioName: text(value.audioName, 100, '音频名称'), points,
  };
}

export function defaultProject() {
  return {
    version: 1, title: '把月光，送到你身旁', imageName: '月夜海面', imageUrl: '/assets/moon-sea.png',
    music: true, audioName: '',
    points: [
      { id: 'moon', label: '月亮', x: 0.76, y: 0.2, action: 'message', text: '月亮在哪，倒影就跟到哪里。' },
      { id: 'water', label: '水面', x: 0.5, y: 0.69, action: 'poem', text: '海上生明月，天涯共此时。' },
      { id: 'boat', label: '纸船', x: 0.18, y: 0.83, action: 'message', text: '今晚，让月光替我到你身旁。' },
    ],
  };
}

export function exportProjectJSON(project) {
  return JSON.stringify(validateProject(project));
}

export function importProjectJSON(jsonText) {
  if (typeof jsonText !== 'string') fail('请选择 JSON 格式的互动图片文件。');
  if (jsonText.length > MAX_JSON_CHARS) fail('互动图片文件过大，请压缩图片后再试。');
  let value;
  try { value = JSON.parse(jsonText); } catch { fail('互动图片文件不是有效的 JSON，或文件已损坏。'); }
  return validateProject(value);
}

function storageError(error, action) {
  if (error?.name === 'QuotaExceededError') return new Error(`本地存储空间不足，${action}未完成。请压缩图片或导出文件备份。`, { cause: error });
  if (error?.name === 'SecurityError') return new Error(`浏览器未允许本地存储，${action}未完成。请导出文件保留内容。`, { cause: error });
  return new Error(`互动图片${action}失败，操作未完成。请保留当前内容并重试。`, { cause: error });
}

/** Inject localStorage for tests; omitted storage is resolved only when used. */
export function createPictureStore(storage) {
  function target(action) {
    let resolved;
    try { resolved = storage === undefined ? globalThis.localStorage : storage; } catch (error) { throw storageError(error, action); }
    if (!resolved || typeof resolved.getItem !== 'function' || typeof resolved.setItem !== 'function') fail('当前浏览器无法使用本地存储，操作未完成。请导出文件保留内容。');
    return resolved;
  }

  function read(current) {
    let raw;
    try { raw = current.getItem(STORAGE_KEY); } catch (error) { throw storageError(error, '读取'); }
    if (raw === null) return null;
    try { return importProjectJSON(raw); } catch (error) {
      throw new Error('本地互动图片已损坏或版本不受支持，未覆盖原有数据。请保留数据并尝试导入备份。', { cause: error });
    }
  }

  function loadProject() {
    // audioName is only a label: audio bytes are never persisted or restored.
    return read(target('读取')) ?? defaultProject();
  }

  function saveProject(project) {
    const snapshot = validateProject(project);
    const current = target('保存');
    // Refuse to silently overwrite malformed persisted data.
    read(current);
    try { current.setItem(STORAGE_KEY, JSON.stringify(snapshot)); } catch (error) { throw storageError(error, '保存'); }
    return snapshot;
  }

  return { loadProject, saveProject };
}

const defaultStore = createPictureStore();
export const loadProject = defaultStore.loadProject;
export const saveProject = defaultStore.saveProject;

/** Interpolate a normalized hand-drawn path by distance, not by vertex count. */
export function pointOnRoute(points, progress) {
  if (!Array.isArray(points)) fail('航行路径必须是坐标列表。');
  if (typeof progress !== 'number' || !Number.isFinite(progress)) fail('航行进度必须是有限数字。');
  const route = [];
  for (let index = 0; index < points.length; index += 1) {
    if (!Object.hasOwn(points, index)) fail('航行路径不能包含空项。');
    const point = points[index];
    object(point, ['x', 'y'], '路径坐标');
    route.push({ x: coordinate(point.x, '路径横向位置'), y: coordinate(point.y, '路径纵向位置') });
  }
  if (!route.length) return null;
  if (route.length === 1) return route[0];
  const fraction = Math.max(0, Math.min(1, progress));
  if (fraction === 0) return route[0];
  if (fraction === 1) return route.at(-1);
  const lengths = route.slice(1).map((point, index) => Math.hypot(point.x - route[index].x, point.y - route[index].y));
  const total = lengths.reduce((sum, length) => sum + length, 0);
  if (!total) return route[0];
  let distance = fraction * total;
  for (let index = 0; index < lengths.length; index += 1) {
    const length = lengths[index];
    if (!length) continue;
    if (distance <= length) {
      const t = distance / length;
      return {
        x: route[index].x + (route[index + 1].x - route[index].x) * t,
        y: route[index].y + (route[index + 1].y - route[index].y) * t,
      };
    }
    distance -= length;
  }
  return route.at(-1);
}
