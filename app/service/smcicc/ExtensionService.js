'use strict';
const Dao = require('../../dao/ExtensionSMCIccDao');
const Identity = require('../integration/OnboardIdentity');
const { normalizeNumber } = require('../../dao/ExtensionIdentityDao');

function error(message, status = 400) { const e = new Error(message); e.status = status; throw e; }
function parse(raw) {
    try {
        const ext = typeof raw === 'string' ? JSON.parse(raw) : raw;
        if (!ext || typeof ext !== 'object' || Array.isArray(ext)) error('分机表单无效');
        return ext;
    } catch (e) { if (e.status) throw e; error('分机表单无效'); }
}
async function scope(ctx, ext = {}, transaction) {
    const selected = await Identity.selected({ ...ctx, dbTransaction: transaction });
    const vdnId = Number(selected.vdn.id);
    for (const value of [ext.vdn, ext.vdnId, ctx.paramsObj['extensionBean.vdnId']]) {
        if (value != null && Number(value) !== vdnId) error('VDN 参数冲突');
    }
    return vdnId;
}
function write(ctx) { if (ctx.method !== 'POST') error('修改操作必须使用 POST', 405); }
function options(ctx, ext = {}) {
    return { actor: ctx.uid, token: ctx.paramsObj.reservationToken,
        authorize: transaction => scope(ctx, ext, transaction) };
}
async function settings(ext, vdnId) {
    if (![0,1].includes(Number(ext.device || 0))) error('设备类型无效');
    if (ext.ch != null && ext.ch !== '' && (!Number.isSafeInteger(Number(ext.ch)) || Number(ext.ch) < 0)) error('通道号无效');
    if (ext.chGroup) {
        const groups = await Dao.loadChGroupList({ vdnId });
        if (!groups.some(g => String(g.name || g.Name) === String(ext.chGroup))) error('通道组不属于当前 VDN', 403);
    }
    if (ext.sipEnabled != null && ![true,false,0,1].includes(ext.sipEnabled)) error('SIP 启用状态无效');
    // The public management API never accepts an arbitrary realm or raw password.
    if (ext.sipDomain != null || ext.sipPassword != null) error('SIP 域和凭据必须通过受管配置维护');
}

const Service = {};
Service.loadExtensionList = async ctx => {
    const vdnId = await scope(ctx);
    const p = ctx.paramsObj;
    const { rows, total } = await Dao.loadExtensionList({ num: String(p['extensionBean.num'] || ''), vdnId,
        pageNum: Math.max(1, Number(p['extensionBean.pageNum'] || 1)), pageSize: Math.min(500, Math.max(1, Number(p['extensionBean.pageSize'] || 30))) });
    return { Rows: rows, Total: total };
};
Service.acquireExtension = async ctx => {
    write(ctx);
    const vdnId = await scope(ctx);
    return { result: 1, ...await Dao.reserve({ actor: ctx.uid, vdnId, previousToken: ctx.paramsObj.reservationToken, authorize: t => scope(ctx, {}, t) }) };
};
Service.releaseExtension = async ctx => {
    write(ctx);
    const vdnId = await scope(ctx);
    await Dao.release({ actor: ctx.uid, vdnId, token: ctx.paramsObj.reservationToken, authorize: t => scope(ctx, {}, t) });
    return { result: 1 };
};
Service.checkExtensionNumber = async ctx => {
    await scope(ctx);
    const num = normalizeNumber(ctx.paramsObj.num);
    return { result: 1, num, available: await Dao.isAvailable(num) };
};
Service.addExtension = async ctx => {
    write(ctx);
    const ext = { ...parse(ctx.paramsObj.extensionJson) };
    ext.vdn = await scope(ctx, ext);
    ext.num = normalizeNumber(ext.num);
    await settings(ext, ext.vdn);
    if ((await Dao.findByNum({ num: ext.num })).length) return { result: -2, msg: '分机号已存在' };
    await Dao.insert(ext, options(ctx, ext));
    return { result: 1 };
};
Service.editExtension = async ctx => {
    write(ctx);
    const ext = { ...parse(ctx.paramsObj.extensionJson) };
    ext.vdn = await scope(ctx, ext);
    ext.num = normalizeNumber(ext.num);
    ext.hisNum = normalizeNumber(ctx.paramsObj.oldNum || ext.hisNum);
    await settings(ext, ext.vdn);
    await Dao.update(ext, options(ctx, ext));
    return { result: 1 };
};
Service.setExtensionValid = async ctx => {
    write(ctx);
    const vdnId = await scope(ctx);
    if (![0,1].includes(Number(ctx.paramsObj.isValid))) error('分机状态无效');
    await Dao.setValid({ num: normalizeNumber(ctx.paramsObj.num), vdnId, isValid: Number(ctx.paramsObj.isValid) }, options(ctx));
    return 1;
};
Service.deleteExtension = async ctx => {
    write(ctx);
    const vdnId = await scope(ctx);
    const nums = String(ctx.paramsObj.nums || '').split(',').filter(Boolean).map(normalizeNumber);
    await Dao.deleteByNums({ nums: [...new Set(nums)], vdnId }, options(ctx));
    return { result: 1, num: '' };
};
Service.getchGroupList = async ctx => Dao.loadChGroupList({ vdnId: await scope(ctx) });
Service.getNumList = async ctx => Dao.loadNumList({ vdnId: await scope(ctx), num: String(ctx.paramsObj.num || '') });
Service.copyExtension = async ctx => {
    write(ctx);
    const ext = parse(ctx.paramsObj.extensionJson || ctx.paramsObj.extension);
    const vdnId = await scope(ctx, ext);
    const src = await Dao.findByPrimaryKey({ num: normalizeNumber(ext.num), vdnId });
    if (!src) error('分机不存在或不属于当前 VDN', 403);
    const lease = await Dao.reserve({ actor: ctx.uid, vdnId, authorize: t => scope(ctx, ext, t) });
    try {
        await Dao.insert({ ...src, num: lease.num, vdn: vdnId, sipEnabled: Boolean(src.sipEnabled) }, { ...options(ctx, ext), token: lease.reservationToken });
        return true;
    } finally { await Dao.release({ actor: ctx.uid, vdnId, token: lease.reservationToken }); }
};
Service.batchExtension = async ctx => {
    write(ctx);
    const ext = { ...parse(ctx.paramsObj.extensionJson) };
    ext.vdn = await scope(ctx, ext);
    await settings(ext, ext.vdn);
    const first = Number(normalizeNumber(ext.num)), last = Number(normalizeNumber(ext.hisNum));
    if (last < first || last - first >= 500) error('批量分机数量必须为 1-500');
    const rows = Array.from({ length: last - first + 1 }, (_, i) => ({ ...ext, num: String(first + i) }));
    if (ext.ch12) {
        const channels = String(ext.ch12).split(',').map(Number);
        if (channels.length !== 2 || !channels.every(Number.isSafeInteger) || channels[0] < 0 || channels[1] - channels[0] !== rows.length - 1) error('通道数量与分机数量不一致');
        rows.forEach((row, i) => { row.ch = channels[0] + i; });
    }
    await Dao.batch(rows, options(ctx, ext));
    return { result: 1, msg: 'ok' };
};
module.exports = Service;
