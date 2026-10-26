const Db = require('./db');
const { QueryTypes } = require('sequelize');

const Dao = {};

function sequelize() {
    return Db.db_smcicc.sequelize;
}

const CCS_SELECT_LIST = [
    'C.PID AS pid',
    'C.CfgFocuCommPID AS cfgFocuCommPid',
    'C.CfgOdbcPID AS cfgOdbcPid',
    'C.myName AS myName',
    'C.myId AS myId',
    'C.RunMode AS runMode',
    'C.Note AS note',
    'C.ConnectKeepAlive AS connectKeepAlive',
    'C.poolSize AS poolSize',
    'C.SupportReport AS supportReport',
    'C.Sync AS sync',
    'C.PoolLength AS poolLength',
    'C.DebugInfo AS debugInfo',
    'C.Elapsed AS elapsed',
    'C.t_icc_ag_state_trk_record AS tIcipAgStateTrkRecord',
    'C.t_icc_ag_skill_sign_record AS tIcipAgSkillSignRecord',
    'C.t_icc_ag_group_sign_record AS tIcipAgGroupSignRecord',
    'C.t_icc_ag_call_record AS tIcipAgCallRecord',
    'C.t_icc_base_cdr AS tIcipBaseCdr',
    'C.DefaultWaitingMusic AS defaultWaitingMusic',
    'C.DefaultWaitingAgentMusic AS defaultWaitingAgentMusic',
    'C.VoiceFileWorkerNumChinese AS voiceFileWorkerNumChinese',
    'C.VoiceFileWorkerNumEnglish AS voiceFileWorkerNumEnglish',
    'C.VoiceFileServiceForYouChinese AS voiceFileServiceForYouChinese',
    'C.VoiceFileServiceForYouEnglish AS voiceFileServiceForYouEnglish',
    'C.VoiceFileNum0Chinese AS voiceFileNum0Chinese',
    'C.VoiceFileNum1Chinese AS voiceFileNum1Chinese',
    'C.VoiceFileNum2Chinese AS voiceFileNum2Chinese',
    'C.VoiceFileNum3Chinese AS voiceFileNum3Chinese',
    'C.VoiceFileNum4Chinese AS voiceFileNum4Chinese',
    'C.VoiceFileNum5Chinese AS voiceFileNum5Chinese',
    'C.VoiceFileNum6Chinese AS voiceFileNum6Chinese',
    'C.VoiceFileNum7Chinese AS voiceFileNum7Chinese',
    'C.VoiceFileNum8Chinese AS voiceFileNum8Chinese',
    'C.VoiceFileNum9Chinese AS voiceFileNum9Chinese',
    'C.VoiceFileNum10Chinese AS voiceFileNum10Chinese',
    'C.VoiceFileNum11Chinese AS voiceFileNum11Chinese',
    'C.VoiceFileNum12Chinese AS voiceFileNum12Chinese',
    'C.VoiceFileNum13Chinese AS voiceFileNum13Chinese',
    'C.VoiceFileNum14Chinese AS voiceFileNum14Chinese',
    'C.VoiceFileNum15Chinese AS voiceFileNum15Chinese',
    'C.VoiceFileNum16Chinese AS voiceFileNum16Chinese',
    'C.VoiceFileNum17Chinese AS voiceFileNum17Chinese',
    'C.VoiceFileNum18Chinese AS voiceFileNum18Chinese',
    'C.VoiceFileNum19Chinese AS voiceFileNum19Chinese',
    'C.VoiceFileNum20Chinese AS voiceFileNum20Chinese',
    'C.VoiceFileNum30Chinese AS voiceFileNum30Chinese',
    'C.VoiceFileNum40Chinese AS voiceFileNum40Chinese',
    'C.VoiceFileNum50Chinese AS voiceFileNum50Chinese',
    'C.VoiceFileNum60Chinese AS voiceFileNum60Chinese',
    'C.VoiceFileNum70Chinese AS voiceFileNum70Chinese',
    'C.VoiceFileNum80Chinese AS voiceFileNum80Chinese',
    'C.VoiceFileNum90Chinese AS voiceFileNum90Chinese',
    'C.VoiceFileNum0English AS voiceFileNum0English',
    'C.VoiceFileNum1English AS voiceFileNum1English',
    'C.VoiceFileNum2English AS voiceFileNum2English',
    'C.VoiceFileNum3English AS voiceFileNum3English',
    'C.VoiceFileNum4English AS voiceFileNum4English',
    'C.VoiceFileNum5English AS voiceFileNum5English',
    'C.VoiceFileNum6English AS voiceFileNum6English',
    'C.VoiceFileNum7English AS voiceFileNum7English',
    'C.VoiceFileNum8English AS voiceFileNum8English',
    'C.VoiceFileNum9English AS voiceFileNum9English',
    'C.VoiceFileNum10English AS voiceFileNum10English',
    'C.VoiceFileNum11English AS voiceFileNum11English',
    'C.VoiceFileNum12English AS voiceFileNum12English',
    'C.VoiceFileNum13English AS voiceFileNum13English',
    'C.VoiceFileNum14English AS voiceFileNum14English',
    'C.VoiceFileNum15English AS voiceFileNum15English',
    'C.VoiceFileNum16English AS voiceFileNum16English',
    'C.VoiceFileNum17English AS voiceFileNum17English',
    'C.VoiceFileNum18English AS voiceFileNum18English',
    'C.VoiceFileNum19English AS voiceFileNum19English',
    'C.VoiceFileNum20English AS voiceFileNum20English',
    'C.VoiceFileNum30English AS voiceFileNum30English',
    'C.VoiceFileNum40English AS voiceFileNum40English',
    'C.VoiceFileNum50English AS voiceFileNum50English',
    'C.VoiceFileNum60English AS voiceFileNum60English',
    'C.VoiceFileNum70English AS voiceFileNum70English',
    'C.VoiceFileNum80English AS voiceFileNum80English',
    'C.VoiceFileNum90English AS voiceFileNum90English',
    'C.Relogin AS relogin',
    'C.CallIn AS callIn',
    'C.CallOut AS callOut',
    'C.TTSmyId AS ttsMyId',
    'C.LogStyle AS logStyle',
    'C.ChannelStatusFlag AS channelStatusFlag',
    'C.AgentStatusFlag AS agentStatusFlag',
    'C.AgentRecordFilePath AS agentRecordFilePath',
    'C.AgentRecordFileName AS agentRecordFileName',
    'C.LastDeployDate AS lastDeployDate',
    'deployUser.ID AS deployUserId',
    'deployUser.Name AS deployUserName',
].join(', ');

