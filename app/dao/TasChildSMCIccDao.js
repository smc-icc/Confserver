const Db = require('./db');
const { QueryTypes } = require('sequelize');

const Dao = {};

function sequelize() {
    return Db.db_smcicc.sequelize;
}

Dao.selChannelGroup = async () => sequelize().query(
    `SELECT t2.ID AS id, t2.Name AS name, t2.BeginSpanID AS beginSpanId, t2.BeginChannelID AS beginChannelId,
            t2.EndSpanID AS endSpanId, t2.EndChannelID AS endChannelId, t2.SeekType AS seekType,
            t2.VDNID AS vdnId, t2.CallerCapacity AS callerCapacity
       FROM t_icc_base_calloutrouter t1
 INNER JOIN t_icc_base_channelgroup t2 ON t1.chGroup = t2.Name`,
    { type: QueryTypes.SELECT }
);

Dao.tas4SysVoiceList = async (cfgTasPid, offset, limit) => sequelize().query(
    `SELECT ID AS id, CfgTASPID AS cfgTasPid, Description AS description, FileName AS fileName
       FROM t_icc_cfg_tas4sysvoice WHERE CfgTASPID = :cfgTasPid ORDER BY ID ASC LIMIT :offset, :limit`,
    { replacements: { cfgTasPid, offset, limit }, type: QueryTypes.SELECT }
);

Dao.tas4SysVoiceCount = async (cfgTasPid) => {
    const rows = await sequelize().query(
        `SELECT COUNT(1) AS c FROM t_icc_cfg_tas4sysvoice WHERE CfgTASPID = :cfgTasPid`,
        { replacements: { cfgTasPid }, type: QueryTypes.SELECT }
    );
    return Number(rows?.[0]?.c || 0);
};

Dao.tas4SysVoiceSelectById = async (id) => {
    const rows = await sequelize().query(
        `SELECT ID AS id, CfgTASPID AS cfgTasPid, Description AS description, FileName AS fileName
           FROM t_icc_cfg_tas4sysvoice WHERE ID = :id`,
        { replacements: { id }, type: QueryTypes.SELECT }
    );
    return rows[0] || null;
};

Dao.tas4SysVoiceInsert = async (row) => {
    await sequelize().query(
        `INSERT INTO t_icc_cfg_tas4sysvoice (id, CfgTASPID, Description, FileName)
         VALUES (:id, :cfgTasPid, :description, :fileName)`,
        { replacements: row, type: QueryTypes.INSERT }
    );
};

Dao.tas4SysVoiceUpdate = async (row) => {
    const [ret] = await sequelize().query(
        `UPDATE t_icc_cfg_tas4sysvoice SET CfgTASPID = :cfgTasPid, Description = :description, FileName = :fileName WHERE ID = :id`,
        { replacements: row, type: QueryTypes.UPDATE }
    );
    return ret;
};

Dao.tas4SysVoiceDelete = async (ids) => {
    if (!ids.length) return 0;
    const marks = ids.map((_, i) => `:d${i}`).join(',');
    const repl = {};
    ids.forEach((id, i) => { repl[`d${i}`] = id; });
    const [ret] = await sequelize().query(
        `DELETE FROM t_icc_cfg_tas4sysvoice WHERE ID IN (${marks})`,
        { replacements: repl, type: QueryTypes.DELETE }
    );
    return ret;
};

