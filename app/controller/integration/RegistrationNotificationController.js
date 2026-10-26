'use strict';
const safeErrors = require('../../service/integration/RegistrationNotificationErrors');
const delivery = require('../../service/integration/VdnRegistrationDelivery');
const messages = {
  400: '配置或测试参数不正确，请检查必填项、SMTP 地址及短信网关格式',
  409: '配置已被其他页面更新，请刷新后重新填写',
  429: '测试发送过于频繁，请等待 30 秒后重试',
  503: '注册通知服务暂不可用，请检查 Omni 服务、同步凭据及配置加密密钥',
  502: '发送服务未接受请求，请检查帐号、模板、目标地址或网络后重试',
};
function createController(service = delivery) {
  const controller = {};
  for (const [action, method] of Object.entries({ get: 'getConfig', save: 'saveConfig', test: 'test' })) {
    controller[action] = async ctx => {
      ctx.set('Cache-Control', 'no-store');
      if (ctx.uid !== 'admin') { ctx.status = 403; ctx.body = { ret_code: 403, err_msg: '仅超级管理员可管理注册通知配置' }; return; }
      try {
        const result = await service[method](ctx.request.body || {});
        ctx.body = { ret_code: 200, data: result };
      } catch (error) {
        const status = Object.hasOwn(messages, error.status) ? error.status : 502;
        ctx.status = status;
        const code = typeof error.code === 'string' && Object.hasOwn(safeErrors, error.code) ? error.code : null;
        ctx.body = { ret_code: status, err_msg: code ? safeErrors[code] : messages[status], ...(code ? {err_code: code} : {}) };
      }
    };
  }
  return controller;
}
module.exports = { ...createController(), createController };
