const Db = require('./db');
const { QueryTypes } = require('sequelize');

const Dao = {};

function sequelize() {
    return Db.db_smcicc.sequelize;
}

Dao.countByAppIdExcludingPid = async ({ appId, currentPid }) => {
    const rows = await sequelize().query(
        `SELECT COUNT(1) AS total
           FROM t_icc_cfg_acd
          WHERE APPID = :appId
            AND (ISNULL(:currentPid) OR PID != :currentPid)`,
        {
            replacements: {
                appId,
                currentPid: currentPid == null || currentPid === '' || Number(currentPid) === 0
                    ? null
                    : Number(currentPid),
            },
            type: QueryTypes.SELECT,
        }
    );
    return Number(rows?.[0]?.total || 0);
};

Dao.insert = async (row) => {
    const [ret] = await sequelize().query(
        `INSERT INTO t_icc_cfg_acd (
            PID, CfgOdbcPID, CfgFocuCommPID, MyName, APPID, RunMode, LocalIP, Note, PoolSize,
            ClientCharset, Sync, DBDebugInfo, t_icc_acd_agent_queue_record, t_icc_acd_call_record,
            CCSID, LogLevel, LogCount
        )
        SELECT IFNULL(MAX(PID), 0) + 1, :cfgOdbcPid, :cfgFocuCommPid, :myName, :appId, :runMode, :localIp, :note, :poolSize,
               :clientCharset, :sync, :dbDebugInfo, :tAgentRec, :tCallRec, :ccsId, :logLevel, :logCount
          FROM t_icc_cfg_acd`,
        {
            replacements: {
                cfgOdbcPid: row.cfgOdbcPid,
                cfgFocuCommPid: row.cfgFocuCommPid,
                myName: row.myName,
                appId: row.appId,
                runMode: row.runMode,
                localIp: row.localIp,
                note: row.note,
                poolSize: row.poolSize,
                clientCharset: row.clientCharset,
                sync: row.sync,
                dbDebugInfo: row.dbDebugInfo,
                tAgentRec: row.tIcipAcdAgentQueueRecord,
                tCallRec: row.tIcipAcdCallRecord,
                ccsId: row.ccsId,
                logLevel: row.logLevel,
                logCount: row.logCount,
            },
            type: QueryTypes.INSERT,
        }
    );
    return ret;
};

Dao.update = async (row) => {
    const [ret] = await sequelize().query(
        `UPDATE t_icc_cfg_acd
            SET CfgOdbcPID = :cfgOdbcPid,
                CfgFocuCommPID = :cfgFocuCommPid,
                MyName = :myName,
                APPID = :appId,
                RunMode = :runMode,
                LocalIP = :localIp,
                Note = :note,
                PoolSize = :poolSize,
                ClientCharset = :clientCharset,
                Sync = :sync,
                DBDebugInfo = :dbDebugInfo,
                t_icc_acd_agent_queue_record = :tAgentRec,
                t_icc_acd_call_record = :tCallRec,
                CCSID = :ccsId,
                LogLevel = :logLevel,
                LogCount = :logCount
          WHERE PID = :pid`,
        {
            replacements: {
                pid: row.pid,
                cfgOdbcPid: row.cfgOdbcPid,
                cfgFocuCommPid: row.cfgFocuCommPid,
                myName: row.myName,
                appId: row.appId,
                runMode: row.runMode,
                localIp: row.localIp,
                note: row.note,
                poolSize: row.poolSize,
                clientCharset: row.clientCharset,
                sync: row.sync,
                dbDebugInfo: row.dbDebugInfo,
                tAgentRec: row.tIcipAcdAgentQueueRecord,
                tCallRec: row.tIcipAcdCallRecord,
                ccsId: row.ccsId,
                logLevel: row.logLevel,
                logCount: row.logCount,
            },
            type: QueryTypes.UPDATE,
        }
    );
    return ret;
};

Dao.deleteByPids = async (pids) => {
    if (!pids.length) return 0;
    const marks = pids.map((_, i) => `:p${i}`).join(',');
    const replacements = {};
    pids.forEach((id, i) => { replacements[`p${i}`] = id; });
    const [ret] = await sequelize().query(
        `DELETE FROM t_icc_cfg_acd WHERE PID IN (${marks})`,
        { replacements, type: QueryTypes.DELETE }
    );
    return ret;
};