const fxoList = (cfgTasPid, offset, limit) => sequelize().query(
    `SELECT AGCh AS agCh, CfgTASPID AS cfgTasPid, No AS no, Flag AS flag
       FROM t_icc_cfg_tas4fxo WHERE CfgTASPID = :cfgTasPid ORDER BY AGCh ASC LIMIT :offset, :limit`,
    { replacements: { cfgTasPid, offset, limit }, type: QueryTypes.SELECT }
);
Dao.tas4FxoList = fxoList;
Dao.tas4FxoCount = async (cfgTasPid) => {
    const rows = await sequelize().query(
        `SELECT COUNT(1) AS c FROM t_icc_cfg_tas4fxo WHERE CfgTASPID = :cfgTasPid`,
        { replacements: { cfgTasPid }, type: QueryTypes.SELECT }
    );
    return Number(rows?.[0]?.c || 0);
};
Dao.tas4FxoSelectByAgCh = async (agCh) => {
    const rows = await sequelize().query(
        `SELECT AGCh AS agCh, CfgTASPID AS cfgTasPid, No AS no, Flag AS flag FROM t_icc_cfg_tas4fxo WHERE AGCh = :agCh`,
        { replacements: { agCh }, type: QueryTypes.SELECT }
    );
    return rows[0] || null;
};
Dao.tas4FxoCountDup = async ({ cfgTasPid, agCh, oldAgCh }) => {
    let sql = `SELECT COUNT(1) AS c FROM t_icc_cfg_tas4fxo WHERE CfgTASPID = :cfgTasPid AND AGCh = :agCh`;
    const repl = { cfgTasPid, agCh };
    if (oldAgCh != null && oldAgCh !== '' && !Number.isNaN(Number(oldAgCh))) {
        sql += ' AND AGCh != :oldAgCh';
        repl.oldAgCh = Number(oldAgCh);
    }
    const rows = await sequelize().query(sql, { replacements: repl, type: QueryTypes.SELECT });
    return Number(rows?.[0]?.c || 0);
};
Dao.tas4FxoInsert = async (row) => {
    await sequelize().query(
        `INSERT INTO t_icc_cfg_tas4fxo (AGCh, CfgTASPID, No, Flag) VALUES (:agCh, :cfgTasPid, :no, :flag)`,
        { replacements: row, type: QueryTypes.INSERT }
    );
};
Dao.tas4FxoUpdate = async ({ agCh, no, flag, oldAgCh, cfgTasPid }) => {
    const [ret] = await sequelize().query(
        `UPDATE t_icc_cfg_tas4fxo SET AGCh = :agCh, No = :no, Flag = :flag
         WHERE AGCh = :oldAgCh AND CfgTASPID = :cfgTasPid`,
        { replacements: { agCh, no, flag, oldAgCh, cfgTasPid }, type: QueryTypes.UPDATE }
    );
    return ret;
};
Dao.tas4FxoDelete = async (agChs, cfgTasPid) => {
    if (!agChs.length) return 0;
    const marks = agChs.map((_, i) => `:a${i}`).join(',');
    const repl = { cfgTasPid };
    agChs.forEach((v, i) => { repl[`a${i}`] = v; });
    const [ret] = await sequelize().query(
        `DELETE FROM t_icc_cfg_tas4fxo WHERE AGCh IN (${marks}) AND CfgTASPID = :cfgTasPid`,
        { replacements: repl, type: QueryTypes.DELETE }
    );
    return ret;
};

