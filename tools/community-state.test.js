const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const os = require('node:os');
const fs = require('node:fs/promises');
const path = require('node:path');
const { CommunityManager } = require('../app/service/community/state');
const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
const sign = (payload) => {
  const data = Buffer.from(JSON.stringify(payload));
  return {
    payload: data.toString('base64'),
    signature: crypto.sign(null, data, privateKey).toString('base64'),
  };
};
const license = (extra = {}) =>
  sign({
    kind: 'smc-license/1',
    deploymentId: 'test',
    licenseId: 'test-1',
    revision: 1,
    edition: 'enterprise',
    notBefore: '2026-01-01T00:00:00Z',
    expiresAt: '2027-01-01T00:00:00Z',
    modules: ['icc', 'ivr', 'itr', 'outbound', 'aiqc', 'flow-designer'],
    limits: { voiceSeats: 20, sipTrunks: 10 },
    ...extra,
  });
async function fixture(t) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'smc-community-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  return new CommunityManager({
    dir,
    deploymentId: 'test',
    licensePublicKey: publicKey,
    now: () => Date.parse('2026-10-20T00:00:00Z'),
  });
}
test('Community is usable without a license and denies commercial modules', async (t) => {
  const m = await fixture(t);
  const s = await m.snapshot();
  assert.equal(s.edition, 'community');
  assert.equal(s.modules.omni.available, true);
  assert.equal(s.modules.icc.available, false);
  assert.equal(s.modules['flow-designer'].available, false);
});
test('signed license, installation, enablement and role are independent', async (t) => {
  const m = await fixture(t);
  await m.importLicense(license(), 0);
  assert.equal((await m.snapshot()).modules.icc.available, false);
  await m.markInstalled('icc', { version: '1.0.0' });
  await m.setEnabled('icc', true, 2);
  const s = await m.snapshot();
  assert.equal(s.modules.icc.available, true);
  assert.equal(s.limits.voiceSeats, 20);
  assert.equal(s.revision, 3);
});
test('registered never grants designers even if the signed feature list includes one', async (t) => {
  const m = await fixture(t);
  await m.importLicense(
    license({
      edition: 'registered',
      limits: { voiceSeats: 999, sipTrunks: 999 },
    }),
    0,
  );
  await assert.rejects(
    () => m.markInstalled('flow-designer', { version: '1.0.0' }),
    /enterprise|企业/,
  );
  const s = await m.snapshot();
  assert.equal(s.limits.voiceSeats, 2);
  assert.equal(s.limits.sipTrunks, 2);
  assert.equal(s.modules.outbound.licensed, false);
  assert.equal(s.modules.aiqc.licensed, false);
});
test('wrong signature, wrong deployment, expiry and replay preserve current state', async (t) => {
  const m = await fixture(t);
  await m.importLicense(license(), 0);
  const bad = license({ revision: 2 });
  bad.signature = Buffer.alloc(64).toString('base64');
  await assert.rejects(() => m.importLicense(bad, 1));
  await assert.rejects(() =>
    m.importLicense(license({ revision: 2, deploymentId: 'other' }), 1),
  );
  await assert.rejects(() =>
    m.importLicense(
      license({ revision: 2, expiresAt: '2020-01-01T00:00:00Z' }),
      1,
    ),
  );
  await assert.rejects(() => m.importLicense(license(), 1));
  assert.equal((await m.snapshot()).revision, 1);
});
test('state survives reload and concurrent updates cannot silently overwrite each other', async (t) => {
  const m = await fixture(t);
  await m.importLicense(license(), 0);
  const results = await Promise.allSettled([
    m.markInstalled('icc', { version: '1.0.0' }, 1),
    m.markInstalled('ivr', { version: '1.0.0' }, 1),
  ]);
  assert.equal(results.filter((x) => x.status === 'fulfilled').length, 1);
  const reload = new CommunityManager(m.options);
  assert.equal((await reload.snapshot()).revision, 2);
});
test('expiry blocks new capabilities without deleting installation records', async (t) => {
  const m = await fixture(t);
  await m.importLicense(license(), 0);
  await m.markInstalled('icc', { version: '1.0.0' });
  await m.setEnabled('icc', true, 2);
  m.options.now = () => Date.parse('2028-01-01T00:00:00Z');
  const s = await m.snapshot();
  assert.equal(s.edition, 'community');
  assert.equal(s.modules.icc.available, false);
  assert.equal(s.modules.icc.installed, true);
});

test('separate managers in the same coordinator share revision serialization', async (t) => {
  const m = await fixture(t),
    other = new CommunityManager(m.options);
  const results = await Promise.allSettled([
    m.importLicense(license(), 0),
    other.importLicense(license({ revision: 2 }), 0),
  ]);
  assert.equal(results.filter((x) => x.status === 'fulfilled').length, 1);
  assert.equal((await m.snapshot()).revision, 1);
});

test('professional and legacy registered cap seats, voice and video at two and never grant designers', async (t) => {
  for (const edition of ['professional', 'registered']) {
    const m = await fixture(t);
    await m.importLicense(
      license({
        edition,
        limits: {
          voiceSeats: 999,
          sipTrunks: 999,
          concurrentCalls: 999,
          videoConcurrentCalls: 999,
        },
      }),
      0,
    );
    const s = await m.snapshot();
    assert.deepEqual(s.limits, {
      voiceSeats: 2,
      sipTrunks: 2,
      concurrentCalls: 2,
      videoConcurrentCalls: 2,
    });
    assert.equal(s.modules['flow-designer'].licensed, false);
    assert.equal(s.modules.outbound.licensed, false);
    assert.equal(s.ivrPolicy, 'template_audio_only');
  }
});
test('enterprise preserves explicitly signed seat, voice and video quotas', async (t) => {
  const m = await fixture(t);
  const limits = {
    voiceSeats: 17,
    concurrentCalls: 31,
    videoConcurrentCalls: 5,
    sipTrunks: 4,
  };
  await m.importLicense(license({ limits }), 0);
  assert.deepEqual((await m.snapshot()).limits, limits);
});