Dao.loadRunModeList = async () => {
    return sequelize().query(
        `SELECT PID AS pid, RunMode AS runMode, myId AS myId
           FROM t_icc_cfg_ccs
          ORDER BY PID, RunMode`,
        { type: QueryTypes.SELECT }
    );
};

Dao.loadSysVoiceList = async () => {
    return sequelize().query(
        `SELECT ID AS id, Description AS text
           FROM t_icc_cfg_tas4sysvoice`,
        { type: QueryTypes.SELECT }
    );
};

Dao.loadFocuCommList = async () => {
    return sequelize().query(
        `SELECT PID AS pid, IPAddress AS ipAddress, Port AS port, RunMode AS runMode, Note AS note
           FROM t_icc_cfg_focucomm`,
        { type: QueryTypes.SELECT }
    );
};

/** 全量 CCS 列表（与 Java CcsMapper.selectAll 用途一致，如 AGP 下拉） */
Dao.listAllCcs = async () => sequelize().query(
    `SELECT ${CCS_SELECT_LIST}
       FROM t_icc_cfg_ccs C
  LEFT JOIN t_user_users deployUser ON C.LastDeplayUserID = deployUser.ID
      ORDER BY C.PID`,
    { type: QueryTypes.SELECT }
);

Dao.selectByPrimaryKey = async (pid) => {
    const rows = await sequelize().query(
        `SELECT ${CCS_SELECT_LIST}
           FROM t_icc_cfg_ccs C
      LEFT JOIN t_user_users deployUser ON C.LastDeplayUserID = deployUser.ID
          WHERE C.PID = :pid`,
        { replacements: { pid }, type: QueryTypes.SELECT }
    );
    return rows[0] || null;
};

