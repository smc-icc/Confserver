const Db = require('./db');
const { QueryTypes } = require('sequelize');

const Dao = {};

function sequelize() {
    return Db.db_smcicc.sequelize;
}

/** 与 PrdMapper.selectByPrimaryKey / selectPrdCount 语义：pid=-100 表示不按 PID 过滤 */
Dao.prdList = async (pidFilter, offset, limit) => {
    const pf = pidFilter === -100 || pidFilter === '-100' ? -100 : Number(pidFilter);
    if (pf === -100) {
        return sequelize().query(
            `SELECT PID AS pid, ISXPID AS isxPid FROM t_icc_cfg_prd ORDER BY PID ASC LIMIT :offset, :limit`,
            { replacements: { offset, limit }, type: QueryTypes.SELECT }
        );
    }
    const pidStr = String(pf);
    return sequelize().query(
        `SELECT PID AS pid, ISXPID AS isxPid FROM t_icc_cfg_prd
          WHERE CAST(PID AS CHAR) LIKE CONCAT('%', :pidStr, '%')
          ORDER BY PID ASC
          LIMIT :offset, :limit`,
        { replacements: { pidStr, offset, limit }, type: QueryTypes.SELECT }
    );
};

Dao.prdCount = async (pidFilter) => {
    const pf = pidFilter === -100 || pidFilter === '-100' ? -100 : Number(pidFilter);
    if (pf === -100) {
        const rows = await sequelize().query(
            `SELECT COUNT(1) AS c FROM t_icc_cfg_prd`,
            { type: QueryTypes.SELECT }
        );
        return Number(rows?.[0]?.c || 0);
    }
    const pidStr = String(pf);
    const rows = await sequelize().query(
        `SELECT COUNT(1) AS c FROM t_icc_cfg_prd WHERE CAST(PID AS CHAR) LIKE CONCAT('%', :pidStr, '%')`,
        { replacements: { pidStr }, type: QueryTypes.SELECT }
    );
    return Number(rows?.[0]?.c || 0);
};

Dao.prdCountByPid = async (pid) => {
    const rows = await sequelize().query(
        `SELECT COUNT(1) AS c FROM t_icc_cfg_prd WHERE PID = :pid`,
        { replacements: { pid }, type: QueryTypes.SELECT }
    );
    return Number(rows?.[0]?.c || 0);
};

Dao.prdInsert = async ({ pid, isxPid }) => {
    await sequelize().query(
        `INSERT INTO t_icc_cfg_prd (PID, ISXPID) VALUES (:pid, :isxPid)`,
        { replacements: { pid, isxPid }, type: QueryTypes.INSERT }
    );
};

Dao.prdUpdate = async ({ newPid, oldPid, isxPid }) => {
    const [ret] = await sequelize().query(
        `UPDATE t_icc_cfg_prd SET PID = :newPid, ISXPID = :isxPid WHERE PID = :oldPid`,
        { replacements: { newPid, oldPid, isxPid }, type: QueryTypes.UPDATE }
    );
    return ret;
};

Dao.prdDelete = async (pids) => {
    if (!pids.length) return 0;
    const marks = pids.map((_, i) => `:p${i}`).join(',');
    const repl = {};
    pids.forEach((id, i) => { repl[`p${i}`] = id; });
    const [ret] = await sequelize().query(
        `DELETE FROM t_icc_cfg_prd WHERE PID IN (${marks})`,
        { replacements: repl, type: QueryTypes.DELETE }
    );
    return ret;
};

Dao.prdSelectAll = async () => sequelize().query(
    `SELECT PID AS pid, ISXPID AS isxPid FROM t_icc_cfg_prd ORDER BY PID`,
    { type: QueryTypes.SELECT }
);

Dao.prdSelectByPid = async (pid) => {
    const rows = await sequelize().query(
        `SELECT PID AS pid, ISXPID AS isxPid FROM t_icc_cfg_prd WHERE PID = :pid LIMIT 1`,
        { replacements: { pid }, type: QueryTypes.SELECT }
    );
    return rows[0] || null;
};

/** 分配新 PRD 主键：MAX(PID)+1 */
Dao.prdNextPid = async () => {
    const rows = await sequelize().query(
        `SELECT IFNULL(MAX(PID), 0) + 1 AS n FROM t_icc_cfg_prd`,
        { type: QueryTypes.SELECT }
    );
    return Number(rows?.[0]?.n || 1);
};

/** 与 TasMapper.selectByPrdPid：TAS 中仍引用这些 PRD PID 的 distinct CfgPRDPID */
Dao.tasDistinctCfgPrdIn = async (prdPids) => {
    if (!prdPids.length) return [];
    const marks = prdPids.map((_, i) => `:t${i}`).join(',');
    const repl = {};
    prdPids.forEach((id, i) => { repl[`t${i}`] = id; });
    return sequelize().query(
        `SELECT DISTINCT CfgPRDPID AS cfgPrdPid FROM t_icc_cfg_tas WHERE CfgPRDPID IN (${marks})`,
        { replacements: repl, type: QueryTypes.SELECT }
    );
};

module.exports = Dao;
