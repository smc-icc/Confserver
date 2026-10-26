'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const Koa = require('koa');
const localeMiddleware = require('../midware/localeMidware');
async function request(t, { cookie, language = 'zh-CN', override } = {}) {
  const app = new Koa();
  app.use(localeMiddleware);
  app.use(ctx => {
    ctx.paramsObj = override === undefined ? {} : { __locale: override };
    ctx.body = { ret_code: 500, err_msg: '#login.passwordNoCorrect#', data: { login_status: 'invalid_credentials' } };
  });
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  return fetch('http://127.0.0.1:' + server.address().port, { headers: { 'accept-language': language, ...(cookie ? { cookie: 'locale=' + cookie } : {}) } });
}
for (const [locale, expected] of [['zh-CN', '密码错误'], ['zh_CN', '密码错误'], ['en-US', 'Incorrect password'], ['cn', '密码错误'], ['__proto__', '密码错误']]) {
  test('failed login remains structured with locale cookie ' + locale, async t => {
    const r = await request(t, { cookie: locale });
    assert.equal(r.status, 200);
    assert.deepEqual(await r.json(), { ret_code: 500, err_msg: expected, data: { login_status: 'invalid_credentials' } });
    assert.match(r.headers.get('set-cookie'), /locale=(cn|en)/);
  });
}
test('unknown or non-string request locale uses the valid cookie language', async t => {
  for (const override of ['unsupported-locale', { bad: true }, '__proto__']) {
    const r = await request(t, { cookie: 'en', override });
    assert.equal(r.status, 200);
    assert.equal((await r.json()).err_msg, 'Incorrect password');
  }
});
test('the first request uses its negotiated language before the cookie is returned', async t => {
  const r = await request(t, { language: 'en-US,en;q=0.9' });
  assert.equal(r.status, 200);
  assert.equal((await r.json()).err_msg, 'Incorrect password');
});
