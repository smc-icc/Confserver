const Dao = require('../../dao/VdnNodeBindSMCIccDao');

function toInt(v, d = -1) {
    if (v === null || v === undefined || v === '') return d;
    const n = Number(v);
    return Number.isNaN(n) ? d : n;
}

function normalizeNodeIds(nodeIds) {
    if (!Array.isArray(nodeIds)) return [];
    return [...new Set(nodeIds.map((x) => Number(x)).filter((x) => Number.isInteger(x) && x > 0))];
}

const Service = {};

Service.loadVdnNodeBindList = async (ctx) => {
    const vdnId = toInt(ctx.paramsObj.vdnId || ctx.paramsObj['vdn.id'], -1);
    if (vdnId <= 0) return { Rows: [] };
    const rows = await Dao.listByVdnId(vdnId);
    return { Rows: rows };
};

Service.replaceForVdn = async (vdnId, nodeIds) => {
    const normalized = normalizeNodeIds(nodeIds);
    if (vdnId <= 0) return 0;
    return Dao.replaceByVdnId({
        vdnId,
        nodeIds: normalized,
        targetType: Dao.TARGET_TYPE_IVR_ADMIN,
    });
};

Service.listActiveNodeIdsByVdnId = async (vdnId) => {
    if (vdnId <= 0) return [];
    return Dao.listActiveNodeIdsByVdnId(vdnId, Dao.TARGET_TYPE_IVR_ADMIN);
};

Service.deleteByVdnIds = async (vdnIds) => Dao.deleteByVdnIds(vdnIds);

module.exports = Service;
