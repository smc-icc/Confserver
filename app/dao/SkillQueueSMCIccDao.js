const Db = require('./db');
const { QueryTypes } = require('sequelize');

const Dao = {};

function sequelize() {
    return Db.db_smcicc.sequelize;
}

Dao.list = async ({ vdnId, groupId = 0, skillId = 0, callMatchingId = 0, agentMatchingId = 0, policyGroupId = 0, pageNum = 1, pageSize = 30 }) => {
    const offset = (Math.max(1, Number(pageNum)) - 1) * Math.max(1, Number(pageSize));
    const limit = Math.max(1, Number(pageSize));
    const rows = await sequelize().query(
        `SELECT a.ID AS id, a.VDNID AS vdnId, a.GroupID AS groupId, a.SkillID AS skillId, a.CallMatchingID AS callMatchingId,
                a.AgentMatchingID AS agentMatchingId, a.PolicyGroupID AS policyGroupId, a.AllocationPercent AS allocationPercent,
                a.OverloadThresholds1 AS overloadThresholds1, a.OverloadThresholds2 AS overloadThresholds2, a.OverloadThresholds3 AS overloadThresholds3,
                a.ServiceObject AS serviceObject, a.ServiceObjectPercent AS serviceObjectPercent, a.EWTFormula AS ewtFormula,
                a.MaxQueueLength AS maxQueueLength, a.MaxQueueWaitTime AS maxQueueWaitTime, a.OverLenProc AS overLenProc, a.TimeOutProc AS timeOutProc,
                a.PromptStyle AS promptStyle, a.PromptContent AS promptContent,
                b.name AS groupName, c.name AS skillName, d.Description AS matchingName, f.Description AS agentMatchingName, g.Description AS policyName
           FROM t_icc_acd_skillqueue a
      LEFT JOIN t_user_group b ON a.GroupID = b.id
      LEFT JOIN t_icc_skill c ON a.SkillID = c.id
      LEFT JOIN t_icc_acd_matchgroup_ele d ON a.CallMatchingID = d.MatchingID
      LEFT JOIN t_icc_acd_policygroup f ON a.AgentMatchingID = f.PolicyID
      LEFT JOIN t_icc_acd_policygroup g ON a.PolicyGroupID = g.PolicyID
          WHERE a.VDNID = :vdnId
            AND (:groupId = 0 OR a.GroupID = :groupId)
            AND (:skillId = 0 OR a.SkillID = :skillId)
            AND (:callMatchingId = 0 OR a.CallMatchingID = :callMatchingId)
            AND (:agentMatchingId = 0 OR a.AgentMatchingID = :agentMatchingId)
            AND (:policyGroupId = 0 OR a.PolicyGroupID = :policyGroupId)
          ORDER BY c.name ASC
          LIMIT :offset, :limit`,
        { replacements: { vdnId, groupId, skillId, callMatchingId, agentMatchingId, policyGroupId, offset, limit }, type: QueryTypes.SELECT }
    );
    const totalRow = await sequelize().query(
        `SELECT COUNT(1) AS total
           FROM t_icc_acd_skillqueue a
          WHERE a.VDNID = :vdnId
            AND (:groupId = 0 OR a.GroupID = :groupId)
            AND (:skillId = 0 OR a.SkillID = :skillId)
            AND (:callMatchingId = 0 OR a.CallMatchingID = :callMatchingId)
            AND (:agentMatchingId = 0 OR a.AgentMatchingID = :agentMatchingId)
            AND (:policyGroupId = 0 OR a.PolicyGroupID = :policyGroupId)`,
        { replacements: { vdnId, groupId, skillId, callMatchingId, agentMatchingId, policyGroupId }, type: QueryTypes.SELECT }
    );
    return { rows, total: Number(totalRow?.[0]?.total || 0) };
};

Dao.insert = async (row) => {
    const [ret] = await sequelize().query(
        `INSERT INTO t_icc_acd_skillqueue
            (VDNID, GroupID, SkillID, CallMatchingID, AgentMatchingID, PolicyGroupID, AllocationPercent,
             OverloadThresholds1, OverloadThresholds2, OverloadThresholds3, ServiceObject, ServiceObjectPercent, EWTFormula,
             MaxQueueLength, MaxQueueWaitTime, OverLenProc, TimeOutProc, PromptStyle, PromptContent)
         VALUES
            (:vdnId, :groupId, :skillId, :callMatchingId, :agentMatchingId, :policyGroupId, :allocationPercent,
             :overloadThresholds1, :overloadThresholds2, :overloadThresholds3, :serviceObject, :serviceObjectPercent, :ewtFormula,
             :maxQueueLength, :maxQueueWaitTime, :overLenProc, :timeOutProc, :promptStyle, :promptContent)`,
        { replacements: row, type: QueryTypes.INSERT }
    );
    return ret;
};

