const test = require('node:test'),
  assert = require('node:assert/strict');
const crypto = require('node:crypto'),
  fs = require('node:fs/promises'),
  path = require('node:path'),
  os = require('node:os');
const { CommunityManager } = require('../app/service/community/state');
const { ComponentInstaller } = require('../app/service/community/installer');
const { FlowPluginStore } = require('../app/service/community/plugins');
const { UpgradeCoordinator } = require('../app/service/community/upgrade');
async function fixture(t) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'smc-upgrade-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const keys = crypto.generateKeyPairSync('ed25519');
  const sign = (x) => {
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
  const tasks = new Map();
  let submissions = 0,
    healthy = true;
  const adapter = {
    preflight: async () => {},
    ensure: async () => ({ id: 7 }),
    submit: async (_id, _cmd, _spec, no) => {
      submissions++;
      tasks.set(no, { status: 2 });
    },
    task: async (no) => tasks.get(no) || { missing: true },
    healthy: async () => healthy,
  };
  const installer = new ComponentInstaller({
    dir: path.join(dir, 'components'),
    manager,
    adapter,
  });
  const plugins = new FlowPluginStore({
    manager,
    dir: path.join(dir, 'plugins'),
    publicKey: keys.publicKey,
  });
  const options = {
    dir: path.join(dir, 'upgrades'),
    manager,
    installer,
    plugins,
    publicKey: keys.publicKey,
  };
  const license = (edition = 'professional', extra = {}) =>
    sign({
      kind: 'smc-license/1',
      deploymentId: 'test',
      licenseId: 'test',
      revision: 1,
      edition,
      notBefore: '2020-01-01',
      expiresAt: '2099-01-01',
      modules:
        edition === 'enterprise'
          ? ['icc', 'ivr', 'itr', 'outbound', 'aiqc', 'flow-designer']
          : ['icc', 'ivr', 'itr'],
      limits: { voiceSeats: 8, concurrentCalls: 10, videoConcurrentCalls: 3 },
      ...extra,
    });
  const component = (module) =>
    sign({
      kind: 'smc-component/1',
      deploymentId: 'test',
      module,
      version: '1.0.0',
      services: [
        {
          application: 'SMC-ICC',
          serverName: module.toUpperCase() + 'Server',
          nodeName: 'test-node',
          patchId: 1,
        },
      ],
    });
  const file = (p, s) => ({
    path: p,
    data: Buffer.from(s).toString('base64'),
    sha256: crypto.createHash('sha256').update(s).digest('hex'),
  });
  const plugin = () =>
    sign({
      kind: 'smc-plugin/1',
      id: 'flow-designer',
      hostProtocol: 1,
      version: '1.0.0',
      files: [
        file('backend.cjs', 'module.exports=()=>({ivr:{},itr:{}})'),
        file('web/index.html', '<html>designer</html>'),
      ],
    });
  const bundle = (edition = 'professional') => ({
    kind: 'smc-upgrade/1',
    license: license(edition),
    components: (edition === 'enterprise'
      ? ['icc', 'ivr', 'itr', 'outbound', 'aiqc']
      : ['icc', 'ivr', 'itr']
    ).map(component),
    ...(edition === 'enterprise' ? { plugin: plugin() } : {}),
  });
  return {
    manager,
    installer,
    adapter,
    options,
    sign,
    license,
    plugin,
    bundle,
    coordinator: new UpgradeCoordinator(options),
    submissions: () => submissions,
    setHealthy: (x) => (healthy = x),
  };
}
async function finish(coordinator, job) {
  for (
    let i = 0;
    i < 20 && job.phase !== 'complete' && job.phase !== 'failed';
    i++
  )
    job = await coordinator.advance(job.id);
  return job;
}
test('professional upgrade installs and enables ICC/runtime without exposing designers, idempotently', async (t) => {
  const f = await fixture(t),
    bundle = f.bundle();
  let job = await f.coordinator.create(bundle, 'professional', 0, 'admin');
  job = await finish(f.coordinator, job);
  assert.equal(job.phase, 'complete', job.error);
  const s = await f.manager.snapshot();
  assert.equal(s.edition, 'professional');
  assert.equal(s.modules.icc.available, true);
  assert.equal(s.modules.ivr.available, true);
  assert.equal(s.modules.itr.available, true);
  assert.equal(s.modules['flow-designer'].available, false);
  assert.equal(s.limits.videoConcurrentCalls, 2);
  const count = f.submissions();
  assert.equal(
    (await f.coordinator.create(bundle, 'professional', 0, 'admin')).id,
    job.id,
  );
  await f.coordinator.advance(job.id);
  assert.equal(f.submissions(), count);
  assert.equal(JSON.stringify(job).includes('payload'), false);
});
test('enterprise upgrade installs both designers and uses signed quotas', async (t) => {
  const f = await fixture(t);
  let job = await f.coordinator.create(
    f.bundle('enterprise'),
    'enterprise',
    0,
    'admin',
  );
  job = await finish(f.coordinator, job);
  assert.equal(job.phase, 'complete', job.error);
  const s = await f.manager.snapshot();
  for (const m of Object.values(s.modules))
    assert.equal(m.available, true, m.id);
  assert.equal(s.limits.voiceSeats, 8);
  assert.equal(s.limits.concurrentCalls, 10);
  assert.equal(s.limits.videoConcurrentCalls, 3);
  assert.equal(
    (await f.options.plugins.asset('index.html')).bytes.toString(),
    '<html>designer</html>',
  );
});
test('validates signatures, edition, complete bundle and enterprise quotas before license writes', async (t) => {
  const f = await fixture(t);
  for (const mutate of [
    (b) => {
      b.license.signature = Buffer.alloc(64).toString('base64');
    },
    (b) => {
      b.components.pop();
    },
    (b) => {
      b.plugin = f.plugin();
    },
    (b) => {
      b.components[0] = f.sign({
        ...JSON.parse(Buffer.from(b.components[0].payload, 'base64')),
        services: [],
      });
    },
  ]) {
    const b = f.bundle();
    mutate(b);
    await assert.rejects(() =>
      f.coordinator.create(b, 'professional', 0, 'admin'),
    );
    assert.equal((await f.manager.snapshot()).revision, 0);
  }
  await assert.rejects(() =>
    f.coordinator.create(f.bundle('enterprise'), 'professional', 0, 'admin'),
  );
  const b = f.bundle('enterprise');
  b.license = f.license('enterprise', { limits: { voiceSeats: 8 } });
  await assert.rejects(
    () => f.coordinator.create(b, 'enterprise', 0, 'admin'),
    /配额/,
  );
  f.adapter.preflight = async () => {
    throw Error('missing TARS package');
  };
  await assert.rejects(
    () => f.coordinator.create(f.bundle(), 'professional', 0, 'admin'),
    /missing/,
  );
  assert.equal((await f.manager.snapshot()).revision, 0);
  assert.equal(f.submissions(), 0);
});
test('resumes after process restart and never enables partial installation; prevents overlapping upgrades', async (t) => {
  const f = await fixture(t);
  f.setHealthy(false);
  let job = await f.coordinator.create(f.bundle(), 'professional', 0, 'admin');
  job = await f.coordinator.advance(job.id);
  assert.notEqual(job.phase, 'complete');
  assert.equal((await f.manager.snapshot()).modules.icc.available, false);
  await assert.rejects(async () =>
    f.coordinator.create(
      f.bundle('enterprise'),
      'enterprise',
      (
        await f.manager.snapshot()
      ).revision,
      'admin',
    ),
  );
  const next = new UpgradeCoordinator(f.options);
  assert.equal((await next.current()).id, job.id);
  f.setHealthy(true);
  job = await finish(next, await next.advance(job.id));
  assert.equal(job.phase, 'complete', job.error);
  assert.equal(f.submissions(), 6);
});
test('expired or superseded license cannot resume or re-enable a completed upgrade', async (t) => {
  const f = await fixture(t);
  let job = await finish(
    f.coordinator,
    await f.coordinator.create(f.bundle(), 'professional', 0, 'admin'),
  );
  const s = await f.manager.snapshot();
  await f.manager.importLicense(
    f.license('enterprise', { revision: 2 }),
    s.revision,
  );
  await assert.rejects(() => f.coordinator.advance(job.id), /授权/);
});

