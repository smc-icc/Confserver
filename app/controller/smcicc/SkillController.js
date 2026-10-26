const logger = require('../../../logger');
const Service = require('../../service/smcicc/SkillService');

const Controller = {};

Controller.initSkill = async (ctx) => {
    try {
        ctx.body = await Service.initSkill(ctx);
    } catch (e) {
        logger.error('[smcicc][initSkill]', e, ctx);
        ctx.body = { Rows: [], Total: 0 };
    }
};

Controller.loadSkillList = async (ctx) => {
    try {
        ctx.body = await Service.loadSkillList(ctx);
    } catch (e) {
        logger.error('[smcicc][loadSkillList]', e, ctx);
        ctx.body = [];
    }
};

Controller.addSkill = async (ctx) => {
    try {
        ctx.body = await Service.addSkill(ctx);
    } catch (e) {
        logger.error('[smcicc][addSkill]', e, ctx);
        ctx.body = 0;
    }
};

Controller.getTIcipSkillById = async (ctx) => {
    try {
        ctx.body = await Service.getTIcipSkillById(ctx);
    } catch (e) {
        logger.error('[smcicc][getTIcipSkillById]', e, ctx);
        ctx.body = {};
    }
};

Controller.editSkill = async (ctx) => {
    try {
        ctx.body = await Service.editSkill(ctx);
    } catch (e) {
        logger.error('[smcicc][editSkill]', e, ctx);
        ctx.body = 0;
    }
};

Controller.deleteSkill = async (ctx) => {
    try {
        ctx.body = await Service.deleteSkill(ctx);
    } catch (e) {
        logger.error('[smcicc][deleteSkill]', e, ctx);
        ctx.body = false;
    }
};

Controller.getSkillAlternativeData = async (ctx) => {
    try {
        ctx.body = await Service.getSkillAlternativeData(ctx);
    } catch (e) {
        logger.error('[smcicc][getSkillAlternativeData]', e, ctx);
        ctx.body = { Rows: [], Total: 0 };
    }
};

Controller.getSkillSelectedData = async (ctx) => {
    try {
        ctx.body = await Service.getSkillSelectedData(ctx);
    } catch (e) {
        logger.error('[smcicc][getSkillSelectedData]', e, ctx);
        ctx.body = { Rows: [], Total: 0 };
    }
};

Controller.insertToSkill = async (ctx) => {
    try {
        ctx.body = await Service.insertToSkill(ctx);
    } catch (e) {
        logger.error('[smcicc][insertToSkill]', e, ctx);
        ctx.body = false;
    }
};

Controller.removeFromSkill = async (ctx) => {
    try {
        ctx.body = await Service.removeFromSkill(ctx);
    } catch (e) {
        logger.error('[smcicc][removeFromSkill]', e, ctx);
        ctx.body = false;
    }
};

Controller.loadMediaTypeList = async (ctx) => {
    try {
        ctx.body = await Service.loadMediaTypeList(ctx);
    } catch (e) {
        logger.error('[smcicc][loadMediaTypeList]', e, ctx);
        ctx.body = [];
    }
};

Controller.loadSkillBusinessTypeList = async (ctx) => {
    try {
        ctx.body = await Service.loadSkillBusinessTypeList(ctx);
    } catch (e) {
        logger.error('[smcicc][loadSkillBusinessTypeList]', e, ctx);
        ctx.body = [];
    }
};

Controller.loadSkillElementList = async (ctx) => {
    try {
        ctx.body = await Service.loadSkillElementList(ctx);
    } catch (e) {
        logger.error('[smcicc][loadSkillElementList]', e, ctx);
        ctx.body = [];
    }
};

Controller.updateSkillAutoCheckIn = async (ctx) => {
    try {
        ctx.body = await Service.updateSkillAutoCheckIn(ctx);
    } catch (e) {
        logger.error('[smcicc][updateSkillAutoCheckIn]', e, ctx);
        ctx.body = false;
    }
};

module.exports = Controller;
