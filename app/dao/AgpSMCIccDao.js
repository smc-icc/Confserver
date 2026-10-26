const Db = require('./db');
const { QueryTypes } = require('sequelize');

const Dao = {};

function sequelize() {
    return Db.db_smcicc.sequelize;
}

const AGP_BASE_COLS = `A.PID AS pid, A.CfgFocuCommPID AS cfgFocuCommPid, A.CCS1 AS ccs1, A.CCS2 AS ccs2, A.Timeout AS timeout,
      A.RunMode AS runMode, A.ClientCount AS clientCount, A.Note AS note, A.LocalIPAndPort AS localIpAndPort,
      A.LocalTimeout AS localTimeout, A.LocalClientCount AS localClientCount, A.LocalExpiryDuration AS localExpiryDuration,
      A.LogLevel AS logLevel, A.LogStyle AS logStyle, A.CCSComID AS ccsComId, A.ACDComID AS acdComId`;

Dao.agpSelectAll = async () => sequelize().query(
    `SELECT ${AGP_BASE_COLS.replace(/A\./g, '')}
       FROM t_icc_cfg_agp
      ORDER BY PID`,
    { type: QueryTypes.SELECT }
);

Dao.agpSelectById = async (pid) => {
    const rows = await sequelize().query(
        `SELECT ${AGP_BASE_COLS},
                A.LastDeployDate AS lastDeployDate,
                deployUser.ID AS deployUserId, deployUser.Name AS deployUserName
           FROM t_icc_cfg_agp A
      LEFT JOIN t_user_users deployUser ON A.LastDeplayUserID = deployUser.ID
          WHERE A.PID = :pid`,
        { replacements: { pid }, type: QueryTypes.SELECT }
    );
    return rows[0] || null;
};

Dao.agpInsertMinimal = async ({ cfgFocuCommPid, runMode, note }) => {
    const [ret] = await sequelize().query(
        `INSERT INTO t_icc_cfg_agp (PID, CfgFocuCommPID, RunMode, Note)
         SELECT IFNULL(MAX(PID) + 1, 1), :cfgFocuCommPid, :runMode, :note FROM t_icc_cfg_agp`,
        { replacements: { cfgFocuCommPid, runMode, note }, type: QueryTypes.INSERT }
    );
    return ret;
};

Dao.agpInsertCopy = async (row) => {
    const [ret] = await sequelize().query(
        `INSERT INTO t_icc_cfg_agp (PID, CfgFocuCommPID, RunMode, Note, CCS1, CCS2, Timeout, ClientCount, LocalIPAndPort,
            LocalTimeout, LocalClientCount, LocalExpiryDuration, LogLevel, LogStyle, CCSComID, ACDComID)
         SELECT IFNULL(MAX(PID) + 1, 1), :cfgFocuCommPid, :runMode, :note, :ccs1, :ccs2, :timeout, :clientCount, :localIpAndPort,
                :localTimeout, :localClientCount, :localExpiryDuration, :logLevel, :logStyle, :ccsComId, :acdComId
           FROM t_icc_cfg_agp`,
        { replacements: row, type: QueryTypes.INSERT }
    );
    return ret;
};

Dao.agpUpdate = async (row) => {
    const [ret] = await sequelize().query(
        `UPDATE t_icc_cfg_agp
            SET CfgFocuCommPID = :cfgFocuCommPid,
                CCS1 = :ccs1,
                CCS2 = :ccs2,
                Timeout = :timeout,
                RunMode = :runMode,
                ClientCount = :clientCount,
                Note = :note,
                LocalIPAndPort = :localIpAndPort,
                LocalTimeout = :localTimeout,
                LocalClientCount = :localClientCount,
                LocalExpiryDuration = :localExpiryDuration,
                LogLevel = :logLevel,
                LogStyle = :logStyle,
                CCSComID = :ccsComId,
                ACDComID = :acdComId
          WHERE PID = :pid`,
        { replacements: row, type: QueryTypes.UPDATE }
    );
    return ret;
};

Dao.agpDelete = async (pid) => {
    const [ret] = await sequelize().query(
        `DELETE FROM t_icc_cfg_agp WHERE PID = :pid`,
        { replacements: { pid }, type: QueryTypes.DELETE }
    );
    return ret;
};

Dao.agpSelectLast = async () => {
    const rows = await sequelize().query(
        `SELECT PID AS pid, CfgFocuCommPID AS cfgFocuCommPid, CCS1 AS ccs1, CCS2 AS ccs2, Timeout AS timeout,
                RunMode AS runMode, ClientCount AS clientCount, Note AS note, LocalIPAndPort AS localIpAndPort,
                LocalTimeout AS localTimeout, LocalClientCount AS localClientCount, LocalExpiryDuration AS localExpiryDuration,
                LogLevel AS logLevel, LogStyle AS logStyle, CCSComID AS ccsComId, ACDComID AS acdComId
           FROM t_icc_cfg_agp
          ORDER BY PID DESC
          LIMIT 1`,
        { type: QueryTypes.SELECT }
    );
    return rows[0] || null;
};

/** 与 Agp4XmlMapper.getAgp4XMLByPid 一致，用于生成 agentproxy_config.xml */
Dao.getAgp4XmlByPid = async (agpId) => {
    const rows = await sequelize().query(
        `SELECT A.PID AS pid,
                A.ClientCount AS clientCount,
                A.Timeout AS timeout,
                A.LocalIPAndPort AS localIpAndPort,
                A.LocalTimeout AS localTimeout,
                A.LocalClientCount AS localClientCount,
                A.LocalExpiryDuration AS localExpiryDuration,
                A.LogLevel AS logLevel,
                A.LogStyle AS logStyle,
                F.IPAddress AS focuIpAddress,
                F.Port AS focuPort,
                C1.myId AS ccs1MyId,
                C2.myId AS ccs2MyId,
                C3.myId AS ccsComMyId,
                D.APPID AS acdAppId
           FROM t_icc_cfg_agp A
      LEFT JOIN t_icc_cfg_focucomm F ON A.CfgFocuCommPID = F.PID
      LEFT JOIN t_icc_cfg_ccs C1 ON A.CCS1 = C1.PID
      LEFT JOIN t_icc_cfg_ccs C2 ON A.CCS2 = C2.PID
      LEFT JOIN t_icc_cfg_ccs C3 ON A.CCSComID = C3.PID
      LEFT JOIN t_icc_cfg_acd D ON A.ACDComID = D.PID
          WHERE A.PID = :agpId`,
        { replacements: { agpId }, type: QueryTypes.SELECT }
    );
    return rows[0] || null;
};

Dao.updateXMLDeployer = async ({ agpId, userId, workName }) => {
    const [ret] = await sequelize().query(
        `UPDATE t_icc_cfg_agp
            SET LastDeployDate = NOW(),
                LastDeplayUserID = :userId,
                LastDeplayUserName = :workName
          WHERE PID = :agpId`,
        { replacements: { agpId, userId, workName }, type: QueryTypes.UPDATE }
    );
    return ret;
};

module.exports = Dao;
