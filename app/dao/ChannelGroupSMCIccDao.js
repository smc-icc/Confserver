const Db = require('./db');
const { QueryTypes } = require('sequelize');

const Dao = {};

function sequelize() {
    return Db.db_smcicc.sequelize;
}

const ROW_SELECT = `ID AS id, Name AS name, BeginSpanID AS beginSpanId, BeginChannelID AS beginChannelId,
      EndSpanID AS endSpanId, EndChannelID AS endChannelId, SeekType AS seekType,
      VDNID AS vdnId, CallerCapacity AS callerCapacity`;

Dao.channelGroupInsert = async (row) => {
    await sequelize().query(
        `INSERT INTO t_icc_base_channelgroup (ID, Name, BeginSpanID, BeginChannelID, EndSpanID, EndChannelID, SeekType, VDNID, CallerCapacity)
         SELECT IFNULL(MAX(ID), 0) + 1, :name, :beginSpanId, :beginChannelId, :endSpanId, :endChannelId, :seekType, :vdnId, :callerCapacity
           FROM t_icc_base_channelgroup`,
        {
            replacements: {
                name: row.name,
                beginSpanId: row.beginSpanId,
                beginChannelId: row.beginChannelId,
                endSpanId: row.endSpanId,
                endChannelId: row.endChannelId,
                seekType: row.seekType,
                vdnId: row.vdnId,
                callerCapacity: row.callerCapacity,
            },
            type: QueryTypes.INSERT,
        }
    );
};

Dao.channelGroupUpdate = async (row) => {
    const [ret] = await sequelize().query(
        `UPDATE t_icc_base_channelgroup
            SET Name = :name,
                BeginSpanID = :beginSpanId,
                BeginChannelID = :beginChannelId,
                EndSpanID = :endSpanId,
                EndChannelID = :endChannelId,
                SeekType = :seekType,
                VDNID = :vdnId,
                CallerCapacity = :callerCapacity
          WHERE ID = :id`,
        { replacements: row, type: QueryTypes.UPDATE }
    );
    return ret;
};

Dao.channelGroupSelectById = async (id) => {
    const rows = await sequelize().query(
        `SELECT ${ROW_SELECT} FROM t_icc_base_channelgroup WHERE ID = :id`,
        { replacements: { id }, type: QueryTypes.SELECT }
    );
    return rows[0] || null;
};

/** 精确名查询（与 selSysChannelGroupJq 一致） */
Dao.channelGroupByNameExact = async (name) => {
    const rows = await sequelize().query(
        `SELECT ${ROW_SELECT} FROM t_icc_base_channelgroup WHERE Name = :name`,
        { replacements: { name }, type: QueryTypes.SELECT }
    );
    return rows[0] || null;
};

/** Name=:name AND ID=:id（编辑时校验是否仍为当前行） */
Dao.channelGroupForEdit = async (name, id) => {
    const rows = await sequelize().query(
        `SELECT ${ROW_SELECT} FROM t_icc_base_channelgroup WHERE Name = :name AND ID = :id`,
        { replacements: { name, id }, type: QueryTypes.SELECT }
    );
    return rows[0] || null;
};

/** Name!=:name1 AND Name=:name2（重名检测） */
Dao.channelGroupForEditElse = async (name1, name2) => {
    const rows = await sequelize().query(
        `SELECT ${ROW_SELECT} FROM t_icc_base_channelgroup WHERE Name != :name1 AND Name = :name2`,
        { replacements: { name1, name2 }, type: QueryTypes.SELECT }
    );
    return rows[0] || null;
};

Dao.channelGroupListPage = async (name, offset, limit) => {
    const hasName = name != null && String(name).trim() !== '';
    const sql = hasName
        ? `SELECT ${ROW_SELECT} FROM t_icc_base_channelgroup
            WHERE Name LIKE CONCAT('%', :name, '%')
            ORDER BY Name, BeginSpanID, BeginChannelID, EndSpanID, EndChannelID ASC
            LIMIT :offset, :limit`
        : `SELECT ${ROW_SELECT} FROM t_icc_base_channelgroup
            ORDER BY Name, BeginSpanID, BeginChannelID, EndSpanID, EndChannelID ASC
            LIMIT :offset, :limit`;
    return sequelize().query(sql, {
        replacements: hasName ? { name: String(name).trim(), offset, limit } : { offset, limit },
        type: QueryTypes.SELECT,
    });
};

Dao.channelGroupCount = async (name) => {
    const hasName = name != null && String(name).trim() !== '';
    const sql = hasName
        ? `SELECT COUNT(1) AS c FROM t_icc_base_channelgroup WHERE Name LIKE CONCAT('%', :name, '%')`
        : `SELECT COUNT(1) AS c FROM t_icc_base_channelgroup`;
    const rows = await sequelize().query(sql, {
        replacements: hasName ? { name: String(name).trim() } : {},
        type: QueryTypes.SELECT,
    });
    return Number(rows?.[0]?.c || 0);
};

Dao.channelGroupDeleteByIds = async (ids) => {
    if (!ids.length) return 0;
    const marks = ids.map((_, i) => `:d${i}`).join(',');
    const repl = {};
    ids.forEach((id, i) => { repl[`d${i}`] = id; });
    const [ret] = await sequelize().query(
        `DELETE FROM t_icc_base_channelgroup WHERE ID IN (${marks})`,
        { replacements: repl, type: QueryTypes.DELETE }
    );
    return ret;
};

/** 被呼出路由引用的通道组（checkChannelGroupUsed） */
Dao.channelGroupCheckUsed = async (ids) => {
    if (!ids.length) return [];
    const marks = ids.map((_, i) => `:u${i}`).join(',');
    const repl = {};
    ids.forEach((id, i) => { repl[`u${i}`] = id; });
    return sequelize().query(
        `SELECT DISTINCT t1.ID AS id, t2.ChGroup AS name
           FROM t_icc_base_channelgroup t1
     INNER JOIN t_icc_base_calloutrouter t2 ON t1.Name = t2.ChGroup
          WHERE t1.ID IN (${marks})`,
        { replacements: repl, type: QueryTypes.SELECT }
    );
};

module.exports = Dao;
