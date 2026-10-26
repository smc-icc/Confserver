const logger = require('../../../logger');
const Service = require('../../service/smcicc/StaticLoginService');

const Controller = {};

Controller.loadstaticLoginList = async (ctx) => {
    try {
        ctx.body = await Service.loadstaticLoginList(ctx);
    } catch (e) {
        logger.error('[smcicc][loadstaticLoginList]', e, ctx);
        ctx.body = { Rows: [], Total: 0 };
    }
};

Controller.addStaticLogin = async (ctx) => {
    try {
        ctx.body = await Service.addStaticLogin(ctx);
    } catch (e) {
        logger.error('[smcicc][addStaticLogin]', e, ctx);
        ctx.body = 0;
    }
};

Controller.editStaticLogin = async (ctx) => {
    try {
        ctx.body = await Service.editStaticLogin(ctx);
    } catch (e) {
        logger.error('[smcicc][editStaticLogin]', e, ctx);
        ctx.body = 0;
    }
};

Controller.deleteStaticLogin = async (ctx) => {
    try {
        ctx.body = await Service.deleteStaticLogin(ctx);
    } catch (e) {
        logger.error('[smcicc][deleteStaticLogin]', e, ctx);
        ctx.body = false;
    }
};

Controller.getUserByWorkNo = async (ctx) => {
    try {
        ctx.body = await Service.getUserByWorkNo(ctx);
    } catch (e) {
        logger.error('[smcicc][getUserByWorkNo]', e, ctx);
        ctx.body = [];
    }
};

Controller.getUserList = async (ctx) => {
    try {
        ctx.body = await Service.getUserList(ctx);
    } catch (e) {
        logger.error('[smcicc][getUserList]', e, ctx);
        ctx.body = [];
    }
};

Controller.copyStaticLogin = async (ctx) => {
    try {
        ctx.body = await Service.copyStaticLogin(ctx);
    } catch (e) {
        logger.error('[smcicc][copyStaticLogin]', e, ctx);
        ctx.body = false;
    }
};

module.exports = Controller;
