const Db = require('./db');
const { QueryTypes } = require('sequelize');

const Dao = {};

function sequelize() {
    return Db.db_smcicc.sequelize;
}

Dao.listPaged = async ({ cfgCcsPid, localIp, page, pageSize }) => {
    const offset = (Math.max(1, Number(page)) - 1) * Math.max(1, Number(pageSize));
    const limit = Math.max(1, Number(pageSize));
    const rows = await sequelize().query(
        `SELECT t.PID AS pid, t.CfgOdbcPID AS cfgOdbcPid, t.CfgCCSPID AS cfgCcsPid, t.CfgFocuCommPID AS cfgFocuCommPid,
                t.LocalIP AS localIp, t.myId AS myId, t.poolSize AS poolSize, t.myName AS telMyName,
                c.myName AS ccsMyName,
                o.odbcName AS odbcOdbcName,
                f.IPAddress AS focuIpAddress,
                CONCAT(f.IPAddress, ':', f.Port) AS focuIpAndPort,
                t.LastDeployDate AS lastDeployDate,
                deployUser.ID AS deployUserId,
                deployUser.Name AS deployUserName
           FROM t_icc_cfg_telagent t
      LEFT JOIN t_icc_cfg_ccs c ON t.CfgCCSPID = c.PID
      LEFT JOIN t_icc_cfg_odbc o ON t.CfgOdbcPID = o.PID
      LEFT JOIN t_icc_cfg_focucomm f ON t.CfgFocuCommPID = f.PID
      LEFT JOIN t_user_users deployUser ON t.LastDeplayUserID = deployUser.ID
          WHERE ((:cfgCcsPid != -1 AND t.CfgCCSPID = :cfgCcsPid) OR :cfgCcsPid = -1)
            AND t.LocalIP LIKE CONCAT('%', :localIp, '%')
          ORDER BY t.LocalIP ASC
          LIMIT :offset, :limit`,
        {
            replacements: {
                cfgCcsPid: Number(cfgCcsPid),
                localIp: localIp == null ? '' : String(localIp),
                offset,
                limit,
            },
            type: QueryTypes.SELECT,
        }
    );
    const totalRow = await sequelize().query(
        `SELECT COUNT(1) AS total
           FROM t_icc_cfg_telagent t
      LEFT JOIN t_icc_cfg_ccs c ON t.CfgCCSPID = c.PID
      LEFT JOIN t_icc_cfg_odbc o ON t.CfgOdbcPID = o.PID
      LEFT JOIN t_icc_cfg_focucomm f ON t.CfgFocuCommPID = f.PID
          WHERE ((:cfgCcsPid != -1 AND t.CfgCCSPID = :cfgCcsPid) OR :cfgCcsPid = -1)
            AND t.LocalIP LIKE CONCAT('%', :localIp, '%')`,
        {
            replacements: {
                cfgCcsPid: Number(cfgCcsPid),
                localIp: localIp == null ? '' : String(localIp),
            },
            type: QueryTypes.SELECT,
        }
    );
    return { rows, total: Number(totalRow?.[0]?.total || 0) };
};

Dao.selectByPid = async (pid) => {
    const rows = await sequelize().query(
        `SELECT PID AS pid, CfgOdbcPID AS cfgOdbcPid, CfgCCSPID AS cfgCcsPid, CfgFocuCommPID AS cfgFocuCommPid,
                LocalIP AS localIp, myId AS myId, myName AS myName, poolSize AS poolSize
           FROM t_icc_cfg_telagent
          WHERE PID = :pid
          LIMIT 1`,
        { replacements: { pid }, type: QueryTypes.SELECT }
    );
    return rows[0] || null;
};

Dao.countByMyIdExcludingPid = async ({ myId, currentPid }) => {
    const rows = await sequelize().query(
        `SELECT COUNT(1) AS c
           FROM t_icc_cfg_telagent t
          WHERE t.myId = :myId
            AND (COALESCE(:currentPid, 0) = 0 OR t.PID <> :currentPid)`,
        {
            replacements: { myId, currentPid: currentPid || 0 },
            type: QueryTypes.SELECT,
        }
    );
    return Number(rows?.[0]?.c || 0);
};

Dao.insert = async (row) => {
    await sequelize().query(
        `INSERT INTO t_icc_cfg_telagent (CfgOdbcPID, CfgCCSPID, CfgFocuCommPID, LocalIP, myId, myName, poolSize)
         VALUES (:cfgOdbcPid, :cfgCcsPid, :cfgFocuCommPid, :localIp, :myId, :myName, :poolSize)`,
        { replacements: row, type: QueryTypes.INSERT }
    );
    const idRows = await sequelize().query('SELECT LAST_INSERT_ID() AS id', { type: QueryTypes.SELECT });
    return Number(idRows?.[0]?.id || 0);
};

Dao.update = async (row) => {
    const [ret] = await sequelize().query(
        `UPDATE t_icc_cfg_telagent
            SET CfgOdbcPID = :cfgOdbcPid,
                CfgCCSPID = :cfgCcsPid,
                CfgFocuCommPID = :cfgFocuCommPid,
                LocalIP = :localIp,
                myId = :myId,
                myName = :myName,
                poolSize = :poolSize
          WHERE PID = :pid`,
        { replacements: row, type: QueryTypes.UPDATE }
    );
    return ret;
};

Dao.deleteByPids = async (pids) => {
    if (!pids.length) return 0;
    const marks = pids.map((_, i) => `:p${i}`).join(',');
    const replacements = {};
    pids.forEach((id, i) => { replacements[`p${i}`] = id; });
    const [ret] = await sequelize().query(
        `DELETE FROM t_icc_cfg_telagent WHERE PID IN (${marks})`,
        { replacements, type: QueryTypes.DELETE }
    );
    return ret;
};

Dao.listCcsByKey = async (key) => {
    const k = key == null ? '' : String(key);
    return sequelize().query(
        `SELECT PID AS pid, myName AS myName
           FROM t_icc_cfg_ccs
          WHERE myName LIKE CONCAT('%', :key, '%')
          ORDER BY myName ASC`,
        { replacements: { key: k }, type: QueryTypes.SELECT }
    );
};

Dao.listAllForXml = async () => {
    return sequelize().query(
        `SELECT T.PID AS pid, T.LocalIP AS localIp, T.myId AS myId, T.poolSize AS poolSize, T.myName AS telMyName,
                C.myId AS ccsMyId,
                O.ODBCName AS odbcName, O.DBName AS dbName, O.LoginID AS loginId, O.LoginPWD AS loginPwd,
                F.IPAddress AS ipAddress, F.Port AS port
           FROM t_icc_cfg_telagent T
      LEFT JOIN t_icc_cfg_ccs C ON T.CfgCCSPID = C.PID
      LEFT JOIN t_icc_cfg_odbc O ON T.CfgOdbcPID = O.PID
      LEFT JOIN t_icc_cfg_focucomm F ON T.CfgFocuCommPID = F.PID`,
        { type: QueryTypes.SELECT }
    );
};

Dao.updateXMLDeployer = async ({ pid, userId, workName }) => {
    const [ret] = await sequelize().query(
        `UPDATE t_icc_cfg_telagent
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

module.exports = Dao;
