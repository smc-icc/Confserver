const test = require('node:test'),
  assert = require('node:assert/strict'),
  Koa = require('koa'),
  Router = require('koa-router'),
  fs = require('node:fs/promises'),
  os = require('node:os'),
  path = require('node:path'),
  crypto = require('node:crypto');
const { CommunityManager } = require('../app/service/community/state');
const { FlowPluginStore } = require('../app/service/community/plugins');
const {
  createController,
  runtimeMiddleware,
} = require('../app/service/community/http');
async function start(t, app) {
  const server = app.listen(0, '127.0.0.1');
  await new Promise((r) => server.once('listening', r));
  t.after(() => new Promise((r) => server.close(r)));
  return 'http://127.0.0.1:' + server.address().port;
}
test('capability service endpoint requires the backend secret and never redirects to login', async (t) => {
  const app = new Koa();
  app.use(
    runtimeMiddleware({
      token: 'x'.repeat(32),
      snapshot: async () => ({ edition: 'community' }),
    }),
  );
  const base = await start(t, app);
  assert.equal(
    (await fetch(base + '/api/smcicc/community/runtime')).status,
    401,
  );
  const good = await fetch(base + '/api/smcicc/community/runtime', {
    headers: { 'x-smc-module-token': 'x'.repeat(32) },
  });
  assert.equal(good.status, 200);
  assert.equal((await good.json()).data.edition, 'community');
});
test('plugin assets are inaccessible before enterprise install, immediately accessible after enablement and blocked after disable', async (t) => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'smc-plugin-http-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const keys = crypto.generateKeyPairSync('ed25519'),
    sign = (x) => {
      const b = Buffer.from(JSON.stringify(x));
      return {
        payload: b.toString('base64'),
        signature: crypto.sign(null, b, keys.privateKey).toString('base64'),
      };
    };
  const manager = new CommunityManager({
    dir,
    deploymentId: 'test',
    licensePublicKey: keys.publicKey,
  });
  const plugins = new FlowPluginStore({
    manager,
    dir: path.join(dir, 'plugins'),
    publicKey: keys.publicKey,
    hostRoot: path.resolve(__dirname, '..'),
  });
  const controller = createController({
    runtime: () => ({ manager, plugins }),
    admin: async (ctx) => {
      if (ctx.get('x-test-role') !== 'admin') {
        const e = Error('需要管理员');
        e.status = 403;
        throw e;
      }
    },
  });
  const app = new Koa(),
    router = new Router();
  router.get('/web/:asset(.*)', controller.asset);
  app.use(require('../midware/localeMidware'));
  app.use(router.routes());
  const base = await start(t, app);
  assert.equal(
    (
      await fetch(base + '/web/index.html', {
        headers: { 'x-test-role': 'admin' },
      })
    ).status,
    403,
  );
  await manager.importLicense(
    sign({
      kind: 'smc-license/1',
      deploymentId: 'test',
      licenseId: 'test',
      revision: 1,
      edition: 'enterprise',
      notBefore: '2020-01-01T00:00:00Z',
      expiresAt: '2099-01-01T00:00:00Z',
      modules: ['flow-designer'],
      limits: {},
    }),
    0,
  );
  const file = (p, s) => ({
    path: p,
    data: Buffer.from(s).toString('base64'),
    sha256: crypto.createHash('sha256').update(s).digest('hex'),
  });
  await plugins.install(
    sign({
      kind: 'smc-plugin/1',
      id: 'flow-designer',
      version: '1.0.0',
      hostProtocol: 1,
      files: [
        file('backend.cjs', 'module.exports=()=>({ivr:{},itr:{}})'),
        file('web/index.html', '<html>已安装</html>'),
        file('web/图标.png', 'png'),
      ],
    }),
    1,
  );
  await manager.setEnabled('flow-designer', true, 2);
  assert.equal((await fetch(base + '/web/index.html')).status, 403);
  const good = await fetch(base + '/web/index.html', {
    headers: { 'x-test-role': 'admin' },
  });
  assert.equal(good.status, 200);
  assert.match(good.headers.get('content-type'), /text\/html/);
  assert.equal(await good.text(), '<html>已安装</html>');
  const image = await fetch(base + '/web/' + encodeURIComponent('图标.png'), {
    headers: { 'x-test-role': 'admin' },
  });
  assert.equal(image.status, 200);
  assert.match(image.headers.get('content-type'), /image\/png/);
  assert.deepEqual(Buffer.from(await image.arrayBuffer()), Buffer.from('png'));
  await manager.setEnabled('flow-designer', false, 3);
  assert.equal(
    (
      await fetch(base + '/web/index.html', {
        headers: { 'x-test-role': 'admin' },
      })
    ).status,
    403,
  );
});

