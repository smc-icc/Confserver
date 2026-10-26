const Dao = require('../../dao/VdnSMCIccDao');
const VdnNodeBindService = require('./VdnNodeBindService');
const { scheduleNotify, SCOPE_VDN } = require('./ccsReloadService');
const OmniUserSync = require('../integration/OmniUserSync');

function toInt(v, d = 0) {
    if (v === null || v === undefined || v === '') return d;
    const n = Number(v);
    return Number.isNaN(n) ? d : n;
}

function splitIds(text, sep = ',') {
    return String(text || '')
        .split(sep)
        .map((x) => Number(String(x).trim()))
        .filter((x) => Number.isInteger(x) && x > 0);
}

function splitNodeIds(raw) {
    if (Array.isArray(raw)) {
        return raw
            .map((x) => Number(x))
            .filter((x) => Number.isInteger(x) && x > 0);
    }
    return String(raw || '')
        .split(/[;,]/)
        .map((x) => Number(String(x).trim()))
        .filter((x) => Number.isInteger(x) && x > 0);
}

async function validateParent(id, parentId) {
    if (parentId === -1) return 1;
    if (parentId === id) return -5;
    const parent = await Dao.findByVdnId(parentId);
    if (!parent) return -6;

    const visited = new Set([id]);
    let currentId = Number(parent.id);
    while (currentId > 0) {
        if (visited.has(currentId)) return -7;
        visited.add(currentId);
        const current = await Dao.findByVdnId(currentId);
        if (!current) break;
        currentId = Number(current.parentId);
    }
    return 1;
}

const Service = {};

Service.loadVdnListJoin = async (ctx) => {
    const vdnName = String(ctx.paramsObj['vdn.name'] || ctx.paramsObj.vdnName || '');
    const page = toInt(ctx.paramsObj.page, 1);
    const pagesize = toInt(ctx.paramsObj.pagesize, 10);
    const { rows, total } = await Dao.listJoin({ vdnName, page, pageSize: pagesize });
    return { Rows: rows, Total: total };
};

Service.selectOneByVdnId = async (ctx) => {
    const vdnId = toInt(ctx.paramsObj.vdnId || ctx.paramsObj['vdn.id'], -1);
    const vdn = await Dao.findByVdnId(vdnId);
    return { vdn: vdn || { id: vdnId, name: '', parentId: -1 } };
};

Service.loadAllVdns = async () => {
    const rows = await Dao.listAllSimple();
    return { Rows: rows };
};

Service.checkAccessCodeByVdnId = async (ctx) => {
    const vdnId = toInt(ctx.paramsObj.vdnId || ctx.paramsObj['vdn.id'], -1);
    const list = await Dao.listAccessCodesByVdnId(vdnId);
    return { accessCodeIds: list.map((x) => `${x.id};`).join('') };
};

Service.addVdn = async (ctx) => {
    const id = toInt(ctx.paramsObj['vdn.id'] || ctx.paramsObj.vdnId, -1);
    const name = String(ctx.paramsObj['vdn.name'] || ctx.paramsObj.name || '').trim();
    const parentId = toInt(ctx.paramsObj['vdn.parentId'] || ctx.paramsObj.parentId, -1);
    const nodeIds = splitNodeIds(ctx.paramsObj.nodeIds || ctx.paramsObj['vdn.nodeIds']);
    const assignedText = String(ctx.paramsObj.accessCodeIdsAssign || '');

    if (await Dao.findByVdnId(id)) return -2;
    if (await Dao.findByName(name)) return -3;
    const parentCheck = await validateParent(id, parentId);
    if (parentCheck !== 1) return parentCheck;

    await Dao.insertVdn({ id, name, parentId });
    const startRecord = ctx.paramsObj.startRecord != null ? toInt(ctx.paramsObj.startRecord, 0) : undefined;
    const recordWorkNo = ctx.paramsObj.recordWorkNo != null ? toInt(ctx.paramsObj.recordWorkNo, 0) : undefined;
    const sipExtStatusSupport = ctx.paramsObj.sipExtStatusSupport != null ? toInt(ctx.paramsObj.sipExtStatusSupport, 0) : 1;
    const realTimeSpeechRecog = ctx.paramsObj.realTimeSpeechRecog != null ? toInt(ctx.paramsObj.realTimeSpeechRecog, 0) : undefined;
    const itrDefaultFlowId = ctx.paramsObj.itrDefaultFlowId != null ? toInt(ctx.paramsObj.itrDefaultFlowId, 0) : undefined;
    const asrEngine = ctx.paramsObj.asrEngine != null ? String(ctx.paramsObj.asrEngine) : undefined;
    if (startRecord !== undefined || recordWorkNo !== undefined || sipExtStatusSupport !== undefined
        || realTimeSpeechRecog !== undefined || itrDefaultFlowId !== undefined || asrEngine !== undefined) {
        await Dao.updateByVdn({ id, name, parentId, startRecord, recordWorkNo, sipExtStatusSupport, itrDefaultFlowId, realTimeSpeechRecog, asrEngine });
    }
    await VdnNodeBindService.replaceForVdn(id, nodeIds);
    const assignedIds = splitIds(assignedText, ';');
    if (assignedIds.length) {
        await Dao.updateAccessCodeByVdn({ vdnId: id, accessCodeIds: assignedIds });
    }
    await OmniUserSync.syncVdn(id);
    scheduleNotify({ scope: SCOPE_VDN, vdnId: id, reason: 'addVdn' });
    return 1;
};

