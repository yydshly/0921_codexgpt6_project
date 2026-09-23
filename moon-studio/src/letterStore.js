const STORAGE_KEY = 'moon-studio-letters-v1';
const MAX_FILE_BYTES = 64 * 1024;
const MAX_STORAGE_BYTES = 4 * 1024 * 1024;
const EDITABLE_KEYS = ['title', 'fromName', 'fromCity', 'toName', 'poemId', 'story', 'firstLine', 'question', 'opening', 'style', 'originTitle'];
const LETTER_KEYS = ['id', 'createdAt', 'updatedAt', ...EDITABLE_KEYS, 'status', 'reply'];
const REPLY_FIELDS = ['name', 'city', 'line', 'message'];
const REPLY_KEYS = ['id', 'letterId', ...REPLY_FIELDS, 'createdAt'];
const LIMITS = { title: 100, fromName: 40, fromCity: 60, toName: 40, story: 600, firstLine: 80, question: 100 };

function fail(message) { throw new Error(message); }

function object(value, allowed, label, required = allowed) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
      || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) fail(`${label}必须是有效对象。`);
  if (Reflect.ownKeys(value).some((key) => typeof key !== 'string' || !allowed.includes(key))) fail(`${label}包含不支持的字段。`);
  for (const key of required) {
    if (!Object.hasOwn(value, key)) fail(`${label}缺少 ${key}。`);
  }
}

