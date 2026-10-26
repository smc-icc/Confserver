const Dao = require('../../dao/ServiceRouteSMCIccDao');
const { scheduleNotify, SCOPE_VDN_AND_ROUTES } = require('./ccsReloadService');

function parseRoute(raw) {
    if (!raw) return {};
    if (typeof raw === 'object') return raw;
    try {
        return JSON.parse(raw);
    } catch (e) {
        return {};
    }
}

function toNum(v, d = -1) {
    if (v === null || v === undefined || v === '') return d;
    const n = Number(v);
    return Number.isNaN(n) ? d : n;
}

function setDefaultValues(route) {
    return {
        ...route,
        calledCode: route.calledCode === '' ? null : route.calledCode,
        deviceType: toNum(route.deviceType, 0),
        deviceId: toNum(route.deviceId, -1),
        groupId: toNum(route.groupId, -1),
        nodeId: toNum(route.nodeId, -1),
        trunkGroupId: toNum(route.trunkGroupId, -1),
        userId: toNum(route.userId, -1),
        accessCodeId: toNum(route.accessCodeId, -1),
        id: toNum(route.id, 0),
    };
}

const Service = {};

Service.loadServiceRouteList = async (ctx) => {
    const pageNum = Number(ctx.paramsObj['serviceRouteBean.pageNum'] || 1);
    const pageSize = Number(ctx.paramsObj['serviceRouteBean.pageSize'] || 20);
    const calledCode = String(ctx.paramsObj['serviceRouteBean.calledCode'] || '');
    const accessCodeId = String(ctx.paramsObj['serviceRouteBean.accessCodeId'] || '');
    const vdnId = Number(ctx.paramsObj.vdnId || ctx.session.smcicc_vdn_id || -1);
    const { rows, total } = await Dao.list({ vdnId, calledCode, accessCodeId, pageNum, pageSize });
    return { Rows: rows, Total: total };
};

function validateIvrHotReloadRoute(route) {
    return 0;
}

Service.addServiceRoute = async (ctx) => {
    let route = parseRoute(ctx.paramsObj.serviceRouteJson);
    route.vdnId = Number(ctx.paramsObj.vdnId || ctx.session.smcicc_vdn_id || route.vdnId || -1);
    route = setDefaultValues(route);
    const invalid = validateIvrHotReloadRoute(route);
    if (invalid) return invalid;
    const dup = await Dao.countDuplicate({
        vdnId: route.vdnId,
        accessCodeId: route.accessCodeId,
        calledCode: String(route.calledCode || ''),
        id: route.id,
    });
    if (dup > 0) return -1;
    const inserted = await Dao.insert(route);
    scheduleNotify({ scope: SCOPE_VDN_AND_ROUTES, vdnId: route.vdnId, reason: 'addServiceRoute' });
    return inserted;
};

Service.modifyServiceRoute = async (ctx) => {
    let route = parseRoute(ctx.paramsObj.serviceRouteJson);
    route.vdnId = Number(ctx.paramsObj.vdnId || ctx.session.smcicc_vdn_id || route.vdnId || -1);
    route = setDefaultValues(route);
    const invalid = validateIvrHotReloadRoute(route);
    if (invalid) return invalid;
    const dup = await Dao.countDuplicate({
        vdnId: route.vdnId,
        accessCodeId: route.accessCodeId,
        calledCode: String(route.calledCode || ''),
        id: route.id,
    });
    if (dup > 0) return -1;
    await Dao.update(route);
    scheduleNotify({ scope: SCOPE_VDN_AND_ROUTES, vdnId: route.vdnId, reason: 'modifyServiceRoute' });
    return 1;
};

Service.setServiceRouteValid = async (ctx) => {
    const id = Number(ctx.paramsObj.id);
    const vdnId = Number(ctx.paramsObj.vdnId || ctx.session.smcicc_vdn_id);
    const isValid = Number(ctx.paramsObj.isValid) === 1 ? 1 : 0;
    if (!id || Number.isNaN(vdnId)) return 0;
    await Dao.setValid({ id, vdnId, isValid });
    scheduleNotify({ scope: SCOPE_VDN_AND_ROUTES, vdnId, reason: 'setServiceRouteValid' });
    return 1;
};

Service.deleteServiceRoutes = async (ctx) => {
    let ids = ctx.paramsObj.idList;
    if (!ids) return false;
    if (!Array.isArray(ids)) {
        ids = [ids];
    }
    ids = ids.map((x) => Number(x)).filter((x) => !Number.isNaN(x));
    if (ids.length === 0) return false;
    await Dao.deleteByIds({ ids });
    scheduleNotify({ scope: SCOPE_VDN_AND_ROUTES, reason: 'deleteServiceRoutes' });
    return true;
};

Service.copyServiceRoute = async (ctx) => {
    let route = parseRoute(ctx.paramsObj.serviceRouteJson);
    route.vdnId = Number(ctx.paramsObj.vdnId || ctx.session.smcicc_vdn_id || route.vdnId || -1);
    route = setDefaultValues(route);

    let current = Number(route.calledCode || 0);
    if (Number.isNaN(current)) current = 0;
    while (true) {
        current += 1;
        if (String(current).length > 12) current = 0;
        const hit = await Dao.findByExactCalledCode({ calledCode: String(current), vdnId: route.vdnId });
        if (!hit || hit.length === 0) {
            route.id = 0;
            route.calledCode = String(current);
            await Dao.insert(route);
            scheduleNotify({ scope: SCOPE_VDN_AND_ROUTES, vdnId: route.vdnId, reason: 'copyServiceRoute' });
            return true;
        }
    }
};

Service.loadUserList = async (ctx) => {
    const vdnId = Number(ctx.paramsObj.vdnId || ctx.session.smcicc_vdn_id || -1);
    const key = String(ctx.paramsObj.key || '');
    const rows = await Dao.loadUsersByName({ vdnId, key });
    return [{ id: -1, workNo: '<系统自动分配>' }, ...rows];
};

Service.loadAccessCodeListByVdnSelf = async (ctx) => {
    const vdnId = Number(ctx.paramsObj.vdnId || ctx.session.smcicc_vdn_id || -1);
    const key = String(ctx.paramsObj.key || '');
    return Dao.loadAccessCodeListByVdnSelf({ vdnId, key });
};

Service.loadAgentGroupList = async (ctx) => {
    const vdnId = Number(ctx.paramsObj.vdnId || ctx.session.smcicc_vdn_id || -1);
    const key = String(ctx.paramsObj.key || '');
    const rows = await Dao.loadAgentGroupList({ vdnId, key });
    return [{ id: -1, name: '<系统自动分配>' }, ...rows];
};

Service.loadTrunkGroupList = async (ctx) => {
    const key = String(ctx.paramsObj.key || '');
    const rows = await Dao.loadTrunkGroupList({ key, pageIndex: 1, pageSize: 10 });
    return [{ id: -1, name: '<系统自动分配>' }, ...rows];
};

Service.loadIvrFlowList = async (ctx) => {
    const vdnId = Number(ctx.paramsObj.vdnId || ctx.session.smcicc_vdn_id || 0);
    const callFlowFlowListService = require('./callFlowFlowListService');
    return callFlowFlowListService.listFlowsByVdn(vdnId);
};

module.exports = Service;