Dao.tas4DtiList = async (cfgTasPid, offset, limit) => sequelize().query(
    `SELECT Span AS span, CfgTASPID AS cfgTasPid, No AS no, Flag AS flag
       FROM t_icc_cfg_tas4dti WHERE CfgTASPID = :cfgTasPid ORDER BY Span ASC LIMIT :offset, :limit`,
    { replacements: { cfgTasPid, offset, limit }, type: QueryTypes.SELECT }
);
Dao.tas4DtiCount = async (cfgTasPid) => {
    const rows = await sequelize().query(
        `SELECT COUNT(1) AS c FROM t_icc_cfg_tas4dti WHERE CfgTASPID = :cfgTasPid`,
        { replacements: { cfgTasPid }, type: QueryTypes.SELECT }
    );
    return Number(rows?.[0]?.c || 0);
};
Dao.tas4DtiSelectBySpan = async (span) => {
    const rows = await sequelize().query(
        `SELECT Span AS span, CfgTASPID AS cfgTasPid, No AS no, Flag AS flag FROM t_icc_cfg_tas4dti WHERE Span = :span`,
        { replacements: { span }, type: QueryTypes.SELECT }
    );
    return rows[0] || null;
};
Dao.tas4DtiCountDup = async ({ cfgTasPid, span, oldSpan }) => {
    let sql = `SELECT COUNT(1) AS c FROM t_icc_cfg_tas4dti WHERE CfgTASPID = :cfgTasPid AND Span = :span`;
    const repl = { cfgTasPid, span };
    if (oldSpan != null && oldSpan !== '' && !Number.isNaN(Number(oldSpan))) {
        sql += ' AND Span != :oldSpan';
        repl.oldSpan = Number(oldSpan);
    }
    const rows = await sequelize().query(sql, { replacements: repl, type: QueryTypes.SELECT });
    return Number(rows?.[0]?.c || 0);
};
Dao.tas4DtiInsert = async (row) => {
    await sequelize().query(
        `INSERT INTO t_icc_cfg_tas4dti (Span, CfgTASPID, No, Flag) VALUES (:span, :cfgTasPid, :no, :flag)`,
        { replacements: row, type: QueryTypes.INSERT }
    );
};
Dao.tas4DtiUpdate = async ({ span, no, flag, oldSpan, cfgTasPid }) => {
    const [ret] = await sequelize().query(
        `UPDATE t_icc_cfg_tas4dti SET Span = :span, No = :no, Flag = :flag
         WHERE Span = :oldSpan AND CfgTASPID = :cfgTasPid`,
        { replacements: { span, no, flag, oldSpan, cfgTasPid }, type: QueryTypes.UPDATE }
    );
    return ret;
};
Dao.tas4DtiDelete = async (spans, cfgTasPid) => {
    if (!spans.length) return 0;
    const marks = spans.map((_, i) => `:s${i}`).join(',');
    const repl = { cfgTasPid };
    spans.forEach((v, i) => { repl[`s${i}`] = v; });
    const [ret] = await sequelize().query(
        `DELETE FROM t_icc_cfg_tas4dti WHERE Span IN (${marks}) AND CfgTASPID = :cfgTasPid`,
        { replacements: repl, type: QueryTypes.DELETE }
    );
    return ret;
};

Dao.tas4ChsList = async (cfgTasPid, offset, limit) => sequelize().query(
    `SELECT PID AS pid, CfgTASPID AS cfgTasPid, Type AS type, BeginSpan AS beginSpan, EndSpan AS endSpan,
            BeginChannel AS beginChannel, EndChannel AS endChannel, Flag AS flag
       FROM t_icc_cfg_tas4chs WHERE CfgTASPID = :cfgTasPid ORDER BY PID ASC LIMIT :offset, :limit`,
    { replacements: { cfgTasPid, offset, limit }, type: QueryTypes.SELECT }
);
Dao.tas4ChsCount = async (cfgTasPid) => {
    const rows = await sequelize().query(
        `SELECT COUNT(1) AS c FROM t_icc_cfg_tas4chs WHERE CfgTASPID = :cfgTasPid`,
        { replacements: { cfgTasPid }, type: QueryTypes.SELECT }
    );
    return Number(rows?.[0]?.c || 0);
};
Dao.tas4ChsInsert = async (row) => {
    await sequelize().query(
        `INSERT INTO t_icc_cfg_tas4chs (CfgTASPID, Type, BeginSpan, EndSpan, BeginChannel, EndChannel, Flag)
         VALUES (:cfgTasPid, :type, :beginSpan, :endSpan, :beginChannel, :endChannel, :flag)`,
        { replacements: row, type: QueryTypes.INSERT }
    );
    const idRows = await sequelize().query('SELECT LAST_INSERT_ID() AS id', { type: QueryTypes.SELECT });
    return Number(idRows?.[0]?.id || 0);
};
Dao.tas4ChsUpdate = async (row) => {
    const [ret] = await sequelize().query(
        `UPDATE t_icc_cfg_tas4chs SET CfgTASPID = :cfgTasPid, Type = :type, BeginSpan = :beginSpan, EndSpan = :endSpan,
         BeginChannel = :beginChannel, EndChannel = :endChannel, Flag = :flag WHERE PID = :pid`,
        { replacements: row, type: QueryTypes.UPDATE }
    );
    return ret;
};
Dao.tas4ChsDelete = async (pids, cfgTasPid) => {
    if (!pids.length) return 0;
    const marks = pids.map((_, i) => `:p${i}`).join(',');
    const repl = { cfgTasPid };
    pids.forEach((v, i) => { repl[`p${i}`] = v; });
    const [ret] = await sequelize().query(
        `DELETE FROM t_icc_cfg_tas4chs WHERE PID IN (${marks}) AND CfgTASPID = :cfgTasPid`,
        { replacements: repl, type: QueryTypes.DELETE }
    );
    return ret;
};

