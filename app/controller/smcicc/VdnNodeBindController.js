const logger = require('../../../logger');
const Service = require('../../service/smcicc/VdnNodeBindService');

const Controller = {};

Controller.loadVdnNodeBindList = async (ctx) => {
    try {
        ctx.body = await Service.loadVdnNodeBindList(ctx);
    } catch (e) {
        logger.error('[smcicc][loadVdnNodeBindList]', e, ctx);
        ctx.body = { Rows: [] };
    }
};

module.exports = Controller;
