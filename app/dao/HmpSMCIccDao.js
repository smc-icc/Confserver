const Db = require('./db');
const { QueryTypes } = require('sequelize');

const Dao = {};

function sequelize() {
    return Db.db_smcicc.sequelize;
}

const HMP_COLS = `t.PID AS pid, t.CfgFocuCommPID AS cfgFocuCommPid, t.myName, t.myId, t.RunMode AS runMode, t.Note AS note,
      t.LocalIP AS localIp, t.RtpPort AS rtpPort, t.ChannelCount AS channelCount, t.Mode AS mode,
      t.t30_use_ecm AS t30UseEcm, t.FilePath AS filePath, t.Identifier AS identifier, t.PageHeaderInfo AS pageHeaderInfo,
      t.t30_set_max_retries AS t30SetMaxRetries, t.t30_set_receiver_not_ready AS t30SetReceiverNotReady,
      t.BaudRate AS baudRate, t.LogStyle AS logStyle, t.LogLevel AS logLevel, t.LogCache AS logCache`;

Dao.hmpList = async (myName, runMode, offset, limit) => {
    const mn = myName == null ? '' : String(myName);
    const rm = runMode == null ? '' : String(runMode);
    return sequelize().query(
        `SELECT ${HMP_COLS},
                CONCAT(IFNULL(f.IPAddress,''), ':', IFNULL(f.Port,'')) AS focuIpAndPort,
                t.LastDeployDate AS lastDeployDate,
                deployUser.ID AS deployUserId, deployUser.Name AS deployUserName
           FROM t_icc_cfg_hmp t
      LEFT JOIN t_icc_cfg_focucomm f ON t.CfgFocuCommPID = f.PID
      LEFT JOIN t_user_users deployUser ON t.LastDeplayUserID = deployUser.ID
          WHERE t.myName LIKE CONCAT('%', :myName, '%')
            AND ((t.RunMode = :runMode) OR :runMode = '')
          ORDER BY t.myName ASC
          LIMIT :offset, :limit`,
        { replacements: { myName: mn, runMode: rm, offset, limit }, type: QueryTypes.SELECT }
    );
};

Dao.hmpCount = async (myName, runMode) => {
    const mn = myName == null ? '' : String(myName);
    const rm = runMode == null ? '' : String(runMode);
    const rows = await sequelize().query(
        `SELECT COUNT(1) AS c FROM t_icc_cfg_hmp
          WHERE myName LIKE CONCAT('%', :myName, '%')
            AND ((RunMode = :runMode) OR :runMode = '')`,
        { replacements: { myName: mn, runMode: rm }, type: QueryTypes.SELECT }
    );
    return Number(rows?.[0]?.c || 0);
};

Dao.hmpCountByMyId = async (myId, excludePid) => {
    const ex = excludePid == null || excludePid === '' ? 0 : Number(excludePid);
    const rows = await sequelize().query(
        `SELECT COUNT(1) AS c FROM t_icc_cfg_hmp WHERE myId = :myId AND PID != :excludePid`,
        { replacements: { myId, excludePid: ex }, type: QueryTypes.SELECT }
    );
    return Number(rows?.[0]?.c || 0);
};

Dao.hmpInsert = async (row) => {
    await sequelize().query(
        `INSERT INTO t_icc_cfg_hmp (PID, CfgFocuCommPID, myName, myId, RunMode, Note, LocalIP, RtpPort, ChannelCount, Mode,
            t30_use_ecm, FilePath, Identifier, PageHeaderInfo, t30_set_max_retries, t30_set_receiver_not_ready, BaudRate, LogStyle, LogLevel, LogCache)
         SELECT IFNULL(MAX(PID), 0) + 1, :cfgFocuCommPid, :myName, :myId, :runMode, :note, :localIp, :rtpPort, :channelCount, :mode,
                :t30UseEcm, :filePath, :identifier, :pageHeaderInfo, :t30SetMaxRetries, :t30SetReceiverNotReady, :baudRate, :logStyle, :logLevel, :logCache
           FROM t_icc_cfg_hmp`,
        { replacements: row, type: QueryTypes.INSERT }
    );
};