Dao.tas4CallOutListAll = async (cfgTasPid) => sequelize().query(
    `SELECT BeginSpan AS beginSpan, EndSpan AS endSpan, CfgTASPID AS cfgTasPid, VoiceCodes AS voiceCodes, Type AS type,
            IP AS ip, Port AS port, UserName AS userName, PassWord AS passWord, NodeID AS nodeId, Flag AS flag
       FROM t_icc_cfg_tas4callout WHERE CfgTASPID = :cfgTasPid`,
    { replacements: { cfgTasPid }, type: QueryTypes.SELECT }
);
Dao.tas4CallOutList = async (cfgTasPid, offset, limit) => sequelize().query(
    `SELECT BeginSpan AS beginSpan, EndSpan AS endSpan, CfgTASPID AS cfgTasPid, VoiceCodes AS voiceCodes, Type AS type,
            IP AS ip, Port AS port, UserName AS userName, PassWord AS passWord, NodeID AS nodeId, Flag AS flag
       FROM t_icc_cfg_tas4callout WHERE CfgTASPID = :cfgTasPid ORDER BY BeginSpan, EndSpan LIMIT :offset, :limit`,
    { replacements: { cfgTasPid, offset, limit }, type: QueryTypes.SELECT }
);
Dao.tas4CallOutCount = async (cfgTasPid) => {
    const rows = await sequelize().query(
        `SELECT COUNT(1) AS c FROM t_icc_cfg_tas4callout WHERE CfgTASPID = :cfgTasPid`,
        { replacements: { cfgTasPid }, type: QueryTypes.SELECT }
    );
    return Number(rows?.[0]?.c || 0);
};
Dao.tas4CallOutInsert = async (row) => {
    await sequelize().query(
        `INSERT INTO t_icc_cfg_tas4callout (BeginSpan, EndSpan, CfgTASPID, VoiceCodes, Type, IP, Port, UserName, PassWord, NodeID, Flag)
         VALUES (:beginSpan, :endSpan, :cfgTasPid, :voiceCodes, :type, :ip, :port, :userName, :passWord, :nodeId, :flag)`,
        { replacements: row, type: QueryTypes.INSERT }
    );
};
Dao.tas4CallOutUpdate = async (row, oldBeginSpan, oldEndSpan) => {
    const [ret] = await sequelize().query(
        `UPDATE t_icc_cfg_tas4callout SET BeginSpan = :beginSpan, EndSpan = :endSpan, VoiceCodes = :voiceCodes, Type = :type,
         IP = :ip, Port = :port, UserName = :userName, PassWord = :passWord, NodeID = :nodeId, Flag = :flag
         WHERE BeginSpan = :oldBeginSpan AND EndSpan = :oldEndSpan AND CfgTASPID = :cfgTasPid`,
        {
            replacements: {
                ...row,
                oldBeginSpan,
                oldEndSpan,
            },
            type: QueryTypes.UPDATE,
        }
    );
    return ret;
};
Dao.tas4CallOutDelete = async (pairs, cfgTasPid) => {
    if (!pairs.length) return 0;
    let n = 0;
    for (const [beginSpan, endSpan] of pairs) {
        const [ret] = await sequelize().query(
            `DELETE FROM t_icc_cfg_tas4callout WHERE BeginSpan = :beginSpan AND EndSpan = :endSpan AND CfgTASPID = :cfgTasPid`,
            { replacements: { beginSpan, endSpan, cfgTasPid }, type: QueryTypes.DELETE }
        );
        n += Number(ret || 0);
    }
    return n;
};

