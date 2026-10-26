const Db = require('./db');
const { QueryTypes } = require('sequelize');

const Dao = {};

function sequelize() {
    return Db.db_smcicc.sequelize;
}

const TAS_ROW_SELECT = `T.PID AS pid, T.CfgFocuCommPID AS cfgFocuCommPid, T.MyID AS myId, T.MyName AS myName, T.LocalIP AS localIp, T.Note AS note,
  T.CCS1 AS ccs1, T.CCS2 AS ccs2, T.MonitorMyID AS monitorMyId, T.CfgMCPID AS cfgMcPid, T.CfgPRDPID AS cfgPrdPid, T.CfgHMPPID AS cfgHmpPid,
  T.IsActiveStandby AS isActiveStandby, T.CfgMC100PID AS cfgMc100Pid, T.RunMode AS runMode, T.Linux_HA_Level AS linuxHaLevel,
  T.CheckBrdWorkTimeOut AS checkBrdWorkTimeOut, T.LogStyle AS logStyle, T.LogBackupCount AS logBackupCount, T.LogCache AS logCache,
  T.RecordType_Type AS recordTypeType, T.RecordTypeThreadNum AS recordTypeThreadNum, T.RecordTypeBUFSIZE AS recordTypeBufSize, T.RecordTypeFilePath AS recordTypeFilePath,
  T.FreFlag0 AS freFlag0, T.Tone0Fq1 AS tone0Fq1, T.Tone0Dv1 AS tone0Dv1, T.Tone0Fq2 AS tone0Fq2, T.Tone0Dv2 AS tone0Dv2,
  T.FreFlag1 AS freFlag1, T.Tone1Fq1 AS tone1Fq1, T.Tone1Dv1 AS tone1Dv1, T.Tone1Fq2 AS tone1Fq2, T.Tone1Dv2 AS tone1Dv2,
  T.FreFlag2 AS freFlag2, T.Tone2Fq1 AS tone2Fq1, T.Tone2Dv1 AS tone2Dv1, T.Tone2Fq2 AS tone2Fq2, T.Tone2Dv2 AS tone2Dv2,
  T.FreFlag3 AS freFlag3, T.Tone3Fq1 AS tone3Fq1, T.Tone3Dv1 AS tone3Dv1, T.Tone3Fq2 AS tone3Fq2, T.Tone3Dv2 AS tone3Dv2,
  T.TimeFlag0 AS timeFlag0, T.Tone0On AS tone0On, T.Tone0Ondv AS tone0OnDv, T.Tone0Off AS tone0Off, T.Tone0Offdv AS tone0OffDv,
  T.TimeFlag1 AS timeFlag1, T.Tone1On AS tone1On, T.Tone1Ondv AS tone1OnDv, T.Tone1Off AS tone1Off, T.Tone1Offdv AS tone1OffDv,
  T.TimeFlag2 AS timeFlag2, T.Tone2On AS tone2On, T.Tone2Ondv AS tone2OnDv, T.Tone2Off AS tone2Off, T.Tone2Offdv AS tone2OffDv,
  T.TimeFlag3 AS timeFlag3, T.Tone3On AS tone3On, T.Tone3Ondv AS tone3OnDv, T.Tone3Off AS tone3Off, T.Tone3Offdv AS tone3OffDv,
  T.FXSParamRingTimes AS fxsParamRingTimes, T.FXOParamIncomingRingTimes AS fxoParamIncomingRingTimes,
  T.SipServerFlag AS sipServerFlag, T.NatedFlag AS natedFlag, T.AutoSwitchRemoteRtpIpAndPort AS autoSwitchRemoteRtpIpAndPort,
  T.LastDeployDate AS lastDeployDate`;

Dao.selectByPrimaryKey = async (pid) => {
    const rows = await sequelize().query(
        `SELECT ${TAS_ROW_SELECT},
                deployUser.ID AS deployUserId, deployUser.Name AS deployUserName
           FROM t_icc_cfg_tas T
      LEFT JOIN t_user_users deployUser ON T.LastDeplayUserID = deployUser.ID
          WHERE T.PID = :pid`,
        { replacements: { pid }, type: QueryTypes.SELECT }
    );
    return rows[0] || null;
};

