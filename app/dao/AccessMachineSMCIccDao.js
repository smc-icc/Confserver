const Db = require('./db');
const { QueryTypes } = require('sequelize');

const Dao = {};

function sequelize() {
    return Db.db_smcicc.sequelize;
}

Dao.list = async ({ ipAddress = '', port = -1, runMode = '', page = 1, pageSize = 10 }) => {
    const offset = (Math.max(1, Number(page)) - 1) * Math.max(1, Number(pageSize));
    const limit = Math.max(1, Number(pageSize));
    const rows = await sequelize().query(
        `SELECT PID AS pid, IPAddress AS ipAddress, Port AS port, RunMode AS runMode, Note AS note
           FROM t_icc_cfg_focucomm
          WHERE 1 = 1
            AND (:ipAddress = '' OR IPAddress LIKE CONCAT('%', :ipAddress, '%'))
            AND (:port = -1 OR Port LIKE CONCAT('%', :port, '%'))
            AND (:runMode = '' OR RunMode = :runMode)
          ORDER BY IPAddress, Port ASC
          LIMIT :offset, :limit`,
        { replacements: { ipAddress, port, runMode, offset, limit }, type: QueryTypes.SELECT }
    );
    const totalRow = await sequelize().query(
        `SELECT COUNT(1) AS total
           FROM t_icc_cfg_focucomm
          WHERE 1 = 1
            AND (:ipAddress = '' OR IPAddress LIKE CONCAT('%', :ipAddress, '%'))
            AND (:port = -1 OR Port = :port)
            AND (:runMode = '' OR RunMode = :runMode)`,
        { replacements: { ipAddress, port, runMode }, type: QueryTypes.SELECT }
    );
    return { rows, total: Number(totalRow?.[0]?.total || 0) };
};

Dao.listByIpPort = async ({ ipAddress = '', port = -1 }) => {
    return sequelize().query(
        `SELECT PID AS pid, IPAddress AS ipAddress, Port AS port, RunMode AS runMode, Note AS note
           FROM t_icc_cfg_focucomm
          WHERE 1 = 1
            AND (:ipAddress = '' OR IPAddress = :ipAddress)
            AND (:port = -1 OR Port = :port)`,
        { replacements: { ipAddress, port }, type: QueryTypes.SELECT }
    );
};

Dao.insert = async ({ ipAddress, port, runMode, note }) => {
    const [ret] = await sequelize().query(
        `INSERT INTO t_icc_cfg_focucomm (IPAddress, Port, RunMode, Note)
         VALUES (:ipAddress, :port, :runMode, :note)`,
        { replacements: { ipAddress, port, runMode, note }, type: QueryTypes.INSERT }
    );
    return ret;
};

Dao.update = async ({ pid, ipAddress, port, runMode, note }) => {
    const [ret] = await sequelize().query(
        `UPDATE t_icc_cfg_focucomm
            SET IPAddress = :ipAddress, Port = :port, RunMode = :runMode, Note = :note
          WHERE PID = :pid`,
        { replacements: { pid, ipAddress, port, runMode, note }, type: QueryTypes.UPDATE }
    );
    return ret;
};

Dao.deleteByIds = async (ids) => {
    if (!ids.length) return 0;
    const marks = ids.map((_, i) => `:id${i}`).join(',');
    const replacements = {};
    ids.forEach((id, i) => { replacements[`id${i}`] = id; });
    const [ret] = await sequelize().query(
        `DELETE FROM t_icc_cfg_focucomm WHERE PID IN (${marks})`,
        { replacements, type: QueryTypes.DELETE }
    );
    return ret;
};

module.exports = Dao;
