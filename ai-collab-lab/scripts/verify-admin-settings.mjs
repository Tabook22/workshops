// Verifies application settings (branding / About) and admin credential changes.
// It temporarily changes the admin credentials and restores them, so it only runs against a local
// server unless ALLOW_CREDENTIAL_TEST=1 is set. Requires WORKSHOP_PRESENTER_PASSWORD.
import assert from 'node:assert/strict';
const origin = process.env.WORKSHOP_TEST_ORIGIN || 'http://127.0.0.1:3800/workshops';
const password = process.env.WORKSHOP_PRESENTER_PASSWORD;
const username = process.env.WORKSHOP_PRESENTER_USERNAME || 'nasser';
assert.ok(password, 'Provide the admin password via WORKSHOP_PRESENTER_PASSWORD.');
if (!/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?\//.test(origin + '/') && process.env.ALLOW_CREDENTIAL_TEST !== '1') throw new Error('Refusing to change credentials on a non-local server. Set ALLOW_CREDENTIAL_TEST=1 to override.');

function client() {
  let cookie = '';
  return {
    async post(path, body, status = 200) {
      const r = await fetch(origin + path, {method: 'POST', headers: {'Content-Type': 'application/json', cookie}, body: JSON.stringify(body)});
      const set = r.headers.getSetCookie().find(c => c.startsWith('presenter_session='));
      if (set) cookie = set.split(';')[0];
      const j = await r.json().catch(() => ({}));
      assert.equal(r.status, status, path + ' ' + JSON.stringify(body.action) + ' → ' + JSON.stringify(j));
      return j;
    },
    async get(path) { const r = await fetch(origin + path, {headers: {cookie}}); return r.json(); },
  };
}

// Application settings
const anon = client(), admin = client(), other = client();
const before = (await anon.get('/api/app')).info;
assert.ok(before.name && before.version, 'public settings readable');
await anon.post('/api/app', {action: 'update', info: {name: 'Hijack'}}, 401);
await admin.post('/api/account', {username, password});
await admin.post('/api/app', {action: 'update', info: {version: 'not a version!'}}, 400);
await admin.post('/api/app', {action: 'update', info: {website: 'javascript:alert(1)'}}, 400);
await admin.post('/api/app', {action: 'update', info: {logoText: 'TEST', logoAccent: 'APP', version: '9.9.9', unknownField: 'ignored'}});
let now = (await anon.get('/api/app')).info;
assert.equal(now.logoText, 'TEST'); assert.equal(now.version, '9.9.9'); assert.equal('unknownField' in now, false);
await admin.post('/api/app', {action: 'update', info: before});
assert.equal((await anon.get('/api/app')).info.version, before.version, 'settings restored');

// Credentials
await other.post('/api/account', {username, password});
assert.equal((await other.get('/api/account')).authenticated, true);
await admin.post('/api/account', {action: 'updateCredentials', currentPassword: 'wrong-password', newPassword: 'Another-pass-123'}, 403);
await admin.post('/api/account', {action: 'updateCredentials', currentPassword: password, newPassword: 'short'}, 400);
await admin.post('/api/account', {action: 'updateCredentials', currentPassword: password, username: 'bad name!'}, 400);
await anon.post('/api/account', {action: 'updateCredentials', currentPassword: password, newPassword: 'Another-pass-123'}, 401);
const temp = {username: username + '-tmp', password: 'Temp-Passw0rd-' + Date.now()};
const changed = await admin.post('/api/account', {action: 'updateCredentials', currentPassword: password, username: temp.username, newPassword: temp.password});
assert.equal(changed.username, temp.username);
assert.equal((await admin.get('/api/account')).authenticated, true, 'this browser stays signed in');
assert.equal((await admin.get('/api/account')).username, temp.username);
assert.equal((await other.get('/api/account')).authenticated, false, 'other devices are signed out');
await client().post('/api/account', {username, password}, 401);
await client().post('/api/account', {username: temp.username, password: temp.password});
// Restore the original credentials
await admin.post('/api/account', {action: 'updateCredentials', currentPassword: temp.password, username, newPassword: password});
await client().post('/api/account', {username, password});
console.log('PASS: public app settings, admin-only updates, validation, restore; credential change requires session + current password, rejects weak passwords and bad usernames, signs out other devices, keeps this session, old password stops working, original credentials restored.');
