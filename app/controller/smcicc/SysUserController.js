const logger = require('../../../logger');
const Service = require('../../service/smcicc/SysUserService');

const C = {};

C.loadUserList = async (ctx) => {
    try {
        ctx.body = await Service.loadUserList(ctx);
    } catch (e) {
        logger.error('[smcicc][loadUserList]', e, ctx);
        ctx.body = { Rows: [], Total: 0 };
    }
};

C.addUser = async (ctx) => {
    try {
        ctx.body = await Service.addUser(ctx);
    } catch (e) {
        logger.error('[smcicc][addUser]', e, ctx);
        ctx.body = 0;
    }
};

C.modifyUser = async (ctx) => {
    try {
        ctx.body = await Service.modifyUser(ctx);
    } catch (e) {
        logger.error('[smcicc][modifyUser]', e, ctx);
        ctx.body = 0;
    }
};

C.deleteUsers = async (ctx) => {
    try {
        ctx.body = await Service.deleteUsers(ctx);
    } catch (e) {
        logger.error('[smcicc][deleteUsers]', e, ctx);
        ctx.body = false;
    }
};

C.copyUser = async (ctx) => {
    try {
        ctx.body = await Service.copyUser(ctx);
    } catch (e) {
        logger.error('[smcicc][copyUser]', e, ctx);
        ctx.body = false;
    }
};

C.getSysUserCount = async (ctx) => {
    try {
        ctx.body = await Service.getSysUserCount(ctx);
    } catch (e) {
        logger.error('[smcicc][getSysUserCount]', e, ctx);
        ctx.body = 0;
    }
};

C.getUserList = async (ctx) => {
    try {
        ctx.body = await Service.getUserList(ctx);
    } catch (e) {
        logger.error('[smcicc][getUserList]', e, ctx);
        ctx.body = [];
    }
};

module.exports = C;
