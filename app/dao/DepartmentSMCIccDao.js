const Db = require('./db');
const { QueryTypes } = require('sequelize');

function sequelize() {
    return Db.db_smcicc.sequelize;
}

function mapDeptRow(r) {
    if (!r) return null;
    return {
        id: r.id != null ? r.id : r.ID,
        departmentName: r.departmentName,
        departmentTel: r.departmentTel,
        departmentFax: r.departmentFax,
        contact: r.contact,
        contactMobile: r.contactMobile,
        vdnId: r.vdnId != null ? r.vdnId : r.VDNID,
        parentId: r.parentId,
        pId: r.pId,
        sortId: r.sortId,
    };
}

function affectedRows(ret) {
    if (typeof ret === 'number') return ret;
    if (ret && typeof ret.affectedRows === 'number') return ret.affectedRows;
    return 0;
}

const Dao = {};

/** 与 DepartmentMapper.selectAll：按 VDN + 可选名称模糊 */
Dao.selectAllFlat = async (vdnId, strKeyWord) => {
    const kw = strKeyWord != null ? String(strKeyWord).trim() : '';
    const rows = await sequelize().query(
        `SELECT ID AS id, departmentName, parentId, pId, sortId
           FROM t_user_department
          WHERE VDNID = :vdnId
            AND (:kw = '' OR departmentName LIKE CONCAT('%', :kw, '%'))`,
        { replacements: { vdnId, kw }, type: QueryTypes.SELECT }
    );
    return rows.map(mapDeptRow);
};

Dao.selectByPrimaryKey = async (id, vdnId) => {
    const rows = await sequelize().query(
        `SELECT ID AS id, departmentName, departmentTel, departmentFax, contact, contactMobile,
                VDNID AS vdnId, parentId, pId, sortId
           FROM t_user_department WHERE ID = :id AND (:vdnId IS NULL OR VDNID=:vdnId)`,
        { replacements: { id, vdnId: vdnId == null ? null : vdnId }, type: QueryTypes.SELECT }
    );
    return mapDeptRow(rows[0]);
};

/** 名称冲突检测（排除指定 ID；与 isExistDepart 模糊名一致） */
Dao.isExistDepart = async (vdnId, name, excludeId) => {
    const ex = excludeId != null && excludeId !== '' ? Number(excludeId) : null;
    const rows = await sequelize().query(
        `SELECT ID AS id, departmentName, parentId, pId, sortId
           FROM t_user_department
          WHERE VDNID = :vdnId
            AND departmentName LIKE CONCAT('%', :name, '%')
            AND (:ex IS NULL OR ID != :ex)`,
        { replacements: { vdnId, name: name != null ? String(name) : '', ex: Number.isNaN(ex) ? null : ex }, type: QueryTypes.SELECT }
    );
    return rows.length > 0;
};

Dao.insert = async (row, transaction) => {
    const [, ret] = await sequelize().query(
        `INSERT INTO t_user_department
            (ID, departMentName, departMentTel, departMentFax, contact, contactMobile, VDNID, parentId, pId, sortId)
         SELECT IFNULL(MAX(ID),0)+1, :departmentName, :departmentTel, :departmentFax, :contact, :contactMobile,
                 :vdnId, :parentId, :pId, :sortId FROM t_user_department`,
        {
            replacements: {
                departmentName: row.departmentName,
                departmentTel: row.departmentTel != null ? row.departmentTel : '',
                departmentFax: row.departmentFax != null ? row.departmentFax : '',
                contact: row.contact != null ? row.contact : '',
                contactMobile: row.contactMobile != null ? row.contactMobile : '',
                vdnId: row.vdnId,
                parentId: row.parentId,
                pId: row.pId != null ? row.pId : null,
                sortId: row.sortId != null ? row.sortId : null,
            },
            type: QueryTypes.RAW,
            transaction,
        }
    );
    const n = affectedRows(ret);
    if (n < 1) return null;
    // Legacy table has a manually allocated primary key, not AUTO_INCREMENT.
    return n > 0 ? true : null;
};

