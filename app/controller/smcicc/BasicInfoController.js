const logger = require('../../../logger');
const Service = require('../../service/smcicc/BasicInfoService');

const Controller = {};

/** Struts root=vdn：JSON 根即为 vdn 对象 */
Controller.loadBasicInfo = async (ctx) => {
    try {
        const vdn = await Service.loadBasicInfo(ctx);
        ctx.body = vdn;
    } catch (e) {
        logger.error('[smcicc][loadBasicInfo]', e, ctx);
        ctx.body = null;
    }
};

/** Struts root=m_OutBoolean */
Controller.modifyBasicInfo = async (ctx) => {
    try {
        ctx.body = await Service.modifyBasicInfo(ctx);
    } catch (e) {
        logger.error('[smcicc][modifyBasicInfo]', e, ctx);
        ctx.body = false;
    }
};

/** Struts root=m_OutBoolean */
Controller.checkVdnNameExist = async (ctx) => {
    try {
        ctx.body = await Service.checkVdnNameExist(ctx);
    } catch (e) {
        logger.error('[smcicc][checkVdnNameExist]', e, ctx);
        ctx.body = false;
    }
};

module.exports = Controller;
