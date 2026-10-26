const logger = require('../../../logger');
const Service = require('../../service/smcicc/IvrDesignService');

const C = {};

C.loadIvrDesignList = async (ctx) => {
    try {
        ctx.body = await Service.loadIvrDesignList(ctx);
    } catch (e) {
        logger.error('[smcicc][loadIvrDesignList]', e, ctx);
        ctx.body = { Rows: [], Total: 0 };
    }
};

C.addIvrDesign = async (ctx) => {
    try {
        ctx.body = await Service.addIvrDesign(ctx);
    } catch (e) {
        logger.error('[smcicc][addIvrDesign]', e, ctx);
        ctx.body = 0;
    }
};

C.editIvrDesign = async (ctx) => {
    try {
        ctx.body = await Service.editIvrDesign(ctx);
    } catch (e) {
        logger.error('[smcicc][editIvrDesign]', e, ctx);
        ctx.body = 0;
    }
};

C.deleteIvrDesign = async (ctx) => {
    try {
        ctx.body = await Service.deleteIvrDesign(ctx);
    } catch (e) {
        logger.error('[smcicc][deleteIvrDesign]', e, ctx);
        ctx.body = false;
    }
};

C.copyIvrDesign = async (ctx) => {
    try {
        ctx.body = await Service.copyIvrDesign(ctx);
    } catch (e) {
        logger.error('[smcicc][copyIvrDesign]', e, ctx);
        ctx.body = false;
    }
};

C.deployIvrDesignXML = async (ctx) => {
    try {
        ctx.body = await Service.deployIvrDesignXML(ctx);
    } catch (e) {
        logger.error('[smcicc][deployIvrDesignXML]', e, ctx);
        ctx.body = { result: false, msg: '发布XML异常' };
    }
};

module.exports = C;
