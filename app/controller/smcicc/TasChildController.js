const logger = require('../../../logger');
const Service = require('../../service/smcicc/TasChildService');

const C = {};

C.loadTas4SysVoiceList = async (ctx) => {
    try {
        ctx.body = await Service.loadTas4SysVoiceList(ctx);
    } catch (e) {
        logger.error('[smcicc][loadTas4SysVoiceList]', e, ctx);
        ctx.body = { Rows: [], Total: 0 };
    }
};
C.addTas4SysVoice = async (ctx) => {
    try {
        ctx.body = await Service.addTas4SysVoice(ctx);
    } catch (e) {
        logger.error('[smcicc][addTas4SysVoice]', e, ctx);
        ctx.body = 0;
    }
};
C.modifyTas4SysVoice = async (ctx) => {
    try {
        ctx.body = await Service.modifyTas4SysVoice(ctx);
    } catch (e) {
        logger.error('[smcicc][modifyTas4SysVoice]', e, ctx);
        ctx.body = 0;
    }
};
C.deleteTas4SysVoice = async (ctx) => {
    try {
        ctx.body = await Service.deleteTas4SysVoice(ctx);
    } catch (e) {
        logger.error('[smcicc][deleteTas4SysVoice]', e, ctx);
        ctx.body = false;
    }
};

C.loadTas4FxoList = async (ctx) => {
    try {
        ctx.body = await Service.loadTas4FxoList(ctx);
    } catch (e) {
        logger.error('[smcicc][loadTas4FxoList]', e, ctx);
        ctx.body = { Rows: [], Total: 0 };
    }
};
C.addTas4Fxo = async (ctx) => {
    try {
        ctx.body = await Service.addTas4Fxo(ctx);
    } catch (e) {
        logger.error('[smcicc][addTas4Fxo]', e, ctx);
        ctx.body = 0;
    }
};
C.modifyTas4Fxo = async (ctx) => {
    try {
        ctx.body = await Service.modifyTas4Fxo(ctx);
    } catch (e) {
        logger.error('[smcicc][modifyTas4Fxo]', e, ctx);
        ctx.body = 0;
    }
};
C.deleteTas4Fxo = async (ctx) => {
    try {
        ctx.body = await Service.deleteTas4Fxo(ctx);
    } catch (e) {
        logger.error('[smcicc][deleteTas4Fxo]', e, ctx);
        ctx.body = false;
    }
};
C.copyTas4Fxo = async (ctx) => {
    try {
        ctx.body = await Service.copyTas4Fxo(ctx);
    } catch (e) {
        logger.error('[smcicc][copyTas4Fxo]', e, ctx);
        ctx.body = false;
    }
};

C.loadTas4DtiList = async (ctx) => {
    try {
        ctx.body = await Service.loadTas4DtiList(ctx);
    } catch (e) {
        logger.error('[smcicc][loadTas4DtiList]', e, ctx);
        ctx.body = { Rows: [], Total: 0 };
    }
};
C.addTas4Dti = async (ctx) => {
    try {
        ctx.body = await Service.addTas4Dti(ctx);
    } catch (e) {
        logger.error('[smcicc][addTas4Dti]', e, ctx);
        ctx.body = 0;
    }
};
C.modifyTas4Dti = async (ctx) => {
    try {
        ctx.body = await Service.modifyTas4Dti(ctx);
    } catch (e) {
        logger.error('[smcicc][modifyTas4Dti]', e, ctx);
        ctx.body = 0;
    }
};
C.deleteTas4Dti = async (ctx) => {
    try {
        ctx.body = await Service.deleteTas4Dti(ctx);
    } catch (e) {
        logger.error('[smcicc][deleteTas4Dti]', e, ctx);
        ctx.body = false;
    }
};
C.copyTas4Dti = async (ctx) => {
    try {
        ctx.body = await Service.copyTas4Dti(ctx);
    } catch (e) {
        logger.error('[smcicc][copyTas4Dti]', e, ctx);
        ctx.body = false;
    }
};