Dao.selectRunModeList = async () => sequelize().query(
    `SELECT PID AS pid, RunMode AS runMode, MyID AS myId, MyName AS myName
       FROM t_icc_cfg_tas
      ORDER BY PID, RunMode`,
    { type: QueryTypes.SELECT }
);

Dao.selectFlag = async (pid) => {
    const rows = await sequelize().query(
        `SELECT PID AS pid, SipServerFlag AS sipServerFlag,
                IFNULL(NatedFlag, '') AS natedFlag,
                IFNULL(AutoSwitchRemoteRtpIpAndPort, '') AS autoSwitchRemoteRtpIpAndPort
           FROM t_icc_cfg_tas
          WHERE PID = :pid`,
        { replacements: { pid }, type: QueryTypes.SELECT }
    );
    return rows[0] || null;
};

Dao.countDuplicateMyId = async ({ myId, excludePid }) => {
    const ex = excludePid == null || Number(excludePid) === 0 ? 0 : Number(excludePid);
    const rows = await sequelize().query(
        `SELECT COUNT(1) AS c FROM t_icc_cfg_tas WHERE MyID = :myId AND (:ex = 0 OR PID <> :ex)`,
        { replacements: { myId, ex }, type: QueryTypes.SELECT }
    );
    return Number(rows?.[0]?.c || 0);
};

Dao.countMyIdUsedByChannels = async (pid) => {
    const rows = await sequelize().query(
        `SELECT COUNT(1) AS c
           FROM t_icc_cfg_tas t, t_icc_base_channels c
          WHERE t.myId = c.myId AND t.PID = :pid`,
        { replacements: { pid }, type: QueryTypes.SELECT }
    );
    return Number(rows?.[0]?.c || 0);
};

Dao.insert = async (row) => {
    await sequelize().query(
        `INSERT INTO t_icc_cfg_tas (
          CfgFocuCommPID, MyID, MyName, LocalIP, Note, CCS1, CCS2, MonitorMyID, CfgMCPID,
          CfgPRDPID, CfgHMPPID, IsActiveStandby, CfgMC100PID, RunMode, Linux_HA_Level, CheckBrdWorkTimeOut,
          LogStyle, LogBackupCount, LogCache, RecordType_Type, RecordTypeThreadNum, RecordTypeBUFSIZE, RecordTypeFilePath,
          FreFlag0, Tone0Fq1, Tone0Dv1, Tone0Fq2, Tone0Dv2,
          FreFlag1, Tone1Fq1, Tone1Dv1, Tone1Fq2, Tone1Dv2,
          FreFlag2, Tone2Fq1, Tone2Dv1, Tone2Fq2, Tone2Dv2,
          FreFlag3, Tone3Fq1, Tone3Dv1, Tone3Fq2, Tone3Dv2,
          TimeFlag0, Tone0On, Tone0Ondv, Tone0Off, Tone0Offdv,
          TimeFlag1, Tone1On, Tone1Ondv, Tone1Off, Tone1Offdv,
          TimeFlag2, Tone2On, Tone2Ondv, Tone2Off, Tone2Offdv,
          TimeFlag3, Tone3On, Tone3Ondv, Tone3Off, Tone3Offdv,
          FXSParamRingTimes, FXOParamIncomingRingTimes, SipServerFlag, NatedFlag, AutoSwitchRemoteRtpIpAndPort
        ) VALUES (
          :cfgFocuCommPid, :myId, :myName, :localIp, :note, :ccs1, :ccs2, :monitorMyId, :cfgMcPid,
          :cfgPrdPid, :cfgHmpPid, 0, :cfgMc100Pid, 'Master', 'Low', 60,
          'FILE', 100, 'yes',
          'WAV', 8, 1024, '/home/ehang/prd',
          0, 450, 10, 0, 0,
          0, 450, 0, 0, 0,
          0, 450, 10, 0, 0,
          0, 950, 10, 200, 0,
          0, 35, 1, 35, 1,
          0, 0, 0, 0, 0,
          0, 125, 35, 375, 35,
          0, 0, 0, 0, 0,
          10, 2,
          'Disable', 'Disable', 'yes'
        )`,
        { replacements: row, type: QueryTypes.INSERT }
    );
    const idRows = await sequelize().query('SELECT LAST_INSERT_ID() AS id', { type: QueryTypes.SELECT });
    return Number(idRows?.[0]?.id || 0);
};