Dao.listPaged = async ({ myName = '', runMode = '', page = 1, pageSize = 10 }) => {
    const offset = (Math.max(1, Number(page)) - 1) * Math.max(1, Number(pageSize));
    const limit = Math.max(1, Number(pageSize));
    const rows = await sequelize().query(
        `SELECT acd.PID AS pid, acd.CfgOdbcPID AS cfgOdbcPid, acd.CfgFocuCommPID AS cfgFocuCommPid, acd.MyName AS myName,
                acd.APPID AS appId, acd.RunMode AS runMode, acd.LocalIP AS localIp, acd.Note AS note, acd.PoolSize AS poolSize,
                acd.ClientCharset AS clientCharset, acd.Sync AS sync, acd.DBDebugInfo AS dbDebugInfo,
                acd.t_icc_acd_agent_queue_record AS tIcipAcdAgentQueueRecord, acd.t_icc_acd_call_record AS tIcipAcdCallRecord,
                acd.CCSID AS ccsId, acd.LogLevel AS logLevel, acd.LogCount AS logCount, acd.LastDeployDate AS lastDeployDate,
                odbc.ODBCName AS odbcOdbcName, odbc.dbType AS odbcDbType, odbc.DBCharSet AS odbcDbCharSet,
                deployUser.ID AS deployUserId, deployUser.Name AS deployUserName
           FROM t_icc_cfg_acd acd
      LEFT JOIN t_icc_cfg_odbc odbc ON acd.CfgOdbcPID = odbc.pid
      LEFT JOIN t_user_users deployUser ON acd.LastDeplayUserID = deployUser.ID
          WHERE acd.MyName LIKE CONCAT('%', :myName, '%')
            AND ((acd.RunMode = :runMode) OR :runMode = '')
          ORDER BY acd.MyName ASC
          LIMIT :offset, :limit`,
        { replacements: { myName, runMode, offset, limit }, type: QueryTypes.SELECT }
    );
    const totalRow = await sequelize().query(
        `SELECT COUNT(1) AS total
           FROM t_icc_cfg_acd acd
      LEFT JOIN t_icc_cfg_odbc odbc ON acd.CfgOdbcPID = odbc.pid
          WHERE acd.MyName LIKE CONCAT('%', :myName, '%')
            AND ((acd.RunMode = :runMode) OR :runMode = '')`,
        { replacements: { myName, runMode }, type: QueryTypes.SELECT }
    );
    return { rows, total: Number(totalRow?.[0]?.total || 0) };
};

Dao.selectByPrimaryKey = async (pid) => {
    return sequelize().query(
        `SELECT PID AS pid, CfgOdbcPID AS cfgOdbcPid, CfgFocuCommPID AS cfgFocuCommPid, MyName AS myName, APPID AS appId,
                RunMode AS runMode, LocalIP AS localIp, Note AS note, PoolSize AS poolSize, ClientCharset AS clientCharset,
                Sync AS sync, DBDebugInfo AS dbDebugInfo, t_icc_acd_agent_queue_record AS tIcipAcdAgentQueueRecord,
                t_icc_acd_call_record AS tIcipAcdCallRecord, CCSID AS ccsId, LogLevel AS logLevel, LogCount AS logCount
           FROM t_icc_cfg_acd
          WHERE PID = :pid`,
        { replacements: { pid }, type: QueryTypes.SELECT }
    );
};

Dao.listCcsForCombo = async () => {
    return sequelize().query(
        `SELECT PID AS pid, myName FROM t_icc_cfg_ccs ORDER BY myName ASC`,
        { type: QueryTypes.SELECT }
    );
};

Dao.getAcdXmlByPid = async (pid) => {
    const rows = await sequelize().query(
        `SELECT A.PID AS pid, A.APPID AS appId, A.LocalIP AS localIp, A.PoolSize AS poolSize, A.ClientCharset AS clientCharset,
                A.Sync AS sync, A.DBDebugInfo AS dbDebugInfo, A.t_icc_acd_agent_queue_record AS tIcipAcdAgentQueueRecord,
                A.t_icc_acd_call_record AS tIcipAcdCallRecord, A.LogLevel AS logLevel, A.LogCount AS logCount,
                O.PID AS odbcPid, O.ODBCName AS odbcName, O.DBType AS dbType, O.LoginID AS loginId,
                O.LoginPWD AS loginPwd, O.DBCharSet AS dbCharSet,
                F.PID AS focuCommPid, F.IPAddress AS ipAddress, F.Port AS port,
                C.PID AS ccsPid, C.myId AS ccsMyId
           FROM t_icc_cfg_acd A
      LEFT JOIN t_icc_cfg_odbc O ON A.CfgOdbcPID = O.PID
      LEFT JOIN t_icc_cfg_focucomm F ON A.CfgFocuCommPID = F.PID
      LEFT JOIN t_icc_cfg_ccs C ON A.CCSID = C.PID
          WHERE A.PID = :pid`,
        { replacements: { pid }, type: QueryTypes.SELECT }
    );
    return rows[0] || null;
};

Dao.updateXMLDeployer = async ({ pid, userId, workName }) => {
    const [ret] = await sequelize().query(
        `UPDATE t_icc_cfg_acd
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

Dao.listFocuCommAll = async () => {
    return sequelize().query(
        `SELECT PID AS pid, IPAddress AS ipAddress, Port AS port, RunMode AS runMode, Note AS note,
                CONCAT(IPAddress, ':', Port) AS ipAndPort
           FROM t_icc_cfg_focucomm
          ORDER BY IPAddress, Port ASC`,
        { type: QueryTypes.SELECT }
    );
};

Dao.listOdbcAll = async () => {
    return sequelize().query(
        `SELECT PID AS pid, ODBCName AS odbcName, DBType AS dbType, DBName AS dbName,
                LoginID AS loginId, LoginPWD AS loginPwd, DBCharSet AS dbCharSet
           FROM t_icc_cfg_odbc
          ORDER BY PID DESC`,
        { type: QueryTypes.SELECT }
    );
};

module.exports = Dao;
