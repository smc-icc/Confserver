const logger = require('../../../logger');
const Service = require('../../service/smcicc/VdnService');

const Controller = {};

Controller.loadVdnListJoin = async (ctx) => {
    try {
        ctx.body = await Service.loadVdnListJoin(ctx);
    } catch (e) {
        logger.error('[smcicc][loadVdnListJoin]', e, ctx);
        ctx.body = { Rows: [], Total: 0 };
    }
};

Controller.loadAllVdns = async (ctx) => {
    try {
        ctx.body = await Service.loadAllVdns(ctx);
    } catch (e) {
        logger.error('[smcicc][loadAllVdns]', e, ctx);
        ctx.body = { Rows: [] };
    }
};

Controller.addVdn = async (ctx) => {
    try {
        ctx.body = await Service.addVdn(ctx);
    } catch (e) {
        logger.error('[smcicc][addVdn]', e, ctx);
        ctx.body = 0;
    }
};

Controller.selectOneByVdnId = async (ctx) => {
    try {
        ctx.body = await Service.selectOneByVdnId(ctx);
    } catch (e) {
        logger.error('[smcicc][selectOneByVdnId]', e, ctx);
        ctx.body = { vdn: null };
    }
};

Controller.checkAccessCodeByVdnId = async (ctx) => {
    try {
        ctx.body = await Service.checkAccessCodeByVdnId(ctx);
    } catch (e) {
        logger.error('[smcicc][checkAccessCodeByVdnId]', e, ctx);
        ctx.body = { accessCodeIds: '' };
    }
};

Controller.editVdn = async (ctx) => {
    try {
        ctx.body = await Service.editVdn(ctx);
    } catch (e) {
        logger.error('[smcicc][editVdn]', e, ctx);
        ctx.body = { result: 0, list: [] };
    }
};

Controller.deleteVdn = async (ctx) => {
    try {
        ctx.body = await Service.deleteVdn(ctx);
    } catch (e) {
        logger.error('[smcicc][deleteVdn]', e, ctx);
        ctx.body = { data: [] };
    }
};

Controller.checkVdnId = async (ctx) => {
    try {
        ctx.body = await Service.checkVdnId(ctx);
    } catch (e) {
        logger.error('[smcicc][checkVdnId]', e, ctx);
        ctx.body = 0;
    }
};

Controller.checkVdnName = async (ctx) => {
    try {
        ctx.body = await Service.checkVdnName(ctx);
    } catch (e) {
        logger.error('[smcicc][checkVdnName]', e, ctx);
        ctx.body = 0;
    }
};

Controller.loadUserByVdn = async (ctx) => {
    try {
        ctx.body = await Service.loadUserByVdn(ctx);
    } catch (e) {
        logger.error('[smcicc][loadUserByVdn]', e, ctx);
        ctx.body = { Rows: [], Total: 0 };
    }
};

Controller.addVdnUser = async (ctx) => {
    try {
        ctx.body = await Service.addVdnUser(ctx);
    } catch (e) {
        logger.error('[smcicc][addVdnUser]', e, ctx);
        ctx.body = 0;
    }
};

Controller.copyVdnUser = async (ctx) => {
    try {
        ctx.body = await Service.copyVdnUser(ctx);
    } catch (e) {
        logger.error('[smcicc][copyVdnUser]', e, ctx);
        ctx.body = 0;
    }
};

Controller.editVdnUser = async (ctx) => {
    try {
        ctx.body = await Service.editVdnUser(ctx);
    } catch (e) {
        logger.error('[smcicc][editVdnUser]', e, ctx);
        ctx.body = 0;
    }
};

Controller.deleteVdnUser = async (ctx) => {
    try {
        ctx.body = await Service.deleteVdnUser(ctx);
    } catch (e) {
        logger.error('[smcicc][deleteVdnUser]', e, ctx);
        ctx.body = 0;
    }
};

module.exports = Controller;
