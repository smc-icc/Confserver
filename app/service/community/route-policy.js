'use strict';
function requiredModule(url, params = {}) {
  if (url.includes('/community/')) return null;
  const action = params.action || url.split('/').pop() || '';
  if (/\/onboard\/hotline$/.test(url)) return 'icc';
  if (/IvrDesign/i.test(action) || /\/(callflow|itrflow)\//.test(url))
    return /\/callflow\/flows\/list$/.test(url)
      ? 'ivr'
      : /\/itrflow\/list$/.test(url)
        ? 'itr'
        : 'flow-designer';
  if (
    /\/(voice-driver|sbc-domains|sbc-route)(?:\/|$)/.test(url) ||
    /(SIPExt|Subscriber|VoiceFile|VoiceServer|SipBoard|DtiBoard|AgBoard|AccessCode|Trunk|Hmp|TelAgent|Extension|IvrRoute)/i.test(
      action,
    )
  )
    return 'icc';
  return null;
}
function guard(handler, url, getSnapshot) {
  return async function (ctx) {
    const id = requiredModule(url, ctx.paramsObj || {});
    if (id) {
      const snapshot = await getSnapshot();
      const designerList = /\/(?:itrflow\/list|callflow\/flows\/list)$/.test(url) && snapshot.modules['flow-designer']?.available;
      if (!snapshot.modules[id]?.available && !designerList) {
        ctx.status = 403;
        ctx.body = { ret_code: 403, err_msg: '对应功能模块未安装、未启用或未获授权' };
        return;
      }
    }
    return handler(ctx);
  };
}
module.exports = { requiredModule, guard };