function text(value, max, label, required = false) {
  if (typeof value !== 'string') fail(`${label}必须是文字。`);
  if (Array.from(value).length > max) fail(`${label}不能超过 ${max} 个字。`);
  if (/[<>\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/u.test(value)) fail(`${label}不能包含 HTML 标记或不可见控制字符。`);
  if (required && !value.trim()) fail(`${label}不能为空。`);
  return value;
}

function id(value, label = '来信编号') {
  if (typeof value !== 'string' || !/^[a-z0-9][a-z0-9_-]{0,127}$/i.test(value)) fail(`${label}无效。`);
  return value;
}

function newId() {
  if (typeof globalThis.crypto?.randomUUID !== 'function') fail('当前浏览器无法创建来信编号，请使用安全连接或本地预览。');
  return globalThis.crypto.randomUUID();
}

function timestamp(value, label) {
  if (!Number.isSafeInteger(value) || value < 0) fail(`${label}无效。`);
  return value;
}

function choice(value, values, label) {
  if (!values.includes(value)) fail(`${label}无效。`);
  return value;
}

function replyValue(value) {
  object(value, REPLY_KEYS, '回信');
  return {
    id: id(value.id, '回信编号'), letterId: id(value.letterId),
    name: text(value.name, 40, '回应者名字', true), city: text(value.city, 60, '回应者城市', true),
    line: text(value.line, 80, '回应诗句', true), message: text(value.message, 600, '回应内容', true),
    createdAt: timestamp(value.createdAt, '回信时间'),
  };
}

function letterValue(value) {
  object(value, LETTER_KEYS, '来信', LETTER_KEYS.filter((key) => key !== 'originTitle'));
  const status = choice(value.status, ['draft', 'waiting', 'complete'], '来信状态');
  const ready = status !== 'draft';
  const result = {
    id: id(value.id), createdAt: timestamp(value.createdAt, '创建时间'), updatedAt: timestamp(value.updatedAt, '更新时间'),
  };
  if (result.updatedAt < result.createdAt) fail('更新时间不能早于创建时间。');
  for (const [key, limit] of Object.entries(LIMITS)) {
    const labels = { title: '来信题目', fromName: '发信人名字', fromCity: '发信人城市', toName: '收信人名字', story: '来信故事', firstLine: '第一句诗', question: '开信问题' };
    const required = ready && (key !== 'question' || value.opening === 'question');
    result[key] = text(value[key], limit, labels[key], required);
  }
  result.poemId = choice(value.poemId, ['wang', 'su', 'li'], '诗词');
  result.opening = choice(value.opening, ['poem', 'question', 'direct'], '开信方式');
  result.style = choice(value.style, ['sea', 'paper', 'sound'], '画面风格');
  result.status = status;
  result.reply = value.reply === null ? null : replyValue(value.reply);
  if (status === 'complete' && result.reply === null) fail('共同完成的来信必须包含回信。');
  if (status !== 'complete' && result.reply !== null) fail('收到回信后，来信状态必须为共同完成。');
  if (result.reply && result.reply.letterId !== result.id) fail('回信不属于这封来信。');
  if (value.originTitle !== undefined) result.originTitle = text(value.originTitle, 100, '原来信题目', true);
  return result;
}

/** Validate and detach a session record without changing identity, state, or storage. */
export function validateLetter(value) {
  return letterValue(value);
}

function parseFile(value, kind) {
  if (typeof value !== 'string') fail('请选择 JSON 格式的来信文件。');
  if (value.length > MAX_FILE_BYTES || new TextEncoder().encode(value).byteLength > MAX_FILE_BYTES) fail('来信文件不能超过 64 KB。');
  let envelope;
  try { envelope = JSON.parse(value); } catch { fail('来信文件不是有效的 JSON，或文件已损坏。'); }
  const field = kind === 'moon-letter-invitation' ? 'letter' : 'reply';
  object(envelope, ['kind', 'version', field], '来信文件');
  if (envelope.kind !== kind) fail(kind === 'moon-letter-invitation' ? '请选择邀请文件。' : '请选择回信文件。');
  if (envelope.version !== 1) fail('暂不支持这个来信文件版本。');
  return envelope[field];
}

/** Create a new blank/editable draft. No persistence or network request occurs. */
export function createLetter(seed = {}) {
  object(seed, EDITABLE_KEYS, '来信草稿', []);
  const now = Date.now();
  return letterValue({
    id: newId(), createdAt: now, updatedAt: now, title: '月光来信',
    fromName: '', fromCity: '', toName: '', poemId: 'wang', story: '', firstLine: '', question: '',
    opening: 'poem', style: 'sea', ...seed, status: 'draft', reply: null,
  });
}

/** A local invitation contains only the sender's content, never a previous reply. */
export function exportInvitation(letter) {
  const current = letterValue(letter);
  if (current.status !== 'waiting') fail('请先将完整来信保存为等待回应，再导出邀请。');
  const { reply: _reply, ...invitation } = current;
  return JSON.stringify({ kind: 'moon-letter-invitation', version: 1, letter: invitation });
}

/** Preserve the invitation id to pair the reply; caller controls local persistence. */
export function importInvitation(jsonText) {
  const source = parseFile(jsonText, 'moon-letter-invitation');
  object(source, LETTER_KEYS.filter((key) => key !== 'reply'), '邀请内容', LETTER_KEYS.filter((key) => !['reply', 'originTitle'].includes(key)));
  if (source.status !== 'waiting') fail('邀请文件必须是一封等待回应的来信。');
  return letterValue({ ...source, reply: null });
}

/** Question text is a reading ritual; no answer is checked or stored as a credential. */
export function submitReply(letter, fields) {
  const current = letterValue(letter);
  if (current.status !== 'waiting' || current.reply) fail('只有等待回应的来信可以收取回信，已有回应不能覆盖。');
  object(fields, REPLY_FIELDS, '回应内容');
  const now = Date.now();
  return letterValue({
    ...current, status: 'complete', updatedAt: Math.max(now, current.updatedAt),
    reply: { id: newId(), letterId: current.id, ...fields, createdAt: now },
  });
}

export function exportReply(letter) {
  const current = letterValue(letter);
  if (current.status !== 'complete' || !current.reply) fail('请先完成回应，再导出回信文件。');
  return JSON.stringify({ kind: 'moon-letter-reply', version: 1, reply: current.reply });
}

export function mergeReply(original, jsonText) {
  const current = letterValue(original);
  if (current.status !== 'waiting' || current.reply) fail('只有等待回应的来信可以接收回信，已有回应不能覆盖。');
  const reply = replyValue(parseFile(jsonText, 'moon-letter-reply'));
  if (reply.letterId !== current.id) fail('这份回信不属于当前来信，请选择对应的回信文件。');
  return letterValue({ ...current, status: 'complete', reply, updatedAt: Math.max(Date.now(), current.updatedAt) });
}

/** Keep the creative prompt; remove sender/recipient identity and personal story. */
export function remixLetter(letter) {
  const current = letterValue(letter);
  return createLetter({
    title: '月光来信 · 改编', poemId: current.poemId, firstLine: current.firstLine,
    question: current.question, opening: current.opening, style: current.style,
    originTitle: current.title.trim() ? current.title : '月光来信',
  });
}

function storageError(error, action) {
  if (error?.name === 'QuotaExceededError') return new Error(`本地空间不足，${action}未完成。请先导出文件备份。`, { cause: error });
  if (error?.name === 'SecurityError') return new Error(`浏览器未允许本地存储，${action}未完成。请检查浏览器设置。`, { cause: error });
  return new Error(`本地来信${action}失败，操作未完成。请先保留当前内容并重试。`, { cause: error });
}

/** Injectable localStorage adapter; there is no server, account, or automatic delivery. */
export function createLetterStore(storage) {
  function resolveStorage(action) {
    let target;
    try { target = storage === undefined ? globalThis.localStorage : storage; } catch (error) { throw storageError(error, action); }
    if (!target || typeof target.getItem !== 'function' || typeof target.setItem !== 'function') fail('当前浏览器无法使用本地来信库，操作未完成。请导出文件保留内容。');
    return target;
  }

  function read(target) {
    let raw;
    try { raw = target.getItem(STORAGE_KEY); } catch (error) { throw storageError(error, '读取'); }
    if (raw === null) return [];
    try {
      if (typeof raw !== 'string' || raw.length > MAX_STORAGE_BYTES || new TextEncoder().encode(raw).byteLength > MAX_STORAGE_BYTES) throw new Error('size');
      const parsed = JSON.parse(raw);
      object(parsed, ['version', 'letters'], '本地来信库');
      if (parsed.version !== 1 || !Array.isArray(parsed.letters)) throw new Error('schema');
      const letters = parsed.letters.map(letterValue);
      if (new Set(letters.map((letter) => letter.id)).size !== letters.length) throw new Error('duplicate');
      return letters;
    } catch (error) {
      throw new Error('本地来信库内容损坏或版本不受支持，未覆盖已有数据。请保留浏览器数据并尝试导出备份。', { cause: error });
    }
  }

  function listLetters() {
    return read(resolveStorage('读取')).sort((a, b) => b.updatedAt - a.updatedAt || a.id.localeCompare(b.id));
  }

  function getLetter(letterId) {
    id(letterId);
    return read(resolveStorage('读取')).find((letter) => letter.id === letterId) ?? null;
  }

  function saveLetter(letter) {
    const current = letterValue(letter);
    const target = resolveStorage('保存');
    const letters = read(target);
    const index = letters.findIndex((entry) => entry.id === current.id);
    const previous = letters[index];
    if (previous?.reply && (current.status !== 'complete' || JSON.stringify(previous.reply) !== JSON.stringify(current.reply))) fail('这封来信已有回应，不能覆盖或清除；请改编为新的来信。');
    current.updatedAt = Math.max(Date.now(), current.createdAt, current.updatedAt);
    if (index < 0) letters.push(current); else letters[index] = current;
    const serialized = JSON.stringify({ version: 1, letters });
    if (new TextEncoder().encode(serialized).byteLength > MAX_STORAGE_BYTES) fail('本地来信库已达容量上限，保存未完成。请先导出文件备份。');
    try { target.setItem(STORAGE_KEY, serialized); } catch (error) { throw storageError(error, '保存'); }
    return current;
  }

  return { saveLetter, listLetters, getLetter };
}

const defaultStore = createLetterStore();
export const saveLetter = defaultStore.saveLetter;
export const listLetters = defaultStore.listLetters;
export const getLetter = defaultStore.getLetter;
