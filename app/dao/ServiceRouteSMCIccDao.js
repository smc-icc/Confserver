const Db = require('./db');
const { QueryTypes } = require('sequelize');

const Dao = {};

function sequelize() {
    return Db.db_smcicc.sequelize;
}

let routeValidReady = false;

async function ensureRouteValid() {
    if (routeValidReady) return;
    const rows = await sequelize().query(
        `SELECT COUNT(*) AS c FROM information_schema.COLUMNS
          WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 't_icc_vdn_serviceroute'
            AND COLUMN_NAME = 'IsValid'`,
        { type: QueryTypes.SELECT }
    );
    if (Number(rows?.[0]?.c) === 0) {
        await sequelize().query(
            `ALTER TABLE t_icc_vdn_serviceroute
                ADD COLUMN IsValid tinyint NOT NULL DEFAULT 1 COMMENT '1启用 0停用'`
        );
    }
    routeValidReady = true;
}

Dao.ensureRouteValid = ensureRouteValid;

Dao.list = async ({ vdnId, calledCode = '', accessCodeId = '', pageNum = 1, pageSize = 20 }) => {
    await ensureRouteValid();
    const offset = (Math.max(1, Number(pageNum)) - 1) * Math.max(1, Number(pageSize));
    const limit = Math.max(1, Number(pageSize));
    const rows = await sequelize().query(
        `SELECT a.ID AS id, a.AccessCodeID AS accessCodeId, ac.code AS accessCodeName, a.CalledCode AS calledCode,
                a.DeviceType AS deviceType, a.DeviceID AS deviceId, a.VDNID AS vdnId, a.GroupID AS groupId, a.UserID AS userId,
                a.TrunkGroupID AS trunkGroupId, a.NodeID AS nodeId, a.IsValid AS isValid,
                b.name AS groupName, b2.Name AS trunkGroup,
                CASE WHEN a.DeviceType=1 THEN a.DeviceID
                     WHEN a.DeviceType=2 THEN c.Name
                     WHEN a.DeviceType=3 THEN a.DeviceID
                     WHEN a.DeviceType=4 THEN c.Name
                     WHEN a.DeviceType=5 THEN e.AppName
                     ELSE NULL END AS text,
                CASE WHEN a.DeviceType=3 THEN a.DeviceID
                     WHEN a.DeviceType=4 THEN d.workNO
                     WHEN a.DeviceType=5 THEN a.DeviceID
                     ELSE NULL END AS userName
           FROM t_icc_vdn_serviceroute a
      LEFT JOIN t_user_group b ON a.GroupID = b.id
      LEFT JOIN t_icc_base_channelgroup b2 ON a.TrunkGroupID = b2.ID
      LEFT JOIN t_icc_skill c ON a.DeviceID = c.id
      LEFT JOIN t_user_users d ON d.ID = a.UserID
      LEFT JOIN t_icc_base_apptype e ON e.ID = a.DeviceID
      LEFT JOIN t_icc_base_accesscode ac ON a.AccessCodeID = ac.id
          WHERE a.VDNID = :vdnId
            AND a.CalledCode LIKE :calledCode
            AND ac.code LIKE :accessCodeCode
          ORDER BY a.DeviceType DESC
          LIMIT :offset, :limit`,
        {
            replacements: { vdnId, calledCode: `%${calledCode}%`, accessCodeCode: `%${accessCodeId}%`, offset, limit },
            type: QueryTypes.SELECT,
        }
    );
    const totalRow = await sequelize().query(
        `SELECT COUNT(1) AS total
           FROM t_icc_vdn_serviceroute a
      LEFT JOIN t_icc_base_accesscode ac ON a.AccessCodeID = ac.id
          WHERE a.VDNID = :vdnId
            AND a.CalledCode LIKE :calledCode
            AND ac.code LIKE :accessCodeCode`,
        { replacements: { vdnId, calledCode: `%${calledCode}%`, accessCodeCode: `%${accessCodeId}%` }, type: QueryTypes.SELECT }
    );
    return { rows, total: Number(totalRow?.[0]?.total || 0) };
};

Dao.countDuplicate = async ({ vdnId, accessCodeId, calledCode, id }) => {
    const row = await sequelize().query(
        `SELECT COUNT(1) AS c
           FROM t_icc_vdn_serviceroute
          WHERE CalledCode = :calledCode
            AND VDNID = :vdnId
            AND accessCodeId = :accessCodeId
            AND id <> :id`,
        { replacements: { calledCode, vdnId, accessCodeId, id: id || 0 }, type: QueryTypes.SELECT }
    );
    return Number(row?.[0]?.c || 0);
};

