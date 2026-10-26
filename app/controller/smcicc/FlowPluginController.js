'use strict';
const { runtime } = require('../../service/community/runtime');
const { action, admin } = require('../../service/community/http');
const { fail } = require('../../service/community/policy');
function dispatch(tool, name) {
  return action(async (ctx) => {
    await admin(ctx);
    const handlers = await runtime().plugins.handlers();
    if (typeof handlers[tool]?.[name] !== 'function')
      fail('插件接口不存在', 404);
    await handlers[tool][name](ctx);
  });
}
const ivr = new Proxy({}, { get: (_t, name) => dispatch('ivr', name) }),
  itr = new Proxy({}, { get: (_t, name) => dispatch('itr', name) });
module.exports = { ivr, itr, dispatch };
