const test = require('node:test'),
  assert = require('node:assert/strict');
const { createTarsAdapter } = require('../app/service/community/tars-adapter');
test('preflight accepts an existing TARS findOne patch record', async () => {
  let query;
  const adapter = createTarsAdapter({
    patches: { find: async (q) => ((query = q), { id: 7 }) },
    servers: { getServerConf: async () => [{ id: 1 }] },
    tasks: {},
    admin: {},
    configs: {},
  });
  await adapter.preflight({
    services: [
      {
        application: 'SMC',
        serverName: 'CCS',
        nodeName: 'node',
        patchId: 7,
        allowExisting: true,
      },
    ],
  });
  assert.deepEqual(query.where, { id: 7, server: 'SMC.CCS' });
});
test('resume fills missing configuration but never overwrites existing production configuration', async () => {
  const writes = [];
  const adapter = createTarsAdapter({
    patches: {},
    servers: { getServerConf: async () => [{ id: 1 }] },
    tasks: {},
    admin: {},
    configs: {
      hasConfigFile: async (p) => p.filename === 'existing.conf',
      addConfigFile: async (p) => writes.push(p),
    },
  });
  assert.equal(
    (
      await adapter.ensure(
        {
          application: 'SMC',
          serverName: 'CCS',
          nodeName: 'node',
          configs: [
            { filename: 'existing.conf', content: 'do not overwrite' },
            { filename: 'missing.conf', content: 'new' },
          ],
        },
        'admin',
      )
    ).id,
    1,
  );
  assert.equal(writes.length, 1);
  assert.equal(writes[0].filename, 'missing.conf');
  assert.equal(writes[0].force, false);
});

test('TARS missing tasks are distinct from database and RPC failures', async () => {
  let result = -1;
  const adapter = createTarsAdapter({
    servers: {},
    tasks: {},
    patches: {},
    configs: {},
    admin: { getTaskRsp: async () => result },
  });
  assert.deepEqual(await adapter.task('task'), { missing: true });
  result = -3;
  await assert.rejects(() => adapter.task('task'));
  result = { status: 2 };
  assert.equal((await adapter.task('task')).status, 2);
});
test('repeated TARS submissions retain task and item identities and check return codes', async () => {
  const requests = [];
  let code = 0;
  const adapter = createTarsAdapter({
    servers: {},
    tasks: {},
    patches: {},
    configs: {},
    admin: {
      addTask: async (req) => {
        requests.push(req);
        return code;
      },
    },
  });
  const spec = {
    application: 'SMC',
    serverName: 'CCS',
    nodeName: 'node',
    patchId: 1,
  };
  await adapter.submit(1, 'patch_tars', spec, 'abc', 'admin');
  await adapter.submit(1, 'patch_tars', spec, 'abc', 'admin');
  assert.equal(
    requests[0].taskItemReq[0].itemNo,
    requests[1].taskItemReq[0].itemNo,
  );
  assert.equal(requests[0].taskNo, 'abc');
  code = -3;
  await assert.rejects(() =>
    adapter.submit(1, 'patch_tars', spec, 'abc', 'admin'),
  );
});
