const Db = require('./db');
const { QueryTypes } = require('sequelize');

const Dao = {};

function sequelize() {
    return Db.db_smcicc.sequelize;
}

const SYS_VDN = -100;

/** 与 selectSysUser：第一参数映射到 WorkNO LIKE，第二参数映射到 Name LIKE（与 MyBatis 一致） */
Dao.sysUserListPage = async (nameForWorkNoLike, workNoForNameLike, offset, limit) => {
    const n1 = nameForWorkNoLike == null ? '' : String(nameForWorkNoLike);
    const n2 = workNoForNameLike == null ? '' : String(workNoForNameLike);
    return sequelize().query(
        `SELECT ID AS id, WorkNO AS workNo, Name AS name, PassWord AS password
           FROM t_user_users
          WHERE VDNID = :vdn
            AND WorkNO LIKE CONCAT('%', :n1, '%')
            AND Name LIKE CONCAT('%', :n2, '%')
          ORDER BY WorkNO ASC
          LIMIT :offset, :limit`,
        { replacements: { vdn: SYS_VDN, n1, n2, offset, limit }, type: QueryTypes.SELECT }
    );
};

Dao.sysUserCount = async (nameForWorkNoLike, workNoForNameLike) => {
    const n1 = nameForWorkNoLike == null ? '' : String(nameForWorkNoLike);
    const n2 = workNoForNameLike == null ? '' : String(workNoForNameLike);
    const rows = await sequelize().query(
        `SELECT COUNT(1) AS c FROM t_user_users
          WHERE VDNID = :vdn
            AND WorkNO LIKE CONCAT('%', :n1, '%')
            AND Name LIKE CONCAT('%', :n2, '%')`,
        { replacements: { vdn: SYS_VDN, n1, n2 }, type: QueryTypes.SELECT }
    );
    return Number(rows?.[0]?.c || 0);
};

Dao.getSysUserCount = async () => {
    const rows = await sequelize().query(
        `SELECT COUNT(1) AS c FROM t_user_users WHERE VDNID = :vdn`,
        { replacements: { vdn: SYS_VDN }, type: QueryTypes.SELECT }
    );
    return Number(rows?.[0]?.c || 0);
};

/** 与 selectByWorkNoForLogin(workNo, -100) */
Dao.selectByWorkNoForVdn = async (workNo, vdnId = SYS_VDN) => {
    const rows = await sequelize().query(
        `SELECT ID AS id, WorkNO AS workNo, Name AS name, PassWord AS password, VDNID AS vdnId, IsValid AS isValid
           FROM t_user_users WHERE WorkNO = :workNo AND VDNID = :vdnId LIMIT 1`,
        { replacements: { workNo: String(workNo), vdnId }, type: QueryTypes.SELECT }
    );
    return rows[0] || null;
};

/** 与 selectByWorkNo：全局工号 */
Dao.selectByWorkNo = async (workNo) => {
    const rows = await sequelize().query(
        `SELECT ID AS id, WorkNO AS workNo, Name AS name, PassWord AS password, VDNID AS vdnId, IsValid AS isValid
           FROM t_user_users WHERE WorkNO = :workNo LIMIT 1`,
        { replacements: { workNo: String(workNo) }, type: QueryTypes.SELECT }
    );
    return rows[0] || null;
};

/** 与 UserMapper.insert（系统用户 VDNID=-100） */
Dao.sysUserInsert = async (row) => {
    const [ret] = await sequelize().query(
        `INSERT INTO t_user_users (WorkNO, Name, ShortName, Byname, PassWord, Tel, ExtensionTel, MobileTel, Email,
            Address, ComputerName, IPAddress, IsSystem, IsValid, AgentActivate, DefaultGroup, MaxCount, dep_id,
            dep_level, dep_parent_list, SelCheckBox, WorkNO2, role_id, VDNID, UserDepartmentID, iscallout, CalledTel)
         VALUES (:workNo, :name, :shortName, :byName, :password, :tel, :extensionTel, :mobileTel, :email,
            :address, :computerName, :ipAddress, :isSystem, :isValid, :agentActivate, :defaultGroup, :maxCount, :depId,
            :depLevel, :depParentList, :selCheckBox, :wokNo2, :roleId, :vdnId, :userDepartmentId, :isCallOut, :calledTel)`,
        { replacements: { ...row, vdnId: SYS_VDN }, type: QueryTypes.INSERT }
    );
    return ret;
};

/** 与 updateByPrimaryKey（仅 Name / PassWord / WorkNO） */
Dao.sysUserUpdateBasic = async ({ id, name, password, workNo }) => {
    const [ret] = await sequelize().query(
        `UPDATE t_user_users SET Name = :name, PassWord = :password, WorkNO = :workNo WHERE ID = :id`,
        { replacements: { id, name, password, workNo }, type: QueryTypes.UPDATE }
    );
    return ret;
};

Dao.sysUserDeleteByIds = async (ids) => {
    if (!ids.length) return 0;
    const marks = ids.map((_, i) => `:d${i}`).join(',');
    const repl = {};
    ids.forEach((id, i) => { repl[`d${i}`] = id; });
    const [ret] = await sequelize().query(
        `DELETE FROM t_user_users WHERE ID IN (${marks})`,
        { replacements: repl, type: QueryTypes.DELETE }
    );
    return ret;
};

Dao.sysUserSelectByIds = async (ids) => {
    if (!ids.length) return [];
    const marks = ids.map((_, i) => `:d${i}`).join(',');
    const repl = {};
    ids.forEach((id, i) => { repl[`d${i}`] = id; });
    return sequelize().query(
        `SELECT ID AS id, WorkNO AS workNo, Name AS name, PassWord AS password, Email AS email, VDNID AS vdnId
           FROM t_user_users WHERE ID IN (${marks})`,
        { replacements: repl, type: QueryTypes.SELECT }
    );
};

Dao.sysUserSelectAll = async () => sequelize().query(
    `SELECT ID AS id, WorkNO AS workNo, Name AS name, ShortName AS shortName, Byname AS byName, PassWord AS password,
            Tel AS tel, ExtensionTel AS extensionTel, MobileTel AS mobileTel, Email AS email, Address AS address,
            ComputerName AS computerName, IPAddress AS ipAddress, IsSystem AS isSystem, IsValid AS isValid,
            AgentActivate AS agentActivate, DefaultGroup AS defaultGroup, MaxCount AS maxCount, dep_id AS depId,
            dep_level AS depLevel, dep_parent_list AS depParentList, SelCheckBox AS selCheckBox, WorkNO2 AS wokNo2,
            role_id AS roleId, VDNID AS vdnId, UserDepartmentID AS userDepartmentId, iscallout AS isCallOut, CalledTel AS calledTel
       FROM t_user_users ORDER BY WorkNO ASC`,
    { type: QueryTypes.SELECT }
);

module.exports = Dao;
