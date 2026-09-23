import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createLetter, createLetterStore, validateLetter, exportInvitation, importInvitation,
  submitReply, exportReply, mergeReply, remixLetter,
} from '../src/letterStore.js';

const seed = () => ({
  title: '今晚，同看一轮月', fromName: '小林', fromCity: '杭州', toName: '阿宁',
  poemId: 'wang', story: '小时候，我们总在院子里分月饼。', firstLine: '月光落在旧窗前，',
  question: '你还记得那棵桂花树吗？', opening: 'question', style: 'paper',
});
const waiting = (changes = {}) => ({ ...createLetter(seed()), ...changes, status: 'waiting' });
const fields = () => ({ name: '阿宁', city: '成都', line: '也照着今夜的归人。', message: '我记得。等下次见面，我们再一起看月亮。' });
function memory() {
  const values = new Map();
  return { values, getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
}

test('session validation restores exact draft/waiting/complete identity and rejects malformed records', () => {
  const original = waiting();
  const records = [createLetter({ story: '尚未保存的草稿' }), original, submitReply(original, fields())];
  for (const record of records) {
    const restored = validateLetter(JSON.parse(JSON.stringify(record)));
    assert.deepEqual(restored, record);
    assert.equal(restored.id, record.id);
    assert.equal(restored.status, record.status);
    assert.equal(restored.updatedAt, record.updatedAt);
    assert.notEqual(restored, record);
    if (restored.reply) assert.notEqual(restored.reply, record.reply);
  }
  for (const value of [null, [], {}, { ...original, id: '../bad' }, { ...original, story: '' }, { ...original, reply: {} }, { ...original, status: 'complete' }, { ...original, extra: true }]) {
    assert.throws(() => validateLetter(value), Error);
  }
});

test('blank drafts persist; invitation requires complete sender content and waiting status', () => {
  const store = createLetterStore(memory());
  const blank = createLetter({ title: '' });
  assert.equal(store.saveLetter(blank).status, 'draft');
  assert.throws(() => exportInvitation(blank), /等待回应/);
  for (const key of ['title', 'fromName', 'fromCity', 'toName', 'story', 'firstLine', 'question']) {
    assert.throws(() => store.saveLetter(waiting({ [key]: '  ' })), /不能为空/, key);
  }
  assert.doesNotThrow(() => exportInvitation(waiting({ opening: 'direct', question: '' })));
});

test('invitation and reply cross independent local stores and complete the same letter', () => {
  const sender = createLetterStore(memory());
  const recipient = createLetterStore(memory());
  const original = sender.saveLetter(waiting());
  const invitationText = exportInvitation(original);
  const invitation = JSON.parse(invitationText);
  assert.equal(Object.hasOwn(invitation.letter, 'reply'), false);
  assert.equal(invitation.kind, 'moon-letter-invitation');
  const opened = importInvitation(invitationText);
  assert.equal(opened.id, original.id);
  assert.notEqual(opened, original);
  assert.equal(recipient.listLetters().length, 0);
  const answered = recipient.saveLetter(submitReply(opened, fields()));
  assert.equal(opened.reply, null);
  assert.equal(answered.status, 'complete');
  assert.equal(sender.getLetter(original.id).status, 'waiting');
  const replyText = exportReply(answered);
  assert.deepEqual(Object.keys(JSON.parse(replyText)).sort(), ['kind', 'reply', 'version']);
  assert.equal(Object.hasOwn(JSON.parse(replyText), 'letter'), false);
  const completed = sender.saveLetter(mergeReply(sender.getLetter(original.id), replyText));
  assert.equal(completed.status, 'complete');
  assert.deepEqual(completed.reply, answered.reply);
  assert.equal(completed.story, original.story);
  assert.equal(completed.firstLine, original.firstLine);
});

test('wrong letter and replayed replies cannot overwrite a completed exchange', () => {
  const original = waiting();
  const text = exportReply(submitReply(original, fields()));
  assert.throws(() => mergeReply(waiting(), text), /不属于/);
  const completed = mergeReply(original, text);
  assert.throws(() => mergeReply(completed, text), /不能覆盖/);
  assert.throws(() => submitReply(completed, fields()), /不能覆盖/);
  assert.throws(() => exportInvitation(completed), /等待回应/);
  const store = createLetterStore(memory());
  store.saveLetter(completed);
  assert.throws(() => store.saveLetter(original), /不能覆盖/);
  assert.throws(() => store.saveLetter({ ...completed, reply: { ...completed.reply, message: '替换已有回应' } }), /不能覆盖/);
  assert.doesNotThrow(() => store.saveLetter(completed));
  assert.deepEqual(store.getLetter(original.id).reply, completed.reply);
});

test('reply fields are required; the sender question is not an authentication answer', () => {
  for (const key of ['name', 'city', 'line', 'message']) {
    assert.throws(() => submitReply(waiting(), { ...fields(), [key]: ' \n ' }), /不能为空/, key);
    const missing = fields();
    delete missing[key];
    assert.throws(() => submitReply(waiting(), missing), /缺少/);
  }
  assert.equal(submitReply(waiting(), fields()).status, 'complete');
  assert.throws(() => submitReply(waiting(), { ...fields(), answer: 'secret' }), /不支持的字段/);
  assert.throws(() => submitReply(createLetter(seed()), fields()), /等待回应/);
  assert.throws(() => exportReply(waiting()), /先完成回应/);
});

test('remix creates a new draft and clears identities, private story, and reply', () => {
  const original = submitReply(waiting(), fields());
  const remix = remixLetter(original);
  assert.notEqual(remix.id, original.id);
  assert.equal(remix.status, 'draft');
  for (const key of ['fromName', 'fromCity', 'toName', 'story']) assert.equal(remix[key], '');
  assert.equal(remix.reply, null);
  for (const key of ['poemId', 'firstLine', 'question', 'opening', 'style']) assert.equal(remix[key], original[key]);
  assert.equal(remix.originTitle, original.title);
  assert.notEqual(original.reply, null);
});

test('strict schema rejects unknown keys, HTML, prototype pollution, invalid enum and timestamps', () => {
  const store = createLetterStore(memory());
  for (const changes of [
    { poemId: 'custom' }, { style: 'web' }, { opening: 'password' }, { status: 'sent' },
    { story: 12 }, { title: '<img src=x onerror=alert(1)>' }, { question: '隐藏\u0000文字' },
    { createdAt: NaN }, { createdAt: Infinity }, { updatedAt: -1 }, { updatedAt: 1.2 },
    { createdAt: 100, updatedAt: 99 }, { id: '../bad' }, { unknown: true }, { reply: {} },
  ]) assert.throws(() => store.saveLetter({ ...waiting(), ...changes }), Error);
  assert.throws(() => createLetter({ id: 'injected-id' }), /不支持的字段/);
  assert.throws(() => createLetter(Object.create(seed())), /有效对象/);
  const invitation = exportInvitation(waiting());
  const polluted = invitation.replace('"title":', '"__proto__":{"polluted":true},"title":');
  assert.throws(() => importInvitation(polluted), /不支持的字段/);
  assert.equal({}.polluted, undefined);
  assert.throws(() => submitReply(waiting(), { ...fields(), message: '<script>alert(1)</script>' }), /HTML/);
});

test('Unicode text limits accept exact bounds and reject oversized letters and replies', () => {
  const store = createLetterStore(memory());
  const limits = { title: 100, fromName: 40, fromCity: 60, toName: 40, story: 600, firstLine: 80, question: 100 };
  for (const [key, limit] of Object.entries(limits)) {
    assert.doesNotThrow(() => exportInvitation(waiting({ [key]: '🌕'.repeat(limit) })));
    assert.throws(() => store.saveLetter(waiting({ [key]: '🌕'.repeat(limit + 1) })), /不能超过/);
  }
  for (const [key, limit] of Object.entries({ name: 40, city: 60, line: 80, message: 600 })) {
    assert.doesNotThrow(() => submitReply(waiting(), { ...fields(), [key]: '字'.repeat(limit) }));
    assert.throws(() => submitReply(waiting(), { ...fields(), [key]: '字'.repeat(limit + 1) }), /不能超过/);
  }
});

test('rejects malformed, oversized, wrong-kind and unexpected invitation content', () => {
  for (const value of ['', '{', 'null', '[]', '{}', 4, null, ' '.repeat(65537), '字'.repeat(22000)]) {
    assert.throws(() => importInvitation(value), Error);
  }
  const source = JSON.parse(exportInvitation(waiting()));
  for (const value of [
    { ...source, version: 2 }, { ...source, version: '1' }, { ...source, kind: 'cloud-invite' },
    { ...source, extra: 1 }, { ...source, letter: { ...source.letter, reply: null } },
    { ...source, letter: { ...source.letter, status: 'complete' } },
    { ...source, letter: { ...source.letter, story: '' } },
  ]) assert.throws(() => importInvitation(JSON.stringify(value)), Error);
  const original = waiting();
  assert.throws(() => mergeReply(original, exportInvitation(original)), Error);
  assert.throws(() => importInvitation(exportReply(submitReply(original, fields()))), Error);
});

test('invalid reply files cannot bypass schema or mutate the source invitation', () => {
  const original = waiting();
  const source = JSON.parse(exportReply(submitReply(original, fields())));
  for (const value of [
    { ...source, version: 2 }, { ...source, extra: true },
    { ...source, reply: { ...source.reply, message: '' } },
    { ...source, reply: { ...source.reply, createdAt: null } },
    { ...source, reply: { ...source.reply, originTitle: 'injected' } },
  ]) assert.throws(() => mergeReply(original, JSON.stringify(value)), Error);
  assert.equal(original.status, 'waiting');
  assert.equal(original.reply, null);
});

test('local records sort newest first, detach from callers, and missing ids return null', () => {
  const storage = memory();
  const store = createLetterStore(storage);
  const first = store.saveLetter(waiting());
  const second = store.saveLetter(waiting({ updatedAt: Date.now() + 1000 }));
  assert.deepEqual(store.listLetters().map((entry) => entry.id), [second.id, first.id]);
  second.story = '仅修改调用者对象';
  const fetched = store.getLetter(second.id);
  assert.notEqual(fetched.story, second.story);
  fetched.story = '仅读取副本';
  assert.notEqual(store.getLetter(second.id).story, fetched.story);
  assert.equal(store.getLetter('missing-id'), null);
  assert.throws(() => store.getLetter('../bad'), /编号/);
});

test('storage write failures never report success or replace earlier saved content', () => {
  const backing = memory();
  const good = createLetterStore(backing);
  const original = good.saveLetter(waiting());
  const before = JSON.stringify([...backing.values]);
  const failing = createLetterStore({
    getItem: backing.getItem,
    setItem() { throw new DOMException('full', 'QuotaExceededError'); },
  });
  assert.throws(() => failing.saveLetter({ ...original, story: '尚未保存的修改' }), /空间不足.*未完成/);
  assert.equal(JSON.stringify([...backing.values]), before);
  assert.equal(good.getLetter(original.id).story, original.story);
  const denied = createLetterStore({ getItem() { throw new DOMException('denied', 'SecurityError'); }, setItem() {} });
  assert.throws(() => denied.listLetters(), /未允许本地存储/);
  assert.throws(() => createLetterStore(null).listLetters(), /无法使用本地来信库/);
});

test('corrupt and duplicate persisted records are never silently cleared on save', () => {
  const item = waiting();
  for (const raw of ['{', JSON.stringify({ version: 2, letters: [] }), JSON.stringify({ version: 1, letters: [item, item] })]) {
    let writes = 0;
    const store = createLetterStore({ getItem: () => raw, setItem() { writes += 1; } });
    assert.throws(() => store.listLetters(), /损坏或版本不受支持/);
    assert.throws(() => store.saveLetter(waiting()), /未覆盖已有数据/);
    assert.equal(writes, 0);
  }
});
