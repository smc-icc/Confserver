const Db = require('./db');
const { QueryTypes } = require('sequelize');

const Dao = {};

function sequelize() {
    return Db.db_smcicc.sequelize;
}

Dao.findAll = async ({ vdnId, keyWord = '' }) => {
    return sequelize().query(
        `SELECT ID AS id, Name AS name, MediaTypeID AS mediaTypeId, BusinessTypeID AS businessTypeId,
                SkillElementID AS skillElementId, Description AS description, Priority AS priority, VDN AS vdn
           FROM t_icc_skill
          WHERE VDN = :vdnId
            AND Name LIKE CONCAT('%', :keyWord, '%')
          ORDER BY Name ASC`,
        { replacements: { vdnId, keyWord }, type: QueryTypes.SELECT }
    );
};

Dao.loadSkillList = async ({ vdnId, key = '' }) => {
    return sequelize().query(
        `SELECT ID AS id, Name AS name
           FROM t_icc_skill
          WHERE VDN = :vdnId
            AND (:key = '' OR Name LIKE CONCAT('%', :key, '%'))
          ORDER BY Name ASC`,
        { replacements: { vdnId, key }, type: QueryTypes.SELECT }
    );
};

Dao.findById = async (id) => {
    const rows = await sequelize().query(
        `SELECT ID AS id, Name AS name, MediaTypeID AS mediaTypeId, BusinessTypeID AS businessTypeId, SkillElementID AS skillElementId
           FROM t_icc_skill
          WHERE ID = :id`,
        { replacements: { id }, type: QueryTypes.SELECT }
    );
    return rows[0] || null;
};

Dao.existsByName = async ({ vdnId, name, excludeId = null }) => {
    const rows = await sequelize().query(
        `SELECT COUNT(1) AS total
           FROM t_icc_skill
          WHERE VDN = :vdnId
            AND Name LIKE :name
            AND (:excludeId IS NULL OR ID <> :excludeId)`,
        { replacements: { vdnId, name, excludeId }, type: QueryTypes.SELECT }
    );
    return Number(rows?.[0]?.total || 0) > 0;
};

Dao.insert = async ({ name, mediaTypeId, businessTypeId, skillElementId, vdn }) => {
    const rows = await sequelize().query(
        `SELECT IFNULL(MAX(id) + 1, 1) AS nextId FROM t_icc_skill`,
        { type: QueryTypes.SELECT }
    );
    const id = Number(rows?.[0]?.nextId || 1);
    const [ret] = await sequelize().query(
        `INSERT INTO t_icc_skill (ID, Name, MediaTypeID, BusinessTypeID, SkillElementID, Description, Priority, VDN)
         VALUES (:id, :name, :mediaTypeId, :businessTypeId, :skillElementId, '', 0, :vdn)`,
        { replacements: { id, name, mediaTypeId, businessTypeId, skillElementId, vdn }, type: QueryTypes.INSERT }
    );
    return ret;
};

Dao.update = async ({ id, name, mediaTypeId, businessTypeId, skillElementId }) => {
    const [ret] = await sequelize().query(
        `UPDATE t_icc_skill
            SET Name = :name, MediaTypeID = :mediaTypeId, BusinessTypeID = :businessTypeId, SkillElementID = :skillElementId
          WHERE ID = :id`,
        { replacements: { id, name, mediaTypeId, businessTypeId, skillElementId }, type: QueryTypes.UPDATE }
    );
    return ret;
};

Dao.deleteSkillToUserBySkillId = async (skillId) => {
    const [ret] = await sequelize().query(
        `DELETE FROM t_icc_skill_skilltouser WHERE SkillID = :skillId`,
        { replacements: { skillId }, type: QueryTypes.DELETE }
    );
    return ret;
};

Dao.deleteSkillById = async (skillId) => {
    const [ret] = await sequelize().query(
        `DELETE FROM t_icc_skill WHERE ID = :skillId`,
        { replacements: { skillId }, type: QueryTypes.DELETE }
    );
    return ret;
};

Dao.listSkillAlternativeUsers = async ({ skillId, keyWord = '', vdnId }) => {
    return sequelize().query(
        `SELECT a.ID AS id, a.WorkNo AS workNo, a.Name AS name
           FROM t_user_users a
          WHERE a.ID NOT IN (SELECT s.UserID FROM t_icc_skill_skilltouser s WHERE s.SkillID = :skillId)
            AND a.vdnId = :vdnId
            AND (a.Name LIKE CONCAT('%', :keyWord, '%') OR a.WorkNo LIKE CONCAT('%', :keyWord, '%'))
          ORDER BY a.WorkNo ASC`,
        { replacements: { skillId, keyWord, vdnId }, type: QueryTypes.SELECT }
    );
};

Dao.listSkillSelectedUsers = async ({ skillId, keyWord = '', vdnId }) => {
    return sequelize().query(
        `SELECT a.ID AS id, a.WorkNo AS workNo, a.Name AS name, b.AutoCheckIn AS autoCheckIn
           FROM t_icc_skill_skilltouser b, t_user_users a
          WHERE b.UserID = a.ID
            AND b.SkillID = :skillId
            AND a.vdnId = :vdnId
            AND (a.Name LIKE CONCAT('%', :keyWord, '%') OR a.WorkNo LIKE CONCAT('%', :keyWord, '%'))
          ORDER BY a.WorkNo ASC`,
        { replacements: { skillId, keyWord, vdnId }, type: QueryTypes.SELECT }
    );
};

