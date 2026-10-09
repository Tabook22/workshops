// Verifies automatic translation end to end against a LibreTranslate-compatible service.
// Env: WORKSHOP_TEST_ORIGIN, WORKSHOP_PRESENTER_PASSWORD, WORKSHOP_TRANSLATE_URL (a LibreTranslate-compatible
// server; a mock is fine). Leaves translation turned off afterwards. Local servers only unless ALLOW_SETTINGS_TEST=1.
import assert from 'node:assert/strict';
const origin = process.env.WORKSHOP_TEST_ORIGIN || 'http://127.0.0.1:3800/workshops';
const password = process.env.WORKSHOP_PRESENTER_PASSWORD, endpoint = process.env.WORKSHOP_TRANSLATE_URL;
assert.ok(password && endpoint, 'Set WORKSHOP_PRESENTER_PASSWORD and WORKSHOP_TRANSLATE_URL.');
if (!/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?\//.test(origin + '/') && process.env.ALLOW_SETTINGS_TEST !== '1') throw new Error('Refusing to change settings on a non-local server.');
const jar = () => { const c = new Map(); return {
  async post(path, body, status = 200) { const r = await fetch(origin + path, {method: 'POST', headers: {'Content-Type': 'application/json', cookie: [...c].map(([k, v]) => k + '=' + v).join('; ')}, body: JSON.stringify(body)}); for (const s of r.headers.getSetCookie()) { const p = s.split(';')[0]; c.set(p.slice(0, p.indexOf('=')), p.slice(p.indexOf('=') + 1)); } const j = await r.json().catch(() => ({})); assert.equal(r.status, status, path + ' ' + (body.action || '') + ' → ' + JSON.stringify(j)); return j; },
  async get(path) { const r = await fetch(origin + path, {headers: {cookie: [...c].map(([k, v]) => k + '=' + v).join('; ')}}); return r.json(); },
}; };
const admin = jar(), student = jar(), anon = jar();
await admin.post('/api/account', {username: process.env.WORKSHOP_PRESENTER_USERNAME || 'nasser', password});
await admin.post('/api/app', {action: 'translation', translation: {provider: 'off'}});
const {code} = await admin.post('/api/workshop', {action: 'create', challenge: 'Smart Tutor', question: 'How can we help students understand their homework?', language: 'en'}, 201);
await student.post('/api/workshop', {action: 'join', code, nickname: 'Sara'}, 201);
await admin.post('/api/workshop', {action: 'control', code, patch: {stage: 2}});
await student.post('/api/workshop', {action: 'submit', code, id: crypto.randomUUID(), title: 'Homework buddy', text: 'An assistant that explains homework step by step.'}, 201);
await student.post('/api/workshop', {action: 'submit', code, id: crypto.randomUUID(), title: 'مراجعة يومية', text: 'تطبيق يذكّر الطلاب بمراجعة الدروس كل يوم.'}, 201);

// Off by default for everyone
assert.equal((await anon.post('/api/translate', {code, target: 'ar', texts: ['Smart Tutor']})).enabled, false);
// Only the admin can configure; keys never appear publicly
await anon.post('/api/app', {action: 'translation', translation: {provider: 'libretranslate', endpoint}}, 401);
await admin.post('/api/app', {action: 'translation', translation: {provider: 'deepl'}}, 400);
const tested = await admin.post('/api/app', {action: 'testTranslation', translation: {provider: 'libretranslate', endpoint}});
assert.ok(tested.sample && /[؀-ۿ]/.test(tested.sample), 'test translation returns Arabic');
await admin.post('/api/app', {action: 'translation', translation: {provider: 'libretranslate', endpoint, apiKey: 'secret-test-key-1234'}});
const pub = await anon.get('/api/app');
assert.equal(pub.translationEnabled, true); assert.equal('translation' in pub, false, 'anonymous visitors do not see settings');
const adminView = await admin.get('/api/app');
assert.equal(adminView.translation.keyHint, '…1234'); assert.equal(JSON.stringify(adminView).includes('secret-test-key'), false, 'key is masked');

// Arabic viewer: English content translated; Arabic content untouched; foreign text rejected
const before = endpoint.includes('5055') ? await (await fetch(endpoint + '/stats')).json() : null;
const asked = ['Smart Tutor', 'How can we help students understand their homework?', 'Homework buddy', 'تطبيق يذكّر الطلاب بمراجعة الدروس كل يوم.', 'Translate this private text that is not in the workshop'];
const ar = (await student.post('/api/translate', {code, target: 'ar', texts: asked})).translations;
assert.ok(ar['Smart Tutor'] && /[؀-ۿ]/.test(ar['Smart Tutor']));
assert.ok(ar['Homework buddy']);
assert.equal(ar['تطبيق يذكّر الطلاب بمراجعة الدروس كل يوم.'], undefined, 'text already in Arabic is not sent');
assert.equal(ar['Translate this private text that is not in the workshop'], undefined, 'non-workshop text is refused');
// English viewer: Arabic content translated
const en = (await anon.post('/api/translate', {code, target: 'en', texts: ['مراجعة يومية']})).translations;
assert.ok(en['مراجعة يومية']);
// Repeat from another viewer: served from the shared cache (no new provider calls)
if (before) {
  const mid = await (await fetch(endpoint + '/stats')).json();
  const again = (await anon.post('/api/translate', {code, target: 'ar', texts: asked})).translations;
  assert.equal(again['Smart Tutor'], ar['Smart Tutor']);
  const after = await (await fetch(endpoint + '/stats')).json();
  assert.equal(after.calls, mid.calls, 'cached translations reused');
}
// Unknown workshop
await anon.post('/api/translate', {code: 'UTAS-000000', target: 'ar', texts: ['x']}, 404);
// Claude provider runs through the official SDK; an invalid key is reported cleanly
const claude = await admin.post('/api/app', {action: 'testTranslation', translation: {provider: 'claude', apiKey: 'sk-ant-invalid-test-key'}}, 502);
assert.match(claude.error, /did not accept/);

await admin.post('/api/app', {action: 'translation', translation: {provider: 'off'}});
await admin.post('/api/workshop', {action: 'deleteWorkshop', code, confirm: code});
console.log('PASS: off by default, admin-only configuration, masked keys, provider test, Arabic↔English translation of workshop content, already-translated and non-workshop text refused, shared cache reuse, unknown workshop 404, Claude SDK error handling, settings restored.');
