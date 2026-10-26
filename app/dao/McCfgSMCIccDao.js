const Db = require('./db');
const { QueryTypes } = require('sequelize');

const Dao = {};

function sequelize() {
    return Db.db_smcicc.sequelize;
}

const MC_COLS = `PID AS pid, IPAddressPort AS ipAddressPort, SavePath AS savePath, BeatCycle AS beatCycle,
      IsCheckTone AS isCheckTone, CheckTone AS checkTone, IsAutoDeleteLogFile AS isAutoDeleteLogFile,
      AutoDeleteLogFile AS autoDeleteLogFile, IsInvokeSyncFun AS isInvokeSyncFun, InvokeSyncFun AS invokeSyncFun`;

Dao.mcListPage = async (localIp, offset, limit) => {
    const lip = localIp == null ? '' : String(localIp);
    return sequelize().query(
        `SELECT ${MC_COLS}
           FROM t_icc_cfg_mc
          WHERE IPAddressPort LIKE CONCAT('%', :lip, '%')
          ORDER BY PID ASC
          LIMIT :offset, :limit`,
        { replacements: { lip, offset, limit }, type: QueryTypes.SELECT }
    );
};

Dao.mcCount = async (localIp) => {
    const lip = localIp == null ? '' : String(localIp);
    const rows = await sequelize().query(
        `SELECT COUNT(1) AS c FROM t_icc_cfg_mc WHERE IPAddressPort LIKE CONCAT('%', :lip, '%')`,
        { replacements: { lip }, type: QueryTypes.SELECT }
    );
    return Number(rows?.[0]?.c || 0);
};

/** 与 selectMcByIpAndPort：同 IPAddressPort 且非当前 PID 的行数 */
Dao.countByIpAddressPortExcludePid = async (ipAddressPort, excludePid) => {
    let sql = `SELECT COUNT(1) AS c FROM t_icc_cfg_mc WHERE IPAddressPort = :ipAddressPort`;
    const repl = { ipAddressPort };
    if (excludePid != null && excludePid > 0) {
        sql += ` AND PID <> :excludePid`;
        repl.excludePid = excludePid;
    }
    const rows = await sequelize().query(sql, { replacements: repl, type: QueryTypes.SELECT });
    return Number(rows?.[0]?.c || 0);
};

Dao.mcInsert = async (row) => {
    const [ret] = await sequelize().query(
        `INSERT INTO t_icc_cfg_mc (PID, IPAddressPort, SavePath, BeatCycle, IsCheckTone, CheckTone, IsAutoDeleteLogFile, AutoDeleteLogFile, IsInvokeSyncFun, InvokeSyncFun)
         SELECT IFNULL(MAX(PID), 0) + 1, :ipAddressPort, :savePath, :beatCycle, :isCheckTone, :checkTone, :isAutoDeleteLogFile, :autoDeleteLogFile, :isInvokeSyncFun, :invokeSyncFun
           FROM t_icc_cfg_mc`,
        { replacements: row, type: QueryTypes.INSERT }
    );
    return ret;
};

Dao.mcUpdate = async (row) => {
    const [ret] = await sequelize().query(
        `UPDATE t_icc_cfg_mc
            SET IPAddressPort = :ipAddressPort,
                SavePath = :savePath,
                BeatCycle = :beatCycle,
                IsCheckTone = :isCheckTone,
                CheckTone = :checkTone,
                IsAutoDeleteLogFile = :isAutoDeleteLogFile,
                AutoDeleteLogFile = :autoDeleteLogFile,
                IsInvokeSyncFun = :isInvokeSyncFun,
                InvokeSyncFun = :invokeSyncFun
          WHERE PID = :pid`,
        { replacements: row, type: QueryTypes.UPDATE }
    );
    return ret;
};

Dao.mcDeleteByPids = async (pids) => {
    if (!pids.length) return 0;
    const marks = pids.map((_, i) => `:p${i}`).join(',');
    const repl = {};
    pids.forEach((id, i) => { repl[`p${i}`] = id; });
    const [ret] = await sequelize().query(
        `DELETE FROM t_icc_cfg_mc WHERE PID IN (${marks})`,
        { replacements: repl, type: QueryTypes.DELETE }
    );
    return ret;
};

Dao.mcSelectAll = async () => sequelize().query(
    `SELECT ${MC_COLS} FROM t_icc_cfg_mc`,
    { type: QueryTypes.SELECT }
);

Dao.mcSelectByPid = async (pid) => {
    const rows = await sequelize().query(
        `SELECT ${MC_COLS} FROM t_icc_cfg_mc WHERE PID = :pid LIMIT 1`,
        { replacements: { pid }, type: QueryTypes.SELECT }
    );
    return rows[0] || null;
};

/** 与 McMapper.deleteMcByPid：删除 MC 及关联 ISX/板卡等（库内需存在该过程） */
Dao.callDeleteMcAndIsx = async (pids) => {
    await sequelize().query('CALL S_ICC_AG_DeleteMcAndIsx(:pids)', {
        replacements: { pids: String(pids) },
        type: QueryTypes.RAW,
    });
};

/**
 * 复制资源板与 ISX（若库中已部署该过程）。
 * 与 DeleteMcAndIsx 对称命名；若不存在则由 Service 回退为 S_ICC_AG_CopyIsx。
 */
Dao.callCopyBoardAndIsx = async (cfgMcPid, cfgIsxPid, oldIsxPid) => {
    await sequelize().query(
        'CALL S_ICC_AG_CopyBoardAndIsx(:cfgMcPid, :cfgIsxPid, :oldIsxPid)',
        {
            replacements: {
                cfgMcPid: Number(cfgMcPid),
                cfgIsxPid: Number(cfgIsxPid),
                oldIsxPid: Number(oldIsxPid),
            },
            type: QueryTypes.RAW,
        }
    );
};

module.exports = Dao;
