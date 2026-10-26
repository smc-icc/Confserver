const logger = require('../../../logger');
const Service = require('../../service/smcicc/AcdService');

const Controller = {};

Controller.loadAcdList = async (ctx) => {
    try {
        ctx.body = await Service.loadAcdList(ctx);
    } catch (e) {
        logger.error('[smcicc][loadAcdList]', e, ctx);
        ctx.body = { Rows: [], Total: 0 };
    }
};

Controller.addAcd = async (ctx) => {
    try {
        ctx.body = await Service.addAcd(ctx);
    } catch (e) {
        logger.error('[smcicc][addAcd]', e, ctx);
        ctx.body = 0;
    }
};

Controller.editAcd = async (ctx) => {
    try {
        ctx.body = await Service.editAcd(ctx);
    } catch (e) {
        logger.error('[smcicc][editAcd]', e, ctx);
        ctx.body = 0;
    }
};

Controller.deleteAcd = async (ctx) => {
    try {
        ctx.body = await Service.deleteAcd(ctx);
    } catch (e) {
        logger.error('[smcicc][deleteAcd]', e, ctx);
        ctx.body = false;
    }
};

Controller.copyAcd = async (ctx) => {
    try {
        ctx.body = await Service.copyAcd(ctx);
    } catch (e) {
        logger.error('[smcicc][copyAcd]', e, ctx);
        ctx.body = false;
    }
};

Controller.getAcdByPid = async (ctx) => {
    try {
        ctx.body = await Service.getAcdByPid(ctx);
    } catch (e) {
        logger.error('[smcicc][getAcdByPid]', e, ctx);
        ctx.body = [];
    }
};

Controller.getCcsList = async (ctx) => {
    try {
        ctx.body = await Service.getCcsList(ctx);
    } catch (e) {
        logger.error('[smcicc][getCcsList]', e, ctx);
        ctx.body = [];
    }
};

Controller.getCfgFocuCommPid = async (ctx) => {
    try {
        ctx.body = await Service.getCfgFocuCommPid(ctx);
    } catch (e) {
        logger.error('[smcicc][getCfgFocuCommPid]', e, ctx);
        ctx.body = [];
    }
};

Controller.getOdbcList = async (ctx) => {
    try {
        ctx.body = await Service.getOdbcList(ctx);
    } catch (e) {
        logger.error('[smcicc][getOdbcList]', e, ctx);
        ctx.body = [];
    }
};

Controller.deployAcdXML = async (ctx) => {
    try {
        ctx.body = await Service.deployAcdXML(ctx);
    } catch (e) {
        logger.error('[smcicc][deployAcdXML]', e, ctx);
        ctx.body = { result: false, msg: '发布XML异常' };
    }
};

module.exports = Controller;