C.loadTas4ChsList = async (ctx) => {
    try {
        ctx.body = await Service.loadTas4ChsList(ctx);
    } catch (e) {
        logger.error('[smcicc][loadTas4ChsList]', e, ctx);
        ctx.body = { Rows: [], Total: 0 };
    }
};
C.addTas4Chs = async (ctx) => {
    try {
        ctx.body = await Service.addTas4Chs(ctx);
    } catch (e) {
        logger.error('[smcicc][addTas4Chs]', e, ctx);
        ctx.body = 0;
    }
};
C.modifyTas4Chs = async (ctx) => {
    try {
        ctx.body = await Service.modifyTas4Chs(ctx);
    } catch (e) {
        logger.error('[smcicc][modifyTas4Chs]', e, ctx);
        ctx.body = 0;
    }
};
C.deleteTas4Chs = async (ctx) => {
    try {
        ctx.body = await Service.deleteTas4Chs(ctx);
    } catch (e) {
        logger.error('[smcicc][deleteTas4Chs]', e, ctx);
        ctx.body = false;
    }
};
C.copyTas4Chs = async (ctx) => {
    try {
        ctx.body = await Service.copyTas4Chs(ctx);
    } catch (e) {
        logger.error('[smcicc][copyTas4Chs]', e, ctx);
        ctx.body = false;
    }
};

C.loadTas4CallOutList = async (ctx) => {
    try {
        ctx.body = await Service.loadTas4CallOutList(ctx);
    } catch (e) {
        logger.error('[smcicc][loadTas4CallOutList]', e, ctx);
        ctx.body = { Rows: [], Total: 0 };
    }
};
C.addTas4CallOut = async (ctx) => {
    try {
        ctx.body = await Service.addTas4CallOut(ctx);
    } catch (e) {
        logger.error('[smcicc][addTas4CallOut]', e, ctx);
        ctx.body = 0;
    }
};
C.modifyTas4CallOut = async (ctx) => {
    try {
        ctx.body = await Service.modifyTas4CallOut(ctx);
    } catch (e) {
        logger.error('[smcicc][modifyTas4CallOut]', e, ctx);
        ctx.body = 0;
    }
};
C.deleteTas4CallOut = async (ctx) => {
    try {
        ctx.body = await Service.deleteTas4CallOut(ctx);
    } catch (e) {
        logger.error('[smcicc][deleteTas4CallOut]', e, ctx);
        ctx.body = false;
    }
};
C.copyTas4CallOut = async (ctx) => {
    try {
        ctx.body = await Service.copyTas4CallOut(ctx);
    } catch (e) {
        logger.error('[smcicc][copyTas4CallOut]', e, ctx);
        ctx.body = false;
    }
};

C.loadTas4CallInList = async (ctx) => {
    try {
        ctx.body = await Service.loadTas4CallInList(ctx);
    } catch (e) {
        logger.error('[smcicc][loadTas4CallInList]', e, ctx);
        ctx.body = { Rows: [], Total: 0 };
    }
};
C.addTas4CallIn = async (ctx) => {
    try {
        ctx.body = await Service.addTas4CallIn(ctx);
    } catch (e) {
        logger.error('[smcicc][addTas4CallIn]', e, ctx);
        ctx.body = 0;
    }
};
C.modifyTas4CallIn = async (ctx) => {
    try {
        ctx.body = await Service.modifyTas4CallIn(ctx);
    } catch (e) {
        logger.error('[smcicc][modifyTas4CallIn]', e, ctx);
        ctx.body = 0;
    }
};
C.deleteTas4CallIn = async (ctx) => {
    try {
        ctx.body = await Service.deleteTas4CallIn(ctx);
    } catch (e) {
        logger.error('[smcicc][deleteTas4CallIn]', e, ctx);
        ctx.body = 0;
    }
};
C.copyTas4CallIn = async (ctx) => {
    try {
        ctx.body = await Service.copyTas4CallIn(ctx);
    } catch (e) {
        logger.error('[smcicc][copyTas4CallIn]', e, ctx);
        ctx.body = false;
    }
};

C.loadTas4RegList = async (ctx) => {
    try {
        ctx.body = await Service.loadTas4RegList(ctx);
    } catch (e) {
        logger.error('[smcicc][loadTas4RegList]', e, ctx);
        ctx.body = { Rows: [], Total: 0 };
    }
};
C.addTas4Reg = async (ctx) => {
    try {
        ctx.body = await Service.addTas4Reg(ctx);
    } catch (e) {
        logger.error('[smcicc][addTas4Reg]', e, ctx);
        ctx.body = 0;
    }
};
C.modifyTas4Reg = async (ctx) => {
    try {
        ctx.body = await Service.modifyTas4Reg(ctx);
    } catch (e) {
        logger.error('[smcicc][modifyTas4Reg]', e, ctx);
        ctx.body = 0;
    }
};
C.deleteTas4Reg = async (ctx) => {
    try {
        ctx.body = await Service.deleteTas4Reg(ctx);
    } catch (e) {
        logger.error('[smcicc][deleteTas4Reg]', e, ctx);
        ctx.body = false;
    }
};
C.copyTas4Reg = async (ctx) => {
    try {
        ctx.body = await Service.copyTas4Reg(ctx);
    } catch (e) {
        logger.error('[smcicc][copyTas4Reg]', e, ctx);
        ctx.body = false;
    }
};