Dao.updateByPrimaryKey = async (row, transaction) => {
    const [ret] = await sequelize().query(
        `UPDATE t_icc_cfg_tas SET
          CfgFocuCommPID = :cfgFocuCommPid, MyID = :myId, MyName = :myName, LocalIP = :localIp, Note = :note,
          CCS1 = :ccs1, CCS2 = :ccs2, MonitorMyID = :monitorMyId, CfgMCPID = :cfgMcPid,
          CfgPRDPID = :cfgPrdPid, CfgHMPPID = :cfgHmpPid, IsActiveStandby = :isActiveStandby, CfgMC100PID = :cfgMc100Pid,
          RunMode = :runMode, Linux_HA_Level = :linuxHaLevel, CheckBrdWorkTimeOut = :checkBrdWorkTimeOut,
          LogStyle = :logStyle, LogBackupCount = :logBackupCount, LogCache = :logCache,
          RecordType_Type = :recordTypeType, RecordTypeThreadNum = :recordTypeThreadNum,
          RecordTypeBUFSIZE = :recordTypeBufSize, RecordTypeFilePath = :recordTypeFilePath
        WHERE PID = :pid`,
        { replacements: row, type: QueryTypes.UPDATE, transaction }
    );
    return ret;
};

Dao.updateByPid = async (row) => {
    const [ret] = await sequelize().query(
        `UPDATE t_icc_cfg_tas SET
          FreFlag0 = :freFlag0, Tone0Fq1 = :tone0Fq1, Tone0Dv1 = :tone0Dv1, Tone0Fq2 = :tone0Fq2, Tone0Dv2 = :tone0Dv2,
          FreFlag1 = :freFlag1, Tone1Fq1 = :tone1Fq1, Tone1Dv1 = :tone1Dv1, Tone1Fq2 = :tone1Fq2, Tone1Dv2 = :tone1Dv2,
          FreFlag2 = :freFlag2, Tone2Fq1 = :tone2Fq1, Tone2Dv1 = :tone2Dv1, Tone2Fq2 = :tone2Fq2, Tone2Dv2 = :tone2Dv2,
          FreFlag3 = :freFlag3, Tone3Fq1 = :tone3Fq1, Tone3Dv1 = :tone3Dv1, Tone3Fq2 = :tone3Fq2, Tone3Dv2 = :tone3Dv2,
          TimeFlag0 = :timeFlag0, Tone0On = :tone0On, Tone0Ondv = :tone0OnDv, Tone0Off = :tone0Off, Tone0Offdv = :tone0OffDv,
          TimeFlag1 = :timeFlag1, Tone1On = :tone1On, Tone1Ondv = :tone1OnDv, Tone1Off = :tone1Off, Tone1Offdv = :tone1OffDv,
          TimeFlag2 = :timeFlag2, Tone2On = :tone2On, Tone2Ondv = :tone2OnDv, Tone2Off = :tone2Off, Tone2Offdv = :tone2OffDv,
          TimeFlag3 = :timeFlag3, Tone3On = :tone3On, Tone3Ondv = :tone3OnDv, Tone3Off = :tone3Off, Tone3Offdv = :tone3OffDv,
          FXSParamRingTimes = :fxsParamRingTimes, FXOParamIncomingRingTimes = :fxoParamIncomingRingTimes
        WHERE PID = :pid`,
        { replacements: row, type: QueryTypes.UPDATE }
    );
    return ret;
};

Dao.updateTasFlag = async (row) => {
    const [ret] = await sequelize().query(
        `UPDATE t_icc_cfg_tas SET
          SipServerFlag = :sipServerFlag, NatedFlag = :natedFlag, AutoSwitchRemoteRtpIpAndPort = :autoSwitchRemoteRtpIpAndPort
        WHERE PID = :pid`,
        { replacements: row, type: QueryTypes.UPDATE }
    );
    return ret;
};

Dao.deleteTas4isxByTasPid = async (tasPid, transaction) => {
    const [ret] = await sequelize().query(
        `DELETE FROM t_icc_cfg_tas4isx WHERE CfgTASPID = :tasPid`,
        { replacements: { tasPid }, type: QueryTypes.DELETE, transaction }
    );
    return ret;
};

