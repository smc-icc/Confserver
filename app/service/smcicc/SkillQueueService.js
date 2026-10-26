const Dao = require('../../dao/SkillQueueSMCIccDao');

function parseSkillQueue(raw) {
    if (!raw) return {};
    if (typeof raw === 'object') return raw;
    try {
        return JSON.parse(raw);
    } catch (e) {
        return {};
    }
}

function toInt(v, d = 0) {
    if (v === null || v === undefined || v === '') return d;
    const n = Number(v);
    return Number.isNaN(n) ? d : n;
}

function withDefaults(row, vdnId) {
    return {
        id: toInt(row.id, 0),
        vdnId: toInt(vdnId, -1),
        oldGroupId: toInt(row.oldGroupId, toInt(row.groupId, -1)),
        oldSkillId: toInt(row.oldSkillId, toInt(row.skillId, -1)),
        groupId: toInt(row.groupId, -1),
        skillId: toInt(row.skillId, -1),
        callMatchingId: toInt(row.callMatchingId, 0),
        agentMatchingId: toInt(row.agentMatchingId, 0),
        policyGroupId: toInt(row.policyGroupId, 0),
        allocationPercent: toInt(row.allocationPercent, 0),
        overloadThresholds1: toInt(row.overloadThresholds1, 0),
        overloadThresholds2: toInt(row.overloadThresholds2, 0),
        overloadThresholds3: toInt(row.overloadThresholds3, 0),
        serviceObject: toInt(row.serviceObject, 0),
        serviceObjectPercent: toInt(row.serviceObjectPercent, 0),
        ewtFormula: toInt(row.ewtFormula, 0),
        maxQueueLength: toInt(row.maxQueueLength, 0),
        maxQueueWaitTime: toInt(row.maxQueueWaitTime, 0),
        overLenProc: toInt(row.overLenProc, 0),
        timeOutProc: toInt(row.timeOutProc, 0),
        promptStyle: toInt(row.promptStyle, 0),
        promptContent: row.promptContent || '',
    };
}

function parseJsonObject(raw) {
    if (!raw) return {};
    if (typeof raw === 'object') return raw;
    try {
        return JSON.parse(raw);
    } catch (e) {
        return {};
    }
}

const Service = {};

function queueTextPrefix(deviceType, text, groupName, isBrim) {
    if (deviceType === 1) return isBrim ? '路由到具体的IVR设备.' : '路由到具体的IVR设备';
    if (deviceType === 2) return `路由到ACD服务进行排队:${text || ''}${isBrim ? (groupName || '') : ''}`;
    if (deviceType === 3) return `路由到具体的应用:${text || ''}`;
    if (deviceType === 4) return `路由到具体的坐席:${text || ''}${isBrim ? (groupName || '') : ''}`;
    if (deviceType === 5) return `路由到具体的应用类型:${text || ''}`;
    if (deviceType === 6) return '直接挂机';
    return text || '';
}

Service.loadSkillQueueList = async (ctx) => {
    const vdnId = toInt(ctx.paramsObj.vdnId || ctx.session.smcicc_vdn_id, -1);
    const pageNum = toInt(ctx.paramsObj['skillQueueBean.pageNum'], 1);
    const pageSize = toInt(ctx.paramsObj['skillQueueBean.pageSize'], 30);
    const groupId = toInt(ctx.paramsObj.groupId, 0);
    const skillId = toInt(ctx.paramsObj.skillId, 0);
    const callMatchingId = toInt(ctx.paramsObj.callMatchingId, 0);
    const agentMatchingId = toInt(ctx.paramsObj.agentMatchingId, 0);
    const policyGroupId = toInt(ctx.paramsObj.policyGroupId, 0);

    const { rows, total } = await Dao.list({ vdnId, groupId, skillId, callMatchingId, agentMatchingId, policyGroupId, pageNum, pageSize });
    const mapped = rows.map((r) => ({
        ...r,
        group: { name: r.groupName },
        skill: { name: r.skillName },
        matchGroupEle: { description: r.matchingName },
        policyGroup: { description: r.agentMatchingName },
        policyGroup1: { description: r.policyName },
    }));
    return { Rows: mapped, Total: total };
};

Service.addSkillQueue = async (ctx) => {
    const raw = parseSkillQueue(ctx.paramsObj.skillQueueJson);
    const row = withDefaults(raw, ctx.paramsObj.vdnId || ctx.session.smcicc_vdn_id);
    await Dao.insert(row);
    return true;
};

Service.editSkillQueue = async (ctx) => {
    const raw = parseSkillQueue(ctx.paramsObj.skillQueueJson);
    const row = withDefaults(raw, ctx.paramsObj.vdnId || ctx.session.smcicc_vdn_id);
    await Dao.update(row);
    return true;
};

Service.deleteSkillQueue = async (ctx) => {
    const ids = String(ctx.paramsObj.ids || '').split(',').map((x) => Number(x.trim())).filter((x) => !Number.isNaN(x));
    if (ids.length === 0) return false;
    await Dao.deleteByIds({ ids });
    return true;
};

