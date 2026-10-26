const Db = require('./db');
const { QueryTypes } = require('sequelize');

const Dao = {};

function sequelize() {
    return Db.db_smcicc.sequelize;
}

Dao.isxSelectAll = async () => sequelize().query(
    `SELECT PID AS pid FROM t_icc_cfg_isx ORDER BY PID ASC`,
    { type: QueryTypes.SELECT }
);

Dao.isxSelectByPid = async (pid) => {
    const rows = await sequelize().query(
        `SELECT PID AS pid FROM t_icc_cfg_isx WHERE PID = :pid LIMIT 1`,
        { replacements: { pid }, type: QueryTypes.SELECT }
    );
    return rows[0] || null;
};

/** 与 IsxMapper.insert */
Dao.isxInsert = async (pid) => {
    const [ret] = await sequelize().query(
        `INSERT INTO t_icc_cfg_isx (PID) VALUES (:pid)`,
        { replacements: { pid }, type: QueryTypes.INSERT }
    );
    return ret;
};

/** 与 Tas4IsxMapper.selectByIsx */
Dao.countTas4IsxByCfgIsxPid = async (cfgIsxPid) => {
    const rows = await sequelize().query(
        `SELECT COUNT(1) AS c FROM t_icc_cfg_tas4isx WHERE CfgIsxPID = :cfgIsxPid`,
        { replacements: { cfgIsxPid }, type: QueryTypes.SELECT }
    );
    return Number(rows?.[0]?.c || 0);
};

/** 与 IsxMapper.deleteIsx：CALLABLE */
Dao.callDeleteIsx = async (pids) => {
    await sequelize().query('CALL S_ICC_AG_DeleteIsx(:pids)', {
        replacements: { pids },
        type: QueryTypes.RAW,
    });
};

/** 与 IsxMapper.copyIsx：CALLABLE */
Dao.callCopyIsx = async (newPid, oldPid) => {
    await sequelize().query('CALL S_ICC_AG_CopyIsx(:newPid, :oldPid)', {
        replacements: { newPid, oldPid },
        type: QueryTypes.RAW,
    });
};

module.exports = Dao;
