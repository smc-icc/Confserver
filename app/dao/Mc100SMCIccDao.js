const Db = require('./db');
const { QueryTypes } = require('sequelize');

const Dao = {};

function sequelize() {
    return Db.db_smcicc.sequelize;
}

/** 与 selectAllMc100：TAS 下拉等 */
Dao.listMc100All = async () => sequelize().query(
    `SELECT PID AS pid, IP AS ip, Port AS port, CONCAT(IP, ':', Port) AS ipAndPort
       FROM t_icc_cfg_mc100 WHERE 1 = 1 ORDER BY IP, Port`,
    { type: QueryTypes.SELECT }
);

Dao.mc100ListPage = async (ip, port, offset, limit) => {
    const iip = ip == null ? '' : String(ip);
    const pport = port == null ? '' : String(port);
    return sequelize().query(
        `SELECT PID AS pid, IP AS ip, Port AS port
           FROM t_icc_cfg_mc100
          WHERE 1 = 1
            AND (:iip = '' OR IP LIKE CONCAT('%', :iip, '%'))
            AND (:pport = '' OR CAST(Port AS CHAR) LIKE CONCAT('%', :pport, '%'))
          ORDER BY IP ASC, Port ASC
          LIMIT :offset, :limit`,
        { replacements: { iip, pport, offset, limit }, type: QueryTypes.SELECT }
    );
};

Dao.mc100Count = async (ip, port) => {
    const iip = ip == null ? '' : String(ip);
    const pport = port == null ? '' : String(port);
    const rows = await sequelize().query(
        `SELECT COUNT(1) AS c FROM t_icc_cfg_mc100
          WHERE 1 = 1
            AND (:iip = '' OR IP LIKE CONCAT('%', :iip, '%'))
            AND (:pport = '' OR CAST(Port AS CHAR) LIKE CONCAT('%', :pport, '%'))`,
        { replacements: { iip, pport }, type: QueryTypes.SELECT }
    );
    return Number(rows?.[0]?.c || 0);
};

/** 与 selectAllJq：条件独立，仅非空字段参与等值匹配 */
Dao.mc100SelectJq = async (ip, portStr) => {
    const hasIp = ip != null && String(ip) !== '';
    const hasPort = portStr != null && String(portStr) !== '';
    const where = ['1=1'];
    const repl = {};
    if (hasIp) {
        where.push('IP = :jqIp');
        repl.jqIp = String(ip);
    }
    if (hasPort) {
        where.push('Port = :jqPort');
        repl.jqPort = Number(portStr);
    }
    const sql = `SELECT PID AS pid, IP AS ip, Port AS port FROM t_icc_cfg_mc100 WHERE ${where.join(' AND ')}`;
    return sequelize().query(sql, { replacements: repl, type: QueryTypes.SELECT });
};

Dao.mc100Insert = async ({ ip, port }) => {
    const [ret] = await sequelize().query(
        `INSERT INTO t_icc_cfg_mc100 (PID, IP, Port)
         SELECT IFNULL(MAX(PID), 0) + 1, :ip, :port FROM t_icc_cfg_mc100`,
        { replacements: { ip, port }, type: QueryTypes.INSERT }
    );
    return ret;
};

Dao.mc100Update = async ({ pid, ip, port }) => {
    const [ret] = await sequelize().query(
        `UPDATE t_icc_cfg_mc100 SET IP = :ip, Port = :port WHERE PID = :pid`,
        { replacements: { pid, ip, port }, type: QueryTypes.UPDATE }
    );
    return ret;
};

Dao.mc100Delete = async (ids) => {
    if (!ids.length) return 0;
    const marks = ids.map((_, i) => `:d${i}`).join(',');
    const repl = {};
    ids.forEach((id, i) => { repl[`d${i}`] = id; });
    const [ret] = await sequelize().query(
        `DELETE FROM t_icc_cfg_mc100 WHERE PID IN (${marks})`,
        { replacements: repl, type: QueryTypes.DELETE }
    );
    return ret;
};

module.exports = Dao;