Dao.tas4CallInListAll = async (cfgTasPid) => sequelize().query(
    `SELECT BeginSpan AS beginSpan, EndSpan AS endSpan, CfgTASPID AS cfgTasPid, VoiceCodes AS voiceCodes, Flag AS flag
       FROM t_icc_cfg_tas4callin WHERE CfgTASPID = :cfgTasPid`,
    { replacements: { cfgTasPid }, type: QueryTypes.SELECT }
);
Dao.tas4CallInList = async (cfgTasPid, offset, limit) => sequelize().query(
    `SELECT BeginSpan AS beginSpan, EndSpan AS endSpan, CfgTASPID AS cfgTasPid, VoiceCodes AS voiceCodes, Flag AS flag
       FROM t_icc_cfg_tas4callin WHERE CfgTASPID = :cfgTasPid ORDER BY BeginSpan, EndSpan LIMIT :offset, :limit`,
    { replacements: { cfgTasPid, offset, limit }, type: QueryTypes.SELECT }
);
Dao.tas4CallInCount = async (cfgTasPid) => {
    const rows = await sequelize().query(
        `SELECT COUNT(1) AS c FROM t_icc_cfg_tas4callin WHERE CfgTASPID = :cfgTasPid`,
        { replacements: { cfgTasPid }, type: QueryTypes.SELECT }
    );
    return Number(rows?.[0]?.c || 0);
};
Dao.tas4CallInInsert = async (row) => {
    await sequelize().query(
        `INSERT INTO t_icc_cfg_tas4callin (BeginSpan, EndSpan, CfgTASPID, VoiceCodes, Flag)
         VALUES (:beginSpan, :endSpan, :cfgTasPid, :voiceCodes, :flag)`,
        { replacements: row, type: QueryTypes.INSERT }
    );
};
Dao.tas4CallInUpdate = async (row, oldBeginSpan, oldEndSpan) => {
    const [ret] = await sequelize().query(
        `UPDATE t_icc_cfg_tas4callin SET BeginSpan = :beginSpan, EndSpan = :endSpan, VoiceCodes = :voiceCodes, Flag = :flag
         WHERE BeginSpan = :oldBeginSpan AND EndSpan = :oldEndSpan AND CfgTASPID = :cfgTasPid`,
        { replacements: { ...row, oldBeginSpan, oldEndSpan }, type: QueryTypes.UPDATE }
    );
    return ret;
};
Dao.tas4CallInDelete = async (pairs, cfgTasPid) => {
    let n = 0;
    for (const [beginSpan, endSpan] of pairs) {
        const [ret] = await sequelize().query(
            `DELETE FROM t_icc_cfg_tas4callin WHERE BeginSpan = :beginSpan AND EndSpan = :endSpan AND CfgTASPID = :cfgTasPid`,
            { replacements: { beginSpan, endSpan, cfgTasPid }, type: QueryTypes.DELETE }
        );
        n += Number(ret || 0);
    }
    return n;
};