Dao.insertTas4isx = async ({ cfgTasPid, isxIds }, transaction) => {
    if (!isxIds.length) return 0;
    const marks = isxIds.map((_, i) => `:i${i}`).join(',');
    const repl = { cfgTasPid };
    isxIds.forEach((id, i) => { repl[`i${i}`] = id; });
    const [ret] = await sequelize().query(
        `INSERT INTO t_icc_cfg_tas4isx (CfgTASPID, CfgIsxPID)
         SELECT :cfgTasPid, PID FROM t_icc_cfg_isx WHERE PID IN (${marks})`,
        { replacements: repl, type: QueryTypes.INSERT, transaction }
    );
    return ret;
};

Dao.listTas4IsxByTasPid = async (cfgTasPid) => sequelize().query(
    `SELECT CfgTASPID AS cfgTasPid, CfgIsxPID AS cfgIsxPid FROM t_icc_cfg_tas4isx WHERE CfgTASPID = :cfgTasPid`,
    { replacements: { cfgTasPid }, type: QueryTypes.SELECT }
);

Dao.listAllIsxPids = async () => sequelize().query(
    `SELECT PID AS pid FROM t_icc_cfg_isx`,
    { type: QueryTypes.SELECT }
);

Dao.listDistinctIsxPidsForTas = async (cfgTasPid) => {
    const rows = await sequelize().query(
        `SELECT DISTINCT CfgIsxPID AS cfgIsxPid FROM t_icc_cfg_tas4isx WHERE CfgTASPID = :cfgTasPid ORDER BY CfgIsxPID`,
        { replacements: { cfgTasPid }, type: QueryTypes.SELECT }
    );
    return rows.map((r) => r.cfgIsxPid);
};

Dao.listAgBoardsForIsx = async (isxPids) => {
    if (!isxPids.length) return [];
    const marks = isxPids.map((_, i) => `:a${i}`).join(',');
    const repl = {};
    isxPids.forEach((id, i) => { repl[`a${i}`] = id; });
    return sequelize().query(
        `SELECT CfgIsxPID AS cfgIsxPid, OAMBoardID AS oamBoardId, CTILogicSpanID AS ctiLogicSpanId, IsEnable AS isEnable
           FROM t_icc_cfg_agboard WHERE CfgIsxPID IN (${marks})`,
        { replacements: repl, type: QueryTypes.SELECT }
    );
};

Dao.listDtiBoardsForIsx = async (isxPids) => {
    if (!isxPids.length) return [];
    const marks = isxPids.map((_, i) => `:d${i}`).join(',');
    const repl = {};
    isxPids.forEach((id, i) => { repl[`d${i}`] = id; });
    return sequelize().query(
        `SELECT CfgIsxPID AS cfgIsxPid, OAMBoardID AS oamBoardId, CTILogicSpanID AS ctiLogicSpanId, IsEnable AS isEnable
           FROM t_icc_cfg_dtiboard WHERE CfgIsxPID IN (${marks})`,
        { replacements: repl, type: QueryTypes.SELECT }
    );
};

Dao.listSipBoardsForIsx = async (isxPids) => {
    if (!isxPids.length) return [];
    const marks = isxPids.map((_, i) => `:s${i}`).join(',');
    const repl = {};
    isxPids.forEach((id, i) => { repl[`s${i}`] = id; });
    return sequelize().query(
        `SELECT CfgIsxPID AS cfgIsxPid, OAMBoardID AS oamBoardId, SIPChannelBeginID AS sipChannelBeginId,
                SIPChannelCount AS sipChannelCount, IsEnable AS isEnable
           FROM t_icc_cfg_sipboard WHERE CfgIsxPID IN (${marks})`,
        { replacements: repl, type: QueryTypes.SELECT }
    );
};

