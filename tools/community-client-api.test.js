const test = require('node:test'),
  assert = require('node:assert/strict');
const api = () => import('../client/src/community/api.mjs');
test('version API retains structured 400/403/409 messages for upload and recovery UI', async () => {
  const { communityRequest } = await api();
  for (const status of [400, 403, 409]) {
    await assert.rejects(
      () =>
        communityRequest('upgrade', {
          method: 'POST',
          data: { edition: 'professional' },
          fetcher: async (url, options) => {
            assert.equal(url, '/pages/server/api/smcicc/community/upgrade');
            assert.equal(options.credentials, 'same-origin');
            assert.equal(JSON.parse(options.body).edition, 'professional');
            return new Response(
              JSON.stringify({
                ret_code: status,
                err_msg: '升级包缺少功能组件：ICC 基础话务',
              }),
              { status },
            );
          },
        }),
      /升级包缺少功能组件/,
    );
  }
});
test('version API reads successful data and turns non-JSON/login responses into actionable errors', async () => {
  const { communityRequest } = await api();
  assert.deepEqual(
    await communityRequest('upgrade/current', {
      fetcher: async () =>
        new Response(JSON.stringify({ ret_code: 200, data: { job: null } })),
    }),
    { job: null },
  );
  await assert.rejects(
    () =>
      communityRequest('upgrade/current', {
        fetcher: async () => new Response('<html>login</html>'),
      }),
    /重新登录/,
  );
  await assert.rejects(
    () =>
      communityRequest('upgrade/current', {
        fetcher: async () => {
          throw Error('offline');
        },
      }),
    /网络请求失败/,
  );
});