Dao.selectByMyId = async ({ pid, myId }) => {
    return sequelize().query(
        `SELECT PID AS pid
           FROM t_icc_cfg_ccs
          WHERE myId = :myId
            AND (:pid IS NULL OR PID != :pid)`,
        {
            replacements: { myId, pid: pid == null ? null : pid },
            type: QueryTypes.SELECT,
        }
    );
};

Dao.insertCcs = async (row, transaction) => {
    await sequelize().query(
        `INSERT INTO t_icc_cfg_ccs (
            CfgFocuCommPID, myName, myId, RunMode, Note, SupportReport, Sync, DebugInfo,
            t_icc_ag_state_trk_record, t_icc_ag_skill_sign_record, t_icc_ag_group_sign_record,
            t_icc_ag_call_record, t_icc_base_cdr, CallIn, CallOut, ChannelStatusFlag, AgentStatusFlag
        ) VALUES (
            :cfgFocuCommPid, :myName, :myId, :runMode, :note, :supportReport, :sync, :debugInfo,
            :tIcipAgStateTrkRecord, :tIcipAgSkillSignRecord, :tIcipAgGroupSignRecord,
            :tIcipAgCallRecord, :tIcipBaseCdr, :callIn, :callOut, :channelStatusFlag, :agentStatusFlag
        )`,
        { replacements: row, type: QueryTypes.INSERT, transaction }
    );
    const idRows = await sequelize().query('SELECT LAST_INSERT_ID() AS id', {
        type: QueryTypes.SELECT,
        transaction,
    });
    return Number(idRows?.[0]?.id || 0);
};

