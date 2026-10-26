const logger = require('../../../logger');
const Service = require('../../service/smcicc/SkillQueueService');

const Controller = {};

Controller.loadSkillQueueList = async (ctx) => {
    try {
        ctx.body = await Service.loadSkillQueueList(ctx);
    } catch (e) {
        logger.error('[smcicc][loadSkillQueueList]', e, ctx);
        ctx.body = { Rows: [], Total: 0 };
    }
};

Controller.addSkillQueue = async (ctx) => {
    try {
        ctx.body = await Service.addSkillQueue(ctx);
    } catch (e) {
        logger.error('[smcicc][addSkillQueue]', e, ctx);
        ctx.body = false;
    }
};

Controller.editSkillQueue = async (ctx) => {
    try {
        ctx.body = await Service.editSkillQueue(ctx);
    } catch (e) {
        logger.error('[smcicc][editSkillQueue]', e, ctx);
        ctx.body = false;
    }
};

Controller.deleteSkillQueue = async (ctx) => {
    try {
        ctx.body = await Service.deleteSkillQueue(ctx);
    } catch (e) {
        logger.error('[smcicc][deleteSkillQueue]', e, ctx);
        ctx.body = false;
    }
};

Controller.copySkillQueue = async (ctx) => {
    try {
        ctx.body = await Service.copySkillQueue(ctx);
    } catch (e) {
        logger.error('[smcicc][copySkillQueue]', e, ctx);
        ctx.body = false;
    }
};

Controller.loadQueueGroupList = async (ctx) => {
    try {
        ctx.body = await Service.loadQueueGroupList(ctx);
    } catch (e) {
        logger.error('[smcicc][loadQueueGroupList]', e, ctx);
        ctx.body = [];
    }
};

Controller.loadQueueSkillList = async (ctx) => {
    try {
        ctx.body = await Service.loadQueueSkillList(ctx);
    } catch (e) {
        logger.error('[smcicc][loadQueueSkillList]', e, ctx);
        ctx.body = [];
    }
};

Controller.loadBrimGroupList = async (ctx) => {
    try {
        ctx.body = await Service.loadBrimGroupList(ctx);
    } catch (e) {
        logger.error('[smcicc][loadBrimGroupList]', e, ctx);
        ctx.body = [];
    }
};

Controller.loadBrimSkillList = async (ctx) => {
    try {
        ctx.body = await Service.loadBrimSkillList(ctx);
    } catch (e) {
        logger.error('[smcicc][loadBrimSkillList]', e, ctx);
        ctx.body = [];
    }
};

Controller.loadMatchGroupEle = async (ctx) => {
    try {
        ctx.body = await Service.loadMatchGroupEle(ctx);
    } catch (e) {
        logger.error('[smcicc][loadMatchGroupEle]', e, ctx);
        ctx.body = [];
    }
};

Controller.loadPolicyGroup = async (ctx) => {
    try {
        ctx.body = await Service.loadPolicyGroup(ctx);
    } catch (e) {
        logger.error('[smcicc][loadPolicyGroup]', e, ctx);
        ctx.body = [];
    }
};

Controller.loadQueueOverBrim = async (ctx) => {
    try {
        ctx.body = await Service.loadQueueOverBrim(ctx);
    } catch (e) {
        logger.error('[smcicc][loadQueueOverBrim]', e, ctx);
        ctx.body = [];
    }
};

Controller.loadQueueOverTime = async (ctx) => {
    try {
        ctx.body = await Service.loadQueueOverTime(ctx);
    } catch (e) {
        logger.error('[smcicc][loadQueueOverTime]', e, ctx);
        ctx.body = [];
    }
};

Controller.loadQueueList = async (ctx) => {
    try {
        ctx.body = await Service.loadQueueList(ctx);
    } catch (e) {
        logger.error('[smcicc][loadQueueList]', e, ctx);
        ctx.body = [];
    }
};

Controller.loadQueueOTList = async (ctx) => {
    try {
        ctx.body = await Service.loadQueueOTList(ctx);
    } catch (e) {
        logger.error('[smcicc][loadQueueOTList]', e, ctx);
        ctx.body = [];
    }
};

Controller.loadQueueOverBrimList = async (ctx) => {
    try {
        ctx.body = await Service.loadQueueOverBrimList(ctx);
    } catch (e) {
        logger.error('[smcicc][loadQueueOverBrimList]', e, ctx);
        ctx.body = { Rows: [], Total: 0 };
    }
};

Controller.loadQueueOverTimeList = async (ctx) => {
    try {
        ctx.body = await Service.loadQueueOverTimeList(ctx);
    } catch (e) {
        logger.error('[smcicc][loadQueueOverTimeList]', e, ctx);
        ctx.body = { Rows: [], Total: 0 };
    }
};

Controller.addQueueOverBrim = async (ctx) => {
    try {
        ctx.body = await Service.addQueueOverBrim(ctx);
    } catch (e) {
        logger.error('[smcicc][addQueueOverBrim]', e, ctx);
        ctx.body = false;
    }
};

Controller.editQueueOverBrim = async (ctx) => {
    try {
        ctx.body = await Service.editQueueOverBrim(ctx);
    } catch (e) {
        logger.error('[smcicc][editQueueOverBrim]', e, ctx);
        ctx.body = false;
    }
};

Controller.copyQueueOverBrim = async (ctx) => {
    try {
        ctx.body = await Service.copyQueueOverBrim(ctx);
    } catch (e) {
        logger.error('[smcicc][copyQueueOverBrim]', e, ctx);
        ctx.body = false;
    }
};

Controller.deleteQueueOverBrim = async (ctx) => {
    try {
        ctx.body = await Service.deleteQueueOverBrim(ctx);
    } catch (e) {
        logger.error('[smcicc][deleteQueueOverBrim]', e, ctx);
        ctx.body = { qobId: '', result: 0 };
    }
};

Controller.addQueueOverTime = async (ctx) => {
    try {
        ctx.body = await Service.addQueueOverTime(ctx);
    } catch (e) {
        logger.error('[smcicc][addQueueOverTime]', e, ctx);
        ctx.body = false;
    }
};

Controller.editQueueOverTime = async (ctx) => {
    try {
        ctx.body = await Service.editQueueOverTime(ctx);
    } catch (e) {
        logger.error('[smcicc][editQueueOverTime]', e, ctx);
        ctx.body = false;
    }
};

Controller.copyQueueOverTime = async (ctx) => {
    try {
        ctx.body = await Service.copyQueueOverTime(ctx);
    } catch (e) {
        logger.error('[smcicc][copyQueueOverTime]', e, ctx);
        ctx.body = false;
    }
};

Controller.deleteQueueOverTime = async (ctx) => {
    try {
        ctx.body = await Service.deleteQueueOverTime(ctx);
    } catch (e) {
        logger.error('[smcicc][deleteQueueOverTime]', e, ctx);
        ctx.body = { qotId: '', result: 0 };
    }
};

Controller.loadAppTypeList = async (ctx) => {
    try {
        ctx.body = await Service.loadAppTypeList(ctx);
    } catch (e) {
        logger.error('[smcicc][loadAppTypeList]', e, ctx);
        ctx.body = [];
    }
};

module.exports = Controller;
