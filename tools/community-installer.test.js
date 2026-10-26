const test = require('node:test'),
  assert = require('node:assert/strict'),
  fs = require('node:fs/promises'),
  os = require('node:os'),
  path = require('node:path');
const { ComponentInstaller } = require('../app/service/community/installer');
async function fixture(t, failed = false) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'smc-install-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  let installed = 0,
    submitted = 0;
  const manager = {
    snapshot: async () => ({ modules: { icc: { licensed: true } } }),
    markInstalled: async () => {
      installed++;
    },
  };
  const adapter = {
    preflight: async () => {},
    ensure: async () => ({ id: 1 }),
    submit: async () => {
      submitted++;
    },
    task: async () => ({ status: failed ? 3 : 2 }),
    healthy: async () => true,
  };
  const i = new ComponentInstaller({ dir, manager, adapter });
  return {
    i,
    adapter,
    counts: () => ({ installed, submitted }),
    plan: {
      module: 'icc',
      version: '1.0.0',
      services: [
        {
          application: 'SMC',
          serverName: 'CCSServer',
          nodeName: 'node1',
          patchId: 1,
        },
      ],
    },
  };
}
test('installation is marked only after publish, start and health confirmation; repeats are idempotent', async (t) => {
  const { i, counts, plan } = await fixture(t);
  const job = await i.create(plan, 'admin');
  await i.advance(job.id);
  assert.deepEqual(counts(), { installed: 1, submitted: 2 });
  await i.advance(job.id);
  assert.deepEqual(counts(), { installed: 1, submitted: 2 });
  assert.equal((await i.get(job.id)).phase, 'complete');
});
test('failed TARS tasks keep module disabled and persist the failure for retry', async (t) => {
  const { i, counts, plan } = await fixture(t, true);
  const job = await i.create(plan, 'admin');
  await i.advance(job.id);
  assert.equal(counts().installed, 0);
  assert.equal((await i.get(job.id)).phase, 'failed');
});

test('confirmed failed task can be retried without recreating the service', async (t) => {
  const { i, adapter, counts, plan } = await fixture(t, true);
  const job = await i.create(plan, 'admin');
  await i.advance(job.id);
  adapter.task = async () => ({ status: 2 });
  await i.advance(job.id, true);
  assert.equal((await i.get(job.id)).phase, 'complete');
  assert.equal(counts().installed, 1);
  assert.equal(counts().submitted, 3);
});
test('pending publish is polled, never treated as a completed installation', async (t) => {
  const { i, adapter, counts, plan } = await fixture(t);
  adapter.task = async () => ({ status: 1 });
  const job = await i.create(plan, 'admin');
  await i.advance(job.id);
  assert.equal(counts().installed, 0);
  assert.equal(counts().submitted, 1);
  adapter.task = async () => ({ status: 2 });
  await i.advance(job.id);
  assert.equal(counts().installed, 1);
  assert.equal(counts().submitted, 2);
});

test('existing SMC-ICC application names are valid signed install targets', async t => {
  const { i, plan } = await fixture(t);
  plan.services[0].application = 'SMC-ICC';
  assert.equal((await i.create(plan, 'admin')).phase, 'prepared');
});
test('install target names still reject separators and shell syntax', async t => {
  const { i, plan } = await fixture(t);
  for (const application of ['SMC/ICC', 'SMC;ICC', 'SMC..ICC']) {
    plan.services[0].application = application;
    await assert.rejects(i.create(plan, 'admin'), /组件服务定义无效/);
  }
});