Dao.tas4RegList = async (cfgTasPid, offset, limit) => sequelize().query(
    `SELECT ID AS id, CfgTASPID AS cfgTasPid, NodeID AS nodeId, BRD AS brd, Domain AS domain, Port AS port,
            UserName AS userName, PassWord AS passWord, Expires AS expires, Nat AS nat, Flag AS flag
       FROM t_icc_cfg_tas4reg WHERE CfgTASPID = :cfgTasPid ORDER BY ID LIMIT :offset, :limit`,
    { replacements: { cfgTasPid, offset, limit }, type: QueryTypes.SELECT }
);
Dao.tas4RegCount = async (cfgTasPid) => {
    const rows = await sequelize().query(
        `SELECT COUNT(1) AS c FROM t_icc_cfg_tas4reg WHERE CfgTASPID = :cfgTasPid`,
        { replacements: { cfgTasPid }, type: QueryTypes.SELECT }
    );
    return Number(rows?.[0]?.c || 0);
};
Dao.tas4RegDupCount = async ({ id, domain, port, userName }) => {
    const rows = await sequelize().query(
        `SELECT COUNT(1) AS c FROM t_icc_cfg_tas4reg WHERE Domain = :domain AND Port = :port AND UserName = :userName AND ID <> :id`,
        { replacements: { id: id || 0, domain, port, userName }, type: QueryTypes.SELECT }
    );
    return Number(rows?.[0]?.c || 0);
};
Dao.tas4RegInsert = async (row) => {
    await sequelize().query(
        `INSERT INTO t_icc_cfg_tas4reg (CfgTASPID, NodeID, BRD, Domain, Port, UserName, PassWord, Expires, Nat, Flag)
         VALUES (:cfgTasPid, :nodeId, :brd, :domain, :port, :userName, :passWord, :expires, :nat, :flag)`,
        { replacements: row, type: QueryTypes.INSERT }
    );
    const idRows = await sequelize().query('SELECT LAST_INSERT_ID() AS id', { type: QueryTypes.SELECT });
    return Number(idRows?.[0]?.id || 0);
};
Dao.tas4RegUpdate = async (row) => {
    const [ret] = await sequelize().query(
        `UPDATE t_icc_cfg_tas4reg SET CfgTASPID = :cfgTasPid, NodeID = :nodeId, BRD = :brd, Domain = :domain, Port = :port,
         UserName = :userName, PassWord = :passWord, Expires = :expires, Nat = :nat, Flag = :flag WHERE ID = :id`,
        { replacements: row, type: QueryTypes.UPDATE }
    );
    return ret;
};
Dao.tas4RegDelete = async (pids, cfgTasPid) => {
    if (!pids.length) return 0;
    const marks = pids.map((_, i) => `:r${i}`).join(',');
    const repl = { cfgTasPid };
    pids.forEach((v, i) => { repl[`r${i}`] = v; });
    const [ret] = await sequelize().query(
        `DELETE FROM t_icc_cfg_tas4reg WHERE ID IN (${marks}) AND CfgTASPID = :cfgTasPid`,
        { replacements: repl, type: QueryTypes.DELETE }
    );
    return ret;
};