Service.copySkillQueue = async (ctx) => {
    let row = parseSkillQueue(ctx.paramsObj.skillQueueJson);
    if (!row || !row.id) {
        return false;
    }
    const dbRows = await Dao.findById(toInt(row.id, 0));
    if (!dbRows || dbRows.length === 0) return false;
    row = withDefaults(dbRows[0], dbRows[0].vdnId);
    row.id = 0;
    row.oldGroupId = row.groupId;
    row.oldSkillId = row.skillId;
    await Dao.insert(row);
    return true;
};

Service.loadQueueGroupList = async (ctx) => {
    const vdnId = toInt(ctx.paramsObj.vdnId || ctx.session.smcicc_vdn_id, -1);
    const key = (ctx.paramsObj.key || '').trim();
    const list = await Dao.loadQueueGroupList({ vdnId, key });
    return [{ id: -1, name: '<系统自动分配>' }, ...list];
};

Service.loadQueueSkillList = async (ctx) => {
    const vdnId = toInt(ctx.paramsObj.vdnId || ctx.session.smcicc_vdn_id, -1);
    const key = (ctx.paramsObj.key || '').trim();
    const list = await Dao.loadQueueSkillList({ vdnId, key });
    return [{ id: -1, name: '<系统自动分配>' }, ...list];
};

Service.loadBrimGroupList = async (ctx) => Service.loadQueueGroupList(ctx);

Service.loadBrimSkillList = async (ctx) => Service.loadQueueSkillList(ctx);

Service.loadMatchGroupEle = async () => Dao.loadMatchGroupEle();

Service.loadPolicyGroup = async () => Dao.loadPolicyGroup();

Service.loadQueueOverBrim = async (ctx) => {
    const vdnId = toInt(ctx.paramsObj.vdnId || ctx.session.smcicc_vdn_id, -1);
    const id = toInt(ctx.paramsObj.key || ctx.paramsObj.id, 0);
    const list = await Dao.loadQueueOverBrim({ vdnId, id });
    return list.map((item) => ({
        ...item,
        text: queueTextPrefix(item.deviceType, item.text, item.groupName, true),
    }));
};

Service.loadQueueOverTime = async (ctx) => {
    const vdnId = toInt(ctx.paramsObj.vdnId || ctx.session.smcicc_vdn_id, -1);
    const id = toInt(ctx.paramsObj.key || ctx.paramsObj.id, 0);
    const list = await Dao.loadQueueOverTime({ vdnId, id });
    return list.map((item) => ({
        ...item,
        text: queueTextPrefix(item.deviceType, item.text, item.groupName, false),
    }));
};

Service.loadQueueList = async (ctx) => {
    const vdnId = toInt(ctx.paramsObj.vdnId || ctx.session.smcicc_vdn_id, -1);
    const id = toInt(ctx.paramsObj.id, 0);
    return Dao.loadQueueListById({ vdnId, id });
};

Service.loadQueueOTList = async (ctx) => {
    const vdnId = toInt(ctx.paramsObj.vdnId || ctx.session.smcicc_vdn_id, -1);
    const id = toInt(ctx.paramsObj.id, 0);
    const list = await Dao.loadQueueOTListById({ vdnId, id });
    return list.map((item) => ({
        ...item,
        group: { name: item.groupName },
    }));
};

Service.loadQueueOverBrimList = async (ctx) => {
    const vdnId = toInt(ctx.paramsObj.vdnId || ctx.session.smcicc_vdn_id, -1);
    const pageNum = toInt(ctx.paramsObj['queueOverBrimBean.pageNum'], 1);
    const pageSize = toInt(ctx.paramsObj['queueOverBrimBean.pageSize'], 30);
    const groupId = toInt(ctx.paramsObj.groupId, 0);
    const deviceType = toInt(ctx.paramsObj.deviceType, 0);
    const { rows, total } = await Dao.loadQueueOverBrimPaged({ vdnId, groupId, deviceType, pageNum, pageSize });
    return { Rows: rows, Total: total };
};

Service.loadQueueOverTimeList = async (ctx) => {
    const vdnId = toInt(ctx.paramsObj.vdnId || ctx.session.smcicc_vdn_id, -1);
    const pageNum = toInt(ctx.paramsObj['queueOverTimeBean.pageNum'], 1);
    const pageSize = toInt(ctx.paramsObj['queueOverTimeBean.pageSize'], 20);
    const groupId = toInt(ctx.paramsObj.groupId, 0);
    const deviceType = toInt(ctx.paramsObj.deviceType, 0);
    const { rows, total } = await Dao.loadQueueOverTimePaged({ vdnId, groupId, deviceType, pageNum, pageSize });
    const mapped = rows.map((item) => ({ ...item, group: { name: item.groupName } }));
    return { Rows: mapped, Total: total };
};