Service.editVdn = async (ctx) => {
    const id = toInt(ctx.paramsObj['vdn.id'] || ctx.paramsObj.vdnId, -1);
    const name = String(ctx.paramsObj['vdn.name'] || ctx.paramsObj.name || '').trim();
    const parentId = toInt(ctx.paramsObj['vdn.parentId'] || ctx.paramsObj.parentId, -1);
    const startRecord = ctx.paramsObj.startRecord != null ? toInt(ctx.paramsObj.startRecord, 0) : undefined;
    const recordWorkNo = ctx.paramsObj.recordWorkNo != null ? toInt(ctx.paramsObj.recordWorkNo, 0) : undefined;
    const sipExtStatusSupport = ctx.paramsObj.sipExtStatusSupport != null ? toInt(ctx.paramsObj.sipExtStatusSupport, 0) : undefined;
    const realTimeSpeechRecog = ctx.paramsObj.realTimeSpeechRecog != null ? toInt(ctx.paramsObj.realTimeSpeechRecog, 0) : undefined;
    const itrDefaultFlowId = ctx.paramsObj.itrDefaultFlowId != null ? toInt(ctx.paramsObj.itrDefaultFlowId, 0) : undefined;
    const asrEngine = ctx.paramsObj.asrEngine != null ? String(ctx.paramsObj.asrEngine) : undefined;
    const nodeIds = splitNodeIds(ctx.paramsObj.nodeIds || ctx.paramsObj['vdn.nodeIds']);
    const accessCodeIdsAssign = String(ctx.paramsObj.accessCodeIdsAssign || '').replace(/;/g, ',');
    const accessCodeIds = String(ctx.paramsObj.accessCodeIds || '');

    const parentCheck = await validateParent(id, parentId);
    if (parentCheck !== 1) return { result: parentCheck, list: [] };

    const assignIds = splitIds(accessCodeIdsAssign, ',');
    const oldIds = splitIds(accessCodeIds, ',');
    const assignIdSet = new Set(assignIds.map((x) => String(x)));
    const ckAccessCodeList = [];

    for (const oldId of oldIds) {
        const refCount = await Dao.checkServiceRouteAccessCodeRef({ vdnId: id, accessCodeId: oldId });
        if (refCount > 0 && !assignIdSet.has(String(oldId))) ckAccessCodeList.push(String(oldId));
    }

    if (ckAccessCodeList.length) return { result: -4, list: ckAccessCodeList };

    await Dao.updateByVdn({ id, name, parentId, startRecord, recordWorkNo, sipExtStatusSupport, itrDefaultFlowId, realTimeSpeechRecog, asrEngine });
    // A basic-only edit omits telephony bindings. Explicit [] still clears.
    if (Object.hasOwn(ctx.paramsObj, 'nodeIds') || Object.hasOwn(ctx.paramsObj, 'vdn.nodeIds'))
        await VdnNodeBindService.replaceForVdn(id, nodeIds);
    if (oldIds.length) await Dao.updateAccessCodeToNotAssign(oldIds);
    if (assignIds.length) await Dao.updateAccessCodeByVdn({ vdnId: id, accessCodeIds: assignIds });
    await OmniUserSync.syncVdn(id);
    scheduleNotify({ scope: SCOPE_VDN, vdnId: id, reason: 'editVdn' });
    return { result: 1, list: [] };
};