Dao.insert = async (row) => {
    const idRow = await sequelize().query(`SELECT IFNULL(MAX(id)+1,1) AS id FROM t_icc_vdn_serviceroute`, { type: QueryTypes.SELECT });
    const id = Number(idRow?.[0]?.id || 1);
    await sequelize().query(
        `INSERT INTO t_icc_vdn_serviceroute
            (ID, AccessCodeID, CalledCode, DeviceType, DeviceID, VDNID, GroupID, UserID, TrunkGroupID, NodeID)
         VALUES
            (:id, :accessCodeId, :calledCode, :deviceType, :deviceId, :vdnId, :groupId, :userId, :trunkGroupId, :nodeId)`,
        { replacements: { ...row, id }, type: QueryTypes.INSERT }
    );
    return 1;
};

Dao.update = async (row) => {
    const [ret] = await sequelize().query(
        `UPDATE t_icc_vdn_serviceroute
            SET CalledCode = :calledCode, AccessCodeID = :accessCodeId, DeviceType = :deviceType,
                DeviceID = :deviceId, GroupID = :groupId, UserID = :userId, TrunkGroupID = :trunkGroupId, NodeID = :nodeId
          WHERE ID = :id`,
        { replacements: row, type: QueryTypes.UPDATE }
    );
    return ret;
};

Dao.setValid = async ({ id, vdnId, isValid }) => {
    await ensureRouteValid();
    const [ret] = await sequelize().query(
        `UPDATE t_icc_vdn_serviceroute
            SET IsValid = :isValid
          WHERE ID = :id AND VDNID = :vdnId`,
        { replacements: { id: Number(id), vdnId: Number(vdnId), isValid: Number(isValid) ? 1 : 0 }, type: QueryTypes.UPDATE }
    );
    return ret;
};

Dao.deleteByIds = async ({ ids }) => {
    const marks = ids.map((_, i) => `:id${i}`).join(',');
    const replacements = {};
    ids.forEach((id, i) => { replacements[`id${i}`] = id; });
    const [ret] = await sequelize().query(
        `DELETE FROM t_icc_vdn_serviceroute WHERE ID IN (${marks})`,
        { replacements, type: QueryTypes.DELETE }
    );
    return ret;
};

Dao.findByExactCalledCode = async ({ calledCode, vdnId }) => {
    return sequelize().query(
        `SELECT ID AS id, CalledCode AS calledCode
           FROM t_icc_vdn_serviceroute
          WHERE CalledCode = :calledCode AND VDNID = :vdnId`,
        { replacements: { calledCode, vdnId }, type: QueryTypes.SELECT }
    );
};

Dao.loadUsersByName = async ({ vdnId, key = '' }) => {
    return sequelize().query(
        `SELECT ID AS id, WorkNO AS workNo, Name AS name
           FROM t_user_users
          WHERE VDNID = :vdnId
            AND (:key = '' OR WorkNO LIKE CONCAT(:key, '%'))
          ORDER BY WorkNO`,
        { replacements: { vdnId, key }, type: QueryTypes.SELECT }
    );
};

Dao.loadAccessCodeListByVdnSelf = async ({ vdnId, key = '' }) => {
    return sequelize().query(
        `SELECT ID AS id, Code AS code, VDNID AS vdnId
           FROM t_icc_base_accesscode
          WHERE VDNID = :vdnId
            AND Code LIKE CONCAT('%', :key, '%')
          ORDER BY Code ASC`,
        { replacements: { vdnId, key }, type: QueryTypes.SELECT }
    );
};

Dao.loadAgentGroupList = async ({ vdnId, key = '' }) => {
    return sequelize().query(
        `SELECT a.ID AS id, a.Name AS name
           FROM t_user_group a
      LEFT JOIN t_icc_grouptovdn b ON a.ID = b.GroupID
          WHERE b.VDNID = :vdnId
            AND (:key = '' OR a.Name LIKE CONCAT('%', :key, '%'))
          ORDER BY a.Name ASC`,
        { replacements: { vdnId, key }, type: QueryTypes.SELECT }
    );
};

Dao.loadTrunkGroupList = async ({ key = '', pageIndex = 1, pageSize = 10 }) => {
    return sequelize().query(
        `SELECT ID AS id, Name AS name, VDNID AS vdnId
           FROM t_icc_base_channelgroup
          WHERE Name LIKE CONCAT('%', :key, '%')
          ORDER BY Name, BeginSpanID, BeginChannelID, EndSpanID, EndChannelID ASC
          LIMIT :pageIndex, :pageSize`,
        { replacements: { key, pageIndex, pageSize }, type: QueryTypes.SELECT }
    );
};

module.exports = Dao;
