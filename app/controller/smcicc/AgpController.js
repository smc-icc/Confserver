const logger = require('../../../logger');
const Service = require('../../service/smcicc/AgpService');

const Controller = {};

Controller.loadAgpList = async (ctx) => {
    try {
        ctx.body = await Service.loadAgpList(ctx);
    } catch (e) {
        logger.error('[smcicc][loadAgpList]', e, ctx);
        ctx.body = { agpList: [] };
    }
};

Controller.loadAccessMachineList2 = async (ctx) => {
    try {
        ctx.body = await Service.loadAccessMachineList2(ctx);
    } catch (e) {
        logger.error('[smcicc][loadAccessMachineList2]', e, ctx);
        ctx.body = { focuCommList: [] };
    }
};

Controller.loadFocuCommList2 = async (ctx) => {
    try {
        ctx.body = await Service.loadFocuCommList2(ctx);
    } catch (e) {
        logger.error('[smcicc][loadFocuCommList2]', e, ctx);
        ctx.body = { focuCommList: [] };
    }
};

Controller.loadCcsList2 = async (ctx) => {
    try {
        ctx.body = await Service.loadCcsList2(ctx);
    } catch (e) {
        logger.error('[smcicc][loadCcsList2]', e, ctx);
        ctx.body = { ccsList: [] };
    }
};

Controller.loadAcdList2 = async (ctx) => {
    try {
        ctx.body = await Service.loadAcdList2(ctx);
    } catch (e) {
        logger.error('[smcicc][loadAcdList2]', e, ctx);
        ctx.body = { acdList: [] };
    }
};

Controller.loadAgp = async (ctx) => {
    try {
        ctx.body = await Service.loadAgp(ctx);
    } catch (e) {
        logger.error('[smcicc][loadAgp]', e, ctx);
        ctx.body = { agp: null };
    }
};

Controller.addAgp = async (ctx) => {
    try {
        ctx.body = await Service.addAgp(ctx);
    } catch (e) {
        logger.error('[smcicc][addAgp]', e, ctx);
        ctx.body = { result: 0, agp: null };
    }
};

Controller.saveAgpForm = async (ctx) => {
    try {
        ctx.body = await Service.saveAgpForm(ctx);
    } catch (e) {
        logger.error('[smcicc][saveAgpForm]', e, ctx);
        ctx.body = { result: 0, agp: null };
    }
};

Controller.deleteAgp = async (ctx) => {
    try {
        ctx.body = await Service.deleteAgp(ctx);
    } catch (e) {
        logger.error('[smcicc][deleteAgp]', e, ctx);
        ctx.body = 0;
    }
};

Controller.copyAgp = async (ctx) => {
    try {
        ctx.body = await Service.copyAgp(ctx);
    } catch (e) {
        logger.error('[smcicc][copyAgp]', e, ctx);
        ctx.body = { result: -1, agp: null };
    }
};

Controller.deployAgpXML = async (ctx) => {
    try {
        ctx.body = await Service.deployAgpXML(ctx);
    } catch (e) {
        logger.error('[smcicc][deployAgpXML]', e, ctx);
        ctx.body = { result: false, msg: '发布XML异常' };
    }
};

module.exports = Controller;
