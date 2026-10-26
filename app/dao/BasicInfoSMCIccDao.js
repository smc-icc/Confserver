const Db = require('./db');
const { QueryTypes } = require('sequelize');

function sequelize() {
    return Db.db_smcicc.sequelize;
}

function mapVdnRow(r) {
    if (!r) return null;
    return {
        id: r.ID,
        name: r.Name,
        parentId: r.ParentId != null ? r.ParentId : -1,
        maxAgentSignIn: r.MaxAgentSignIn,
        maxWebCall: r.MaxWebCall,
        maxObsCall: r.MaxOBSCall,
        maxPstnCall: r.MaxPSTNCall,
        cancelQueueDtmf: r.CancelQueueDTMF,
        maxTalkingTime: r.MaxTalkingTime,
        answerStyle: r.AnswerStyle,
        systemVoiceId: r.SystemVoiceID,
        maxWaitAnswerTime: r.MaxWaitAnswerTime,
        agentGroupAllocPolicy: r.AgentGroupAllocPolicy,
        waitingMusic: r.WaitingMusic,
        maxAcwTime: r.MaxACWTime,
        startRecord: r.StartRecord,
        recordWorkNo: r.RecordWorkNo != null ? r.RecordWorkNo : 0,
        sipExtStatusSupport: r.SipExtStatusSupport != null ? r.SipExtStatusSupport : 0,
        realTimeSpeechRecog: r.RealTimeSpeechRecog != null ? r.RealTimeSpeechRecog : 0,
        asrEngine: r.AsrEngine != null && String(r.AsrEngine) ? String(r.AsrEngine) : 'ali',
        callOutCallingNum: r.CallOutCallingNum,
        onceSolveRefDays: r.OnceSolveRefDays,
        obsFlowFileName: r.OBSFlowFileName,
        voiceName: r.voiceName,
        callOutCalledNumType: r.CallOutCalledNumType,
        callOutCallingNumType: r.CallOutCallingNumType,
    };
}

const Dao = {};
const VALID_ASR_ENGINES = ['ali', 'funasr', 'whisper'];
let realTimeSpeechRecogColumnExists = null;
let asrEngineColumnExists = null;

function normalizeAsrEngine(v) {
    const s = v != null ? String(v).trim() : '';
    return VALID_ASR_ENGINES.includes(s) ? s : 'ali';
}

async function ensureRealTimeSpeechRecogColumn() {
    if (realTimeSpeechRecogColumnExists === true) return true;
    if (realTimeSpeechRecogColumnExists === false) return false;
    try {
        const rows = await sequelize().query(
            `SHOW COLUMNS FROM t_icc_vdn LIKE 'RealTimeSpeechRecog'`,
            { type: QueryTypes.SELECT }
        );
        if (Array.isArray(rows) && rows.length > 0) {
            realTimeSpeechRecogColumnExists = true;
            return true;
        }
        await sequelize().query(
            `ALTER TABLE t_icc_vdn ADD COLUMN RealTimeSpeechRecog int(11) NOT NULL DEFAULT 0 COMMENT '坐席接通后实时转写：0关，1开'`
        );
        realTimeSpeechRecogColumnExists = true;
        return true;
    } catch (e) {
        realTimeSpeechRecogColumnExists = false;
        return false;
    }
}

async function ensureAsrEngineColumn() {
    if (asrEngineColumnExists === true) return true;
    if (asrEngineColumnExists === false) return false;
    try {
        const rows = await sequelize().query(
            `SHOW COLUMNS FROM t_icc_vdn LIKE 'AsrEngine'`,
            { type: QueryTypes.SELECT }
        );
        if (Array.isArray(rows) && rows.length > 0) {
            asrEngineColumnExists = true;
            return true;
        }
        await sequelize().query(
            `ALTER TABLE t_icc_vdn ADD COLUMN AsrEngine varchar(32) NOT NULL DEFAULT 'ali' COMMENT 'ASR引擎：ali（默认）/funasr/whisper'`
        );
        asrEngineColumnExists = true;
        return true;
    } catch (e) {
        asrEngineColumnExists = false;
        return false;
    }
}

