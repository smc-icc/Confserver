const Dao = require('../../dao/BasicInfoSMCIccDao');
const { scheduleNotify, SCOPE_VDN } = require('./ccsReloadService');

function parseVdnJson(raw) {
    if (!raw) return null;
    if (typeof raw === 'object') return raw;
    try {
        return JSON.parse(raw);
    } catch (e) {
        return null;
    }
}

const Service = {};

Service.loadBasicInfo = async (ctx) => {
    const vdnId = Number(ctx.session.smcicc_vdn_id || ctx.paramsObj.vdnId || -1);
    if (Number.isNaN(vdnId) || vdnId < 0) {
        return null;
    }
    return Dao.selectByPrimaryKey(vdnId);
};

Service.modifyBasicInfo = async (ctx) => {
    const vdn = parseVdnJson(ctx.paramsObj.vdnjson || ctx.paramsObj.vdnJson);
    if (!vdn || vdn.id == null) {
        return false;
    }
    if (vdn.recordWorkNo == null || Number.isNaN(Number(vdn.recordWorkNo))) {
        vdn.recordWorkNo = 0;
    } else {
        vdn.recordWorkNo = Number(vdn.recordWorkNo) ? 1 : 0;
    }
    if (vdn.sipExtStatusSupport == null || Number.isNaN(Number(vdn.sipExtStatusSupport))) {
        vdn.sipExtStatusSupport = 0;
    } else {
        vdn.sipExtStatusSupport = Number(vdn.sipExtStatusSupport) ? 1 : 0;
    }
    if (vdn.realTimeSpeechRecog == null || Number.isNaN(Number(vdn.realTimeSpeechRecog))) {
        vdn.realTimeSpeechRecog = 0;
    } else {
        vdn.realTimeSpeechRecog = Number(vdn.realTimeSpeechRecog) ? 1 : 0;
    }
    const validEngines = ['ali', 'funasr', 'whisper'];
    const engine = vdn.asrEngine != null ? String(vdn.asrEngine).trim() : '';
    vdn.asrEngine = validEngines.includes(engine) ? engine : 'ali';
    const n = Number(await Dao.updateBasicInfoByPrimaryKey(vdn)) || 0;
    if (n > 0) {
        scheduleNotify({ scope: SCOPE_VDN, vdnId: Number(vdn.id) || 0, reason: 'modifyBasicInfo' });
    }
    return n > 0;
};

/** 与 Java isVdnNameExist：名称已被其它 VDN 占用则 true */
Service.checkVdnNameExist = async (ctx) => {
    const vdnId = ctx.paramsObj.vdnId != null ? Number(ctx.paramsObj.vdnId) : null;
    const vdnName = ctx.paramsObj.vdnName != null ? String(ctx.paramsObj.vdnName) : '';
    if (vdnId == null || Number.isNaN(vdnId) || !vdnName) {
        return false;
    }
    const row = await Dao.selectByName(vdnName);
    return !!(row && row.id !== vdnId);
};

module.exports = Service;
