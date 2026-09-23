const DB_NAME = 'moon-studio-projects';
const STORE_NAME = 'projects';
const MAX_JSON_BYTES = 30 * 1024 * 1024;
const MODES = ['sea', 'paper', 'sound'];
const CONFIG_RULES = {
  poemId: ['wang', 'su', 'li', 'custom'],
  message: 200,
  customPoem: 100,
  moonX: [0.1, 0.9],
  moonY: [0.1, 0.48],
  moonSize: [0.07, 0.24],
  brightness: [0, 1],
  response: ['message', 'next', 'ripple'],
  trigger: ['moon', 'stage', 'flower'],
  spacing: [0, 1],
  intensity: [0, 1],
  textX: [0.03, 0.8],
  textY: [0.06, 0.75],
};
const RECORD_KEYS = ['id', 'title', 'mode', 'config', 'audioBlob', 'audioLabel', 'updatedAt', 'originTitle'];
const FILE_KEYS = ['title', 'mode', 'config', 'audioDataUrl', 'audioLabel', 'originTitle'];
const AUDIO_MIME = /^audio\/[a-z0-9][a-z0-9.+-]*(?:;codecs=[a-z0-9., -]+)?$/i;

function fail(message) {
  throw new Error(message);
}

function objectWithKeys(value, keys, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
      || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) {
    fail(`${label}必须是有效对象。`);
  }
  const unexpected = Object.keys(value).find((key) => !keys.includes(key));
  if (unexpected !== undefined) fail(`${label}包含不支持的字段。`);
}

