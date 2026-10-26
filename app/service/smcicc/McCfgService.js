const McDao = require('../../dao/McCfgSMCIccDao');
const TasDao = require('../../dao/TasSMCIccDao');
const IsxDao = require('../../dao/IsxSMCIccDao');

const Service = {};

const CONST_IPADDRESSPORT_MAX_LENGTH = 100;

function toInt(v, d = 0) {
    if (v === null || v === undefined || v === '') return d;
    const n = Number(v);
    return Number.isNaN(n) ? d : n;
}

function pickMc(p, key) {
    if (!p) return undefined;
    if (p.mc && typeof p.mc === 'object' && Object.prototype.hasOwnProperty.call(p.mc, key)) {
        return p.mc[key];
    }
    const dotted = `mc.${key}`;
    if (Object.prototype.hasOwnProperty.call(p, dotted)) return p[dotted];
    if (Object.prototype.hasOwnProperty.call(p, key)) return p[key];
    return undefined;
}

function pickMcPid(p) {
    const a = pickMc(p, 'pid');
    if (a != null && a !== '') return a;
    if (p && p.cfgMcPid != null) return p.cfgMcPid;
    return undefined;
}

function pageOf(ctx) {
    const page = Math.max(1, toInt(ctx.paramsObj.page, 1));
    const pagesize = Math.max(1, toInt(ctx.paramsObj.pagesize, 10));
    return { offset: (page - 1) * pagesize, pagesize, page };
}

function parseMc(p) {
    return {
        pid: toInt(pickMc(p, 'pid'), 0),
        ipAddressPort: String(pickMc(p, 'ipAddressPort') ?? '').trim(),
        savePath: String(pickMc(p, 'savePath') ?? '').trim(),
        beatCycle: toInt(pickMc(p, 'beatCycle'), 0),
        isCheckTone: toInt(pickMc(p, 'isCheckTone'), 0),
        checkTone: toInt(pickMc(p, 'checkTone'), 0),
        isAutoDeleteLogFile: toInt(pickMc(p, 'isAutoDeleteLogFile'), 0),
        autoDeleteLogFile: toInt(pickMc(p, 'autoDeleteLogFile'), 0),
        isInvokeSyncFun: toInt(pickMc(p, 'isInvokeSyncFun'), 0),
        invokeSyncFun: toInt(pickMc(p, 'invokeSyncFun'), 0),
    };
}

function rowForWrite(r) {
    return {
        ipAddressPort: r.ipAddressPort,
        savePath: r.savePath,
        beatCycle: r.beatCycle,
        isCheckTone: r.isCheckTone,
        checkTone: r.checkTone,
        isAutoDeleteLogFile: r.isAutoDeleteLogFile,
        autoDeleteLogFile: r.autoDeleteLogFile,
        isInvokeSyncFun: r.isInvokeSyncFun,
        invokeSyncFun: r.invokeSyncFun,
    };
}

/** 与 McAction.loadMcList：顶层 localIp */
Service.loadMcList = async (ctx) => {
    const p = ctx.paramsObj || {};
    const localIp = p.localIp != null ? String(p.localIp) : '';
    const { offset, pagesize } = pageOf(ctx);
    const [Rows, Total] = await Promise.all([
        McDao.mcListPage(localIp, offset, pagesize),
        McDao.mcCount(localIp),
    ]);
    return { Rows, Total };
};

/** 与 McImpl.addMc */
Service.addMc = async (ctx) => {
    const row = parseMc(ctx.paramsObj || {});
    if (!row.ipAddressPort) return 0;
    try {
        const dup = await McDao.countByIpAddressPortExcludePid(row.ipAddressPort, 0);
        if (dup > 0) return -1;
        const ret = await McDao.mcInsert(rowForWrite(row));
        return Number(ret || 0) > 0 ? 1 : 0;
    } catch (e) {
        return 0;
    }
};

/** 与 McImpl.editMc */
Service.editMc = async (ctx) => {
    const row = parseMc(ctx.paramsObj || {});
    if (!row.pid || !row.ipAddressPort) return 0;
    try {
        const dup = await McDao.countByIpAddressPortExcludePid(row.ipAddressPort, row.pid);
        if (dup > 0) return -1;
        const ret = await McDao.mcUpdate({ pid: row.pid, ...rowForWrite(row) });
        return Number(ret || 0) > 0 ? 1 : 0;
    } catch (e) {
        return 0;
    }
};

/** 与 McImpl.deleteMc：有 TAS 引用则返回 { result: 0, mcPid } */
Service.deleteMc = async (ctx) => {
    const pidsStr = String(ctx.paramsObj.pids || '').trim();
    const pids = pidsStr
        .split(',')
        .map((x) => toInt(x.trim(), 0))
        .filter((x) => x > 0);
    if (!pids.length) return { result: 0 };
    try {
        const inUse = await TasDao.selectCfgMcPidsInUse(pids);
        if (inUse.length > 0) {
            const mcPid = inUse.map((r) => r.cfgMcPid).filter((x) => x != null).join(',');
            return { result: 0, mcPid };
        }
        const result = await McDao.mcDeleteByPids(pids);
        return { result: Number(result || 0) };
    } catch (e) {
        return { result: 0 };
    }
};

