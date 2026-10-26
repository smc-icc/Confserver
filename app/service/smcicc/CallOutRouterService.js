const CorDao = require('../../dao/CallOutRouterSMCIccDao');
const TasDao = require('../../dao/TasSMCIccDao');

const Svc = {};

function toInt(v, d = 0) {
    if (v === null || v === undefined || v === '') return d;
    const n = Number(v);
    return Number.isNaN(n) ? d : n;
}

function resolveVdnId(ctx) {
    const p = ctx.paramsObj || {};
    const id = p.vdnId ?? p.vdnID ?? ctx.session?.smcicc_vdn_id;
    const n = Number(id);
    return Number.isNaN(n) ? 0 : n;
}

function parseCallOutRouterJson(ctx) {
    const raw = ctx.paramsObj?.callOutRouterJson ?? ctx.paramsObj?.callOutRouter;
    if (!raw) return {};
    if (typeof raw === 'object') return raw;
    try {
        return JSON.parse(raw);
    } catch (e) {
        return {};
    }
}

function logicListFromChannelGroup(cg) {
    const cgBeginSpanId = toInt(cg.beginSpanId, 0);
    const cgEndSpanId = toInt(cg.endSpanId, 0);
    const cgBeginChannelId = toInt(cg.beginChannelId, 0);
    const cgEndChannelId = toInt(cg.endChannelId, 0);
    const logicList = [];
    for (let beginId = cgBeginSpanId; beginId <= cgEndSpanId; beginId += 1) {
        for (let i = cgBeginChannelId; i <= cgEndChannelId; i += 1) {
            const val = i + beginId * 32;
            if (!logicList.includes(val)) logicList.push(val);
        }
    }
    return logicList;
}

function containsAll(logicList, physicalList) {
    return physicalList.every((p) => logicList.includes(p));
}

/** 与 CallOutRouterServiceImpl.deleteCallOutRouter 中物理通道集合计算 */
async function buildPhysicalChannelList() {
    const physicalList = [];
    const tasRows = await TasDao.tasSelectAllPids();
    for (const { pid: tasPid } of tasRows) {
        const isxLinks = await TasDao.listTas4IsxByTasPid(tasPid);
        for (const link of isxLinks) {
            const isxPid = toInt(link.cfgIsxPid, 0);
            if (!isxPid) continue;
            const agBoardList = await TasDao.listAgBoardsForIsx([isxPid]);
            for (const ag of agBoardList) {
                if (Number(ag.isEnable) !== 1) continue;
                const boardId = toInt(ag.oamBoardId, 0);
                const spanId = toInt(ag.ctiLogicSpanId, 0);
                for (let chNum = 0; chNum < 4; chNum += 1) {
                    const ch = spanId * 32 + ((boardId % 8) * 4) + chNum;
                    if (!physicalList.includes(ch)) physicalList.push(ch);
                }
            }
            const dtiBoardList = await TasDao.listDtiBoardsForIsx([isxPid]);
            for (const dti of dtiBoardList) {
                if (Number(dti.isEnable) !== 1) continue;
                const spanId = toInt(dti.ctiLogicSpanId, 0);
                for (let chNum = 0; chNum < 32; chNum += 1) {
                    const ch = chNum + spanId * 32;
                    if (!physicalList.includes(ch)) physicalList.push(ch);
                }
            }
        }
        const tas4CallOutList = await TasDao.listCallOutsEnabled(tasPid);
        for (const co of tas4CallOutList) {
            const beginSpan = toInt(co.beginSpan, 0);
            const endSpan = toInt(co.endSpan, 0);
            for (let chNum = 0; chNum < 32; chNum += 1) {
                for (let i = beginSpan; i <= endSpan; i += 1) {
                    const ch = chNum + i * 32;
                    if (!physicalList.includes(ch)) physicalList.push(ch);
                }
            }
        }
        const tas4CallInList = await TasDao.listCallInsEnabled(tasPid);
        for (const ci of tas4CallInList) {
            const beginSpan = toInt(ci.beginSpan, 0);
            const endSpan = toInt(ci.endSpan, 0);
            for (let chNum = 0; chNum < 32; chNum += 1) {
                for (let i = beginSpan; i <= endSpan; i += 1) {
                    const ch = chNum + i * 32;
                    if (!physicalList.includes(ch)) physicalList.push(ch);
                }
            }
        }
    }
    return physicalList;
}

