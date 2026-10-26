const Dao = require('../../dao/SysUserSMCIccDao');
const OmniUserSync = require('../integration/OmniUserSync');

const CONST_WORKNO_MAX_LENGTH = 50;
const CONST_NAME_MAX_LENGTH = 100;

const Service = {};

function toInt(v, d = 0) {
    if (v === null || v === undefined || v === '') return d;
    const n = Number(v);
    return Number.isNaN(n) ? d : n;
}

function pickUser(p, key) {
    if (!p) return undefined;
    if (p.user && typeof p.user === 'object' && Object.prototype.hasOwnProperty.call(p.user, key)) {
        return p.user[key];
    }
    const dotted = `user.${key}`;
    if (Object.prototype.hasOwnProperty.call(p, dotted)) return p[dotted];
    if (Object.prototype.hasOwnProperty.call(p, key)) return p[key];
    return undefined;
}

function pageOf(ctx) {
    const page = Math.max(1, toInt(ctx.paramsObj.page, 1));
    const pagesize = Math.max(1, toInt(ctx.paramsObj.pagesize, 10));
    return { offset: (page - 1) * pagesize, pagesize, page };
}

function optStrPick(p, key) {
    const v = pickUser(p, key);
    if (v === undefined || v === null) return null;
    const s = String(v).trim();
    return s === '' ? null : s;
}

function optIntPick(p, key) {
    const v = pickUser(p, key);
    if (v === undefined || v === null || v === '') return null;
    const n = Number(v);
    return Number.isNaN(n) ? null : n;
}

function parseUserFull(p) {
    return {
        workNo: String(pickUser(p, 'workNo') ?? '').trim(),
        name: String(pickUser(p, 'name') ?? '').trim(),
        shortName: optStrPick(p, 'shortName'),
        byName: optStrPick(p, 'byName'),
        password: optStrPick(p, 'password'),
        tel: optStrPick(p, 'tel'),
        extensionTel: optStrPick(p, 'extensionTel'),
        mobileTel: optStrPick(p, 'mobileTel'),
        email: optStrPick(p, 'email'),
        address: optStrPick(p, 'address'),
        computerName: optStrPick(p, 'computerName'),
        ipAddress: optStrPick(p, 'ipAddress'),
        isSystem: optIntPick(p, 'isSystem'),
        isValid: optIntPick(p, 'isValid'),
        agentActivate: optIntPick(p, 'agentActivate'),
        defaultGroup: optIntPick(p, 'defaultGroup'),
        maxCount: optIntPick(p, 'maxCount'),
        depId: optStrPick(p, 'depId'),
        depLevel: optIntPick(p, 'depLevel'),
        depParentList: optStrPick(p, 'depParentList'),
        selCheckBox: optIntPick(p, 'selCheckBox'),
        wokNo2: optStrPick(p, 'wokNo2'),
        roleId: optStrPick(p, 'roleId'),
        userDepartmentId: optIntPick(p, 'userDepartmentId'),
        isCallOut: optIntPick(p, 'isCallOut'),
        calledTel: optStrPick(p, 'calledTel'),
    };
}

function rowForInsert(u) {
    return {
        workNo: u.workNo,
        name: u.name,
        shortName: u.shortName,
        byName: u.byName,
        password: u.password,
        tel: u.tel,
        extensionTel: u.extensionTel,
        mobileTel: u.mobileTel,
        email: u.email,
        address: u.address,
        computerName: u.computerName,
        ipAddress: u.ipAddress,
        isSystem: u.isSystem,
        isValid: u.isValid,
        agentActivate: u.agentActivate,
        defaultGroup: u.defaultGroup,
        maxCount: u.maxCount,
        depId: u.depId,
        depLevel: u.depLevel,
        depParentList: u.depParentList,
        selCheckBox: u.selCheckBox,
        wokNo2: u.wokNo2,
        roleId: u.roleId,
        userDepartmentId: u.userDepartmentId,
        isCallOut: u.isCallOut,
        calledTel: u.calledTel,
    };
}

/** 与 copyUser：仅 WorkNO/Name/PassWord 有值，其余与 Java new User + insert 一致的可空列 */
function rowForCopyInsert(workNo, name, password) {
    return rowForInsert({
        workNo,
        name,
        password: password != null ? String(password).trim() : null,
        shortName: null,
        byName: null,
        tel: null,
        extensionTel: null,
        mobileTel: null,
        email: null,
        address: null,
        computerName: null,
        ipAddress: null,
        isSystem: null,
        isValid: null,
        agentActivate: null,
        defaultGroup: null,
        maxCount: null,
        depId: null,
        depLevel: null,
        depParentList: null,
        selCheckBox: null,
        wokNo2: null,
        roleId: null,
        userDepartmentId: null,
        isCallOut: null,
        calledTel: null,
    });
}

function pickUserIds(p) {
    if (!p) return '';
    if (p.userIds != null) return String(p.userIds);
    return '';
}