Dao.tas4EhRegList = async (cfgTasPid, offset, limit) => sequelize().query(
    `SELECT PID AS pid, CfgTASPID AS cfgTasPid, UserId AS userId, Passwd AS passwd, UserName AS userName, Flag AS flag
       FROM t_icc_cfg_tas4ehreg WHERE CfgTASPID = :cfgTasPid ORDER BY UserId ASC LIMIT :offset, :limit`,
    { replacements: { cfgTasPid, offset, limit }, type: QueryTypes.SELECT }
);
Dao.tas4EhRegCount = async (cfgTasPid) => {
    const rows = await sequelize().query(
        `SELECT COUNT(1) AS c FROM t_icc_cfg_tas4ehreg WHERE CfgTASPID = :cfgTasPid`,
        { replacements: { cfgTasPid }, type: QueryTypes.SELECT }
    );
    return Number(rows?.[0]?.c || 0);
};
Dao.tas4EhRegDupCount = async ({ cfgTasPid, pid, userId }) => {
    const rows = await sequelize().query(
        `SELECT COUNT(1) AS c FROM t_icc_cfg_tas4ehreg WHERE CfgTASPID = :cfgTasPid AND PID <> :pid AND UserId = :userId`,
        { replacements: { cfgTasPid, pid: pid || 0, userId }, type: QueryTypes.SELECT }
    );
    return Number(rows?.[0]?.c || 0);
};
Dao.tas4EhRegInsert = async (row) => {
    await sequelize().query(
        `INSERT INTO t_icc_cfg_tas4ehreg (CfgTASPID, UserId, Passwd, UserName, Flag)
         VALUES (:cfgTasPid, :userId, :passwd, :userName, :flag)`,
        { replacements: row, type: QueryTypes.INSERT }
    );
    const idRows = await sequelize().query('SELECT LAST_INSERT_ID() AS id', { type: QueryTypes.SELECT });
    return Number(idRows?.[0]?.id || 0);
};
Dao.tas4EhRegUpdate = async (row) => {
    const [ret] = await sequelize().query(
        `UPDATE t_icc_cfg_tas4ehreg SET CfgTASPID = :cfgTasPid, UserId = :userId, Passwd = :passwd, UserName = :userName, Flag = :flag
         WHERE PID = :pid`,
        { replacements: row, type: QueryTypes.UPDATE }
    );
    return ret;
};
Dao.tas4EhRegDelete = async (pids, cfgTasPid) => {
    if (!pids.length) return 0;
    const marks = pids.map((_, i) => `:e${i}`).join(',');
    const repl = { cfgTasPid };
    pids.forEach((v, i) => { repl[`e${i}`] = v; });
    const [ret] = await sequelize().query(
        `DELETE FROM t_icc_cfg_tas4ehreg WHERE PID IN (${marks}) AND CfgTASPID = :cfgTasPid`,
        { replacements: repl, type: QueryTypes.DELETE }
    );
    return ret;
};

Dao.tas4NatSipList = async (cfgTasPid, offset, limit) => sequelize().query(
    `SELECT PID AS pid, CfgTASPID AS cfgTasPid, NodeId AS nodeId, PublicIp AS publicIp, PublicPort AS publicPort, Flag AS flag
       FROM t_icc_cfg_tas4natsip WHERE CfgTASPID = :cfgTasPid ORDER BY NodeId, PublicIp LIMIT :offset, :limit`,
    { replacements: { cfgTasPid, offset, limit }, type: QueryTypes.SELECT }
);
Dao.tas4NatSipCount = async (cfgTasPid) => {
    const rows = await sequelize().query(
        `SELECT COUNT(1) AS c FROM t_icc_cfg_tas4natsip WHERE CfgTASPID = :cfgTasPid`,
        { replacements: { cfgTasPid }, type: QueryTypes.SELECT }
    );
    return Number(rows?.[0]?.c || 0);
};
Dao.tas4NatSipDupCount = async ({ pid, nodeId, publicIp, publicPort }) => {
    const rows = await sequelize().query(
        `SELECT COUNT(1) AS c FROM t_icc_cfg_tas4natsip WHERE NodeId = :nodeId AND PublicIp = :publicIp AND PublicPort = :publicPort AND PID <> :pid`,
        { replacements: { pid: pid || 0, nodeId, publicIp, publicPort }, type: QueryTypes.SELECT }
    );
    return Number(rows?.[0]?.c || 0);
};
Dao.tas4NatSipInsert = async (row) => {
    await sequelize().query(
        `INSERT INTO t_icc_cfg_tas4natsip (CfgTASPID, NodeId, PublicIp, PublicPort, Flag)
         VALUES (:cfgTasPid, :nodeId, :publicIp, :publicPort, :flag)`,
        { replacements: row, type: QueryTypes.INSERT }
    );
    const idRows = await sequelize().query('SELECT LAST_INSERT_ID() AS id', { type: QueryTypes.SELECT });
    return Number(idRows?.[0]?.id || 0);
};
Dao.tas4NatSipUpdate = async (row) => {
    const [ret] = await sequelize().query(
        `UPDATE t_icc_cfg_tas4natsip SET CfgTASPID = :cfgTasPid, NodeId = :nodeId, PublicIp = :publicIp, PublicPort = :publicPort, Flag = :flag
         WHERE PID = :pid`,
        { replacements: row, type: QueryTypes.UPDATE }
    );
    return ret;
};
Dao.tas4NatSipDelete = async (pids, cfgTasPid) => {
    if (!pids.length) return 0;
    const marks = pids.map((_, i) => `:n${i}`).join(',');
    const repl = { cfgTasPid };
    pids.forEach((v, i) => { repl[`n${i}`] = v; });
    const [ret] = await sequelize().query(
        `DELETE FROM t_icc_cfg_tas4natsip WHERE PID IN (${marks}) AND CfgTASPID = :cfgTasPid`,
        { replacements: repl, type: QueryTypes.DELETE }
    );
    return ret;
};