Service.loadAllMc = async () => McDao.mcSelectAll();

function rowFromDb(src) {
    return {
        ipAddressPort: String(src.ipAddressPort ?? ''),
        savePath: String(src.savePath ?? ''),
        beatCycle: toInt(src.beatCycle, 0),
        isCheckTone: toInt(src.isCheckTone, 0),
        checkTone: toInt(src.checkTone, 0),
        isAutoDeleteLogFile: toInt(src.isAutoDeleteLogFile, 0),
        autoDeleteLogFile: toInt(src.autoDeleteLogFile, 0),
        isInvokeSyncFun: toInt(src.isInvokeSyncFun, 0),
        invokeSyncFun: toInt(src.invokeSyncFun, 0),
    };
}

/**
 * Struts mcAdmin.copyMc：Java McAction 未实现；按同表复制一条 MC，IPAddressPort 全局唯一（copy 前缀）。
 */
Service.copyMc = async (ctx) => {
    const p = ctx.paramsObj || {};
    const pid = toInt(pickMcPid(p), 0);
    if (!pid) return false;
    try {
        const src = await McDao.mcSelectByPid(pid);
        if (!src) return false;
        const oldIp = String(src.ipAddressPort || '');
        const prefix = 'copy';
        let i = 0;
        let newIp;
        let dup;
        do {
            i += 1;
            const cutLen = (prefix + i).length - (CONST_IPADDRESSPORT_MAX_LENGTH - oldIp.length);
            newIp = cutLen > 0
                ? prefix + i + oldIp.substring(0, oldIp.length - cutLen)
                : prefix + i + oldIp;
            dup = await McDao.countByIpAddressPortExcludePid(newIp, 0);
        } while (dup > 0);
        const ret = await McDao.mcInsert({ ...rowFromDb(src), ipAddressPort: newIp });
        return Number(ret || 0) > 0;
    } catch (e) {
        return false;
    }
};

/** Struts getIsx：返回全部 ISX PID 列表（与 loadIsxList 数据源一致） */
Service.getIsx = async () => IsxDao.isxSelectAll();

/**
 * Struts deleteBoardAndIsx：与 McMapper.deleteMcByPid 一致，调用 S_ICC_AG_DeleteMcAndIsx。
 * 参数：pids（逗号分隔 MC PID），部分客户端可能传 cfgMcPid 单值。
 */
Service.deleteBoardAndIsx = async (ctx) => {
    const p = ctx.paramsObj || {};
    const raw = String(p.pids ?? p.cfgMcPid ?? '').trim();
    if (!raw) return false;
    try {
        await McDao.callDeleteMcAndIsx(raw);
        return true;
    } catch (e) {
        return false;
    }
};

/**
 * Struts copyBoardAndIsx：m_OutMap。
 * 1) 若库中存在 S_ICC_AG_CopyBoardAndIsx(cfgMcPid, cfgIsxPid, oldIsxPid) 则直接调用；
 * 2) 否则与 copyIsx 一致：S_ICC_AG_CopyIsx 会复制 ISX 下资源板等业务数据（见 IsxMapper.copyIsx）。
 */
Service.copyBoardAndIsx = async (ctx) => {
    const p = ctx.paramsObj || {};
    const oldIsxPid = toInt(p.oldIsxPid ?? p.oldPid, 0);
    const cfgIsxPid = toInt(p.cfgIsxPid ?? p.newPid, 0);
    const cfgMcPid = toInt(p.cfgMcPid ?? pickMcPid(p), 0);

    const tryProc = cfgMcPid > 0 && cfgIsxPid > 0 && oldIsxPid > 0;
    if (tryProc) {
        try {
            await McDao.callCopyBoardAndIsx(cfgMcPid, cfgIsxPid, oldIsxPid);
            return {
                success: true,
                cfgMcPid,
                cfgIsxPid,
                oldIsxPid,
            };
        } catch (e) {
            /* 过程不存在或参数不匹配时回退 */
        }
    }

    if (cfgIsxPid <= 0 || oldIsxPid <= 0) {
        return { success: false, reason: 'missing_isx_pid' };
    }
    try {
        const exists = await IsxDao.isxSelectByPid(cfgIsxPid);
        if (exists) {
            return { success: false, reason: 'target_exists' };
        }
        await IsxDao.callCopyIsx(cfgIsxPid, oldIsxPid);
        return {
            success: true,
            cfgIsxPid,
            oldIsxPid,
            cfgMcPid: cfgMcPid > 0 ? cfgMcPid : undefined,
        };
    } catch (e) {
        return { success: false, reason: 'copy_failed' };
    }
};

module.exports = Service;