Dao.update = async (row) => {
    const [ret] = await sequelize().query(
        `UPDATE t_icc_acd_skillqueue
            SET CallMatchingID = :callMatchingId, GroupID = :groupId, SkillID = :skillId, AgentMatchingID = :agentMatchingId,
                PolicyGroupID = :policyGroupId, AllocationPercent = :allocationPercent, OverloadThresholds1 = :overloadThresholds1,
                OverloadThresholds2 = :overloadThresholds2, OverloadThresholds3 = :overloadThresholds3, ServiceObject = :serviceObject,
                ServiceObjectPercent = :serviceObjectPercent, EWTFormula = :ewtFormula, MaxQueueLength = :maxQueueLength,
                MaxQueueWaitTime = :maxQueueWaitTime, OverLenProc = :overLenProc, TimeOutProc = :timeOutProc,
                PromptStyle = :promptStyle, PromptContent = :promptContent
          WHERE ID = :id AND VDNID = :vdnId AND GroupID = :oldGroupId AND SkillID = :oldSkillId`,
        { replacements: row, type: QueryTypes.UPDATE }
    );
    return ret;
};

Dao.deleteByIds = async ({ ids }) => {
    const marks = ids.map((_, i) => `:id${i}`).join(',');
    const replacements = {};
    ids.forEach((id, i) => { replacements[`id${i}`] = id; });
    const [ret] = await sequelize().query(`DELETE FROM t_icc_acd_skillqueue WHERE ID IN (${marks})`, { replacements, type: QueryTypes.DELETE });
    return ret;
};

Dao.findById = async (id) => {
    return sequelize().query(
        `SELECT ID AS id, VDNID AS vdnId, GroupID AS groupId, SkillID AS skillId, CallMatchingID AS callMatchingId,
                AgentMatchingID AS agentMatchingId, PolicyGroupID AS policyGroupId, AllocationPercent AS allocationPercent,
                OverloadThresholds1 AS overloadThresholds1, OverloadThresholds2 AS overloadThresholds2, OverloadThresholds3 AS overloadThresholds3,
                ServiceObject AS serviceObject, ServiceObjectPercent AS serviceObjectPercent, EWTFormula AS ewtFormula,
                MaxQueueLength AS maxQueueLength, MaxQueueWaitTime AS maxQueueWaitTime, OverLenProc AS overLenProc, TimeOutProc AS timeOutProc,
                PromptStyle AS promptStyle, PromptContent AS promptContent
           FROM t_icc_acd_skillqueue WHERE ID = :id`,
        { replacements: { id }, type: QueryTypes.SELECT }
    );
};

