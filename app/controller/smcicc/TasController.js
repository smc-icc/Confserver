const logger = require('../../../logger');
const Service = require('../../service/smcicc/TasService');

const Controller = {};

Controller.loadTasList = async (ctx) => {
    try {
        ctx.body = await Service.loadTasList(ctx);
    } catch (e) {
        logger.error('[smcicc][loadTasList]', e, ctx);
        ctx.body = [];
    }
};

Controller.loadTas = async (ctx) => {
    try {
        ctx.body = await Service.loadTas(ctx);
    } catch (e) {
        logger.error('[smcicc][loadTas]', e, ctx);
        ctx.body = null;
    }
};

Controller.addTas = async (ctx) => {
    try {
        ctx.body = await Service.addTas(ctx);
    } catch (e) {
        logger.error('[smcicc][addTas]', e, ctx);
        ctx.body = -2;
    }
};

Controller.modifyTas = async (ctx) => {
    try {
        ctx.body = await Service.modifyTas(ctx);
    } catch (e) {
        logger.error('[smcicc][modifyTas]', e, ctx);
        ctx.body = { result: 0, tas: null };
    }
};

Controller.modifyTasFlag = async (ctx) => {
    try {
        ctx.body = await Service.modifyTasFlag(ctx);
    } catch (e) {
        logger.error('[smcicc][modifyTasFlag]', e, ctx);
        ctx.body = 0;
    }
};

Controller.modifyTasByPid = async (ctx) => {
    try {
        ctx.body = await Service.modifyTasByPid(ctx);
    } catch (e) {
        logger.error('[smcicc][modifyTasByPid]', e, ctx);
        ctx.body = null;
    }
};

Controller.loadTasFlag = async (ctx) => {
    try {
        ctx.body = await Service.loadTasFlag(ctx);
    } catch (e) {
        logger.error('[smcicc][loadTasFlag]', e, ctx);
        ctx.body = null;
    }
};

Controller.copyTas = async (ctx) => {
    try {
        ctx.body = await Service.copyTas(ctx);
    } catch (e) {
        logger.error('[smcicc][copyTas]', e, ctx);
        ctx.body = null;
    }
};

Controller.loadMc100 = async (ctx) => {
    try {
        ctx.body = await Service.loadMc100(ctx);
    } catch (e) {
        logger.error('[smcicc][loadMc100]', e, ctx);
        ctx.body = [];
    }
};

Controller.getMc100 = Controller.loadMc100;

Controller.deleteTas = async (ctx) => {
    try {
        ctx.body = await Service.deleteTas(ctx);
    } catch (e) {
        logger.error('[smcicc][deleteTas]', e, ctx);
        ctx.body = 0;
    }
};

Controller.getTas4Isx = async (ctx) => {
    try {
        ctx.body = await Service.getTas4Isx(ctx);
    } catch (e) {
        logger.error('[smcicc][getTas4Isx]', e, ctx);
        ctx.body = { isx: [], tas4Isx: [] };
    }
};

Controller.deployTasXML = async (ctx) => {
    try {
        ctx.body = await Service.deployTasXML(ctx);
    } catch (e) {
        logger.error('[smcicc][deployTasXML]', e, ctx);
        ctx.body = { result: false, msg: '发布XML异常' };
    }
};

module.exports = Controller;