Dao.selectByPrimaryKey = async (id) => {
    await ensureRealTimeSpeechRecogColumn();
    const hasAsr = await ensureAsrEngineColumn();
    const asrSelect = hasAsr
        ? `IFNULL(a.AsrEngine, 'ali') AS AsrEngine`
        : `'ali' AS AsrEngine`;
    const rows = await sequelize().query(
        `SELECT a.ID, a.Name, IFNULL(a.ParentId, -1) AS ParentId, a.MaxAgentSignIn, a.MaxWebCall, a.MaxOBSCall, a.MaxPSTNCall,
                a.CancelQueueDTMF, a.MaxTalkingTime, a.AnswerStyle, a.SystemVoiceID, a.MaxWaitAnswerTime,
                a.AgentGroupAllocPolicy, a.WaitingMusic, a.MaxACWTime, a.StartRecord, a.RecordWorkNo,
                IFNULL(a.SipExtStatusSupport, 0) AS SipExtStatusSupport,
                IFNULL(a.RealTimeSpeechRecog, 0) AS RealTimeSpeechRecog, ${asrSelect}, a.CallOutCallingNum,
                a.OnceSolveRefDays, a.OBSFlowFileName, a.CallOutCallingNumType, a.CallOutCalledNumType,
                b.Description AS voiceName
           FROM t_icc_vdn a
      LEFT JOIN t_icc_cfg_tas4sysvoice b ON b.ID = a.SystemVoiceID
          WHERE a.ID = :id`,
        { replacements: { id }, type: QueryTypes.SELECT }
    );
    return mapVdnRow(rows[0]);
};

Dao.selectByName = async (name) => {
    const hasAsr = await ensureAsrEngineColumn();
    const asrSelect = hasAsr
        ? `IFNULL(AsrEngine, 'ali') AS AsrEngine`
        : `'ali' AS AsrEngine`;
    const rows = await sequelize().query(
        `SELECT ID, Name, IFNULL(ParentId, -1) AS ParentId, MaxAgentSignIn, MaxWebCall, MaxOBSCall, MaxPSTNCall, CancelQueueDTMF,
                MaxTalkingTime, AnswerStyle, SystemVoiceID, MaxWaitAnswerTime, AgentGroupAllocPolicy,
                WaitingMusic, MaxACWTime, StartRecord, RecordWorkNo, IFNULL(SipExtStatusSupport, 0) AS SipExtStatusSupport,
                IFNULL(RealTimeSpeechRecog, 0) AS RealTimeSpeechRecog, ${asrSelect},
                CallOutCallingNum, OnceSolveRefDays,
                OBSFlowFileName, CallOutCallingNumType, CallOutCalledNumType
           FROM t_icc_vdn WHERE Name = :name`,
        { replacements: { name }, type: QueryTypes.SELECT }
    );
    return mapVdnRow(rows[0]);
};

Dao.updateBasicInfoByPrimaryKey = async (vdn) => {
    const hasAsr = await ensureAsrEngineColumn();
    const asrSql = hasAsr ? ',\n            AsrEngine = :asrEngine' : '';
    const [ret] = await sequelize().query(
        `UPDATE t_icc_vdn SET
            Name = :name,
            CancelQueueDTMF = :cancelQueueDtmf,
            AnswerStyle = :answerStyle,
            SystemVoiceID = :systemVoiceId,
            MaxWaitAnswerTime = :maxWaitAnswerTime,
            MaxACWTime = :maxAcwTime,
            StartRecord = :startRecord,
            RecordWorkNo = :recordWorkNo,
            SipExtStatusSupport = :sipExtStatusSupport,
            RealTimeSpeechRecog = :realTimeSpeechRecog${asrSql},
            CallOutCallingNum = :callOutCallingNum,
            CallOutCalledNumType = :callOutCalledNumType,
            CallOutCallingNumType = :callOutCallingNumType
         WHERE ID = :id`,
        {
            replacements: {
                id: vdn.id,
                name: vdn.name,
                cancelQueueDtmf: vdn.cancelQueueDtmf,
                answerStyle: vdn.answerStyle,
                systemVoiceId: vdn.systemVoiceId,
                maxWaitAnswerTime: vdn.maxWaitAnswerTime,
                maxAcwTime: vdn.maxAcwTime,
                startRecord: vdn.startRecord,
                recordWorkNo: vdn.recordWorkNo != null ? Number(vdn.recordWorkNo) : 0,
                sipExtStatusSupport: vdn.sipExtStatusSupport != null ? Number(vdn.sipExtStatusSupport) ? 1 : 0 : 0,
                realTimeSpeechRecog: vdn.realTimeSpeechRecog != null ? Number(vdn.realTimeSpeechRecog) ? 1 : 0 : 0,
                ...(hasAsr ? { asrEngine: normalizeAsrEngine(vdn.asrEngine) } : {}),
                callOutCallingNum: vdn.callOutCallingNum,
                callOutCalledNumType: vdn.callOutCalledNumType,
                callOutCallingNumType: vdn.callOutCallingNumType,
            },
            type: QueryTypes.UPDATE,
        }
    );
    if (typeof ret === 'number') return ret;
    if (ret && typeof ret.affectedRows === 'number') return ret.affectedRows;
    return 0;
};

module.exports = Dao;