C.loadTas4EhRegList = async (ctx) => {
    try {
        ctx.body = await Service.loadTas4EhRegList(ctx);
    } catch (e) {
        logger.error('[smcicc][loadTas4EhRegList]', e, ctx);
        ctx.body = { Rows: [], Total: 0 };
    }
};
C.addTas4EhReg = async (ctx) => {
    try {
        ctx.body = await Service.addTas4EhReg(ctx);
    } catch (e) {
        logger.error('[smcicc][addTas4EhReg]', e, ctx);
        ctx.body = 0;
    }
};
C.modifyTas4EhReg = async (ctx) => {
    try {
        ctx.body = await Service.modifyTas4EhReg(ctx);
    } catch (e) {
        logger.error('[smcicc][modifyTas4EhReg]', e, ctx);
        ctx.body = 0;
    }
};
C.deleteTas4EhReg = async (ctx) => {
    try {
        ctx.body = await Service.deleteTas4EhReg(ctx);
    } catch (e) {
        logger.error('[smcicc][deleteTas4EhReg]', e, ctx);
        ctx.body = false;
    }
};
C.copyTas4EhReg = async (ctx) => {
    try {
        ctx.body = await Service.copyTas4EhReg(ctx);
    } catch (e) {
        logger.error('[smcicc][copyTas4EhReg]', e, ctx);
        ctx.body = false;
    }
};

C.loadTas4NatSipList = async (ctx) => {
    try {
        ctx.body = await Service.loadTas4NatSipList(ctx);
    } catch (e) {
        logger.error('[smcicc][loadTas4NatSipList]', e, ctx);
        ctx.body = { Rows: [], Total: 0 };
    }
};
C.addTas4NatSip = async (ctx) => {
    try {
        ctx.body = await Service.addTas4NatSip(ctx);
    } catch (e) {
        logger.error('[smcicc][addTas4NatSip]', e, ctx);
        ctx.body = 0;
    }
};
C.modifyTas4NatSip = async (ctx) => {
    try {
        ctx.body = await Service.modifyTas4NatSip(ctx);
    } catch (e) {
        logger.error('[smcicc][modifyTas4NatSip]', e, ctx);
        ctx.body = 0;
    }
};
C.deleteTas4NatSip = async (ctx) => {
    try {
        ctx.body = await Service.deleteTas4NatSip(ctx);
    } catch (e) {
        logger.error('[smcicc][deleteTas4NatSip]', e, ctx);
        ctx.body = false;
    }
};
C.copyTas4NatSip = async (ctx) => {
    try {
        ctx.body = await Service.copyTas4NatSip(ctx);
    } catch (e) {
        logger.error('[smcicc][copyTas4NatSip]', e, ctx);
        ctx.body = false;
    }
};

C.loadTas4NatXiopList = async (ctx) => {
    try {
        ctx.body = await Service.loadTas4NatXiopList(ctx);
    } catch (e) {
        logger.error('[smcicc][loadTas4NatXiopList]', e, ctx);
        ctx.body = { Rows: [], Total: 0 };
    }
};
C.addTas4NatXiop = async (ctx) => {
    try {
        ctx.body = await Service.addTas4NatXiop(ctx);
    } catch (e) {
        logger.error('[smcicc][addTas4NatXiop]', e, ctx);
        ctx.body = 0;
    }
};
C.modifyTas4NatXiop = async (ctx) => {
    try {
        ctx.body = await Service.modifyTas4NatXiop(ctx);
    } catch (e) {
        logger.error('[smcicc][modifyTas4NatXiop]', e, ctx);
        ctx.body = 0;
    }
};
C.deleteTas4NatXiop = async (ctx) => {
    try {
        ctx.body = await Service.deleteTas4NatXiop(ctx);
    } catch (e) {
        logger.error('[smcicc][deleteTas4NatXiop]', e, ctx);
        ctx.body = false;
    }
};
C.copyTas4NatXiop = async (ctx) => {
    try {
        ctx.body = await Service.copyTas4NatXiop(ctx);
    } catch (e) {
        logger.error('[smcicc][copyTas4NatXiop]', e, ctx);
        ctx.body = false;
    }
};

module.exports = C;
