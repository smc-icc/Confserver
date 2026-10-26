const Db = require('./db');
const { QueryTypes } = require('sequelize');

const Dao = {};

function sequelize() {
    return Db.db_smcicc.sequelize;
}

const ROW = `PID AS pid, IPAndPort AS ipAndPort, Dir4Source AS dir4Source, Dir4Target AS dir4Target,
      LastDeployDate AS lastDeployDate, deployUser.ID AS deployUserId, deployUser.Name AS deployUserName`;

Dao.ivrDesignList = async (ipLike, offset, limit) => {
    const ip = ipLike == null ? '' : String(ipLike);
    return sequelize().query(
        `SELECT ${ROW}
           FROM t_icc_cfg_ivrdesign
      LEFT JOIN t_user_users deployUser ON LastDeplayUserID = deployUser.ID
          WHERE IPAndPort LIKE CONCAT('%', :ip, '%')
          ORDER BY IPAndPort ASC
          LIMIT :offset, :limit`,
        { replacements: { ip, offset, limit }, type: QueryTypes.SELECT }
    );
};

Dao.ivrDesignCount = async (ipLike) => {
    const ip = ipLike == null ? '' : String(ipLike);
    const rows = await sequelize().query(
        `SELECT COUNT(1) AS c FROM t_icc_cfg_ivrdesign WHERE IPAndPort LIKE CONCAT('%', :ip, '%')`,
        { replacements: { ip }, type: QueryTypes.SELECT }
    );
    return Number(rows?.[0]?.c || 0);
};

Dao.ivrDesignDupCount = async ({ ipAndPort, excludePid }) => {
    const ex = excludePid == null || excludePid === '' ? 0 : Number(excludePid);
    const rows = await sequelize().query(
        `SELECT COUNT(1) AS c FROM t_icc_cfg_ivrdesign WHERE IPAndPort = :ipAndPort AND PID != :excludePid`,
        { replacements: { ipAndPort, excludePid: ex }, type: QueryTypes.SELECT }
    );
    return Number(rows?.[0]?.c || 0);
};

Dao.ivrDesignInsert = async ({ ipAndPort, dir4Source, dir4Target }) => {
    await sequelize().query(
        `INSERT INTO t_icc_cfg_ivrdesign (PID, IPAndPort, Dir4Source, Dir4Target)
         SELECT IFNULL(MAX(PID), 0) + 1, :ipAndPort, :dir4Source, :dir4Target FROM t_icc_cfg_ivrdesign`,
        { replacements: { ipAndPort, dir4Source, dir4Target }, type: QueryTypes.INSERT }
    );
};

Dao.ivrDesignUpdate = async ({ pid, ipAndPort, dir4Source, dir4Target }) => {
    const [ret] = await sequelize().query(
        `UPDATE t_icc_cfg_ivrdesign
            SET IPAndPort = :ipAndPort,
                Dir4Source = :dir4Source,
                Dir4Target = :dir4Target
          WHERE PID = :pid`,
        { replacements: { pid, ipAndPort, dir4Source, dir4Target }, type: QueryTypes.UPDATE }
    );
    return ret;
};

Dao.ivrDesignDelete = async (pids) => {
    if (!pids.length) return 0;
    const marks = pids.map((_, i) => `:p${i}`).join(',');
    const repl = {};
    pids.forEach((id, i) => { repl[`p${i}`] = id; });
    const [ret] = await sequelize().query(
        `DELETE FROM t_icc_cfg_ivrdesign WHERE PID IN (${marks})`,
        { replacements: repl, type: QueryTypes.DELETE }
    );
    return ret;
};

Dao.getIvrDesignXmlRow = async (pid) => {
    const rows = await sequelize().query(
        `SELECT IPAndPort AS ipAndPort, Dir4Source AS dir4Source, Dir4Target AS dir4Target
           FROM t_icc_cfg_ivrdesign WHERE PID = :pid`,
        { replacements: { pid }, type: QueryTypes.SELECT }
    );
    return rows[0] || null;
};

Dao.updateXMLDeployer = async ({ pid, userId, workName }) => {
    const [ret] = await sequelize().query(
        `UPDATE t_icc_cfg_ivrdesign
            SET LastDeployDate = NOW(),
                LastDeplayUserID = :userId,
                LastDeplayUserName = :workName
          WHERE PID = :pid`,
        { replacements: { pid, userId, workName }, type: QueryTypes.UPDATE }
    );
    return ret;
};

module.exports = Dao;
