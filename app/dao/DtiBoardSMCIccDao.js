const Db = require('./db');
const { QueryTypes } = require('sequelize');

const Dao = {};

function sequelize() {
    return Db.db_smcicc.sequelize;
}

Dao.dtiBoardListPage = async (cfgIsxPid, offset, limit) => sequelize().query(
    `SELECT OAMBoardID AS oamBoardId, CfgIsxPID AS cfgIsxPid, CTILogicSpanID AS ctiLogicSpanId, IsEnable AS isEnable
       FROM t_icc_cfg_dtiboard
      WHERE CfgIsxPID = :cfgIsxPid
      ORDER BY OAMBoardID ASC
      LIMIT :offset, :limit`,
    { replacements: { cfgIsxPid, offset, limit }, type: QueryTypes.SELECT }
);

Dao.dtiBoardCount = async (cfgIsxPid) => {
    const rows = await sequelize().query(
        `SELECT COUNT(1) AS c FROM t_icc_cfg_dtiboard WHERE CfgIsxPID = :cfgIsxPid`,
        { replacements: { cfgIsxPid }, type: QueryTypes.SELECT }
    );
    return Number(rows?.[0]?.c || 0);
};

Dao.countByPidAndCfgIsxPid = async ({ cfgIsxPid, oamBoardId, oldOamBoardId }) => {
    const oldEx = oldOamBoardId == null ? -1 : Number(oldOamBoardId);
    const rows = await sequelize().query(
        `SELECT COUNT(1) AS c FROM t_icc_cfg_dtiboard
          WHERE CfgIsxPID = :cfgIsxPid
            AND OAMBoardID = :oamBoardId
            AND OAMBoardID <> :oldEx`,
        { replacements: { cfgIsxPid, oamBoardId, oldEx }, type: QueryTypes.SELECT }
    );
    return Number(rows?.[0]?.c || 0);
};

Dao.dtiBoardInsert = async ({ oamBoardId, cfgIsxPid, ctiLogicSpanId, isEnable }) => {
    const [ret] = await sequelize().query(
        `INSERT INTO t_icc_cfg_dtiboard (OAMBoardID, CfgIsxPID, CTILogicSpanID, IsEnable)
         VALUES (:oamBoardId, :cfgIsxPid, :ctiLogicSpanId, :isEnable)`,
        { replacements: { oamBoardId, cfgIsxPid, ctiLogicSpanId, isEnable }, type: QueryTypes.INSERT }
    );
    return ret;
};

Dao.dtiBoardUpdate = async ({ ctiLogicSpanId, isEnable, oamBoardId, oldOamBoardId, cfgIsxPid }) => {
    const spanSql = ctiLogicSpanId == null
        ? 'CTILogicSpanID = NULL'
        : 'CTILogicSpanID = :ctiLogicSpanId';
    const repl = {
        isEnable,
        oamBoardId,
        oldOamBoardId,
        cfgIsxPid,
    };
    if (ctiLogicSpanId != null) repl.ctiLogicSpanId = ctiLogicSpanId;
    const [ret] = await sequelize().query(
        `UPDATE t_icc_cfg_dtiboard
            SET ${spanSql},
                IsEnable = :isEnable,
                OAMBoardID = :oamBoardId
          WHERE OAMBoardID = :oldOamBoardId
            AND CfgIsxPID = :cfgIsxPid`,
        { replacements: repl, type: QueryTypes.UPDATE }
    );
    return ret;
};

Dao.dtiBoardSelectById = async (oamBoardId) => {
    const rows = await sequelize().query(
        `SELECT OAMBoardID AS oamBoardId, CfgIsxPID AS cfgIsxPid, CTILogicSpanID AS ctiLogicSpanId, IsEnable AS isEnable
           FROM t_icc_cfg_dtiboard WHERE OAMBoardID = :oamBoardId`,
        { replacements: { oamBoardId }, type: QueryTypes.SELECT }
    );
    return rows[0] || null;
};

Dao.dtiBoardSelectByBoardIds = async (oamBoardIds, cfgIsxPid) => {
    if (!oamBoardIds.length) return [];
    const marks = oamBoardIds.map((_, i) => `:b${i}`).join(',');
    const repl = { cfgIsxPid };
    oamBoardIds.forEach((id, i) => { repl[`b${i}`] = id; });
    return sequelize().query(
        `SELECT OAMBoardID AS oamBoardId, CfgIsxPID AS cfgIsxPid, CTILogicSpanID AS ctiLogicSpanId, IsEnable AS isEnable
           FROM t_icc_cfg_dtiboard
          WHERE CfgIsxPID = :cfgIsxPid AND OAMBoardID IN (${marks})`,
        { replacements: repl, type: QueryTypes.SELECT }
    );
};

Dao.dtiBoardDelete = async (oamBoardIds, cfgIsxPid) => {
    if (!oamBoardIds.length) return 0;
    const marks = oamBoardIds.map((_, i) => `:d${i}`).join(',');
    const repl = { cfgIsxPid };
    oamBoardIds.forEach((id, i) => { repl[`d${i}`] = id; });
    const [ret] = await sequelize().query(
        `DELETE FROM t_icc_cfg_dtiboard WHERE OAMBoardID IN (${marks}) AND CfgIsxPID = :cfgIsxPid`,
        { replacements: repl, type: QueryTypes.DELETE }
    );
    return ret;
};

module.exports = Dao;
