/** Global channel configuration requires the real singleton administrator.
 * Never infer VDN from an account-1/process default. Single-process JSON writer.
 */
const managed = () => process.env.CONF_TENANCY_ENABLED === '1';
const immutable = ['conf_id', 'omni_channel_id', 'omni_inbox_id', 'account_id', 'created_at'];
function fail(message, status = 400) { const e = new Error(message); e.status = status; throw e; }
function positive(value) {
  if (!/^[1-9]\d*$/.test(String(value)) || !Number.isSafeInteger(Number(value))) fail('必须明确指定有效 VDN');
  return Number(value);
}
function channelSelector(config, row) {
  if (!managed()) return { account_id: config.account_id };
  if (!row || row.vdn_id == null) fail('旧渠道没有已审核的 VDN 归属，禁止默认归属或自动接管', 409);
  return { vdn_id: positive(row.vdn_id) };
}
let queue = Promise.resolve();
function guardChannelController(Controller, loadConfig) {
  for (const name of Object.getOwnPropertyNames(Controller)) {
    if (typeof Controller[name] !== 'function' || ['length', 'name', 'prototype'].includes(name)) continue;
    const original = Controller[name];
    Controller[name] = async function(ctx) {
      if (!managed()) return original.call(Controller, ctx);
      if (ctx.uid !== 'admin') { ctx.status = 403; ctx.body = { code: -1, message: '仅真实认证的系统超级用户可管理全局渠道配置' }; return; }
      const run = async () => {
        try {
          const fields = { ...(ctx.request.body || {}) };
          if (name === 'create' || name === 'update' || name === 'remove') {
            const config = loadConfig();
            const type = ctx.params.channel_type || fields.channel_type;
            const prev = (config.channels[type] || []).find(r => r.conf_id === ctx.params.conf_id);
            if (name !== 'create' && !prev) fail('channel not found', 404);
            if (name === 'create') {
              if (immutable.some(k => fields[k] != null)) fail('不能指定或覆盖渠道身份/租户内部标识');
              fields.vdn_id = positive(fields.vdn_id);
            } else {
              const selector = channelSelector(config, prev);
              for (const k of immutable) if (fields[k] != null && fields[k] !== prev[k]) fail('渠道身份及归属不可通过更新修改', 409);
              if (fields.vdn_id != null && positive(fields.vdn_id) !== selector.vdn_id) fail('禁止跨 VDN 移动渠道及历史会话', 409);
              fields.vdn_id = selector.vdn_id;
            }
            for (const k of immutable) delete fields[k];
            ctx.request.body = fields;
          }
          await original.call(Controller, ctx);
          if (ctx.body && ctx.body.code === -1 && (!ctx.status || ctx.status === 200)) ctx.status = 400;
        } catch (e) {
          ctx.status = e.status || 502;
          ctx.body = { code: -1, message: e.status ? e.message : '渠道配置操作失败，请检查同步服务及服务端日志' };
        }
      };
      const next = queue.then(run, run);
      queue = next.catch(() => {});
      return next;
    };
  }
  return Controller;
}
module.exports = { managed, positive, channelSelector, guardChannelController };
