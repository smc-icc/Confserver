const Db = require('./db');
const { QueryTypes } = require('sequelize');

const Dao = {};

function sequelize() {
    return Db.db_smcicc.sequelize;
}

Dao.sipBoardListPage = async (cfgIsxPid, offset, limit) => sequelize().query(
    `SELECT OAMBoardID AS oamBoardId, CfgIsxPID AS cfgIsxPid,
            SIPChannelBeginID AS sipChannelBeginId, SIPChannelCount AS sipChannelCount, IsEnable AS isEnable
       FROM t_icc_cfg_sipboard
      WHERE CfgIsxPID = :cfgIsxPid
      ORDER BY OAMBoardID ASC
      LIMIT :offset, :limit`,
    { replacements: { cfgIsxPid, offset, limit }, type: QueryTypes.SELECT }
);

Dao.sipBoardCount = async (cfgIsxPid) => {
    const rows = await sequelize().query(
        `SELECT COUNT(1) AS c FROM t_icc_cfg_sipboard WHERE CfgIsxPID = :cfgIsxPid`,
        { replacements: { cfgIsxPid }, type: QueryTypes.SELECT }
    );
    return Number(rows?.[0]?.c || 0);
};

Dao.countByPidAndCfgIsxPid = async ({ cfgIsxPid, oamBoardId, oldOamBoardId }) => {
    const oldEx = oldOamBoardId == null ? -1 : Number(oldOamBoardId);
    const rows = await sequelize().query(
        `SELECT COUNT(1) AS c FROM t_icc_cfg_sipboard
          WHERE CfgIsxPID = :cfgIsxPid
            AND OAMBoardID = :oamBoardId
            AND OAMBoardID <> :oldEx`,
        { replacements: { cfgIsxPid, oamBoardId, oldEx }, type: QueryTypes.SELECT }
    );
    return Number(rows?.[0]?.c || 0);
};

Dao.sipBoardInsert = async ({ oamBoardId, cfgIsxPid, sipChannelBeginId, sipChannelCount, isEnable }) => {
    const [ret] = await sequelize().query(
        `INSERT INTO t_icc_cfg_sipboard (OAMBoardID, CfgIsxPID, SIPChannelBeginID, SIPChannelCount, IsEnable)
         VALUES (:oamBoardId, :cfgIsxPid, :sipChannelBeginId, :sipChannelCount, :isEnable)`,
        { replacements: { oamBoardId, cfgIsxPid, sipChannelBeginId, sipChannelCount, isEnable }, type: QueryTypes.INSERT }
    );
    return ret;
};

Dao.sipBoardUpdate = async ({
    sipChannelBeginId,
    sipChannelCount,
    isEnable,
    oamBoardId,
    oldOamBoardId,
    cfgIsxPid,
}) => {
    const begSql = sipChannelBeginId == null
        ? 'SIPChannelBeginID = NULL'
        : 'SIPChannelBeginID = :sipChannelBeginId';
    const cntSql = sipChannelCount == null
        ? 'SIPChannelCount = NULL'
        : 'SIPChannelCount = :sipChannelCount';
    const repl = {
        isEnable,
        oamBoardId,
        oldOamBoardId,
        cfgIsxPid,
    };
    if (sipChannelBeginId != null) repl.sipChannelBeginId = sipChannelBeginId;
    if (sipChannelCount != null) repl.sipChannelCount = sipChannelCount;
    const [ret] = await sequelize().query(
        `UPDATE t_icc_cfg_sipboard
            SET ${begSql},
                ${cntSql},
                IsEnable = :isEnable,
                OAMBoardID = :oamBoardId
          WHERE OAMBoardID = :oldOamBoardId
            AND CfgIsxPID = :cfgIsxPid`,
        { replacements: repl, type: QueryTypes.UPDATE }
    );
    return ret;
};

Dao.sipBoardSelectById = async (oamBoardId) => {
    const rows = await sequelize().query(
        `SELECT OAMBoardID AS oamBoardId, CfgIsxPID AS cfgIsxPid,
                SIPChannelBeginID AS sipChannelBeginId, SIPChannelCount AS sipChannelCount, IsEnable AS isEnable
           FROM t_icc_cfg_sipboard WHERE OAMBoardID = :oamBoardId`,
        { replacements: { oamBoardId }, type: QueryTypes.SELECT }
    );
    return rows[0] || null;
};

Dao.sipBoardDelete = async (oamBoardIds, cfgIsxPid) => {
    if (!oamBoardIds.length) return 0;
    const marks = oamBoardIds.map((_, i) => `:d${i}`).join(',');
    const repl = { cfgIsxPid };
    oamBoardIds.forEach((id, i) => { repl[`d${i}`] = id; });
    const [ret] = await sequelize().query(
        `DELETE FROM t_icc_cfg_sipboard WHERE OAMBoardID IN (${marks}) AND CfgIsxPID = :cfgIsxPid`,
        { replacements: repl, type: QueryTypes.DELETE }
    );
    return ret;
};

module.exports = Dao;
