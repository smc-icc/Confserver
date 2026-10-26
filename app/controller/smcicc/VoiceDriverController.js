const logger = require('../../../logger');
const Service = require('../../service/smcicc/VoiceDriverService');
const { wrapOk } = require('./SMCIccWrap');

const Controller = {};

Controller.load = async (ctx) => {
    try {
        ctx.body = wrapOk(await Service.load());
    } catch (e) {
        logger.error('[smcicc][voiceDriver.load]', e);
        ctx.body = wrapOk({ ok: false, message: 'load_failed' });
    }
};

Controller.save = async (ctx) => {
    try {
        const body = (ctx.paramsObj && Object.keys(ctx.paramsObj).length) ? ctx.paramsObj : (ctx.request.body || {});
        ctx.body = wrapOk(await Service.save(body || {}));
    } catch (e) {
        logger.error('[smcicc][voiceDriver.save]', e);
        ctx.body = wrapOk({ ok: false, message: 'save_failed' });
    }
};

module.exports = Controller;
