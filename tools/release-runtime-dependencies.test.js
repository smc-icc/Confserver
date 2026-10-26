// Release-only dependency compatibility checks. No app.js, no customer data.
// Optional SQL fixture MUST point at the disposable delivery test database.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { once } = require('node:events');
const { join, resolve } = require('node:path');
const Module = require('node:module');
const Koa = require('koa');
const bodyparser = require('koa-bodyparser');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const mysql = require('mysql2/promise');
const Sequelize = require('sequelize');

async function serverFor(handler, fn) {
  const server = http.createServer(handler);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  try { await fn(`http://127.0.0.1:${server.address().port}`); }
  finally { await new Promise((done, fail) => server.close(err => err ? fail(err) : done())); }
}
function loadTokenService() {
  const path = resolve(__dirname, '../sso/db-service/token/TokenService.js');
  const original = Module._load;
  // Stub only the DAO imported by this exact module, never connect a database.
  Module._load = function (id, parent, ...rest) {
    if (parent?.filename === path && id === '../../dao/TokenDao') return new Proxy({}, { get: () => () => { throw new Error('unexpected DAO call in isolated token test'); } });
    return original.call(this, id, parent, ...rest);
  };
  try { return require(path); } finally { Module._load = original; }
}

test('JWT 9 signs/verifies real existing TokenService callbacks without a database', async () => {
  const service = loadTokenService();
  assert.equal(service.signWebIDToken({}, 60000), null);
  const token = service.signWebIDToken({ uid: 'synthetic' }, 60000);
  const claims = await service.verifyWebIDToken(token);
  assert.equal(claims.uid, 'synthetic');
  assert.deepEqual(await service.verifyWebIDToken('invalid'), { code: -2, uid: null });
  const pieces = token.split('.');
  pieces[1] = Buffer.from(JSON.stringify({ uid: 'another-synthetic-user' })).toString('base64url');
  assert.deepEqual(await service.verifyWebIDToken(pieces.join('.')), { code: -2, uid: null });
  const expired = service.signWebIDToken({ uid: 'synthetic' }, -60000);
  assert.deepEqual(await service.verifyWebIDToken(expired), { code: -1, uid: null });
});

test('JWT 9 rejects unsigned and incorrectly keyed tokens', () => {
  const key = 'synthetic-only-key-never-used-by-the-application';
  const good = jwt.sign({ uid: 'synthetic' }, key, { expiresIn: '1m' });
  assert.equal(jwt.verify(good, key).uid, 'synthetic');
  assert.throws(() => jwt.verify(good, 'other-synthetic-key'));
  const unsigned = jwt.sign({ uid: 'synthetic' }, '', { algorithm: 'none' });
  assert.throws(() => jwt.verify(unsigned, key));
});

test('Koa bodyparser 4 and real parameter middleware preserve JSON/form contracts', async () => {
  const { paramsDealMidware, paramsCheckMidware } = require('../midware/paramsMidware');
  const app = new Koa();
  app.use(bodyparser());
  app.use(paramsDealMidware(['count', 'active', 'items']));
  app.use(paramsCheckMidware({ count: 'notEmpty;number', active: 'boolean', items: 'array' }));
  app.use(ctx => { ctx.makeResObj(0, '', ctx.paramsObj); });
  await serverFor(app.callback(), async url => {
    const payload = { count: '41', active: 'true', items: '[1,2]', notAllowed: 'removed' };
    const json = await axios.post(url, payload, { proxy: false, timeout: 2000 });
    assert.equal(json.data.ret_code, 0); assert.deepEqual(json.data.data, { count: '41', active: 'true', items: '[1,2]' });
    const form = await axios.post(url, new URLSearchParams(payload).toString(), { proxy: false, timeout: 2000, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
    assert.deepEqual(form.data, json.data);
    const invalid = await axios.post(url, { ...payload, count: 'not-a-number' }, { proxy: false, timeout: 2000 });
    assert.equal(invalid.data.ret_code, 500);
  });
});

test('Koa bodyparser rejects malformed and oversized JSON', async () => {
  const app = new Koa();
  app.silent = true;
  app.use(bodyparser({ jsonLimit: '1kb' }));
  app.use(ctx => { ctx.body = ctx.request.body; });
  await serverFor(app.callback(), async url => {
    const options = { proxy: false, timeout: 2000, headers: { 'Content-Type': 'application/json' }, validateStatus: () => true };
    assert.equal((await axios.post(url, '{bad', options)).status, 400);
    assert.equal((await axios.post(url, { value: 'x'.repeat(2048) }, options)).status, 413);
  });
});

test('Axios 1 retains the actual ConfigureWrite URL/form/HTTP status contract', async () => {
  await serverFor(async (req, res) => {
    let data = ''; for await (const chunk of req) data += chunk;
    assert.equal(req.url, '/ConfigureWrite/write');
    const form = new URLSearchParams(data);
    assert.equal(form.get('filename'), 'synthetic.xml'); assert.equal(form.get('content'), '<synthetic/>');
    res.writeHead(202, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ synthetic: true }));
  }, async url => {
    const previous = process.env.ICC_XML_WRITE_RELAY_URL;
    process.env.ICC_XML_WRITE_RELAY_URL = url;
    try {
      const { postConfigureWrite } = require('../app/service/smcicc/configureWriteHttp');
      const response = await postConfigureWrite('unused-synthetic-host', 'synthetic.xml', '<synthetic/>', { timeout: 2000 });
      assert.equal(response.status, 202); assert.deepEqual(response.data, { synthetic: true });
    } finally {
      if (previous === undefined) delete process.env.ICC_XML_WRITE_RELAY_URL; else process.env.ICC_XML_WRITE_RELAY_URL = previous;
    }
  });
});

