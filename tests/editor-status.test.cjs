const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const html = fs.readFileSync(__dirname + '/../editor.html', 'utf8');
const code = html.match(/function createPublisher[\s\S]*?(?=\nconst list = )/)[0];
const programme = JSON.parse(fs.readFileSync(__dirname + '/../calendar-data.js', 'utf8').replace(/^window.PROVINCE_SCHEDULE\s*=\s*/, '').replace(/;\s*$/, ''));
const flush = () => new Promise(resolve => setImmediate(resolve));
function setup(options = {}) {
  const values = new Map(Object.entries(options.session || {}));
  const sessionStorage = { getItem: key => values.get(key) || null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
  const ui = Object.fromEntries(['publish','signin','repository','deployment','check','resultLink','repositoryLink','signout'].map(key => [key, { dataset: {}, textContent: '', disabled: false, hidden: true }]));
  let dateNow = Date.parse('2026-09-13T16:00:00Z'), timerId = 0;
  class Clock extends Date { constructor(...args) { super(...(args.length ? args : [dateNow])); } static now() { return dateNow; } }
  const timers = new Map(), requests = [], drafts = [], navigations = [];
  let liveProgramme = options.live || [['January 2020','Old Court','Old City','2020-01-01','Meeting']];
  const location = { hash: options.hash || '', pathname: '/ATHELSTAN-PROV-CALENDAR/editor.html', search: '', assign: url => navigations.push(url) };
  const json = (value, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => value, text: async () => JSON.stringify(value) });
  const fetch = async (url, settings) => {
    requests.push({ url, method: settings.method || 'GET', body: settings.body });
    if (url.endsWith('/user')) return json({ login: 'test-editor' }, options.authStatus || 200);
    if (url.endsWith('/api/publish')) {
      if (options.publishDeferred) return options.publishDeferred;
      if (options.publishOffline) throw new TypeError('Offline');
      return json({ ok: options.ok !== false }, options.publishStatus || 200);
    }
    if (options.liveOffline) throw new TypeError('Offline');
    return { ok: true, status: 200, text: async () => 'window.PROVINCE_SCHEDULE=' + JSON.stringify(liveProgramme) + ';' };
  };
  const sandbox = vm.createContext({ fetch, AbortController, sessionStorage, URLSearchParams, Date: Clock, location,
    history: { replaceState: (_a, _b, url) => { location.hash = ''; navigations.push(url); } },
    setTimeout: (fn, delay) => { const id = ++timerId; timers.set(id, { fn, delay }); return id; }, clearTimeout: id => timers.delete(id) });
  vm.runInContext(code, sandbox);
  const controller = sandbox.createPublisher({ ui, getSchedule: () => JSON.parse(JSON.stringify(options.draft || programme)), saveDraft: data => { drafts.push(data); return options.storageOK !== false; } });
  return { controller, ui, values, requests, drafts, navigations, location, timers,
    setLive: value => { liveProgramme = value; },
    tick: async (elapsed = 10000) => { dateNow += elapsed; const entry = [...timers].find(([, timer]) => timer.delay === 10000); if (entry) { timers.delete(entry[0]); await entry[1].fn(); } await flush(); } };
}
test('OAuth return confirms identity and removes the token from the address', async () => {
  const s = setup({ hash: '#github_token=unit-test-token' });
  await s.controller.init();
  assert.equal(s.location.hash, '');
  assert.equal(s.ui.signin.dataset.state, 'success');
  assert.match(s.ui.signin.textContent, /Sign-in successful — test-editor/);
  assert.equal(s.ui.publish.textContent, 'Publish changes to GitHub');
  assert.equal(s.values.get('provinceGithubToken'), 'unit-test-token');
  s.ui.signout.onclick();
  assert.equal(s.values.has('provinceGithubToken'), false);
  assert.equal(s.ui.signout.hidden, true);
  assert.equal(s.ui.publish.textContent, 'Sign in & Publish to GitHub');
});
test('expired sign-in is visibly rejected and cleared', async () => {
  const s = setup({ session: { provinceGithubToken: 'revoked-test-token' }, authStatus: 401 });
  await s.controller.init();
  assert.equal(s.ui.signin.dataset.state, 'error');
  assert.equal(s.values.has('provinceGithubToken'), false);
  assert.equal(s.ui.publish.disabled, false);
});
test('a draft is saved before leaving to sign in', async () => {
  const s = setup(); await s.controller.init(); await s.ui.publish.onclick();
  assert.deepEqual(s.drafts[0], programme);
  assert.match(s.navigations[0], /\/auth\/github$/);
  assert.equal(s.ui.signin.dataset.state, 'busy');
  const denied = setup({ storageOK: false }); await denied.controller.init(); await denied.ui.publish.onclick();
  assert.equal(denied.navigations.length, 0);
});
test('repository save and deployment are distinct; only matching live data succeeds', async () => {
  const s = setup({ session: { provinceGithubToken: 'unit-test-token' } });
  await s.controller.init(); await s.ui.publish.onclick(); await flush();
  assert.equal(s.ui.repository.dataset.state, 'success');
  assert.equal(s.ui.deployment.dataset.state, 'busy');
  assert.deepEqual(JSON.parse(s.requests.find(r => r.method === 'POST').body).schedule, programme);
  assert.equal(s.navigations.length, 0, 'must keep the editor open');
  s.setLive(programme); await s.tick();
  assert.equal(s.ui.deployment.dataset.state, 'success');
  assert.match(s.ui.deployment.textContent, /verified/);
  assert.match(s.ui.resultLink.href, /index.html\?published=/);
  assert.equal(s.ui.check.hidden, true);
});
test('permission errors and offline saves never show deployment success', async () => {
  for (const outcome of [{ publishStatus: 403 }, { publishOffline: true }, { ok: false }]) {
    const s = setup({ session: { provinceGithubToken: 'unit-test-token' }, ...outcome });
    await s.controller.init(); await s.ui.publish.onclick(); await flush();
    assert.equal(s.ui.repository.dataset.state, 'error');
    assert.equal(s.ui.deployment.dataset.state, 'idle');
    assert.equal(s.ui.publish.disabled, false);
    assert.equal(s.values.has('provinceLastPublication'), false);
  }
});
test('repeated clicks do not send duplicate saves', async () => {
  let resolve; const response = new Promise(r => { resolve = r; });
  const s = setup({ session: { provinceGithubToken: 'unit-test-token' }, publishDeferred: response });
  await s.controller.init(); const first = s.ui.publish.onclick(); await flush();
  assert.equal(s.ui.publish.disabled, true);
  await s.ui.publish.onclick();
  assert.equal(s.requests.filter(r => r.method === 'POST').length, 1);
  resolve({ ok: true, json: async () => ({ ok: true }) }); await first; await flush();
});
test('slow deployment stays pending and can be checked again without publishing', async () => {
  const s = setup({ session: { provinceGithubToken: 'unit-test-token' } });
  await s.controller.init(); await s.ui.publish.onclick(); await flush(); await s.tick(601000);
  assert.equal(s.ui.deployment.dataset.state, 'pending');
  assert.equal(s.ui.check.hidden, false);
  s.setLive(programme); await s.ui.check.onclick(); await flush();
  assert.equal(s.ui.deployment.dataset.state, 'success');
  assert.equal(s.requests.filter(r => r.method === 'POST').length, 1);
});
test('refresh resumes the saved snapshot independently of a newer draft', async () => {
  const previous = { schedule: programme, savedAt: '2026-09-13T15:58:00Z', liveVerifiedAt: null };
  const s = setup({ session: { provinceLastPublication: JSON.stringify(previous) }, live: programme, draft: [] });
  await s.controller.init(); await flush();
  assert.equal(s.ui.repository.dataset.state, 'success');
  assert.equal(s.ui.deployment.dataset.state, 'success');
  assert.equal(s.requests.filter(r => r.method === 'POST').length, 0);
});
test('a failed public fetch does not undo the confirmed repository save', async () => {
  const s = setup({ session: { provinceGithubToken: 'unit-test-token' }, liveOffline: true });
  await s.controller.init(); await s.ui.publish.onclick(); await flush();
  assert.equal(s.ui.repository.dataset.state, 'success');
  assert.equal(s.ui.deployment.dataset.state, 'busy');
  assert.match(s.ui.deployment.textContent, /could not be checked/);
});