/** 与 UserAction.loadUserList：user 为 null 时列表用 "" 过滤；Total 避免 Java 侧 NPE，对 name/workNo 用 "" */
Service.loadUserList = async (ctx) => {
    const p = ctx.paramsObj || {};
    const u = p.user && typeof p.user === 'object' ? p.user : null;
    const nameForWorkNoLike = u ? (u.name != null ? String(u.name) : '') : '';
    const workNoForNameLike = u ? (u.workNo != null ? String(u.workNo) : '') : '';
    const { offset, pagesize } = pageOf(ctx);
    const [Rows, Total] = await Promise.all([
        Dao.sysUserListPage(nameForWorkNoLike, workNoForNameLike, offset, pagesize),
        Dao.sysUserCount(nameForWorkNoLike, workNoForNameLike),
    ]);
    return { Rows, Total };
};

/** 与 UserServiceImpl.addUser */
Service.addUser = async (ctx) => {
    const p = ctx.paramsObj || {};
    const u = parseUserFull(p);
    try {
        const dup = await Dao.selectByWorkNoForVdn(u.workNo, undefined);
        if (dup != null) return -1;
        const ret = await Dao.sysUserInsert(rowForInsert(u));
        if (Number(ret || 0) > 0) {
            await OmniUserSync.upsert({
                vdnId: -100,
                workNo: u.workNo,
                name: u.name,
                email: u.email,
                password: u.password,
            });
            return 1;
        }
        return 0;
    } catch (e) {
        return 0;
    }
};

/** 与 UserServiceImpl.modifyUser */
Service.modifyUser = async (ctx) => {
    const p = ctx.paramsObj || {};
    const id = toInt(pickUser(p, 'id'), 0);
    if (id === 0) return 0;
    const workNo = String(pickUser(p, 'workNo') ?? '').trim();
    const name = String(pickUser(p, 'name') ?? '').trim();
    const password = pickUser(p, 'password') != null ? String(pickUser(p, 'password')).trim() : null;
    try {
        const existingRows = await Dao.sysUserSelectByIds([id]);
        const existing = existingRows[0] || null;
        const dbUser = await Dao.selectByWorkNoForVdn(workNo, undefined);
        if (dbUser != null && Number(dbUser.id) !== id) return -1;
        const ret = await Dao.sysUserUpdateBasic({ id, name, password, workNo });
        if (Number(ret || 0) > 0) {
            await OmniUserSync.upsert({
                vdnId: -100,
                workNo,
                previousWorkNo: existing?.workNo && existing.workNo !== workNo ? existing.workNo : null,
                name,
                email: existing?.email || null,
                password: password || null,
            });
            return 1;
        }
        return 0;
    } catch (e) {
        return 0;
    }
};

/** 与 UserServiceImpl.deleteUsers */
Service.deleteUsers = async (ctx) => {
    const p = ctx.paramsObj || {};
    const raw = pickUserIds(p);
    if (raw == null || String(raw).trim() === '') return false;
    const ids = String(raw)
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s !== '')
        .map((s) => toInt(s, NaN))
        .filter((n) => !Number.isNaN(n));
    if (!ids.length) return false;
    try {
        const before = await Dao.sysUserSelectByIds(ids);
        const ret = await Dao.sysUserDeleteByIds(ids);
        if (Number(ret || 0) > 0) {
            for (const row of before) {
                await OmniUserSync.remove({ vdnId: -100,
                    workNo: row.workNo,
                    email: row.email || null,
                });
            }
            return true;
        }
        return false;
    } catch (e) {
        return false;
    }
};

/** 与 UserServiceImpl.copyUser */
Service.copyUser = async (ctx) => {
    const p = ctx.paramsObj || {};
    const oldWorkNo = String(pickUser(p, 'workNo') ?? '');
    const oldName = String(pickUser(p, 'name') ?? '');
    const password = pickUser(p, 'password');
    const prefix = 'copy';
    let i = 0;
    let newWorkNo;
    let dbUser;
    do {
        i += 1;
        const cutLen = (prefix + i).length - (CONST_WORKNO_MAX_LENGTH - oldWorkNo.length);
        newWorkNo = cutLen > 0
            ? prefix + i + oldWorkNo.substring(0, oldWorkNo.length - cutLen)
            : prefix + i + oldWorkNo;
        dbUser = await Dao.selectByWorkNo(newWorkNo);
    } while (dbUser != null);

    const cutLen2 = (prefix + i).length - (CONST_NAME_MAX_LENGTH - oldName.length);
    const newName = cutLen2 > 0
        ? prefix + i + oldName.substring(0, oldName.length - cutLen2)
        : prefix + i + oldName;

    try {
        const ret = await Dao.sysUserInsert(rowForCopyInsert(newWorkNo, newName, password));
        if (Number(ret || 0) > 0) {
            await OmniUserSync.upsert({
                vdnId: -100,
                workNo: newWorkNo,
                name: newName,
                email: null,
                password: password != null ? String(password).trim() : null,
            });
            return true;
        }
        return false;
    } catch (e) {
        return false;
    }
};

/** 与 UserServiceImpl.getSysUserCount */
Service.getSysUserCount = async () => Dao.getSysUserCount();

/** 与 UserAction.getUserList：m_OutList = userService.getUserList() → selectAll */
Service.getUserList = async () => Dao.sysUserSelectAll();

module.exports = Service;