Dao.updateCcs = async (row, transaction) => {
    const [ret] = await sequelize().query(
        `UPDATE t_icc_cfg_ccs
            SET CfgFocuCommPID = :cfgFocuCommPid,
                CfgOdbcPID = :cfgOdbcPid,
                myName = :myName,
                myId = :myId,
                RunMode = :runMode,
                Note = :note,
                ConnectKeepAlive = :connectKeepAlive,
                poolSize = :poolSize,
                SupportReport = :supportReport,
                Sync = :sync,
                PoolLength = :poolLength,
                DebugInfo = :debugInfo,
                Elapsed = :elapsed,
                t_icc_ag_state_trk_record = :tIcipAgStateTrkRecord,
                t_icc_ag_skill_sign_record = :tIcipAgSkillSignRecord,
                t_icc_ag_group_sign_record = :tIcipAgGroupSignRecord,
                t_icc_ag_call_record = :tIcipAgCallRecord,
                t_icc_base_cdr = :tIcipBaseCdr,
                DefaultWaitingMusic = :defaultWaitingMusic,
                DefaultWaitingAgentMusic = :defaultWaitingAgentMusic,
                VoiceFileWorkerNumChinese = :voiceFileWorkerNumChinese,
                VoiceFileWorkerNumEnglish = :voiceFileWorkerNumEnglish,
                VoiceFileServiceForYouChinese = :voiceFileServiceForYouChinese,
                VoiceFileServiceForYouEnglish = :voiceFileServiceForYouEnglish,
                VoiceFileNum0Chinese = :voiceFileNum0Chinese,
                VoiceFileNum1Chinese = :voiceFileNum1Chinese,
                VoiceFileNum2Chinese = :voiceFileNum2Chinese,
                VoiceFileNum3Chinese = :voiceFileNum3Chinese,
                VoiceFileNum4Chinese = :voiceFileNum4Chinese,
                VoiceFileNum5Chinese = :voiceFileNum5Chinese,
                VoiceFileNum6Chinese = :voiceFileNum6Chinese,
                VoiceFileNum7Chinese = :voiceFileNum7Chinese,
                VoiceFileNum8Chinese = :voiceFileNum8Chinese,
                VoiceFileNum9Chinese = :voiceFileNum9Chinese,
                VoiceFileNum10Chinese = :voiceFileNum10Chinese,
                VoiceFileNum11Chinese = :voiceFileNum11Chinese,
                VoiceFileNum12Chinese = :voiceFileNum12Chinese,
                VoiceFileNum13Chinese = :voiceFileNum13Chinese,
                VoiceFileNum14Chinese = :voiceFileNum14Chinese,
                VoiceFileNum15Chinese = :voiceFileNum15Chinese,
                VoiceFileNum16Chinese = :voiceFileNum16Chinese,
                VoiceFileNum17Chinese = :voiceFileNum17Chinese,
                VoiceFileNum18Chinese = :voiceFileNum18Chinese,
                VoiceFileNum19Chinese = :voiceFileNum19Chinese,
                VoiceFileNum20Chinese = :voiceFileNum20Chinese,
                VoiceFileNum30Chinese = :voiceFileNum30Chinese,
                VoiceFileNum40Chinese = :voiceFileNum40Chinese,
                VoiceFileNum50Chinese = :voiceFileNum50Chinese,
                VoiceFileNum60Chinese = :voiceFileNum60Chinese,
                VoiceFileNum70Chinese = :voiceFileNum70Chinese,
                VoiceFileNum80Chinese = :voiceFileNum80Chinese,
                VoiceFileNum90Chinese = :voiceFileNum90Chinese,
                VoiceFileNum0English = :voiceFileNum0English,
                VoiceFileNum1English = :voiceFileNum1English,
                VoiceFileNum2English = :voiceFileNum2English,
                VoiceFileNum3English = :voiceFileNum3English,
                VoiceFileNum4English = :voiceFileNum4English,
                VoiceFileNum5English = :voiceFileNum5English,
                VoiceFileNum6English = :voiceFileNum6English,
                VoiceFileNum7English = :voiceFileNum7English,
                VoiceFileNum8English = :voiceFileNum8English,
                VoiceFileNum9English = :voiceFileNum9English,
                VoiceFileNum10English = :voiceFileNum10English,
                VoiceFileNum11English = :voiceFileNum11English,
                VoiceFileNum12English = :voiceFileNum12English,
                VoiceFileNum13English = :voiceFileNum13English,
                VoiceFileNum14English = :voiceFileNum14English,
                VoiceFileNum15English = :voiceFileNum15English,
                VoiceFileNum16English = :voiceFileNum16English,
                VoiceFileNum17English = :voiceFileNum17English,
                VoiceFileNum18English = :voiceFileNum18English,
                VoiceFileNum19English = :voiceFileNum19English,
                VoiceFileNum20English = :voiceFileNum20English,
                VoiceFileNum30English = :voiceFileNum30English,
                VoiceFileNum40English = :voiceFileNum40English,
                VoiceFileNum50English = :voiceFileNum50English,
                VoiceFileNum60English = :voiceFileNum60English,
                VoiceFileNum70English = :voiceFileNum70English,
                VoiceFileNum80English = :voiceFileNum80English,
                VoiceFileNum90English = :voiceFileNum90English,
                Relogin = :relogin,
                CallIn = :callIn,
                CallOut = :callOut,
                TTSmyId = :ttsMyId,
                LogStyle = :logStyle,
                ChannelStatusFlag = :channelStatusFlag,
                AgentStatusFlag = :agentStatusFlag,
                AgentRecordFilePath = :agentRecordFilePath,
                AgentRecordFileName = :agentRecordFileName
          WHERE PID = :pid`,
        { replacements: row, type: QueryTypes.UPDATE, transaction }
    );
    return ret;
};

Dao.callCheckCcsReferenced = async (pid) => {
    const raw = await sequelize().query('CALL S_CFG_CheckCcsReferenced(:pid)', {
        replacements: { pid },
        type: QueryTypes.SELECT,
    });
    let row = null;
    if (Array.isArray(raw) && raw.length) {
        row = raw[0];
        if (Array.isArray(row) && row.length) {
            row = row[0];
        }
    }
    if (!row || typeof row !== 'object') return '';
    const v = row.v_references ?? row.V_REFERENCES ?? row.v_References;
    return v != null && v !== undefined ? String(v) : '';
};

Dao.deleteCcs4ChByCcsPid = async (pid, transaction) => {
    const [ret] = await sequelize().query(
        `DELETE FROM t_icc_cfg_ccs4ch WHERE CfgCCSPID = :pid`,
        { replacements: { pid }, type: QueryTypes.DELETE, transaction }
    );
    return ret;
};

Dao.deleteCcs4AgByCcsPid = async (pid, transaction) => {
    const [ret] = await sequelize().query(
        `DELETE FROM t_icc_cfg_ccs4ag WHERE CfgCCSPID = :pid`,
        { replacements: { pid }, type: QueryTypes.DELETE, transaction }
    );
    return ret;
};

