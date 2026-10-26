const logger = require('../../../logger');
const Service = require('../../service/smcicc/CcsService');

const Controller = {};

Controller.loadCcsRunModeList = async (ctx) => {
    try {
        ctx.body = await Service.loadCcsRunModeList(ctx);
    } catch (e) {
        logger.error('[smcicc][loadCcsRunModeList]', e, ctx);
        ctx.body = [];
    }
};

Controller.loadFocuCommList = async (ctx) => {
    try {
        ctx.body = await Service.loadFocuCommList(ctx);
    } catch (e) {
        logger.error('[smcicc][loadFocuCommList]', e, ctx);
        ctx.body = [];
    }
};

Controller.loadSysVoiceList = async (ctx) => {
    try {
        ctx.body = await Service.loadSysVoiceList(ctx);
    } catch (e) {
        logger.error('[smcicc][loadSysVoiceList]', e, ctx);
        ctx.body = [];
    }
};

Controller.loadCcsOdbcList = async (ctx) => {
    try {
        ctx.body = await Service.loadCcsOdbcList(ctx);
    } catch (e) {
        logger.error('[smcicc][loadCcsOdbcList]', e, ctx);
        ctx.body = [];
    }
};

Controller.addCcs = async (ctx) => {
    try {
        ctx.body = await Service.addCcs(ctx);
    } catch (e) {
        logger.error('[smcicc][addCcs]', e, ctx);
        ctx.body = -1;
    }
};

Controller.loadCcs = async (ctx) => {
    try {
        ctx.body = await Service.loadCcs(ctx);
    } catch (e) {
        logger.error('[smcicc][loadCcs]', e, ctx);
        ctx.body = null;
    }
};

Controller.modifyCcs = async (ctx) => {
    try {
        ctx.body = await Service.modifyCcs(ctx);
    } catch (e) {
        logger.error('[smcicc][modifyCcs]', e, ctx);
        ctx.body = { result: -1, ccs: null };
    }
};

Controller.deleteCcs = async (ctx) => {
    try {
        ctx.body = await Service.deleteCcs(ctx);
    } catch (e) {
        logger.error('[smcicc][deleteCcs]', e, ctx);
        ctx.body = '-2';
    }
};

Controller.copyCcs = async (ctx) => {
    try {
        ctx.body = await Service.copyCcs(ctx);
    } catch (e) {
        logger.error('[smcicc][copyCcs]', e, ctx);
        ctx.body = null;
    }
};

Controller.deployCcsXML = async (ctx) => {
    try {
        ctx.body = await Service.deployCcsXML(ctx);
    } catch (e) {
        logger.error('[smcicc][deployCcsXML]', e, ctx);
        ctx.body = { result: false, msg: '发布XML异常' };
    }
};

Controller.loadCcs4ChList = async (ctx) => {
    try {
        ctx.body = await Service.loadCcs4ChList(ctx);
    } catch (e) {
        logger.error('[smcicc][loadCcs4ChList]', e, ctx);
        ctx.body = { Rows: [], Total: 0 };
    }
};

Controller.addCcs4Ch = async (ctx) => {
    try {
        ctx.body = await Service.addCcs4Ch(ctx);
    } catch (e) {
        logger.error('[smcicc][addCcs4Ch]', e, ctx);
        ctx.body = -1;
    }
};

Controller.modifyCcs4Ch = async (ctx) => {
    try {
        ctx.body = await Service.modifyCcs4Ch(ctx);
    } catch (e) {
        logger.error('[smcicc][modifyCcs4Ch]', e, ctx);
        ctx.body = -1;
    }
};

Controller.deleteCcs4Chs = async (ctx) => {
    try {
        ctx.body = await Service.deleteCcs4Chs(ctx);
    } catch (e) {
        logger.error('[smcicc][deleteCcs4Chs]', e, ctx);
        ctx.body = false;
    }
};

Controller.loadCcs4AgList = async (ctx) => {
    try {
        ctx.body = await Service.loadCcs4AgList(ctx);
    } catch (e) {
        logger.error('[smcicc][loadCcs4AgList]', e, ctx);
        ctx.body = { Rows: [], Total: 0 };
    }
};

Controller.addCcs4Ag = async (ctx) => {
    try {
        ctx.body = await Service.addCcs4Ag(ctx);
    } catch (e) {
        logger.error('[smcicc][addCcs4Ag]', e, ctx);
        ctx.body = -1;
    }
};

Controller.modifyCcs4Ag = async (ctx) => {
    try {
        ctx.body = await Service.modifyCcs4Ag(ctx);
    } catch (e) {
        logger.error('[smcicc][modifyCcs4Ag]', e, ctx);
        ctx.body = -1;
    }
};

Controller.deleteCcs4Ags = async (ctx) => {
    try {
        ctx.body = await Service.deleteCcs4Ags(ctx);
    } catch (e) {
        logger.error('[smcicc][deleteCcs4Ags]', e, ctx);
        ctx.body = false;
    }
};

module.exports = Controller;