Service.addQueueOverBrim = async (ctx) => {
    const raw = parseJsonObject(ctx.paramsObj.queueOverBrimJson);
    const row = {
        vdnId: toInt(raw.vdnId || ctx.paramsObj.vdnId || ctx.session.smcicc_vdn_id, -1),
        deviceType: toInt(raw.deviceType, 0),
        deviceId: toInt(raw.deviceId, 0),
        groupId: toInt(raw.groupId, 0),
    };
    await Dao.addQueueOverBrim(row);
    return true;
};

Service.editQueueOverBrim = async (ctx) => {
    const raw = parseJsonObject(ctx.paramsObj.queueOverBrimJson);
    const row = {
        id: toInt(raw.id, 0),
        vdnId: toInt(raw.vdnId || ctx.paramsObj.vdnId || ctx.session.smcicc_vdn_id, -1),
        deviceType: toInt(raw.deviceType, 0),
        deviceId: toInt(raw.deviceId, 0),
        groupId: toInt(raw.groupId, 0),
    };
    await Dao.editQueueOverBrim(row);
    return true;
};

Service.copyQueueOverBrim = async (ctx) => {
    const raw = parseJsonObject(ctx.paramsObj.queueOverBrimJson || ctx.paramsObj.queueOverBrim);
    const id = toInt(ctx.paramsObj.id || raw.id, 0);
    const rows = await Dao.findQueueOverBrimById(id);
    if (!rows.length) return false;
    const src = rows[0];
    await Dao.addQueueOverBrim({
        vdnId: toInt(src.vdnId, -1),
        deviceType: toInt(src.deviceType, 0),
        deviceId: toInt(src.deviceId, 0),
        groupId: toInt(src.groupId, 0),
    });
    return true;
};

Service.deleteQueueOverBrim = async (ctx) => {
    const vdnId = toInt(ctx.paramsObj.vdnId || ctx.session.smcicc_vdn_id, -1);
    const ids = String(ctx.paramsObj.ids || '').split(',').map((x) => Number(x.trim())).filter((x) => !Number.isNaN(x));
    if (!ids.length) return { qobId: '', result: 0 };
    const refs = await Dao.referencedQueueOverBrimIds({ vdnId, ids });
    if (refs.length) {
        return { qobId: refs.map((x) => x.id).join(','), result: 0 };
    }
    const ret = await Dao.deleteQueueOverBrimByIds(ids);
    return { qobId: '', result: Number(ret || 0) };
};

Service.addQueueOverTime = async (ctx) => {
    const raw = parseJsonObject(ctx.paramsObj.queueOverTimeJson);
    const row = {
        vdnId: toInt(raw.vdnId || ctx.paramsObj.vdnId || ctx.session.smcicc_vdn_id, -1),
        deviceType: toInt(raw.deviceType, 0),
        deviceId: toInt(raw.deviceId, 0),
        groupId: toInt(raw.groupId, 0),
    };
    await Dao.addQueueOverTime(row);
    return true;
};

Service.editQueueOverTime = async (ctx) => {
    const raw = parseJsonObject(ctx.paramsObj.queueOverTimeJson);
    const row = {
        id: toInt(raw.id, 0),
        vdnId: toInt(raw.vdnId || ctx.paramsObj.vdnId || ctx.session.smcicc_vdn_id, -1),
        deviceType: toInt(raw.deviceType, 0),
        deviceId: toInt(raw.deviceId, 0),
        groupId: toInt(raw.groupId, 0),
    };
    await Dao.editQueueOverTime(row);
    return true;
};

Service.copyQueueOverTime = async (ctx) => {
    const raw = parseJsonObject(ctx.paramsObj.queueOverTimeJson || ctx.paramsObj.queueOverTime);
    const id = toInt(ctx.paramsObj.id || raw.id, 0);
    const rows = await Dao.findQueueOverTimeById(id);
    if (!rows.length) return false;
    const src = rows[0];
    await Dao.addQueueOverTime({
        vdnId: toInt(src.vdnId, -1),
        deviceType: toInt(src.deviceType, 0),
        deviceId: toInt(src.deviceId, 0),
        groupId: toInt(src.groupId, 0),
    });
    return true;
};

Service.deleteQueueOverTime = async (ctx) => {
    const vdnId = toInt(ctx.paramsObj.vdnId || ctx.session.smcicc_vdn_id, -1);
    const ids = String(ctx.paramsObj.ids || '').split(',').map((x) => Number(x.trim())).filter((x) => !Number.isNaN(x));
    if (!ids.length) return { qotId: '', result: 0 };
    const refs = await Dao.referencedQueueOverTimeIds({ vdnId, ids });
    if (refs.length) {
        return { qotId: refs.map((x) => x.id).join(','), result: 0 };
    }
    const ret = await Dao.deleteQueueOverTimeByIds(ids);
    return { qotId: '', result: Number(ret || 0) };
};

Service.loadAppTypeList = async () => Dao.loadAppTypeList();

module.exports = Service;