test('failed TARS upgrade is retryable without reimporting authorization or reinstalling completed services', async (t) => {
  const f = await fixture(t);
  const task = f.adapter.task;
  let fail = true;
  f.adapter.task = async (no) => (fail ? { status: 3 } : task(no));
  let job = await f.coordinator.create(f.bundle(), 'professional', 0, 'admin');
  job = await f.coordinator.advance(job.id);
  assert.equal(job.phase, 'failed');
  assert.equal((await f.manager.snapshot()).modules.icc.available, false);
  const revision = (await f.manager.read()).highestLicenseRevision;
  assert.equal((await f.coordinator.advance(job.id)).phase, 'failed');
  fail = false;
  job = await f.coordinator.advance(job.id, true);
  job = await finish(f.coordinator, job);
  assert.equal(job.phase, 'complete', job.error);
  assert.equal((await f.manager.read()).highestLicenseRevision, revision);
});
test('restart in the gap after saving authorization recovers without replay rejection', async (t) => {
  const f = await fixture(t),
    b = f.bundle();
  const job = await f.coordinator.create(b, 'professional', 0, 'admin');
  await f.manager.importLicense(b.license, 0);
  const coordinator = new UpgradeCoordinator(f.options);
  const done = await finish(coordinator, await coordinator.advance(job.id));
  assert.equal(done.phase, 'complete', done.error);
});

