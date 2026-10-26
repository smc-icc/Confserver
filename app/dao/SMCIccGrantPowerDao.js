const Db = require('./db');
const { QueryTypes } = require('sequelize');

function sequelize() {
    return Db.db_smcicc.sequelize;
}

function affectedRows(ret) {
    if (typeof ret === 'number') return ret;
    if (ret && typeof ret.affectedRows === 'number') return ret.affectedRows;
    return 0;
}

const Dao = {};

/** 与 GrantPowerMapper.getPower：无关键字且非纯数字时返回全部权限行 */
Dao.getPowerList = async (strKeyWord) => {
    const kw = strKeyWord != null ? String(strKeyWord).trim() : '';
    const hasKw = kw === '' ? 0 : 1;
    let valueNum = null;
    if (kw !== '' && /^\d+$/.test(kw)) {
        valueNum = Number(kw);
    }
    const rows = await sequelize().query(
        `SELECT A.id AS powerid, A.name AS powername, A.value AS powervalue, A.SubSystemType AS subsystemtype,
                IFNULL(CONCAT('[', B.ID, ']', B.SubSysemType), '未知') AS firstname
           FROM t_user_power A
           JOIN t_user_subsysemtype B ON A.SubSystemType = B.ID
          WHERE (
                  (:hasKw = 0 AND :valueNum IS NULL)
               OR (:hasKw = 1 AND A.Name LIKE CONCAT('%', :kw, '%'))
               OR (:valueNum IS NOT NULL AND A.Value = :valueNum)
                )
          ORDER BY A.SubSystemType, A.Name ASC`,
        { replacements: { kw, hasKw, valueNum }, type: QueryTypes.SELECT }
    );
    return rows;
};

Dao.getDepartToPowerIds = async (departId, vdnId) => {
    const rows = await sequelize().query(
        `SELECT PowerId AS powerid FROM t_user_grantpower
          WHERE OwnerType = 2 AND IsOwn = 1 AND OwnerId = :departId AND vdnid = :vdnId`,
        { replacements: { departId, vdnId }, type: QueryTypes.SELECT }
    );
    return new Set(rows.map((r) => r.powerid).filter((x) => x != null));
};

Dao.insertToPowerForDepart = async (departId, powerId, vdnId, transaction) => {
    const [, ret] = await sequelize().query(
        `INSERT INTO t_user_grantpower (OwnerType, OwnerId, PowerId, IsOwn, vdnid)
         VALUES (2, :departId, :powerId, 1, :vdnId)`,
        { replacements: { departId, powerId, vdnId }, type: QueryTypes.RAW, transaction }
    );
    return affectedRows(ret);
};

Dao.deletePowerForDepart = async (departId, powerId, vdnId, transaction) => {
    const [, ret] = await sequelize().query(
        `DELETE FROM t_user_grantpower
          WHERE OwnerType = 2 AND OwnerId = :departId AND PowerId = :powerId AND vdnid = :vdnId`,
        { replacements: { departId, powerId, vdnId }, type: QueryTypes.RAW, transaction }
    );
    return affectedRows(ret);
};

Dao.deleteAllPowerByDepartIds = async (ids, transaction, vdnId) => {
    if (!ids.length) return 0;
    const placeholders = ids.map(() => '?').join(',');
    const [, ret] = await sequelize().query(
        `DELETE FROM t_user_grantpower WHERE OwnerType = 2 AND OwnerId IN (${placeholders}) AND VDNID = ?`,
        { replacements: [...ids, vdnId], type: QueryTypes.RAW, transaction }
    );
    return affectedRows(ret);
};

Dao.getRoleToPowerIds = async (roleId, vdnId) => {
    const rows = await sequelize().query(
        `SELECT PowerId AS powerid FROM t_user_grantpower
          WHERE OwnerType = 1 AND IsOwn = 1 AND OwnerId = :roleId AND vdnid = :vdnId`,
        { replacements: { roleId, vdnId }, type: QueryTypes.SELECT }
    );
    return new Set(rows.map((r) => r.powerid).filter((x) => x != null));
};

/** GrantPowerMapper.deletePowerForRole */
Dao.deletePowerForRole = async (roleId, powerId, vdnId, transaction) => {
    const opts = {
        replacements: { roleId, powerId, vdnId },
        type: QueryTypes.RAW,
    };
    if (transaction) opts.transaction = transaction;
    const [, ret] = await sequelize().query(
        `DELETE FROM t_user_grantpower
          WHERE OwnerType = 1 AND OwnerId = :roleId AND PowerId = :powerId AND vdnid = :vdnId`,
        opts
    );
    return affectedRows(ret);
};

/** GrantPowerMapper.insertToPower（OwnerType=1 角色） */
Dao.insertToPowerForRole = async (roleId, powerId, vdnId, transaction) => {
    const opts = {
        replacements: { roleId, powerId, vdnId },
        type: QueryTypes.RAW,
    };
    if (transaction) opts.transaction = transaction;
    const [, ret] = await sequelize().query(
        `INSERT INTO t_user_grantpower (OwnerType, OwnerId, PowerId, IsOwn, vdnid)
         VALUES (1, :roleId, :powerId, 1, :vdnId)`,
        opts
    );
    return affectedRows(ret);
};

/**
 * 与 RoleAndPowerManagerServiceImpl.insertToPower：先删再插
 */
Dao.replacePowerForRole = async (roleId, powerId, vdnId, transaction) => {
    await Dao.deletePowerForRole(roleId, powerId, vdnId, transaction);
    return Dao.insertToPowerForRole(roleId, powerId, vdnId, transaction);
};

module.exports = Dao;