Dao.insertUserToSkill = async ({ userId, skillId }) => {
    const [ret] = await sequelize().query(
        `INSERT INTO t_icc_skill_skilltouser (SkillID, UserID, Level, AutoCheckIn)
         VALUES (:skillId, :userId, 1, 0)`,
        { replacements: { userId, skillId }, type: QueryTypes.INSERT }
    );
    return ret;
};

Dao.removeUserFromSkill = async ({ userId, skillId }) => {
    const [ret] = await sequelize().query(
        `DELETE FROM t_icc_skill_skilltouser WHERE SkillID = :skillId AND UserID = :userId`,
        { replacements: { userId, skillId }, type: QueryTypes.DELETE }
    );
    return ret;
};

Dao.loadMediaTypeList = async () => {
    return sequelize().query(
        `SELECT ID AS id, Name AS name, IsAccessMedia AS isAccessMedia, IsRunTime AS isRunTime, Description AS description
           FROM t_icc_base_mediatype`,
        { type: QueryTypes.SELECT }
    );
};

Dao.loadSkillBusinessTypeList = async (vdnId) => {
    return sequelize().query(
        `SELECT ID AS id, Name AS name, VDN AS vdn
           FROM t_icc_skill_businesstype
          WHERE VDN = :vdnId`,
        { replacements: { vdnId }, type: QueryTypes.SELECT }
    );
};

Dao.loadSkillElementList = async (vdnId) => {
    return sequelize().query(
        `SELECT ID AS id, Name AS name, VDN AS vdn
           FROM t_icc_skill_element
          WHERE VDN = :vdnId`,
        { replacements: { vdnId }, type: QueryTypes.SELECT }
    );
};

Dao.countSkillUser = async ({ agentId, skillId }) => {
    const rows = await sequelize().query(
        `SELECT COUNT(1) AS total
           FROM t_icc_skill_skilltouser
          WHERE UserID = :agentId AND SkillID = :skillId`,
        { replacements: { agentId, skillId }, type: QueryTypes.SELECT }
    );
    return Number(rows?.[0]?.total || 0);
};

Dao.updateSkillUserAutoCheckIn = async ({ agentId, skillId, autoCheckInFlag }) => {
    const [ret] = await sequelize().query(
        `UPDATE t_icc_skill_skilltouser
            SET AutoCheckIn = :autoCheckInFlag
          WHERE UserID = :agentId AND SkillID = :skillId`,
        { replacements: { agentId, skillId, autoCheckInFlag }, type: QueryTypes.UPDATE }
    );
    return ret;
};

Dao.insertSkillUserAutoCheckIn = async ({ agentId, skillId, autoCheckInFlag }) => {
    const [ret] = await sequelize().query(
        `INSERT INTO t_icc_skill_skilltouser (UserID, SkillID, AutoCheckIn)
         VALUES (:agentId, :skillId, :autoCheckInFlag)`,
        { replacements: { agentId, skillId, autoCheckInFlag }, type: QueryTypes.INSERT }
    );
    return ret;
};

function mediaKind(mediaTypeId) {
    const n = Number(mediaTypeId);
    if (!Number.isFinite(n) || n <= 0) return null;
    return n === 1 ? 'tas' : 'ims';
}

/** 业务组 × 技能（含 MediaType）。组未挂技能时 skills 为空。t_group_skill 缺失时返回空数组。 */
Dao.loadGroupSkillMatrix = async (vdnId) => {
    if (!(Number(vdnId) > 0)) return [];
    try {
        const rows = await sequelize().query(
            `SELECT g.ID AS groupId, g.Name AS groupName,
                    s.ID AS skillId, s.Name AS skillName, s.MediaTypeID AS mediaTypeId
               FROM t_user_group g
               INNER JOIN t_icc_grouptovdn v ON v.GroupID = g.ID AND v.VDNID = :vdnId
               LEFT JOIN t_group_skill gs ON gs.group_id = g.ID
               LEFT JOIN t_icc_skill s ON s.ID = gs.skill_id
              ORDER BY g.ID, s.ID`,
            { replacements: { vdnId: Number(vdnId) }, type: QueryTypes.SELECT }
        );
        const byId = new Map();
        for (const r of rows || []) {
            const gid = Number(r.groupId);
            if (!byId.has(gid)) {
                byId.set(gid, { id: gid, name: String(r.groupName || `组${gid}`), mediaKinds: [], skills: [] });
            }
            const item = byId.get(gid);
            const sid = Number(r.skillId || 0);
            if (sid > 0) {
                const mediaTypeId = Number(r.mediaTypeId || 0);
                item.skills.push({
                    id: sid,
                    name: String(r.skillName || `技能${sid}`),
                    mediaTypeId,
                    kind: mediaKind(mediaTypeId),
                });
            }
        }
        for (const item of byId.values()) {
            const set = new Set();
            for (const s of item.skills) {
                if (s.kind) set.add(s.kind);
            }
            item.mediaKinds = [...set];
        }
        return [...byId.values()];
    } catch (e) {
        return [];
    }
};

module.exports = Dao;