Dao.hmpUpdate = async (row) => {
    const [ret] = await sequelize().query(
        `UPDATE t_icc_cfg_hmp
            SET CfgFocuCommPID = :cfgFocuCommPid,
                myName = :myName,
                myId = :myId,
                RunMode = :runMode,
                Note = :note,
                LocalIP = :localIp,
                RtpPort = :rtpPort,
                ChannelCount = :channelCount,
                Mode = :mode,
                t30_use_ecm = :t30UseEcm,
                FilePath = :filePath,
                Identifier = :identifier,
                PageHeaderInfo = :pageHeaderInfo,
                t30_set_max_retries = :t30SetMaxRetries,
                t30_set_receiver_not_ready = :t30SetReceiverNotReady,
                BaudRate = :baudRate,
                LogStyle = :logStyle,
                LogLevel = :logLevel,
                LogCache = :logCache
          WHERE PID = :pid`,
        { replacements: row, type: QueryTypes.UPDATE }
    );
    return ret;
};

Dao.hmpDelete = async (pids) => {
    if (!pids.length) return 0;
    const marks = pids.map((_, i) => `:p${i}`).join(',');
    const repl = {};
    pids.forEach((id, i) => { repl[`p${i}`] = id; });
    const [ret] = await sequelize().query(
        `DELETE FROM t_icc_cfg_hmp WHERE PID IN (${marks})`,
        { replacements: repl, type: QueryTypes.DELETE }
    );
    return ret;
};

Dao.hmpSelectById = async (pid) => {
    const rows = await sequelize().query(
        `SELECT PID AS pid, CfgFocuCommPID AS cfgFocuCommPid, myName, myId, RunMode AS runMode, Note AS note,
                LocalIP AS localIp, RtpPort AS rtpPort, ChannelCount AS channelCount, Mode AS mode,
                t30_use_ecm AS t30UseEcm, FilePath AS filePath, Identifier AS identifier, PageHeaderInfo AS pageHeaderInfo,
                t30_set_max_retries AS t30SetMaxRetries, t30_set_receiver_not_ready AS t30SetReceiverNotReady,
                BaudRate AS baudRate, LogStyle AS logStyle, LogLevel AS logLevel, LogCache AS logCache
           FROM t_icc_cfg_hmp WHERE PID = :pid`,
        { replacements: { pid }, type: QueryTypes.SELECT }
    );
    return rows[0] || null;
};

Dao.hmpSelectAll = async () => sequelize().query(
    `SELECT PID AS pid, CfgFocuCommPID AS cfgFocuCommPid, myName, myId, RunMode AS runMode, Note AS note,
            LocalIP AS localIp, RtpPort AS rtpPort, ChannelCount AS channelCount, Mode AS mode,
            t30_use_ecm AS t30UseEcm, FilePath AS filePath, Identifier AS identifier, PageHeaderInfo AS pageHeaderInfo,
            t30_set_max_retries AS t30SetMaxRetries, t30_set_receiver_not_ready AS t30SetReceiverNotReady,
            BaudRate AS baudRate, LogStyle AS logStyle, LogLevel AS logLevel, LogCache AS logCache
       FROM t_icc_cfg_hmp`,
    { type: QueryTypes.SELECT }
);

/** 与 Hmp4XmlMapper.getHmpXMLByPid + join FocuComm */
Dao.getHmpXmlRow = async (pid) => {
    const rows = await sequelize().query(
        `SELECT H.PID AS pid, H.myId, H.myName, H.LogStyle AS logStyle, H.LogLevel AS logLevel, H.LogCache AS logCache,
                H.LocalIP AS localIp, H.RtpPort AS rtpPort, H.ChannelCount AS channelCount, H.FilePath AS filePath,
                H.BaudRate AS baudRate, H.Identifier AS identifier, H.PageHeaderInfo AS pageHeaderInfo,
                H.t30_use_ecm AS t30UseEcm, H.t30_set_max_retries AS t30SetMaxRetries, H.t30_set_receiver_not_ready AS t30SetReceiverNotReady,
                F.IPAddress AS focuIpAddress, F.Port AS focuPort
           FROM t_icc_cfg_hmp H
      LEFT JOIN t_icc_cfg_focucomm F ON H.CfgFocuCommPID = F.PID
          WHERE H.PID = :pid`,
        { replacements: { pid }, type: QueryTypes.SELECT }
    );
    return rows[0] || null;
};

Dao.updateXMLDeployer = async ({ pid, userId, workName }) => {
    const [ret] = await sequelize().query(
        `UPDATE t_icc_cfg_hmp
            SET LastDeployDate = NOW(),
                LastDeplayUserID = :userId,
                LastDeplayUserName = :workName
          WHERE PID = :pid`,
        { replacements: { pid, userId, workName }, type: QueryTypes.UPDATE }
    );
    return ret;
};

module.exports = Dao;