Dao.tas4NatXiopList = async (cfgTasPid, offset, limit) => sequelize().query(
    `SELECT PID AS pid, CfgTASPID AS cfgTasPid, NodeId AS nodeId, PublicIp AS publicIp, PrivateIp AS privateIp, Flag AS flag
       FROM t_icc_cfg_tas4natxiop WHERE CfgTASPID = :cfgTasPid ORDER BY NodeId, PublicIp LIMIT :offset, :limit`,
    { replacements: { cfgTasPid, offset, limit }, type: QueryTypes.SELECT }
);
Dao.tas4NatXiopCount = async (cfgTasPid) => {
    const rows = await sequelize().query(
        `SELECT COUNT(1) AS c FROM t_icc_cfg_tas4natxiop WHERE CfgTASPID = :cfgTasPid`,
        { replacements: { cfgTasPid }, type: QueryTypes.SELECT }
    );
    return Number(rows?.[0]?.c || 0);
};
Dao.tas4NatXiopDupCount = async ({ pid, cfgTasPid, nodeId, privateIpPrefix }) => {
    const rows = await sequelize().query(
        `SELECT COUNT(1) AS c FROM t_icc_cfg_tas4natxiop
          WHERE CfgTASPID = :cfgTasPid AND NodeId = :nodeId AND PrivateIp LIKE CONCAT('%', :privateIpPrefix, '%') AND PID <> :pid`,
        { replacements: { pid: pid || 0, cfgTasPid, nodeId, privateIpPrefix }, type: QueryTypes.SELECT }
    );
    return Number(rows?.[0]?.c || 0);
};
Dao.tas4NatXiopInsert = async (row) => {
    await sequelize().query(
        `INSERT INTO t_icc_cfg_tas4natxiop (CfgTASPID, NodeId, PublicIp, PrivateIp, Flag)
         VALUES (:cfgTasPid, :nodeId, :publicIp, :privateIp, :flag)`,
        { replacements: row, type: QueryTypes.INSERT }
    );
    const idRows = await sequelize().query('SELECT LAST_INSERT_ID() AS id', { type: QueryTypes.SELECT });
    return Number(idRows?.[0]?.id || 0);
};
Dao.tas4NatXiopUpdate = async (row) => {
    const [ret] = await sequelize().query(
        `UPDATE t_icc_cfg_tas4natxiop SET CfgTASPID = :cfgTasPid, NodeId = :nodeId, PublicIp = :publicIp, PrivateIp = :privateIp, Flag = :flag
         WHERE PID = :pid`,
        { replacements: row, type: QueryTypes.UPDATE }
    );
    return ret;
};
Dao.tas4NatXiopDelete = async (pids, cfgTasPid) => {
    if (!pids.length) return 0;
    const marks = pids.map((_, i) => `:x${i}`).join(',');
    const repl = { cfgTasPid };
    pids.forEach((v, i) => { repl[`x${i}`] = v; });
    const [ret] = await sequelize().query(
        `DELETE FROM t_icc_cfg_tas4natxiop WHERE PID IN (${marks}) AND CfgTASPID = :cfgTasPid`,
        { replacements: repl, type: QueryTypes.DELETE }
    );
    return ret;
};

module.exports = Dao;