Dao.selectTasXmlBase = async (pid) => {
    const rows = await sequelize().query(
        `SELECT ${TAS_ROW_SELECT},
                FC.IPAddress AS fcIpAddress, FC.Port AS fcPort,
                CCS1.myId AS ccs1MyId, CCS2.myId AS ccs2MyId,
                MC.IPAddressPort AS mcIpAddressPort, MC.SavePath AS mcSavePath, MC.BeatCycle AS mcBeatCycle,
                MC.IsCheckTone AS mcIsCheckTone, MC.CheckTone AS mcCheckTone,
                MC.IsAutoDeleteLogFile AS mcIsAutoDeleteLogFile, MC.AutoDeleteLogFile AS mcAutoDeleteLogFile,
                MC.IsInvokeSyncFun AS mcIsInvokeSyncFun, MC.InvokeSyncFun AS mcInvokeSyncFun,
                HMP.myId AS hmpMyId, HMP.LocalIP AS hmpLocalIp, HMP.RtpPort AS hmpRtpPort,
                HMP.ChannelCount AS hmpChannelCount, HMP.Mode AS hmpMode,
                PRD.PID AS prdPid, PRD.ISXPID AS prdIsxPid,
                MC100.IP AS mc100Ip, MC100.Port AS mc100Port
           FROM t_icc_cfg_tas T
      LEFT JOIN t_icc_cfg_focucomm FC ON T.CfgFocuCommPID = FC.PID
      LEFT JOIN t_icc_cfg_ccs CCS1 ON T.CCS1 = CCS1.PID
      LEFT JOIN t_icc_cfg_ccs CCS2 ON T.CCS2 = CCS2.PID
      LEFT JOIN t_icc_cfg_mc MC ON T.CfgMCPID = MC.PID
      LEFT JOIN t_icc_cfg_hmp HMP ON T.CfgHMPPID = HMP.PID
      LEFT JOIN t_icc_cfg_prd PRD ON T.CfgPRDPID = PRD.PID
      LEFT JOIN t_icc_cfg_mc100 MC100 ON T.CfgMC100PID = MC100.PID
          WHERE T.PID = :pid`,
        { replacements: { pid }, type: QueryTypes.SELECT }
    );
    return rows[0] || null;
};

Dao.listCallOuts = async (cfgTasPid) => sequelize().query(
    `SELECT BeginSpan AS beginSpan, EndSpan AS endSpan, VoiceCodes AS voiceCodes, Type AS type, IP AS ip, Port AS port,
            UserName AS userName, PassWord AS passWord, NodeID AS nodeId, Flag AS flag
       FROM t_icc_cfg_tas4callout WHERE CfgTASPID = :cfgTasPid`,
    { replacements: { cfgTasPid }, type: QueryTypes.SELECT }
);

Dao.listCallIns = async (cfgTasPid) => sequelize().query(
    `SELECT BeginSpan AS beginSpan, EndSpan AS endSpan, VoiceCodes AS voiceCodes, Flag AS flag
       FROM t_icc_cfg_tas4callin WHERE CfgTASPID = :cfgTasPid`,
    { replacements: { cfgTasPid }, type: QueryTypes.SELECT }
);

Dao.listSysVoices = async (cfgTasPid) => sequelize().query(
    `SELECT ID AS id, Description AS description, FileName AS fileName
       FROM t_icc_cfg_tas4sysvoice WHERE CfgTASPID = :cfgTasPid`,
    { replacements: { cfgTasPid }, type: QueryTypes.SELECT }
);

Dao.listChs = async (cfgTasPid) => sequelize().query(
    `SELECT Type AS type, BeginSpan AS beginSpan, EndSpan AS endSpan, BeginChannel AS beginChannel, EndChannel AS endChannel, Flag AS flag
       FROM t_icc_cfg_tas4chs WHERE CfgTASPID = :cfgTasPid`,
    { replacements: { cfgTasPid }, type: QueryTypes.SELECT }
);

Dao.listFxos = async (cfgTasPid) => sequelize().query(
    `SELECT AGCh AS agCh, No AS no, Flag AS flag FROM t_icc_cfg_tas4fxo WHERE CfgTASPID = :cfgTasPid`,
    { replacements: { cfgTasPid }, type: QueryTypes.SELECT }
);

Dao.listDtis = async (cfgTasPid) => sequelize().query(
    `SELECT Span AS span, No AS no, Flag AS flag FROM t_icc_cfg_tas4dti WHERE CfgTASPID = :cfgTasPid`,
    { replacements: { cfgTasPid }, type: QueryTypes.SELECT }
);

Dao.listRegs = async (cfgTasPid) => sequelize().query(
    `SELECT ID AS id, NodeID AS nodeId, BRD AS brd, Domain AS domain, Port AS port,
            UserName AS userName, PassWord AS passWord, Expires AS expires, Nat AS nat, Flag AS flag
       FROM t_icc_cfg_tas4reg WHERE CfgTASPID = :cfgTasPid`,
    { replacements: { cfgTasPid }, type: QueryTypes.SELECT }
);