Dao.deleteCcsByPid = async (pid, transaction) => {
    const [ret] = await sequelize().query(
        `DELETE FROM t_icc_cfg_ccs WHERE PID = :pid`,
        { replacements: { pid }, type: QueryTypes.DELETE, transaction }
    );
    return ret;
};

Dao.callCopyCcs = async (pid) => {
    await sequelize().query('CALL S_CFG_CopyCcs(:pid)', {
        replacements: { pid },
        type: QueryTypes.RAW,
    });
};

Dao.lastInsertId = async () => {
    const rows = await sequelize().query('SELECT LAST_INSERT_ID() AS id', { type: QueryTypes.SELECT });
    return Number(rows?.[0]?.id || 0);
};

Dao.getCcsXmlRow = async (pid) => {
    const rows = await sequelize().query(
        `SELECT C.*,
                F.IPAddress AS focuIpAddress,
                F.Port AS focuPort,
                O.ODBCName AS odbcName,
                O.DBType AS dbType,
                O.LoginID AS loginId,
                O.LoginPWD AS loginPwd,
                V1.FileName AS defaultWaitingMusicFileName,
                V2.FileName AS defaultWaitingAgentMusicFileName,
                V3.FileName AS voiceFileWorkerNumChineseFileName,
                V4.FileName AS voiceFileWorkerNumEnglishFileName,
                V5.FileName AS voiceFileServiceForYouChineseFileName,
                V6.FileName AS voiceFileServiceForYouEnglishFileName
           FROM t_icc_cfg_ccs C
      LEFT JOIN t_icc_cfg_focucomm F ON C.CfgFocuCommPID = F.PID
      LEFT JOIN t_icc_cfg_odbc O ON C.CfgOdbcPID = O.PID
      LEFT JOIN t_icc_cfg_tas4sysvoice V1 ON V1.ID = C.DefaultWaitingMusic
      LEFT JOIN t_icc_cfg_tas4sysvoice V2 ON V2.ID = C.DefaultWaitingAgentMusic
      LEFT JOIN t_icc_cfg_tas4sysvoice V3 ON V3.ID = C.VoiceFileWorkerNumChinese
      LEFT JOIN t_icc_cfg_tas4sysvoice V4 ON V4.ID = C.VoiceFileWorkerNumEnglish
      LEFT JOIN t_icc_cfg_tas4sysvoice V5 ON V5.ID = C.VoiceFileServiceForYouChinese
      LEFT JOIN t_icc_cfg_tas4sysvoice V6 ON V6.ID = C.VoiceFileServiceForYouEnglish
          WHERE C.PID = :pid`,
        { replacements: { pid }, type: QueryTypes.SELECT }
    );
    return rows[0] || null;
};

Dao.listCcs4ChByCcsPid = async (ccsPid) => {
    return sequelize().query(
        `SELECT PID AS pid, CfgCCSPID AS cfgCcsPid, \`Value\` AS \`value\`, myId AS myId
           FROM t_icc_cfg_ccs4ch
          WHERE CfgCCSPID = :ccsPid`,
        { replacements: { ccsPid }, type: QueryTypes.SELECT }
    );
};

Dao.listCcs4AgByCcsPid = async (ccsPid) => {
    return sequelize().query(
        `SELECT PID AS pid, CfgCCSPID AS cfgCcsPid, \`Value\` AS \`value\`, myId AS myId
           FROM t_icc_cfg_ccs4ag
          WHERE CfgCCSPID = :ccsPid`,
        { replacements: { ccsPid }, type: QueryTypes.SELECT }
    );
};

Dao.updateXMLDeployer = async ({ pid, userId, workName }) => {
    const [ret] = await sequelize().query(
        `UPDATE t_icc_cfg_ccs
            SET LastDeployDate = NOW(),
                LastDeplayUserID = :userId,
                LastDeplayUserName = :workName
          WHERE PID = :pid`,
        { replacements: { pid, userId, workName }, type: QueryTypes.UPDATE }
    );
    return ret;
};

