const test = require('node:test'),
  assert = require('node:assert/strict');
const {
  requiredModule,
  guard,
} = require('../app/service/community/route-policy');
test('legacy flow publishing cannot bypass the designer module', () => {
  assert.equal(
    requiredModule('/smcicc/systemadmin/deployIvrDesignXML'),
    'flow-designer',
  );
  assert.equal(
    requiredModule('/smcicc/proxy/systemadmin/:action', {
      action: 'addIvrDesign',
    }),
    'flow-designer',
  );
  assert.equal(requiredModule('/smcicc/itrflow/save'), 'flow-designer');
  assert.equal(requiredModule('/smcicc/itrflow/list'), 'itr');
  assert.equal(requiredModule('/smcicc/systemadmin/loadUserList'), null);
});
test('module guard rejects direct API calls and leaves base account management usable', async () => {
  let calls = 0;
  const snap = async () => ({ modules: { icc: { available: false } } });
  const c = { paramsObj: {} };
  await guard(
    async () => {
      calls++;
    },
    '/smcicc/voice-driver',
    snap,
  )(c);
  assert.equal(c.status, 403);
  assert.equal(calls, 0);
  await guard(
    async () => {
      calls++;
    },
    '/smcicc/systemadmin/loadUserList',
    snap,
  )(c);
  assert.equal(calls, 1);
});

test('enterprise designers can list local flows before runtime components are installed', async () => {
  let calls = 0;
  const snapshot = async () => ({ modules: { ivr: { available: false }, itr: { available: false }, icc: { available: false }, 'flow-designer': { available: true } } });
  for (const url of ['/smcicc/itrflow/list', '/smcicc/callflow/flows/list']) {
    const ctx = { paramsObj: {} };
    await guard(async () => { calls++; }, url, snapshot)(ctx);
    assert.notEqual(ctx.status, 403);
  }
  assert.equal(calls, 2);
  const ctx = { paramsObj: {} };
  await guard(async () => { calls++; }, '/smcicc/voice-driver', snapshot)(ctx);
  assert.equal(ctx.status, 403); assert.equal(calls, 2);
});