Dao.loadQueueGroupList = async ({ vdnId, key = '' }) => {
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

Dao.loadQueueSkillList = async ({ vdnId, key = '' }) => {
    return sequelize().query(
        `SELECT ID AS id, Name AS name
           FROM t_icc_skill
          WHERE VDN = :vdnId
            AND (:key = '' OR Name LIKE CONCAT('%', :key, '%'))
          ORDER BY Name ASC`,
        { replacements: { vdnId, key }, type: QueryTypes.SELECT }
    );
};

Dao.loadMatchGroupEle = async () => {
    return sequelize().query(
        `SELECT ID AS id, MatchingID AS matchingId, PolicyID AS policyId, Description AS description, Level AS level
           FROM t_icc_acd_matchgroup_ele`,
        { type: QueryTypes.SELECT }
    );
};

Dao.loadPolicyGroup = async () => {
    return sequelize().query(
        `SELECT ID AS id, PolicyID AS policyId, Description AS description
           FROM t_icc_acd_policygroup`,
        { type: QueryTypes.SELECT }
    );
};

Dao.loadQueueOverBrim = async ({ vdnId, id = 0 }) => {
    return sequelize().query(
        `SELECT a.ID AS id, a.DeviceType AS deviceType,
                CASE
                    WHEN a.DeviceType = 2 THEN c.Name
                    WHEN a.DeviceType = 3 THEN a.DeviceID
                    WHEN a.DeviceType = 4 THEN c.Name
                    WHEN a.DeviceType = 5 THEN d.AppName
                    ELSE NULL
                END AS text,
                b.Name AS groupName,
                a.GroupID AS groupId,
                a.VDNID AS vdnId
           FROM t_icc_acd_queueoverbrim a
      LEFT JOIN t_user_group b ON a.GroupID = b.id
      LEFT JOIN t_icc_skill c ON a.DeviceID = c.ID
      LEFT JOIN t_icc_base_apptype d ON a.DeviceID = d.ID
          WHERE a.VDNID = :vdnId
            AND (:id = 0 OR a.ID = :id)
          ORDER BY a.DeviceType ASC`,
        { replacements: { vdnId, id }, type: QueryTypes.SELECT }
    );
};

Dao.loadQueueOverTime = async ({ vdnId, id = 0 }) => {
    return sequelize().query(
        `SELECT a.ID AS id, a.DeviceType AS deviceType,
                CASE
                    WHEN a.DeviceType = 2 THEN c.Name
                    WHEN a.DeviceType = 3 THEN a.DeviceID
                    WHEN a.DeviceType = 4 THEN c.Name
                    WHEN a.DeviceType = 5 THEN d.AppName
                    ELSE NULL
                END AS text,
                b.Name AS groupName,
                a.GroupID AS groupId,
                a.VDNID AS vdnId
           FROM t_icc_acd_queueovertime a
      LEFT JOIN t_user_group b ON a.GroupID = b.id
      LEFT JOIN t_icc_skill c ON a.DeviceID = c.ID
      LEFT JOIN t_icc_base_apptype d ON a.DeviceID = d.ID
          WHERE a.VDNID = :vdnId
            AND (:id = 0 OR a.ID = :id)
          ORDER BY a.DeviceType ASC`,
        { replacements: { vdnId, id }, type: QueryTypes.SELECT }
    );
};

Dao.loadQueueListById = async ({ vdnId, id = 0 }) => {
    return sequelize().query(
        `SELECT a.ID AS id, a.DeviceType AS deviceType, a.DeviceID AS deviceId, a.GroupID AS groupId, a.VDNID AS vdnId,
                b.Name AS groupName,
                CASE
                    WHEN a.DeviceType = 2 THEN c.Name
                    WHEN a.DeviceType = 3 THEN a.DeviceID
                    WHEN a.DeviceType = 4 THEN c.Name
                    WHEN a.DeviceType = 5 THEN d.AppName
                    ELSE NULL
                END AS text
           FROM t_icc_acd_queueoverbrim a
      LEFT JOIN t_user_group b ON a.GroupID = b.id
      LEFT JOIN t_icc_skill c ON a.DeviceID = c.ID
      LEFT JOIN t_icc_base_apptype d ON a.DeviceID = d.ID
          WHERE a.VDNID = :vdnId
            AND (:id = 0 OR a.ID = :id)`,
        { replacements: { vdnId, id }, type: QueryTypes.SELECT }
    );
};

Dao.loadQueueOTListById = async ({ vdnId, id = 0 }) => {
    return sequelize().query(
        `SELECT a.ID AS id, a.DeviceType AS deviceType, a.DeviceID AS deviceId, a.GroupID AS groupId, a.VDNID AS vdnId,
                b.Name AS groupName,
                CASE
                    WHEN a.DeviceType = 2 THEN c.Name
                    WHEN a.DeviceType = 3 THEN a.DeviceID
                    WHEN a.DeviceType = 4 THEN c.Name
                    WHEN a.DeviceType = 5 THEN d.AppName
                    ELSE NULL
                END AS text
           FROM t_icc_acd_queueovertime a
      LEFT JOIN t_user_group b ON a.GroupID = b.id
      LEFT JOIN t_icc_skill c ON a.DeviceID = c.ID
      LEFT JOIN t_icc_base_apptype d ON a.DeviceID = d.ID
          WHERE a.VDNID = :vdnId
            AND (:id = 0 OR a.ID = :id)`,
        { replacements: { vdnId, id }, type: QueryTypes.SELECT }
    );
};

Dao.loadQueueOverBrimPaged = async ({ vdnId, groupId = 0, deviceType = 0, pageNum = 1, pageSize = 30 }) => {
    const offset = (Math.max(1, Number(pageNum)) - 1) * Math.max(1, Number(pageSize));
    const limit = Math.max(1, Number(pageSize));
    const rows = await sequelize().query(
        `SELECT a.ID AS id, a.DeviceType AS deviceType, a.DeviceID AS deviceId, a.GroupID AS groupId, a.VDNID AS vdnId,
                b.Name AS groupName,
                CASE
                    WHEN a.DeviceType = 2 THEN c.Name
                    WHEN a.DeviceType = 3 THEN a.DeviceID
                    WHEN a.DeviceType = 4 THEN c.Name
                    WHEN a.DeviceType = 5 THEN d.AppName
                    ELSE NULL
                END AS text
           FROM t_icc_acd_queueoverbrim a
      LEFT JOIN t_user_group b ON a.GroupID = b.id
      LEFT JOIN t_icc_skill c ON a.DeviceID = c.ID
      LEFT JOIN t_icc_base_apptype d ON a.DeviceID = d.ID
          WHERE a.VDNID = :vdnId
            AND (:groupId = 0 OR a.GroupID = :groupId)
            AND (:deviceType = 0 OR a.DeviceType = :deviceType)
          ORDER BY a.DeviceType ASC
          LIMIT :offset, :limit`,
        { replacements: { vdnId, groupId, deviceType, offset, limit }, type: QueryTypes.SELECT }
    );
    const totalRow = await sequelize().query(
        `SELECT COUNT(1) AS total
           FROM t_icc_acd_queueoverbrim a
          WHERE a.VDNID = :vdnId
            AND (:groupId = 0 OR a.GroupID = :groupId)
            AND (:deviceType = 0 OR a.DeviceType = :deviceType)`,
        { replacements: { vdnId, groupId, deviceType }, type: QueryTypes.SELECT }
    );
    return { rows, total: Number(totalRow?.[0]?.total || 0) };
};

Dao.loadQueueOverTimePaged = async ({ vdnId, groupId = 0, deviceType = 0, pageNum = 1, pageSize = 20 }) => {
    const offset = (Math.max(1, Number(pageNum)) - 1) * Math.max(1, Number(pageSize));
    const limit = Math.max(1, Number(pageSize));
    const rows = await sequelize().query(
        `SELECT a.ID AS id, a.DeviceType AS deviceType, a.DeviceID AS deviceId, a.GroupID AS groupId, a.VDNID AS vdnId,
                b.Name AS groupName,
                CASE
                    WHEN a.DeviceType = 2 THEN c.Name
                    WHEN a.DeviceType = 3 THEN a.DeviceID
                    WHEN a.DeviceType = 4 THEN c.Name
                    WHEN a.DeviceType = 5 THEN d.AppName
                    ELSE NULL
                END AS text
           FROM t_icc_acd_queueovertime a
      LEFT JOIN t_user_group b ON a.GroupID = b.id
      LEFT JOIN t_icc_skill c ON a.DeviceID = c.ID
      LEFT JOIN t_icc_base_apptype d ON a.DeviceID = d.ID
          WHERE a.VDNID = :vdnId
            AND (:groupId = 0 OR a.GroupID = :groupId)
            AND (:deviceType = 0 OR a.DeviceType = :deviceType)
          ORDER BY a.DeviceType ASC
          LIMIT :offset, :limit`,
        { replacements: { vdnId, groupId, deviceType, offset, limit }, type: QueryTypes.SELECT }
    );
    const totalRow = await sequelize().query(
        `SELECT COUNT(1) AS total
           FROM t_icc_acd_queueovertime a
          WHERE a.VDNID = :vdnId
            AND (:groupId = 0 OR a.GroupID = :groupId)
            AND (:deviceType = 0 OR a.DeviceType = :deviceType)`,
        { replacements: { vdnId, groupId, deviceType }, type: QueryTypes.SELECT }
    );
    return { rows, total: Number(totalRow?.[0]?.total || 0) };
};

Dao.addQueueOverBrim = async (row) => {
    const [ret] = await sequelize().query(
        `INSERT INTO t_icc_acd_queueoverbrim (DeviceType, DeviceID, GroupID, VDNID)
         VALUES (:deviceType, :deviceId, :groupId, :vdnId)`,
        { replacements: row, type: QueryTypes.INSERT }
    );
    return ret;
};

Dao.editQueueOverBrim = async (row) => {
    const [ret] = await sequelize().query(
        `UPDATE t_icc_acd_queueoverbrim
            SET DeviceType = :deviceType, DeviceID = :deviceId, GroupID = :groupId, VDNID = :vdnId
          WHERE ID = :id`,
        { replacements: row, type: QueryTypes.UPDATE }
    );
    return ret;
};

Dao.findQueueOverBrimById = async (id) => {
    return sequelize().query(
        `SELECT ID AS id, DeviceType AS deviceType, DeviceID AS deviceId, GroupID AS groupId, VDNID AS vdnId
           FROM t_icc_acd_queueoverbrim
          WHERE ID = :id`,
        { replacements: { id }, type: QueryTypes.SELECT }
    );
};

Dao.deleteQueueOverBrimByIds = async (ids) => {
    const marks = ids.map((_, i) => `:id${i}`).join(',');
    const replacements = {};
    ids.forEach((id, i) => { replacements[`id${i}`] = id; });
    const [ret] = await sequelize().query(`DELETE FROM t_icc_acd_queueoverbrim WHERE ID IN (${marks})`, { replacements, type: QueryTypes.DELETE });
    return ret;
};

Dao.referencedQueueOverBrimIds = async ({ vdnId, ids }) => {
    if (!ids.length) return [];
    const marks = ids.map((_, i) => `:id${i}`).join(',');
    const replacements = { vdnId };
    ids.forEach((id, i) => { replacements[`id${i}`] = id; });
    return sequelize().query(
        `SELECT a.ID AS id
           FROM t_icc_acd_queueoverbrim a, t_icc_acd_skillqueue s
          WHERE a.ID = s.OverLenProc AND a.VDNID = :vdnId AND a.ID IN (${marks})`,
        { replacements, type: QueryTypes.SELECT }
    );
};

Dao.addQueueOverTime = async (row) => {
    const [ret] = await sequelize().query(
        `INSERT INTO t_icc_acd_queueovertime (DeviceType, DeviceID, GroupID, VDNID)
         VALUES (:deviceType, :deviceId, :groupId, :vdnId)`,
        { replacements: row, type: QueryTypes.INSERT }
    );
    return ret;
};

Dao.editQueueOverTime = async (row) => {
    const [ret] = await sequelize().query(
        `UPDATE t_icc_acd_queueovertime
            SET DeviceType = :deviceType, DeviceID = :deviceId, GroupID = :groupId, VDNID = :vdnId
          WHERE ID = :id`,
        { replacements: row, type: QueryTypes.UPDATE }
    );
    return ret;
};

Dao.findQueueOverTimeById = async (id) => {
    return sequelize().query(
        `SELECT ID AS id, DeviceType AS deviceType, DeviceID AS deviceId, GroupID AS groupId, VDNID AS vdnId
           FROM t_icc_acd_queueovertime
          WHERE ID = :id`,
        { replacements: { id }, type: QueryTypes.SELECT }
    );
};

Dao.deleteQueueOverTimeByIds = async (ids) => {
    const marks = ids.map((_, i) => `:id${i}`).join(',');
    const replacements = {};
    ids.forEach((id, i) => { replacements[`id${i}`] = id; });
    const [ret] = await sequelize().query(`DELETE FROM t_icc_acd_queueovertime WHERE ID IN (${marks})`, { replacements, type: QueryTypes.DELETE });
    return ret;
};

Dao.referencedQueueOverTimeIds = async ({ vdnId, ids }) => {
    if (!ids.length) return [];
    const marks = ids.map((_, i) => `:id${i}`).join(',');
    const replacements = { vdnId };
    ids.forEach((id, i) => { replacements[`id${i}`] = id; });
    return sequelize().query(
        `SELECT a.ID AS id
           FROM t_icc_acd_queueovertime a, t_icc_acd_skillqueue s
          WHERE a.ID = s.TimeOutProc AND a.VDNID = :vdnId AND a.ID IN (${marks})`,
        { replacements, type: QueryTypes.SELECT }
    );
};

Dao.loadAppTypeList = async () => {
    return sequelize().query(
        `SELECT ID AS id, AppName AS name, myId AS myId, Descption AS description
           FROM t_icc_base_apptype`,
        { type: QueryTypes.SELECT }
    );
};

module.exports = Dao;