Dao.findSysUserByWorkNo = async (workNo) => {
    const rows = await sequelize().query(
        `SELECT ID AS id, Name AS name
           FROM t_user_users
          WHERE WorkNO = :workNo
          ORDER BY ID ASC
          LIMIT 1`,
        { replacements: { workNo }, type: QueryTypes.SELECT }
    );
    return rows[0] || null;
};

Dao.countCcs4ChDup = async ({ cfgCcsPid, value, myId, excludePid }) => {
    const rows = await sequelize().query(
        `SELECT COUNT(1) AS c
           FROM t_icc_cfg_ccs4ch
          WHERE CfgCCSPID = :cfgCcsPid
            AND \`Value\` = :value
            AND myId = :myId
            AND (:excludePid IS NULL OR PID != :excludePid)`,
        {
            replacements: {
                cfgCcsPid, value, myId,
                excludePid: excludePid == null ? null : excludePid,
            },
            type: QueryTypes.SELECT,
        }
    );
    return Number(rows?.[0]?.c || 0);
};

Dao.insertCcs4Ch = async (row, transaction) => {
    const [ret] = await sequelize().query(
        `INSERT INTO t_icc_cfg_ccs4ch (CfgCCSPID, \`Value\`, myId)
         VALUES (:cfgCcsPid, :value, :myId)`,
        { replacements: row, type: QueryTypes.INSERT, transaction }
    );
    return ret;
};

Dao.updateCcs4Ch = async (row, transaction) => {
    const [ret] = await sequelize().query(
        `UPDATE t_icc_cfg_ccs4ch
            SET CfgCCSPID = :cfgCcsPid,
                \`Value\` = :value,
                myId = :myId
          WHERE PID = :pid`,
        { replacements: row, type: QueryTypes.UPDATE, transaction }
    );
    return ret;
};

Dao.deleteCcs4ChByPids = async (pids, transaction) => {
    if (!pids.length) return 0;
    const marks = pids.map((_, i) => `:p${i}`).join(',');
    const replacements = {};
    pids.forEach((id, i) => { replacements[`p${i}`] = id; });
    const [ret] = await sequelize().query(
        `DELETE FROM t_icc_cfg_ccs4ch WHERE PID IN (${marks})`,
        { replacements, type: QueryTypes.DELETE, transaction }
    );
    return ret;
};

Dao.countCcs4AgDup = async ({ cfgCcsPid, value, myId, excludePid }) => {
    const rows = await sequelize().query(
        `SELECT COUNT(1) AS c
           FROM t_icc_cfg_ccs4ag
          WHERE CfgCCSPID = :cfgCcsPid
            AND \`Value\` = :value
            AND myId = :myId
            AND (:excludePid IS NULL OR PID != :excludePid)`,
        {
            replacements: {
                cfgCcsPid, value, myId,
                excludePid: excludePid == null ? null : excludePid,
            },
            type: QueryTypes.SELECT,
        }
    );
    return Number(rows?.[0]?.c || 0);
};

Dao.insertCcs4Ag = async (row, transaction) => {
    const [ret] = await sequelize().query(
        `INSERT INTO t_icc_cfg_ccs4ag (CfgCCSPID, \`Value\`, myId)
         VALUES (:cfgCcsPid, :value, :myId)`,
        { replacements: row, type: QueryTypes.INSERT, transaction }
    );
    return ret;
};

Dao.updateCcs4Ag = async (row, transaction) => {
    const [ret] = await sequelize().query(
        `UPDATE t_icc_cfg_ccs4ag
            SET CfgCCSPID = :cfgCcsPid,
                \`Value\` = :value,
                myId = :myId
          WHERE PID = :pid`,
        { replacements: row, type: QueryTypes.UPDATE, transaction }
    );
    return ret;
};

Dao.deleteCcs4AgByPids = async (pids, transaction) => {
    if (!pids.length) return 0;
    const marks = pids.map((_, i) => `:p${i}`).join(',');
    const replacements = {};
    pids.forEach((id, i) => { replacements[`p${i}`] = id; });
    const [ret] = await sequelize().query(
        `DELETE FROM t_icc_cfg_ccs4ag WHERE PID IN (${marks})`,
        { replacements, type: QueryTypes.DELETE, transaction }
    );
    return ret;
};

module.exports = Dao;