Dao.updateByPrimaryKey = async (row, transaction) => {
    const [, ret] = await sequelize().query(
        `UPDATE t_user_department SET
            departMentName = :departmentName,
            departMentTel = :departmentTel,
            departmentFax = :departmentFax,
            contact = :contact,
            contactMobile = :contactMobile,
            VDNID = :vdnId,
            parentId = :parentId,
            pId = :pId,
            sortId = :sortId
         WHERE ID = :id AND VDNID = :vdnId`,
        {
            replacements: {
                id: row.id,
                departmentName: row.departmentName,
                departmentTel: row.departmentTel != null ? row.departmentTel : '',
                departmentFax: row.departmentFax != null ? row.departmentFax : '',
                contact: row.contact != null ? row.contact : '',
                contactMobile: row.contactMobile != null ? row.contactMobile : '',
                vdnId: row.vdnId,
                parentId: row.parentId,
                pId: row.pId != null ? row.pId : null,
                sortId: row.sortId != null ? row.sortId : null,
            },
            type: QueryTypes.RAW,
            transaction,
        }
    );
    return affectedRows(ret);
};

Dao.selectChildIds = async (vdnId, parentId) => {
    const rows = await sequelize().query(
        `SELECT ID AS id FROM t_user_department WHERE VDNID = :vdnId AND parentId = :parentId`,
        { replacements: { vdnId, parentId }, type: QueryTypes.SELECT }
    );
    return rows.map((r) => r.id);
};

Dao.deleteByIds = async (ids, transaction, vdnId) => {
    if (!ids.length) return 0;
    const placeholders = ids.map(() => '?').join(',');
    const [, ret] = await sequelize().query(`DELETE FROM t_user_department WHERE ID IN (${placeholders}) AND VDNID = ?`, {
        replacements: [...ids, vdnId],
        type: QueryTypes.RAW,
        transaction,
    });
    return affectedRows(ret);
};

/** 未关联本部门的坐席（与 UserMapper.getAlternativeData4Depart） */
Dao.getAlternativeData4Depart = async (departId, strKeyWord, vdnId) => {
    const kw = strKeyWord != null ? String(strKeyWord).trim() : '';
    return sequelize().query(
        `SELECT A.ID AS id, A.WorkNO AS workno, A.Name AS name
           FROM t_user_users A
          WHERE NOT EXISTS (
                  SELECT B.UserID FROM t_user_usertodepart B
                   WHERE B.departid = :departId AND B.VDNID = :vdnId AND B.UserID = A.ID
                )
            AND A.VDNID = :vdnId
            AND (A.Name LIKE CONCAT('%', :kw, '%') OR A.WorkNO LIKE CONCAT('%', :kw, '%'))
          ORDER BY A.WorkNO ASC`,
        { replacements: { departId, vdnId, kw }, type: QueryTypes.SELECT }
    );
};

/** 已关联本部门的坐席 */
Dao.getSelectedData4Depart = async (departId, strKeyWord, vdnId) => {
    const kw = strKeyWord != null ? String(strKeyWord).trim() : '';
    return sequelize().query(
        `SELECT A.ID AS id, A.WorkNO AS workno, A.Name AS name
           FROM t_user_users A
          WHERE EXISTS (
                  SELECT B.UserID FROM t_user_usertodepart B
                   WHERE B.departid = :departId AND B.VDNID = :vdnId AND B.UserID = A.ID
                )
            AND A.VDNID = :vdnId
            AND (A.Name LIKE CONCAT('%', :kw, '%') OR A.WorkNO LIKE CONCAT('%', :kw, '%'))
          ORDER BY A.WorkNO ASC`,
        { replacements: { departId, vdnId, kw }, type: QueryTypes.SELECT }
    );
};

Dao.insertUserToDepart = async (userId, departId, vdnId, transaction) => {
    const [, ret] = await sequelize().query(
        `INSERT INTO t_user_usertodepart (userId, departId, vdnId) SELECT u.ID, o.ID, :vdnId FROM t_user_users u JOIN t_user_department o ON o.ID=:departId AND o.VDNID=:vdnId
          WHERE u.ID=:userId AND u.VDNID=:vdnId
            AND NOT EXISTS (SELECT 1 FROM t_user_usertodepart r WHERE r.UserID=u.ID AND r.departId=o.ID AND r.VDNID=:vdnId)`,
        { replacements: { userId, departId, vdnId }, type: QueryTypes.RAW, transaction }
    );
    return affectedRows(ret);
};

Dao.deleteUserToDepart = async (userId, departId, vdnId, transaction) => {
    const [, ret] = await sequelize().query(
        `DELETE FROM t_user_usertodepart
          WHERE userId = :userId AND departId = :departId AND VDNID = :vdnId`,
        { replacements: { userId, departId, vdnId }, type: QueryTypes.RAW, transaction }
    );
    return affectedRows(ret);
};

module.exports = Dao;
