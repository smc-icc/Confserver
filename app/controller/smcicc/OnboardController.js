const logger = require('../../../logger');
const OnboardService = require('../../service/smcicc/OnboardService');
const { wrapOk } = require('./SMCIccWrap');

const Provision = require('../../service/smcicc/OnboardProvisionService');
const Controller = {};

function fail(ctx, e) {
    const status = e && e.status ? e.status : 500;
    const msg = status >= 500 ? '开通操作未完成，请稍后重试或检查服务状态' : ((e && e.message) || '请求失败');
    if (status >= 500) {
        logger.error('[onboard] request failed', { status, actor: ctx.uid, path: ctx.path });
    }
    ctx.status = status;
    ctx.body = { ret_code: status, err_msg: msg };
}

Controller.status = async (ctx) => {
    try {
        ctx.body = wrapOk(await OnboardService.getStatus(ctx));
    } catch (e) {
        fail(ctx, e);
    }
};

Controller.adminPassword = async (ctx) => {
    try {
        ctx.body = wrapOk(await OnboardService.changeAdminPassword(ctx));
    } catch (e) {
        fail(ctx, e);
    }
};

Controller.firstAgent = async (ctx) => {
    try {
        ctx.body = wrapOk(await OnboardService.createFirstAgent(ctx));
    } catch (e) {
        fail(ctx, e);
    }
};

Controller.hotline = async (ctx) => {
    try {
        ctx.body = wrapOk(await OnboardService.saveHotline(ctx));
    } catch (e) {
        fail(ctx, e);
    }
};

Controller.complete = async (ctx) => {
    try {
        ctx.body = wrapOk(await OnboardService.complete(ctx));
    } catch (e) {
        fail(ctx, e);
    }
};

for (const [name, method] of Object.entries({ context: 'context', createVdn: 'createVdn', provisionStatus: 'status', assignAdmin: 'admin', retry: 'retry' })) {
    Controller[name] = async ctx => { try { ctx.body = wrapOk(await Provision[method](ctx)); } catch (e) { fail(ctx, e); } };
}
module.exports = Controller;
