const { mutationGuard } = require('../integration/VdnAccessController');
const Alloc = require('../../service/smcicc/WorkNoAllocService');

function fail(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  throw error;
}

function fields(input, allowed) {
  if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some(key => !allowed.includes(key))) {
    fail('请求字段不正确');
  }
  return input;
}

function createController(service) {
  const resolve = () => service || Alloc.getService();
  const actions = {
    policy: ['policy', ['vdnId'], true],
    apply: ['apply', ['vdnId', 'startNo', 'endNo', 'reason']],
    withdraw: ['withdraw', ['id']],
    adminList: ['adminList', [], true],
    review: ['review', ['id', 'decision', 'note']],
    grant: ['grant', ['vdnId', 'startNo', 'endNo']],
    shield: ['shield', ['startNo', 'endNo']],
    revoke: ['revoke', ['id']],
  };
  const controller = {};
  for (const [name, [method, allowed, isGet]] of Object.entries(actions)) {
    controller[name] = async ctx => {
      try {
        if (!ctx.uid) fail('请先登录', 401);
        if (!isGet) mutationGuard(ctx);
        const value = isGet ? { ...(ctx.query || {}) } : (ctx.request.body || {});
        delete value.ticket;
        const body = fields(value, allowed);
        ctx.paramsObj = body;
        const data = await resolve()[method](ctx, body);
        if (ctx.set) ctx.set('Cache-Control', 'no-store');
        ctx.body = { ret_code: 200, data };
      } catch (error) {
        ctx.status = error.status || 503;
        ctx.body = { ret_code: ctx.status, err_msg: error.status ? error.message : '工号分配操作失败，请稍后重试' };
      }
    };
  }
  return controller;
}

module.exports = { ...createController(), createController };