async function deleteNeedsUserConfirm(nums, vdnId) {
    const numArr = String(nums || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    for (const num of numArr) {
        const channelGroup = await CorDao.channelGroupByRouterNum(num, vdnId);
        if (!channelGroup) continue;
        const logicList = logicListFromChannelGroup(channelGroup);
        const physicalList = await buildPhysicalChannelList();
        if (containsAll(logicList, physicalList)) {
            return true;
        }
    }
    return false;
}

Svc.loadCallOutRouterList = async (ctx) => {
    const p = ctx.paramsObj || {};
    const bean = p.callOutRouterBean && typeof p.callOutRouterBean === 'object' ? p.callOutRouterBean : p;
    const vdnId = resolveVdnId(ctx);
    if (!vdnId) return { Rows: [], Total: 0 };
    const page = Math.max(1, toInt(bean.pageNum ?? bean.page ?? p.page, 1));
    const pageSize = Math.max(1, toInt(bean.pageSize ?? bean.pagesize ?? p.pagesize, 10));
    const offset = (page - 1) * pageSize;
    const num = bean.num;
    const device = bean.device;
    const chGroup = bean.chGroup;
    const ch = bean.ch;
    const [Rows, Total] = await Promise.all([
        CorDao.callOutRouterListPage({ vdnId, num, device, chGroup, ch, offset, limit: pageSize }),
        CorDao.callOutRouterCount({ vdnId, num, device, chGroup, ch }),
    ]);
    return { Rows, Total };
};

Svc.addCallOutRouter = async (ctx) => {
    const vdnId = resolveVdnId(ctx);
    if (!vdnId) return 0;
    const j = parseCallOutRouterJson(ctx);
    const row = {
        num: String(j.num ?? '').trim(),
        oldNum: j.oldNum != null ? String(j.oldNum).trim() : '',
        device: toInt(j.device, 0),
        ch: toInt(j.ch, 0),
        chGroup: String(j.chGroup ?? '').trim(),
        description: String(j.description ?? '').trim(),
        agentMode: toInt(j.agentMode, 0),
        routerType: String(j.routerType ?? '').trim(),
        callOutCalledNumType: toInt(j.callOutCalledNumType, 0),
        vdnId,
    };
    if (!row.num) return 0;
    const dup = await CorDao.callOutRouterCountByNum(vdnId, row.num);
    if (dup > 0) return 2;
    try {
        await CorDao.callOutRouterInsert(row);
        return 1;
    } catch (e) {
        return 0;
    }
};

Svc.editCallOutRouter = async (ctx) => {
    const vdnId = resolveVdnId(ctx);
    if (!vdnId) return 0;
    const j = parseCallOutRouterJson(ctx);
    const newNum = String(j.num ?? '').trim();
    const oldNum = String(j.oldNum ?? j.num ?? '').trim();
    const row = {
        num: newNum,
        oldNum,
        device: toInt(j.device, 0),
        ch: toInt(j.ch, 0),
        chGroup: String(j.chGroup ?? '').trim(),
        description: String(j.description ?? '').trim(),
        agentMode: toInt(j.agentMode, 0),
        routerType: String(j.routerType ?? '').trim(),
        callOutCalledNumType: toInt(j.callOutCalledNumType, 0),
        vdnId,
    };
    if (!newNum || !oldNum) return 0;
    if (newNum !== oldNum) {
        const dup = await CorDao.callOutRouterCountByNum(vdnId, newNum);
        if (dup > 0) return 2;
    }
    try {
        const ret = await CorDao.callOutRouterUpdate(row);
        return Number(ret || 0) > 0 ? 1 : 0;
    } catch (e) {
        return 0;
    }
};

/**
 * 与 Java：成功=1，失败=-1，需二次确认=-2；confirmDel=1 时强制删。
 */
Svc.deleteCallOutRouter = async (ctx) => {
    const p = ctx.paramsObj || {};
    const vdnId = resolveVdnId(ctx);
    if (!vdnId) return -1;
    const nums = String(p.nums ?? '').trim();
    const confirmDel = toInt(p.confirmDel, 0);
    if (!nums) return -1;
    if (confirmDel === 0) {
        const need = await deleteNeedsUserConfirm(nums, vdnId);
        if (need) return -2;
    }
    try {
        const parts = nums.split(',').map((s) => s.trim()).filter(Boolean);
        let n = 0;
        for (const num of parts) {
            const r = await CorDao.callOutRouterDeleteOne(num, vdnId);
            n += Number(r || 0);
        }
        return n > 0 ? 1 : -1;
    } catch (e) {
        return -1;
    }
};

module.exports = Svc;