Dao.listEhRegs = async (cfgTasPid) => sequelize().query(
    `SELECT UserId AS userId, Passwd AS passwd, UserName AS userName, Flag AS flag
       FROM t_icc_cfg_tas4ehreg WHERE CfgTASPID = :cfgTasPid`,
    { replacements: { cfgTasPid }, type: QueryTypes.SELECT }
);

Dao.listNatSips = async (cfgTasPid) => sequelize().query(
    `SELECT NodeId AS nodeId, PublicIp AS publicIp, PublicPort AS publicPort, Flag AS flag
       FROM t_icc_cfg_tas4natsip WHERE CfgTASPID = :cfgTasPid`,
    { replacements: { cfgTasPid }, type: QueryTypes.SELECT }
);

Dao.listNatXiops = async (cfgTasPid) => sequelize().query(
    `SELECT NodeId AS nodeId, PublicIp AS publicIp, PrivateIp AS privateIp, Flag AS flag
       FROM t_icc_cfg_tas4natxiop WHERE CfgTASPID = :cfgTasPid`,
    { replacements: { cfgTasPid }, type: QueryTypes.SELECT }
);

Dao.updateXMLDeployer = async ({ pid, userId, workName }) => {
    const [ret] = await sequelize().query(
        `UPDATE t_icc_cfg_tas SET LastDeployDate = SYSDATE(), LastDeplayUserID = :userId, LastDeplayUserName = :workName
         WHERE PID = :pid`,
        { replacements: { pid, userId, workName }, type: QueryTypes.UPDATE }
    );
    return ret;
};

Dao.callCopyTas = async (pid) => {
    await sequelize().query('CALL S_CFG_CopyTas(:pid)', {
        replacements: { pid },
        type: QueryTypes.RAW,
    });
};

Dao.lastInsertId = async () => {
    const rows = await sequelize().query('SELECT LAST_INSERT_ID() AS id', { type: QueryTypes.SELECT });
    return Number(rows?.[0]?.id || 0);
};

Dao.callDeleteTas = async (pid) => {
    await sequelize().query('CALL S_CFG_DeleteTas(:pid)', {
        replacements: { pid },
        type: QueryTypes.RAW,
    });
};

Dao.findSysUserByWorkNo = async (workNo) => {
    const rows = await sequelize().query(
        `SELECT ID AS id FROM t_user_users WHERE WorkNO = :workNo LIMIT 1`,
        { replacements: { workNo: String(workNo) }, type: QueryTypes.SELECT }
    );
    return rows[0] || null;
};

/** 与 TasMapper.selectByMcPid：待删 MC PID 仍被 TAS.CfgMCPID 引用 */
Dao.selectCfgMcPidsInUse = async (mcPids) => {
    if (!mcPids.length) return [];
    const marks = mcPids.map((_, i) => `:m${i}`).join(',');
    const repl = {};
    mcPids.forEach((id, i) => { repl[`m${i}`] = id; });
    return sequelize().query(
        `SELECT CfgMCPID AS cfgMcPid FROM t_icc_cfg_tas WHERE CfgMCPID IN (${marks}) GROUP BY CfgMCPID`,
        { replacements: repl, type: QueryTypes.SELECT }
    );
};

/** 呼出路由删除校验：与 TasMapper.selectAll */
Dao.tasSelectAllPids = async () => sequelize().query(
    `SELECT PID AS pid FROM t_icc_cfg_tas ORDER BY PID ASC`,
    { type: QueryTypes.SELECT }
);

/** 与 Tas4CallOutMapper.selectByCfgTasPidEnable */
Dao.listCallOutsEnabled = async (cfgTasPid) => sequelize().query(
    `SELECT BeginSpan AS beginSpan, EndSpan AS endSpan
       FROM t_icc_cfg_tas4callout WHERE CfgTASPID = :cfgTasPid AND Flag = 'Enable'`,
    { replacements: { cfgTasPid }, type: QueryTypes.SELECT }
);

/** 与 Tas4CallInMapper.selectByCfgTasPidEnable */
Dao.listCallInsEnabled = async (cfgTasPid) => sequelize().query(
    `SELECT BeginSpan AS beginSpan, EndSpan AS endSpan
       FROM t_icc_cfg_tas4callin WHERE CfgTASPID = :cfgTasPid AND Flag = 'Enable'`,
    { replacements: { cfgTasPid }, type: QueryTypes.SELECT }
);

module.exports = Dao;