Service.deleteVdn = async (ctx) => {
    const ids = splitIds(ctx.paramsObj.vdnIds, ',');
    const fail = [];
    for (const id of ids) {
        const childCount = await Dao.countChildren(id);
        if (childCount > 0) {
            fail.push(id);
            continue;
        }
        const ok = await Dao.callDeleteVdnFK(id);
        if (ok === 1) {
            await Dao.deleteVdnById(id);
            await OmniUserSync.syncVdn(id, 'delete');
            await VdnNodeBindService.deleteByVdnIds([id]);
        } else {
            fail.push(id);
        }
    }
    if (fail.length < ids.length) {
        scheduleNotify({ scope: SCOPE_VDN, reason: 'deleteVdn' });
    }
    return { data: fail };
};

Service.checkVdnId = async (ctx) => {
    const validData = String(ctx.paramsObj.validData || '');
    return Dao.countByVdnId(validData);
};

Service.checkVdnName = async (ctx) => {
    const validData = String(ctx.paramsObj.validData || '');
    return Dao.countByVdnName(validData);
};

Service.loadUserByVdn = async (ctx) => {
    const vdnId = toInt(ctx.paramsObj['vdn.id'] || ctx.paramsObj.vdnId, -1);
    const page = toInt(ctx.paramsObj.page, 1);
    const pagesize = toInt(ctx.paramsObj.pagesize, 10);
    const { rows, total } = await Dao.loadUserListByVdn({ vdnId, page, pageSize: pagesize });
    return { Rows: rows, Total: total };
};

function resolveUser(ctx) {
    return {
        id: toInt(ctx.paramsObj['user.id'] || ctx.paramsObj.UserId || ctx.paramsObj.userId, 0),
        workNo: String(ctx.paramsObj['user.workNo'] || ctx.paramsObj.workNo || ''),
        name: String(ctx.paramsObj['user.name'] || ctx.paramsObj.Name || ctx.paramsObj.userName || ''),
        password: String(ctx.paramsObj['user.password'] || ctx.paramsObj.PassWord || ctx.paramsObj.password || ''),
        vdnId: toInt(ctx.paramsObj['user.vdnId'] || ctx.paramsObj.vdnId || ctx.paramsObj['vdn.id'], -1),
    };
}

Service.addVdnUser = async (ctx) => {
    const user = resolveUser(ctx);
    const exists = await Dao.selectByWorkNoNVdnId({ workNo: user.workNo, vdnId: user.vdnId });
    if (exists.length) return -2;
    const inserted = await Dao.insertUserByVdn(user);
    if (inserted.userId > 0) {
        await Dao.insertGrantPowerForVdnUser({ userId: inserted.userId, vdnId: user.vdnId });
        await OmniUserSync.upsert({
            vdnId: user.vdnId, sourceUserId: inserted.userId,
            workNo: user.workNo,
            name: user.name,
            email: null,
            password: user.password || null,
        });
    }
    return 1;
};

Service.copyVdnUser = async (ctx) => Service.addVdnUser(ctx);

Service.editVdnUser = async (ctx) => {
    const user = resolveUser(ctx);
    const exists = await Dao.selectByWorkNoNVdnId({ workNo: user.workNo, vdnId: user.vdnId });
    if (exists.length && Number(exists[0].id) !== Number(user.id)) return -2;
    const before = user.id > 0 ? await Dao.getUserById(user.id) : null;
    await Dao.updateUserByVdn(user);
    const prevWorkNo = before?.workno ? String(before.workno) : null;
    await OmniUserSync.upsert({
        vdnId: user.vdnId, sourceUserId: user.id,
        workNo: user.workNo,
        previousWorkNo: prevWorkNo && prevWorkNo !== user.workNo ? prevWorkNo : null,
        name: user.name,
        email: null,
        password: user.password || null,
    });
    return 1;
};

Service.deleteVdnUser = async (ctx) => {
    const userIds = String(ctx.paramsObj.userIds || '')
        .split(',')
        .map((x) => Number(x.trim()))
        .filter((x) => !Number.isNaN(x));
    let result = 0;
    for (const userId of userIds) {
        const userMap = await Dao.getUserById(userId);
        result = Number(await Dao.deleteVdnUser(userId) || 0);
        if (userMap?.workno) {
            await Dao.deleteStaticLoginByWorkNo(String(userMap.workno));
            await OmniUserSync.remove({ vdnId: userMap.vdnid, sourceUserId: userMap.id, workNo: String(userMap.workno) });
        }
    }
    return result;
};

module.exports = Service;
