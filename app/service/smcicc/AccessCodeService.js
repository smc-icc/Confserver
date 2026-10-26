const Dao = require('../../dao/AccessCodeSMCIccDao');
const DialplanCurl = require('./XmlCurlDialplanService');

function toInt(v, d = 0) {
    if (v === null || v === undefined || v === '') return d;
    const n = Number(v);
    return Number.isNaN(n) ? d : n;
}

function resolveCode(params) {
    const p = params || {};
    if (p.accessCode && p.accessCode.code != null) {
        return String(p.accessCode.code).trim();
    }
    return String(
        p['accessCode.code']
        || p.code
        || p.calledCode
        || ''
    ).trim();
}

function resolveId(params) {
    const p = params || {};
    const raw = (p.accessCode && p.accessCode.id != null)
        ? p.accessCode.id
        : p['accessCode.id'] || p.id || p.calledCodeId;
    return toInt(raw, 0);
}

function resolveMediaTypeId(params) {
    const p = params || {};
    let raw;
    if (p.accessCode && p.accessCode.mediaType != null && typeof p.accessCode.mediaType === 'object') {
        raw = p.accessCode.mediaType.id;
    } else {
        raw = p.txtMyId_val
            || p['accessCode.mediaType.id']
            || p.mediaTypeId
            || p.myId;
    }
    return toInt(raw, 0);
}

const Service = {};

Service.loadAccessCodeList = async (ctx) => {
    const calledCode = String(ctx.paramsObj.calledCode || '');
    const page = toInt(ctx.paramsObj.page, 1);
    const pagesize = toInt(ctx.paramsObj.pagesize, 10);
    const { rows, total } = await Dao.list({ calledCode, page, pageSize: pagesize });
    const mapped = rows.map((x) => ({
        id: x.id,
        code: x.code,
        mediaType: { id: x.mediaTypeId, name: x.mediaTypeName },
        vdnId: x.vdnId,
    }));
    return { Rows: mapped, Total: total };
};

Service.loadAccessCodeListByNotAssign = async () => {
    const rows = await Dao.listByNotAssign();
    return {
        Rows: rows,
        Total: rows.length,
        ids: rows.map((x) => x.id).join(','),
    };
};

Service.loadAccessCodeListByNotAssignSelf = async (ctx) => {
    const vdnId = toInt(ctx.paramsObj.vdnId, -1);
    const rows = await Dao.listByNotAssignSelf(vdnId);
    return {
        Rows: rows,
        Total: rows.length,
        ids: rows.map((x) => x.id).join(','),
    };
};

Service.addAccessCode = async (ctx) => {
    const code = resolveCode(ctx.paramsObj);
    const mediaTypeId = resolveMediaTypeId(ctx.paramsObj);
    const exist = await Dao.findByCode(code);
    if (exist) return -1;
    await Dao.insert({ code, mediaTypeId });
    DialplanCurl.invalidateCache();
    return 1;
};

Service.modifyAccessCode = async (ctx) => {
    const id = resolveId(ctx.paramsObj);
    const code = resolveCode(ctx.paramsObj);
    const mediaTypeId = resolveMediaTypeId(ctx.paramsObj);
    const sameCodeList = await Dao.findAllByCode(code);
    if (sameCodeList.length === 0) {
        await Dao.update({ id, code, mediaTypeId });
        DialplanCurl.invalidateCache();
        return 1;
    }
    if (sameCodeList[0].id === id) {
        await Dao.update({ id, code, mediaTypeId });
        DialplanCurl.invalidateCache();
        return 1;
    }
    return -1;
};

Service.copyAccessCode = async (ctx) => {
    const code = resolveCode(ctx.paramsObj);
    const mediaTypeId = resolveMediaTypeId(ctx.paramsObj);
    const exist = await Dao.findByCode(code);
    if (exist) return -1;
    await Dao.insert({ code, mediaTypeId });
    DialplanCurl.invalidateCache();
    return 1;
};

Service.deleteAccessCode = async (ctx) => {
    const ids = String(ctx.paramsObj.accessCodeIds || '')
        .split(',')
        .map((x) => Number(x.trim()))
        .filter((x) => !Number.isNaN(x));
    const ret = await Dao.deleteByIds(ids);
    DialplanCurl.invalidateCache();
    return Number(ret || 0) > 0;
};

Service.loadMediaTypeListAtAccessCode = async () => Dao.loadMediaTypeList();

module.exports = Service;