test('large plugin uploads are authorized before any body parsing', async (t) => {
  const { pluginUploadGate } = require('../app/service/community/http');
  let parsed = 0,
    enterprise = false;
  const app = new Koa();
  app.use(
    pluginUploadGate({
      admin: async (ctx) => {
        if (ctx.get('x-role') !== 'admin') {
          const e = Error('forbidden');
          e.status = 403;
          throw e;
        }
      },
      snapshot: async () => ({
        edition: enterprise ? 'enterprise' : 'registered',
        modules: { 'flow-designer': { licensed: enterprise } },
      }),
    }),
  );
  app.use(async (ctx, next) => {
    parsed++;
    await next();
  });
  app.use(require('koa-bodyparser')());
  app.use((ctx) => (ctx.body = { ok: true }));
  const base = await start(t, app);
  assert.equal(
    (
      await fetch(base, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'not-json',
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await fetch(base, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-role': 'admin' },
        body: 'not-json',
      })
    ).status,
    403,
  );
  assert.equal(parsed, 0);
  enterprise = true;
  assert.equal(
    (
      await fetch(base, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-role': 'admin' },
        body: '{}',
      })
    ).status,
    200,
  );
  assert.equal(parsed, 1);
});

test('upgrade upload gate allows Community admins before parsing and rejects other roles first', async (t) => {
  const { upgradeUploadGate } = require('../app/service/community/http');
  let parsed = 0,
    calls = 0;
  const app = new Koa();
  app.use(
    upgradeUploadGate({
      admin: async (ctx) => {
        if (ctx.get('x-test-role') !== 'admin') {
          const e = Error('仅系统管理员');
          e.status = 403;
          throw e;
        }
      },
    }),
  );
  app.use(async (ctx, next) => {
    parsed++;
    await next();
  });
  app.use(require('koa-bodyparser')({ jsonLimit: '1kb' }));
  app.use(async (ctx) => {
    calls++;
    ctx.body = { ok: true };
  });
  const base = await start(t, app);
  const denied = await fetch(base, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ x: 'x'.repeat(4096) }),
  });
  assert.equal(denied.status, 403);
  assert.equal(parsed, 0);
  assert.equal(calls, 0);
  const good = await fetch(base, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-test-role': 'admin' },
    body: '{}',
  });
  assert.equal(good.status, 200);
  assert.equal(parsed, 1);
  assert.equal(calls, 1);
});
test('unified upgrade endpoints require admin and only return durable progress', async () => {
  let creates = 0,
    advances = 0;
  const controller = createController({
    admin: async (ctx) => {
      if (!ctx.allowed) {
        const e = Error('forbidden');
        e.status = 403;
        throw e;
      }
    },
    upgrades: () => ({
      create: async () => {
        creates++;
        return { id: 'task', phase: 'prepared' };
      },
      advance: async () => {
        advances++;
        return { id: 'task', phase: 'complete' };
      },
      current: async () => null,
    }),
  });
  for (const name of ['upgrade', 'upgradeJob', 'currentUpgrade']) {
    const ctx = { paramsObj: { expectedRevision: 0 } };
    await controller[name](ctx);
    assert.equal(ctx.status, 403);
  }
  assert.equal(creates, 0);
  assert.equal(advances, 0);
  const ctx = { allowed: true, paramsObj: { expectedRevision: 0 } };
  await controller.upgrade(ctx);
  assert.equal(ctx.body.data.phase, 'prepared');
  assert.equal(creates, 1);
  assert.equal(advances, 0);
  await controller.currentUpgrade(ctx);
  assert.deepEqual(ctx.body.data, { job: null });
});
