const Db = require('./db');
const { QueryTypes } = require('sequelize');

const Dao = {};

function sequelize() {
    return Db.db_smcicc.sequelize;
}

Dao.channelInsert = async (row) => {
    await sequelize().query(
        `INSERT INTO t_icc_base_channels (ID, \`Offset\`, ConfOffset, ConfLength, MyID)
         SELECT IFNULL(MAX(ID), 0) + 1, :offset, :confOffset, :confLength, :myId
           FROM t_icc_base_channels`,
        { replacements: row, type: QueryTypes.INSERT }
    );
};

Dao.channelUpdate = async (row) => {
    const [ret] = await sequelize().query(
        `UPDATE t_icc_base_channels
            SET \`Offset\` = :offset,
                ConfOffset = :confOffset,
                ConfLength = :confLength,
                MyID = :myId
          WHERE ID = :id`,
        { replacements: row, type: QueryTypes.UPDATE }
    );
    return ret;
};

Dao.channelDeleteByIds = async (ids) => {
    if (!ids.length) return 0;
    const marks = ids.map((_, i) => `:d${i}`).join(',');
    const repl = {};
    ids.forEach((id, i) => { repl[`d${i}`] = id; });
    const [ret] = await sequelize().query(
        `DELETE FROM t_icc_base_channels WHERE ID IN (${marks})`,
        { replacements: repl, type: QueryTypes.DELETE }
    );
    return ret;
};

/** 与 ChannelImpl.loadChannelListPage：selSysChannelTasByPage */
Dao.channelListPageTas = async (myId, offset, limit) => {
    const mid = myId === -1 || myId === '-1' ? -1 : Number(myId);
    return sequelize().query(
        `SELECT c.ID AS id, c.\`Offset\` AS chOffset, c.ConfOffset AS confOffset, c.ConfLength AS confLength, c.MyID AS myId,
                t.PID AS tasPid, t.MyID AS tasMyId, t.MyName AS tasMyName
           FROM t_icc_base_channels c
      LEFT JOIN t_icc_cfg_tas t ON c.MyID = t.MyID
          WHERE (c.MyID = :mid OR :mid = -1)
          ORDER BY c.\`Offset\`, c.ConfOffset, c.ConfLength ASC
          LIMIT :off, :lim`,
        { replacements: { mid, off: offset, lim: limit }, type: QueryTypes.SELECT }
    );
};

Dao.channelListCountTas = async (myId) => {
    const mid = myId === -1 || myId === '-1' ? -1 : Number(myId);
    const rows = await sequelize().query(
        `SELECT COUNT(1) AS c FROM t_icc_base_channels c WHERE (c.MyID = :mid OR :mid = -1)`,
        { replacements: { mid }, type: QueryTypes.SELECT }
    );
    return Number(rows?.[0]?.c || 0);
};

module.exports = Dao;
