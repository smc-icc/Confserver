const test = require('node:test'),
  assert = require('node:assert/strict'),
  crypto = require('node:crypto'),
  fs = require('node:fs/promises'),
  path = require('node:path'),
  os = require('node:os');
const { CommunityManager } = require('../app/service/community/state');
const { FlowPluginStore } = require('../app/service/community/plugins');
const pair = crypto.generateKeyPairSync('ed25519');
const sign = (x) => {
  const b = Buffer.from(JSON.stringify(x));
  return {
    payload: b.toString('base64'),
    signature: crypto.sign(null, b, pair.privateKey).toString('base64'),
  };
};
const file = (p, s) => ({
  path: p,
  data: Buffer.from(s).toString('base64'),
  sha256: crypto.createHash('sha256').update(s).digest('hex'),
});
async function fixture(t) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'smc-plugin-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const manager = new CommunityManager({
    dir,
    deploymentId: 'test',
    licensePublicKey: pair.publicKey,
  });
  const store = new FlowPluginStore({
    manager,
    dir: path.join(dir, 'plugins'),
    publicKey: pair.publicKey,
    hostRoot: path.resolve(__dirname, '..'),
  });
  const pkg = (extra) =>
    sign({
      kind: 'smc-plugin/1',
      id: 'flow-designer',
      version: '1.0.0',
      hostProtocol: 1,
      files: [
        file(
          'backend.cjs',
          'module.exports=()=>({ivr:{list:async c=>{c.body={ok:true}}},itr:{}})',
        ),
        file('web/index.html', '<html>designer</html>'),
      ],
      ...extra,
    });
  return { manager, store, pkg };
}
async function enterprise(m) {
  await m.importLicense(
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
}
test('community cannot install or load a designer package', async (t) => {
  const { store, pkg } = await fixture(t);
  await assert.rejects(() => store.install(pkg(), 0), /企业|enterprise/);
  await assert.rejects(() => store.asset('index.html'));
});
test('enterprise signed install is idempotent and requires explicit enablement', async (t) => {
  const { manager, store, pkg } = await fixture(t);
  await enterprise(manager);
  await store.install(pkg(), 1);
  assert.equal(
    (await manager.snapshot()).modules['flow-designer'].enabled,
    false,
  );
  await assert.rejects(() => store.asset('index.html'));
  await manager.setEnabled('flow-designer', true, 2);
  assert.match((await store.asset('index.html')).bytes.toString(), /designer/);
  const rev = (await manager.snapshot()).revision;
  await store.install(pkg(), rev);
  assert.equal((await manager.snapshot()).revision, rev);
});
test('invalid signatures, paths, hashes and host versions preserve previous installation', async (t) => {
  const { manager, store, pkg } = await fixture(t);
  await enterprise(manager);
  await store.install(pkg(), 1);
  for (const extra of [
    { files: [file('../outside', 'bad')] },
    { hostProtocol: 2 },
    { files: [{ ...file('backend.cjs', 'x'), sha256: '0'.repeat(64) }] },
  ])
    await assert.rejects(() => store.install(pkg(extra), 2));
  assert.equal((await manager.snapshot()).revision, 2);
});
test('tampered installed backend is rejected before loading, disabling keeps files', async (t) => {
  const { manager, store, pkg } = await fixture(t);
  await enterprise(manager);
  await store.install(pkg(), 1);
  await manager.setEnabled('flow-designer', true, 2);
  const handlers = await store.handlers();
  const ctx = {};
  await handlers.ivr.list(ctx);
  assert.equal(ctx.body.ok, true);
  const state = await manager.read();
  const release = path.join(
    store.options.dir,
    state.modules['flow-designer'].receipt.digest,
  );
  await fs.writeFile(
    path.join(release, 'backend.cjs'),
    'throw Error("must not execute")',
  );
  await assert.rejects(() => store.handlers(), /校验|hash/);
  await manager.setEnabled('flow-designer', false, 3);
  assert.equal((await fs.stat(release)).isDirectory(), true);
});
