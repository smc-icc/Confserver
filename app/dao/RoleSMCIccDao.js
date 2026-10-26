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

/** RoleMapper.getTUserRole */
Dao.getTUserRole = async (vdnId, strKeyWord) => {
    const kw = strKeyWord != null ? String(strKeyWord).trim() : '';
    return sequelize().query(
        `SELECT ID AS id, Name AS name, IsSystem AS issystem, VDNID AS vdnid
           FROM t_user_role
          WHERE VDNID = :vdnId
            AND (:kw = '' OR Name LIKE CONCAT('%', :kw, '%'))
          ORDER BY Name ASC`,
        { replacements: { vdnId, kw }, type: QueryTypes.SELECT }
    );
};

/** RoleMapper.addRole：IFNULL(MAX(ID),0)+1 */
Dao.addRole = async (name, vdnId, transaction) => {
    const opts = {
        replacements: { name, vdnId },
        type: QueryTypes.RAW,
    };
    if (transaction) opts.transaction = transaction;
    const [, ret] = await sequelize().query(
        `INSERT INTO t_user_role (id, NAME, IsSystem, VDNID)
         SELECT IFNULL(MAX(ID), 0) + 1, :name, 0, :vdnId FROM t_user_role`,
        opts
    );
    return affectedRows(ret);
};

/** RoleMapper.editRole */
Dao.editRole = async (roleId, name, vdnId, transaction) => {
    const opts = {
        replacements: { roleId, name, vdnId },
        type: QueryTypes.RAW,
    };
    if (transaction) opts.transaction = transaction;
    const [, ret] = await sequelize().query(
        `UPDATE t_user_role SET NAME = :name WHERE id = :roleId AND VDNID = :vdnId`,
        opts
    );
    return affectedRows(ret);
};

/** RoleMapper.getRole2Add */
Dao.getRole2Add = async (roleName, vdnId) => {
    const rows = await sequelize().query(
        `SELECT ID AS id, Name AS name, IsSystem AS issystem, VDNID AS vdnid, SubSystemType AS subsystemtype
           FROM t_user_role
          WHERE Name LIKE :roleName AND VDNID = :vdnId
          ORDER BY Name ASC`,
        { replacements: { roleName, vdnId }, type: QueryTypes.SELECT }
    );
    return rows;
};

/** RoleMapper.getRoleByName（编辑时排除自身 id） */
Dao.getRoleByNameExcludeId = async (roleName, excludeRoleId, vdnId) => {
    const rows = await sequelize().query(
        `SELECT ID AS id, Name AS name, IsSystem AS issystem, VDNID AS vdnid, SubSystemType AS subsystemtype
           FROM t_user_role
          WHERE Name LIKE :roleName AND VDNID = :vdnId AND id != :excludeRoleId
          ORDER BY Name ASC`,
        { replacements: { roleName, excludeRoleId, vdnId }, type: QueryTypes.SELECT }
    );
    return rows;
};

/** RoleMapper.getRoleById */
Dao.getRoleById = async (roleId, vdnId) => {
    const rows = await sequelize().query(
        `SELECT ID AS id, Name AS name, IsSystem AS issystem, VDNID AS vdnid, SubSystemType AS subsystemtype
           FROM t_user_role
          WHERE id = :roleId AND VDNID = :vdnId
          ORDER BY Name ASC`,
        { replacements: { roleId, vdnId }, type: QueryTypes.SELECT }
    );
    return rows[0] || null;
};

Dao.deleteRolesByIds = async (ids, vdnId, transaction) => {
    if (!ids.length) return 0;
    const placeholders = ids.map(() => '?').join(',');
    const opts = {
        replacements: [...ids, vdnId],
        type: QueryTypes.RAW,
    };
    if (transaction) opts.transaction = transaction;
    const [, ret] = await sequelize().query(
        `DELETE FROM t_user_role WHERE ID IN (${placeholders}) AND VDNID = ?`,
        opts
    );
    return affectedRows(ret);
};

/** UserMapper.getAlternativeData4Role */
Dao.getAlternativeData4Role = async (roleId, strKeyWord, vdnId) => {
    const kw = strKeyWord != null ? String(strKeyWord).trim() : '';
    return sequelize().query(
        `SELECT A.ID AS id, A.WorkNO AS workno, A.Name AS name
           FROM t_user_users A
          WHERE NOT EXISTS (
                  SELECT B.UserID FROM t_user_usertorole B
                   WHERE B.RoleID = :roleId AND B.VDNID = :vdnId AND B.UserID = A.ID
                )
            AND A.VDNID = :vdnId
            AND (A.Name LIKE CONCAT('%', :kw, '%') OR A.WorkNO LIKE CONCAT('%', :kw, '%'))
          ORDER BY A.WorkNO ASC`,
        { replacements: { roleId, vdnId, kw }, type: QueryTypes.SELECT }
    );
};

/** UserMapper.getSelectedData4Role */
Dao.getSelectedData4Role = async (roleId, strKeyWord, vdnId) => {
    const kw = strKeyWord != null ? String(strKeyWord).trim() : '';
    return sequelize().query(
        `SELECT A.ID AS id, A.WorkNO AS workno, A.Name AS name
           FROM t_user_users A
          WHERE EXISTS (
                  SELECT B.UserID FROM t_user_usertorole B
                   WHERE B.RoleID = :roleId AND B.VDNID = :vdnId AND B.UserID = A.ID
                )
            AND A.VDNID = :vdnId
            AND (A.Name LIKE CONCAT('%', :kw, '%') OR A.WorkNO LIKE CONCAT('%', :kw, '%'))
          ORDER BY A.WorkNO ASC`,
        { replacements: { roleId, vdnId, kw }, type: QueryTypes.SELECT }
    );
};

Dao.insertUserToRole = async (userId, roleId, vdnId, transaction) => {
    const [, ret] = await sequelize().query(
        `INSERT INTO t_user_usertorole (userId, roleId, vdnId) SELECT u.ID, o.ID, :vdnId FROM t_user_users u JOIN t_user_role o ON o.ID=:roleId AND o.VDNID=:vdnId
          WHERE u.ID=:userId AND u.VDNID=:vdnId
            AND NOT EXISTS (SELECT 1 FROM t_user_usertorole r WHERE r.UserID=u.ID AND r.roleId=o.ID AND r.VDNID=:vdnId)`,
        { replacements: { userId, roleId, vdnId }, type: QueryTypes.RAW, transaction }
    );
    return affectedRows(ret);
};

Dao.deleteUserFromRole = async (userId, roleId, vdnId, transaction) => {
    const [, ret] = await sequelize().query(
        `DELETE FROM t_user_usertorole
          WHERE userId = :userId AND roleId = :roleId AND VDNID = :vdnId`,
        { replacements: { userId, roleId, vdnId }, type: QueryTypes.RAW, transaction }
    );
    return affectedRows(ret);
};

module.exports = Dao;