test('a revision conflict before license import is recoverable with a freshly confirmed revision', async (t) => {
  const f = await fixture(t),
    job = await f.coordinator.create(f.bundle(), 'professional', 0, 'admin');
  await f.manager.update(0, () => {});
  let pending = await f.coordinator.advance(job.id);
  assert.equal(pending.phase, 'failed');
  assert.equal((await f.manager.snapshot()).edition, 'community');
  pending = await f.coordinator.advance(job.id, true, 1);
  const done = await finish(f.coordinator, pending);
  assert.equal(done.phase, 'complete', done.error);
});

test('a lost current-task checkpoint is recovered by resubmitting the same bundle', async (t) => {
  const f = await fixture(t),
    b = f.bundle(),
    atomic = f.coordinator.atomic.bind(f.coordinator);
  let once = true;
  f.coordinator.atomic = async (name, value) => {
    if (name === 'current.json' && once) {
      once = false;
      throw Error('disk interrupted');
    }
    return atomic(name, value);
  };
  await assert.rejects(
    () => f.coordinator.create(b, 'professional', 0, 'admin'),
    /disk interrupted/,
  );
  const resumed = new UpgradeCoordinator(f.options),
    job = await resumed.create(b, 'professional', 0, 'admin');
  assert.equal((await resumed.current()).id, job.id);
  const done = await finish(resumed, await resumed.advance(job.id));
  assert.equal(done.phase, 'complete', done.error);
});

test('vendor packaging CLI produces an accepted single-file upgrade without a private key', async (t) => {
  const f = await fixture(t),
    base = path.dirname(f.options.dir),
    b = f.bundle();
  await fs.writeFile(
    path.join(base, 'license.json'),
    JSON.stringify(b.license),
  );
  const components = [];
  for (let i = 0; i < b.components.length; i++) {
    const name = 'component-' + i + '.json';
    components.push(name);
    await fs.writeFile(path.join(base, name), JSON.stringify(b.components[i]));
  }
  const manifest = path.join(base, 'manifest.json'),
    output = path.join(base, 'upgrade.smcu');
  await fs.writeFile(
    manifest,
    JSON.stringify({ license: 'license.json', components }),
  );
  const exec = require('node:util').promisify(
    require('node:child_process').execFile,
  );
  const tool = path.join(__dirname, 'bundle-upgrade.cjs');
  await exec(process.execPath, [tool, manifest, output]);
  const bundle = JSON.parse(await fs.readFile(output, 'utf8'));
  assert.deepEqual(bundle, b);
  await assert.rejects(() => exec(process.execPath, [tool, manifest, output]));
  const job = await finish(
    f.coordinator,
    await f.coordinator.create(bundle, 'professional', 0, 'admin'),
  );
  assert.equal(job.phase, 'complete', job.error);
});