test('MySQL 3 promise pool preserves lazy construction and SQL escaping', async () => {
  const driver = require('mysql2');
  assert.equal(driver.format('SELECT ?? WHERE id=?', ['value', 41]), 'SELECT `value` WHERE id=41');
  const pool = mysql.createPool({ host: '127.0.0.1', port: 1, user: 'synthetic', database: 'synthetic' });
  assert.equal(typeof pool.execute, 'function'); await pool.end();
});

test('Sequelize current dialect loads MySQL 3 without opening a connection', async () => {
  const db = new Sequelize('synthetic', 'synthetic', 'synthetic', { dialect: 'mysql', host: '127.0.0.1', port: 1, logging: false });
  assert.equal(typeof db.transaction, 'function'); try { assert.equal(typeof db.getQueryInterface(), 'object'); } finally { await db.close(); }
});

test('real MySQL 8 transactions, prepared queries and existing Sequelize dialect', { skip: !process.env.SMC_RELEASE_TEST_MYSQL_HOST }, async () => {
  // Refuse arbitrary user/VM databases. A network alias is used only for the
  // disposable Docker network created by the delivery regression runner.
  assert.equal(process.env.SMC_RELEASE_TEST_MYSQL_HOST, 'smc-release-fixture-mysql');
  assert.equal(process.env.SMC_RELEASE_TEST_MYSQL_DATABASE, 'smc_release_fixture');
  const options = { host: process.env.SMC_RELEASE_TEST_MYSQL_HOST, database: 'smc_release_fixture', user: 'root', password: 'synthetic-only-release-test-password', port: 3306 };
  const pool = mysql.createPool(options);
  const db = new Sequelize(options.database, options.user, options.password, { host: options.host, dialect: 'mysql', logging: false });
  try {
    await pool.query('CREATE TABLE IF NOT EXISTS dependency_fixture (id INT PRIMARY KEY, name VARCHAR(100))');
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      await connection.execute('INSERT INTO dependency_fixture(id,name) VALUES (?,?)', [41, 'synthetic 中文']);
      await connection.rollback();
      const [rows] = await connection.execute('SELECT * FROM dependency_fixture WHERE id=?', [41]);
      assert.equal(rows.length, 0);
    } finally { connection.release(); }
    await db.authenticate();
    const [row] = await db.query('SELECT :value AS marker', { replacements: { value: 'synthetic 中文' }, type: Sequelize.QueryTypes.SELECT });
    assert.equal(row.marker, 'synthetic 中文');
    await db.transaction(async transaction => {
      await db.query('INSERT INTO dependency_fixture(id,name) VALUES (:id,:name)', { replacements: { id: 42, name: 'synthetic committed' }, transaction });
    });
    const [rows] = await pool.execute('SELECT name FROM dependency_fixture WHERE id=?', [42]);
    assert.equal(rows[0].name, 'synthetic committed');
  } finally { await db.close(); await pool.end(); }
});


test('actual app error handler preserves JSON/text HTTP status and hides internal errors', async () => {
  const onerror = require('../midware/errorHandler');
  assert.equal(typeof onerror, 'function');
  const app = new Koa(); app.silent = true; app.env = 'production';
  onerror(app);
  app.use(ctx => {
    if (ctx.path === '/exposed') ctx.throw(404, 'synthetic-not-found');
    throw new Error('synthetic-internal-do-not-expose');
  });
  await serverFor(app.callback(), async url => {
    const base = { proxy: false, timeout: 2000, validateStatus: () => true };
    const json = await axios.get(url + '/exposed', { ...base, headers: { Accept: 'application/json' } });
    assert.equal(json.status, 404); assert.match(JSON.stringify(json.data), /synthetic-not-found/);
    const text = await axios.get(url + '/exposed', { ...base, headers: { Accept: 'text/plain' } });
    assert.equal(text.status, 404); assert.match(text.data, /synthetic-not-found/);
    const hidden = await axios.get(url + '/internal', { ...base, headers: { Accept: 'application/json' } });
    assert.equal(hidden.status, 500);
    assert.ok(!JSON.stringify(hidden.data).includes('synthetic-internal-do-not-expose'));
  });
});

test('release error handler escapes attacker HTML including development error detail', async () => {
  // Security contract is asserted in the release image, not against the old dev lock.
  assert.equal(require('koa-onerror/package.json').version, '5.0.1');
  // v5 selects its template from NODE_ENV, not app.env. Restore the process
  // environment after this serial test; other test files use separate workers.
  const previous = process.env.NODE_ENV;
  process.env.NODE_ENV = 'development';
  try {
    const app = new Koa(); app.silent = true; app.env = 'development';
    require('../midware/errorHandler')(app);
    app.use(() => { throw new Error('<script>synthetic-unsafe-markup</script>'); });
    await serverFor(app.callback(), async url => {
      const result = await axios.get(url, { proxy: false, timeout: 2000, headers: { Accept: 'text/html' }, validateStatus: () => true });
      assert.equal(result.status, 500);
      assert.ok(!result.data.includes('<script>synthetic-unsafe-markup</script>'));
      assert.match(result.data, /&lt;script&gt;synthetic-unsafe-markup&lt;\/script&gt;/);
    });
  } finally {
    if (previous === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = previous;
  }
});
