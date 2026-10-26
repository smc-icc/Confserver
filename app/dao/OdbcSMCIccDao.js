const Db = require('./db');
const { QueryTypes } = require('sequelize');

const Dao = {};

function sequelize() {
    return Db.db_smcicc.sequelize;
}

Dao.list = async ({ odbcName = '', dbType = '', dbName = '', page = 1, pageSize = 10 }) => {
    const offset = (Math.max(1, Number(page)) - 1) * Math.max(1, Number(pageSize));
    const limit = Math.max(1, Number(pageSize));
    const rows = await sequelize().query(
        `SELECT PID AS pid, ODBCName AS odbcName, DBType AS dbType, DBName AS dbName,
                LoginID AS loginId, LoginPWD AS loginPwd, DBCharSet AS dbCharSet
           FROM t_icc_cfg_odbc
          WHERE ODBCName LIKE CONCAT('%', :odbcName, '%')
            AND ((DBType = :dbType) OR :dbType = '')
            AND DBName LIKE CONCAT('%', :dbName, '%')
          ORDER BY ODBCName ASC
          LIMIT :offset, :limit`,
        { replacements: { odbcName, dbType, dbName, offset, limit }, type: QueryTypes.SELECT }
    );
    const totalRow = await sequelize().query(
        `SELECT COUNT(1) AS total
           FROM t_icc_cfg_odbc
          WHERE ODBCName LIKE CONCAT('%', :odbcName, '%')
            AND ((DBType = :dbType) OR :dbType = '')
            AND DBName LIKE CONCAT('%', :dbName, '%')`,
        { replacements: { odbcName, dbType, dbName }, type: QueryTypes.SELECT }
    );
    return { rows, total: Number(totalRow?.[0]?.total || 0) };
};

Dao.listAll = async () => {
    return sequelize().query(
        `SELECT PID AS pid, ODBCName AS odbcName, DBType AS dbType, DBName AS dbName,
                LoginID AS loginId, LoginPWD AS loginPwd, DBCharSet AS dbCharSet
           FROM t_icc_cfg_odbc
          ORDER BY PID DESC`,
        { type: QueryTypes.SELECT }
    );
};

Dao.selectByPid = async (pid) => {
    const rows = await sequelize().query(
        `SELECT PID AS pid, ODBCName AS odbcName, DBType AS dbType, DBName AS dbName,
                LoginID AS loginId, LoginPWD AS loginPwd, DBCharSet AS dbCharSet
           FROM t_icc_cfg_odbc
          WHERE PID = :pid
          LIMIT 1`,
        { replacements: { pid }, type: QueryTypes.SELECT }
    );
    return rows[0] || null;
};

Dao.countByNameExcludingPid = async ({ odbcName, pid = -1 }) => {
    const rows = await sequelize().query(
        `SELECT COUNT(1) AS total
           FROM t_icc_cfg_odbc
          WHERE ODBCName = :odbcName
            AND PID != IFNULL(:pid, -1)`,
        { replacements: { odbcName, pid }, type: QueryTypes.SELECT }
    );
    return Number(rows?.[0]?.total || 0);
};

Dao.insert = async ({ odbcName, dbType, dbName, loginId, loginPwd, dbCharSet }) => {
    const [ret] = await sequelize().query(
        `INSERT INTO t_icc_cfg_odbc (ODBCName, DBType, DBName, LoginID, LoginPWD, DBCharSet)
         VALUES (:odbcName, :dbType, :dbName, :loginId, :loginPwd, :dbCharSet)`,
        { replacements: { odbcName, dbType, dbName, loginId, loginPwd, dbCharSet }, type: QueryTypes.INSERT }
    );
    return ret;
};

Dao.update = async ({ pid, odbcName, dbType, dbName, loginId, loginPwd, dbCharSet }) => {
    const [ret] = await sequelize().query(
        `UPDATE t_icc_cfg_odbc
            SET ODBCName = :odbcName,
                DBType = :dbType,
                DBName = :dbName,
                LoginID = :loginId,
                LoginPWD = :loginPwd,
                DBCharSet = :dbCharSet
          WHERE PID = :pid`,
        { replacements: { pid, odbcName, dbType, dbName, loginId, loginPwd, dbCharSet }, type: QueryTypes.UPDATE }
    );
    return ret;
};

Dao.deleteByPids = async (pids) => {
    if (!pids.length) return 0;
    const marks = pids.map((_, i) => `:p${i}`).join(',');
    const replacements = {};
    pids.forEach((id, i) => { replacements[`p${i}`] = id; });
    const [ret] = await sequelize().query(
        `DELETE FROM t_icc_cfg_odbc WHERE PID IN (${marks})`,
        { replacements, type: QueryTypes.DELETE }
    );
    return ret;
};

module.exports = Dao;
