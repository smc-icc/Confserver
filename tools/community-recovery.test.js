const test = require('node:test'),
  assert = require('node:assert/strict'),
  fs = require('node:fs/promises'),
  path = require('node:path'),
  os = require('node:os'),
  crypto = require('node:crypto');
const { ComponentInstaller } = require('../app/service/community/installer');
const { CommunityManager } = require('../app/service/community/state');
async function setup(t) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'smc-recovery-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  let installed = 0;
  const manager = {
    snapshot: async () => ({ modules: { icc: { licensed: true } } }),
    markInstalled: async () => installed++,
  };
  const submits = [];
  const adapter = {
    preflight: async () => {},
    ensure: async () => ({ id: 1 }),
    submit: async (...args) => submits.push(args),
    task: async () => ({ status: 2 }),
    healthy: async () => true,
  };
  const i = new ComponentInstaller({ dir, manager, adapter });
  const plan = {
    module: 'icc',
    version: '1.0.0',
    services: [
      { application: 'SMC', serverName: 'CCS', nodeName: 'node', patchId: 1 },
    ],
  };
  return {
    dir,
    i,
    manager,
    adapter,
    submits,
    plan,
    installed: () => installed,
  };
}
test('unknown submission confirmed missing is retried with the same task identity', async (t) => {
  const f = await setup(t);
  let lost = true;
  f.adapter.submit = async (...args) => {
    f.submits.push(args);
    if (lost) {
      lost = false;
      throw Error('not received');
    }
  };
  f.adapter.task = async () =>
    f.submits.length === 1 ? { missing: true } : { status: 2 };
  const j = await f.i.create(f.plan, 'admin');
  assert.equal((await f.i.advance(j.id)).phase, 'submission_unknown');
  assert.equal((await f.i.advance(j.id, true)).phase, 'complete');
  assert.equal(f.submits.length, 3);
  assert.equal(f.submits[0][3], f.submits[1][3]);
  assert.equal(f.installed(), 1);
});
test('accepted submission with a lost response is reconciled without duplicate publishing', async (t) => {
  const f = await setup(t);
  let lost = true;
  f.adapter.submit = async (...args) => {
    f.submits.push(args);
    if (lost) {
      lost = false;
      throw Error('response lost');
    }
  };
  const j = await f.i.create(f.plan, 'admin');
  await f.i.advance(j.id);
  assert.equal((await f.i.advance(j.id, true)).phase, 'complete');
  assert.equal(f.submits.length, 2);
});
test('a failed task query never authorizes a new submission', async (t) => {
  const f = await setup(t);
  f.adapter.submit = async (...args) => {
    f.submits.push(args);
    throw Error('unknown');
  };
  const j = await f.i.create(f.plan, 'admin');
  await f.i.advance(j.id);
  f.adapter.task = async () => {
    throw Error('database unavailable');
  };
  const result = await f.i.advance(j.id, true);
  assert.ok(
    ['submission_unknown', 'task_query_unknown'].includes(result.phase),
  );
  assert.equal(f.submits.length, 1);
  assert.equal(f.installed(), 0);
});
test('different concurrent plans for one module are serialized before preflight', async (t) => {
  const f = await setup(t);
  f.adapter.preflight = async () => new Promise((r) => setTimeout(r, 15));
  const plans = [
    f.plan,
    {
      ...f.plan,
      version: '1.0.1',
      services: [{ ...f.plan.services[0], patchId: 2 }],
    },
  ];
  const results = await Promise.allSettled(
    plans.map((p) => f.i.create(p, 'admin')),
  );
  assert.equal(results.filter((x) => x.status === 'fulfilled').length, 1);
  assert.equal(results.find((x) => x.status === 'rejected').reason.status, 409);
});
test('an orphaned legacy lock file cannot block a restarted single coordinator', async (t) => {
  const f = await setup(t);
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
  const bytes = Buffer.from(
    JSON.stringify({
      kind: 'smc-license/1',
      deploymentId: 'test',
      licenseId: 'test',
      revision: 1,
      edition: 'registered',
      notBefore: '2020-01-01T00:00:00Z',
      expiresAt: '2099-01-01T00:00:00Z',
      modules: ['icc'],
      limits: {},
    }),
  );
  await fs.writeFile(path.join(f.dir, 'modules.lock'), 'orphaned');
  const manager = new CommunityManager({
    dir: f.dir,
    deploymentId: 'test',
    licensePublicKey: publicKey,
  });
  await manager.importLicense(
    {
      payload: bytes.toString('base64'),
      signature: crypto.sign(null, bytes, privateKey).toString('base64'),
    },
    0,
  );
  assert.equal((await manager.snapshot()).revision, 1);
});

test('a superseded failed job cannot race a new module plan', async (t) => {
  const f = await setup(t);
  f.adapter.task = async () => ({ status: 3 });
  const old = await f.i.create(f.plan, 'admin');
  await f.i.advance(old.id);
  const next = await f.i.create({ ...f.plan, version: '1.0.1' }, 'admin');
  await assert.rejects(
    () => f.i.advance(old.id, true),
    (e) => e.status === 409,
  );
  assert.equal((await f.i.get(next.id)).phase, 'prepared');
});

test('an evicted start task is confirmed by active service state without replay', async (t) => {
  const f = await setup(t);
  const commands = new Map();
  f.adapter.submit = async (...args) => {
    f.submits.push(args);
    commands.set(args[3], args[1]);
  };
  f.adapter.task = async (id) =>
    commands.get(id) === 'start_tars' ? { missing: true } : { status: 2 };
  const job = await f.i.create(f.plan, 'admin');
  assert.equal((await f.i.advance(job.id)).phase, 'complete');
  assert.equal(f.submits.length, 2);
  assert.equal(f.installed(), 1);
});

for (const failing of ['point', 'save'])
  test(
    'new plan recovers after ' + failing + ' fails before creation completes',
    async (t) => {
      const f = await setup(t);
      const a = await f.i.create(f.plan, 'admin');
      await f.i.advance(a.id);
      const plan = { ...f.plan, version: '1.0.1' };
      const original = f.i[failing].bind(f.i);
      let injected = false;
      f.i[failing] = async (...args) => {
        if (!injected) {
          injected = true;
          throw Error('simulated disk interruption');
        }
        return original(...args);
      };
      await assert.rejects(() => f.i.create(plan, 'admin'), /interruption/);
      const restarted = new ComponentInstaller(f.i.options);
      const b = await restarted.create(plan, 'admin');
      assert.equal((await restarted.advance(b.id)).phase, 'complete');
      assert.equal(f.installed(), 2);
    },
  );