function textValue(value, limit, label, required = false) {
  if (typeof value !== 'string') fail(`${label}必须是文字。`);
  if (Array.from(value).length > limit) fail(`${label}不能超过 ${limit} 个字。`);
  if (required && !value.trim()) fail(`${label}不能为空。`);
  // Stored content is plain text; never accept markup or hidden control characters.
  if (/[<>\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/u.test(value)) {
    fail(`${label}不能包含 HTML 标记或不可见控制字符。`);
  }
  return value;
}

function identifier(value) {
  if (typeof value !== 'string' || !/^[a-z0-9][a-z0-9_-]{0,127}$/i.test(value)) {
    fail('作品编号无效。');
  }
  return value;
}

function newId() {
  if (typeof globalThis.crypto?.randomUUID !== 'function') {
    fail('当前浏览器无法创建作品编号，请在安全连接或本地预览中打开。');
  }
  return globalThis.crypto.randomUUID();
}

function configValue(value) {
  objectWithKeys(value, Object.keys(CONFIG_RULES), '作品设置');
  const result = {};
  for (const [key, rule] of Object.entries(CONFIG_RULES)) {
    if (!Object.hasOwn(value, key)) fail(`作品设置缺少 ${key}。`);
    const entry = value[key];
    if (typeof rule === 'number') {
      result[key] = textValue(entry, rule, key === 'message' ? '寄语' : '自写诗句');
    } else if (typeof rule[0] === 'string') {
      if (typeof entry !== 'string' || !rule.includes(entry)) fail(`作品设置 ${key} 无效。`);
      result[key] = entry;
    } else {
      if (typeof entry !== 'number' || !Number.isFinite(entry) || entry < rule[0] || entry > rule[1]) {
        fail(`作品设置 ${key} 必须在 ${rule[0]} 至 ${rule[1]} 之间。`);
      }
      result[key] = entry;
    }
  }
  return result;
}

function audioValue(value) {
  if (value === null || value === undefined) return null;
  if (!(value instanceof Blob)) fail('音频必须是本地音频文件。');
  if (!AUDIO_MIME.test(value.type)) fail('音频格式无效，请选择有正确音频格式的文件。');
  return value;
}

function projectValue(project) {
  objectWithKeys(project, RECORD_KEYS, '作品');
  if (typeof project.mode !== 'string' || !MODES.includes(project.mode)) fail('作品风格无效。');
  if (project.updatedAt !== undefined
      && (typeof project.updatedAt !== 'number' || !Number.isFinite(project.updatedAt) || project.updatedAt < 0)) {
    fail('作品更新时间无效。');
  }
  const record = {
    id: project.id === undefined || project.id === null ? newId() : identifier(project.id),
    title: textValue(project.title, 120, '作品名称', true),
    mode: project.mode,
    config: configValue(project.config),
    audioBlob: audioValue(project.audioBlob),
    audioLabel: textValue(project.audioLabel === undefined ? '' : project.audioLabel, 255, '音频名称'),
    updatedAt: project.updatedAt ?? Date.now(),
  };
  if (project.originTitle !== undefined) record.originTitle = textValue(project.originTitle, 120, '原作品名称', true);
  return record;
}

function storageError(error, action) {
  if (error?.name === 'QuotaExceededError') {
    return new Error(`本地存储空间不足，${action}未完成。请先导出作品备份，再清理空间。`, { cause: error });
  }
  if (error?.name === 'SecurityError' || error?.name === 'InvalidStateError') {
    return new Error(`浏览器未允许使用本地作品库，${action}未完成。请检查浏览器存储设置。`, { cause: error });
  }
  return new Error(`本地作品库${action}失败，请重试；当前编辑内容请先导出备份。`, { cause: error });
}

function openDatabase(action) {
  return new Promise((resolve, reject) => {
    let request;
    let rejected = false;
    const rejectOpen = (error) => {
      rejected = true;
      reject(error);
    };
    try {
      const factory = globalThis.indexedDB;
      if (!factory) {
        rejectOpen(new Error('当前浏览器不支持本地作品库，操作未完成。请导出文件备份。'));
        return;
      }
      request = factory.open(DB_NAME, 1);
    } catch (error) {
      rejectOpen(storageError(error, action));
      return;
    }
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onerror = () => rejectOpen(storageError(request.error, action));
    request.onblocked = () => rejectOpen(new Error('本地作品库被另一个页面占用，操作未完成。请关闭其他创作页面后重试。'));
    request.onsuccess = () => {
      const database = request.result;
      if (rejected) {
        database.close();
        return;
      }
      database.onversionchange = () => database.close();
      resolve(database);
    };
  });
}

async function transact(mode, action, operation) {
  const database = await openDatabase(action);
  try {
    return await new Promise((resolve, reject) => {
      let transaction;
      let result;
      let requestError;
      try {
        transaction = database.transaction(STORE_NAME, mode);
        // Resolve only after commit, not after the individual put/delete request.
        transaction.oncomplete = () => resolve(result);
        transaction.onabort = () => reject(storageError(transaction.error ?? requestError, action));
        transaction.onerror = () => { requestError ??= transaction.error; };
        const request = operation(transaction.objectStore(STORE_NAME));
        request.onsuccess = () => { result = request.result; };
        request.onerror = () => { requestError = request.error; };
      } catch (error) {
        if (transaction) {
          try { transaction.abort(); } catch { /* Already closed. */ }
        }
        reject(storageError(error, action));
      }
    });
  } finally {
    database.close();
  }
}

/** Save a new or existing local record. Resolves only once IndexedDB commits. */
export async function saveProject(project) {
  const record = projectValue(project);
  record.updatedAt = Date.now();
  await transact('readwrite', '保存', (store) => store.put(record));
  return record;
}

/** All complete local records, newest first (including any persisted audio Blob). */
export async function listProjects() {
  const records = await transact('readonly', '读取', (store) => store.getAll());
  return records.map(projectValue).sort((a, b) => b.updatedAt - a.updatedAt || a.id.localeCompare(b.id));
}

/** Missing records return null, while storage failures reject. */
export async function getProject(id) {
  identifier(id);
  const record = await transact('readonly', '读取', (store) => store.get(id));
  return record === undefined ? null : projectValue(record);
}

/** Deleting a missing id is harmless; success still waits for the transaction. */
export async function deleteProject(id) {
  identifier(id);
  await transact('readwrite', '删除', (store) => store.delete(id));
}

function checkJsonSize(text) {
  if (text.length > MAX_JSON_BYTES || new TextEncoder().encode(text).byteLength > MAX_JSON_BYTES) {
    fail('作品文件不能超过 30 MB，请缩短音频后再试。');
  }
}

async function audioToDataUrl(blob) {
  // Reject oversized audio before allocating the expanded base64 string.
  if (4 * Math.ceil(blob.size / 3) + blob.type.length + 13 > MAX_JSON_BYTES) {
    fail('音频导出后超过 30 MB，请缩短音频后再试。');
  }
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const chunks = [];
  // A multiple of three keeps concatenated base64 chunks valid.
  for (let offset = 0; offset < bytes.length; offset += 24576) {
    chunks.push(btoa(String.fromCharCode(...bytes.subarray(offset, offset + 24576))));
  }
  return `data:${blob.type};base64,${chunks.join('')}`;
}

function audioFromDataUrl(value) {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') fail('音频数据必须是有效的音频文件内容。');
  const comma = value.indexOf(',');
  if (!value.startsWith('data:') || comma < 0 || comma > 256 || !value.slice(0, comma).endsWith(';base64')) {
    fail('音频数据格式无效；仅支持内嵌的 base64 音频。');
  }
  const mime = value.slice(5, comma - 7);
  if (!AUDIO_MIME.test(mime)) fail('文件包含不支持的音频类型。');
  const encoded = value.slice(comma + 1);
  if (encoded.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(encoded)) fail('音频 base64 数据损坏。');
  let binary;
  try {
    binary = atob(encoded);
  } catch {
    fail('音频 base64 数据损坏。');
  }
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new Blob([bytes], { type: mime });
}

/** A versioned backup, never HTML. Does not write to IndexedDB. */
export async function exportProject(project) {
  const record = projectValue(project);
  const payload = {
    title: record.title,
    mode: record.mode,
    config: record.config,
    audioLabel: record.audioLabel,
  };
  if (record.originTitle !== undefined) payload.originTitle = record.originTitle;
  if (record.audioBlob !== null) payload.audioDataUrl = await audioToDataUrl(record.audioBlob);
  const text = JSON.stringify({ version: 1, project: payload });
  checkJsonSize(text);
  return text;
}

/** Validate an imported backup and assign a new id; caller explicitly saves it. */
export async function importProject(jsonText) {
  if (typeof jsonText !== 'string') fail('请选择 JSON 格式的作品文件。');
  checkJsonSize(jsonText);
  let envelope;
  try {
    envelope = JSON.parse(jsonText);
  } catch {
    fail('作品文件不是有效的 JSON，或文件已损坏。');
  }
  objectWithKeys(envelope, ['version', 'project'], '作品文件');
  if (envelope.version !== 1) fail('暂不支持这个作品文件版本。');
  objectWithKeys(envelope.project, FILE_KEYS, '作品内容');
  const source = envelope.project;
  return projectValue({
    id: newId(),
    title: source.title,
    mode: source.mode,
    config: source.config,
    audioBlob: audioFromDataUrl(source.audioDataUrl),
    audioLabel: source.audioLabel === undefined ? '' : source.audioLabel,
    originTitle: source.originTitle ?? source.title,
    updatedAt: Date.now(),
  });
}
