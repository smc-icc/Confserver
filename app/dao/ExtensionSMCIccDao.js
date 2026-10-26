const Db = require('./db');
const { QueryTypes } = require('sequelize');
const IdentityDao = require('./ExtensionIdentityDao');

const Dao = {};

function getSequelize() {
    return Db.db_smcicc.sequelize;
}

let extensionValidReady = false;

async function ensureExtensionValid() {
    if (extensionValidReady) return;
    const rows = await getSequelize().query(
        `SELECT COUNT(*) AS c FROM information_schema.COLUMNS
          WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 't_icc_base_extension'
            AND COLUMN_NAME = 'IsValid'`,
        { type: QueryTypes.SELECT }
    );
    if (Number(rows?.[0]?.c) === 0) {
        const error = new Error('请先执行分机主从表迁移');
        error.status = 503;
        throw error;
    }
    extensionValidReady = true;
}

Dao.ensureExtensionValid = ensureExtensionValid;

Dao.loadExtensionList = async ({ num = '', vdnId, pageNum = 1, pageSize = 30 }) => {
    await ensureExtensionValid();
    const offset = (Math.max(1, Number(pageNum)) - 1) * Math.max(1, Number(pageSize));
    const limit = Math.max(1, Number(pageSize));

    const rows = await getSequelize().query(
        `SELECT A.Num AS num, A.Device AS device, A.Ch AS ch, B.Name AS chGroup, B.ID AS chGroupId,
                A.Description AS description, A.AgentMode AS agentMode, A.VDN AS vdn,
                A.CallAgentRouterType AS callAgentRouterType, A.CallExternalRouterType AS callExternalRouterType,
                A.IsValid AS isValid, COALESCE(D.enabled,0) AS sipEnabled
           FROM t_icc_base_extension A
      LEFT JOIN t_icc_base_channelgroup B ON A.ChGroup = B.Name
      LEFT JOIN t_icc_sip_directory D ON D.username=A.Num AND D.vdn_id=A.VDN
          WHERE A.VDN = :vdnId AND A.num LIKE :num
          ORDER BY A.num * 1 ASC
          LIMIT :offset, :limit`,
        {
            replacements: { vdnId, num: `%${num}%`, offset, limit },
            type: QueryTypes.SELECT,
        }
    );

    const totalRow = await getSequelize().query(
        `SELECT COUNT(1) AS total
           FROM t_icc_base_extension A
          WHERE A.VDN = :vdnId AND A.num LIKE :num`,
        { replacements: { vdnId, num: `%${num}%` }, type: QueryTypes.SELECT }
    );
    const total = Number(totalRow?.[0]?.total || 0);
    return { rows, total };
};

Dao.findByNum = async ({ num, vdnId, excludeHisNum }) => {
    let sql = `SELECT Num AS num FROM t_icc_base_extension WHERE Num = :num`;
    const replacements = { num, vdnId };
    if (vdnId != null) sql += ' AND VDN = :vdnId';
    if (excludeHisNum) {
        sql += ` AND Num <> :excludeHisNum`;
        replacements.excludeHisNum = excludeHisNum;
    }
    return getSequelize().query(sql, { replacements, type: QueryTypes.SELECT });
};

Dao.findExistCh = async ({ ch }) => {
    return getSequelize().query(
        `SELECT Num AS num, Ch AS ch FROM t_icc_base_extension WHERE Ch = :ch`,
        { replacements: { ch }, type: QueryTypes.SELECT }
    );
};

Dao.insert = IdentityDao.insert;
Dao.batch = IdentityDao.batch;
Dao.reserve = IdentityDao.reserve;
Dao.release = IdentityDao.release;
Dao.isAvailable = IdentityDao.isAvailable;

Dao.update = IdentityDao.update;

Dao.setValid = IdentityDao.setValid;

Dao.findReferencedNums = async ({ nums, vdnId }) => {
    const marks = nums.map((_, i) => `:n${i}`).join(',');
    const replacements = { vdnId };
    nums.forEach((n, i) => { replacements[`n${i}`] = n; });
    return getSequelize().query(
        `SELECT e.Num AS num
           FROM t_icc_base_extension e
          WHERE e.Num IN (${marks})
            AND e.VDN = :vdnId
            AND EXISTS (SELECT 1 FROM t_icc_telag_staticlogin s WHERE e.Num = s.ExtNum)`,
        { replacements, type: QueryTypes.SELECT }
    );
};

Dao.deleteByNums = IdentityDao.deleteByNums;

Dao.loadChGroupList = async ({ vdnId }) => {
    return getSequelize().query(
        `SELECT id, name, beginspanid, beginchannelid, endspanid, endchannelid, seektype
           FROM t_icc_base_channelgroup
          WHERE VDNID = :vdnId
          ORDER BY Name ASC`,
        { replacements: { vdnId }, type: QueryTypes.SELECT }
    );
};

Dao.loadNumList = async ({ vdnId, num = '' }) => {
    return getSequelize().query(
        `SELECT a.num, a.device, a.chgroup, a.vdn
           FROM t_icc_base_extension a
          WHERE NOT EXISTS (
                    SELECT ExtNum
                      FROM t_icc_telag_staticlogin t
                     WHERE a.Num = t.ExtNum
                       AND t.VDNID = :vdnId
                )
            AND a.VDN = :vdnId
            AND a.num LIKE :num
          ORDER BY a.num ASC
          LIMIT 0, 10`,
        { replacements: { vdnId, num: `${num}%` }, type: QueryTypes.SELECT }
    );
};

Dao.findByPrimaryKey = async ({ num, vdnId }) => {
    const rows = await getSequelize().query(
        `SELECT Num AS num, Device AS device, Ch AS ch, ChGroup AS chGroup, Description AS description,
                AgentMode AS agentMode, VDN AS vdn, CallAgentRouterType AS callAgentRouterType, CallExternalRouterType AS callExternalRouterType,
                (SELECT enabled FROM t_icc_sip_directory d WHERE d.username=e.Num AND d.vdn_id=e.VDN) AS sipEnabled
           FROM t_icc_base_extension e
          WHERE Num = :num AND VDN = :vdnId`,
        { replacements: { num, vdnId }, type: QueryTypes.SELECT }
    );
    return rows[0] || null;
};

Dao.findExistChInRange = async ({ startCh, endCh }) => {
    return getSequelize().query(
        `SELECT Num AS num, Ch AS ch
           FROM t_icc_base_extension
          WHERE Ch BETWEEN :startCh AND :endCh`,
        { replacements: { startCh, endCh }, type: QueryTypes.SELECT }
    );
};

module.exports = Dao;
