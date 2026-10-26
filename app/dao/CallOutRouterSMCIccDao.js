const Db = require('./db');
const { QueryTypes } = require('sequelize');

const Dao = {};

function sequelize() {
    return Db.db_smcicc.sequelize;
}

const ROW_SELECT = `A.Num AS num, A.Device AS device, A.Ch AS ch, B.Name AS chGroup, B.ID AS chGroupId,
      A.Description AS description, A.AgentMode AS agentMode, A.RouterType AS routerType,
      A.CallOutCalledNumType AS callOutCalledNumType, A.VDNID AS vdnId`;

Dao.callOutRouterInsert = async (row) => {
    const [ret] = await sequelize().query(
        `INSERT INTO t_icc_base_calloutrouter (Num, Device, Ch, ChGroup, Description, AgentMode, RouterType, CallOutCalledNumType, VDNID)
         VALUES (:num, :device, :ch, :chGroup, :description, :agentMode, :routerType, :callOutCalledNumType, :vdnId)`,
        { replacements: row, type: QueryTypes.INSERT }
    );
    return ret;
};

Dao.callOutRouterUpdate = async (row) => {
    const [ret] = await sequelize().query(
        `UPDATE t_icc_base_calloutrouter
            SET Device = :device, Ch = :ch, ChGroup = :chGroup, Description = :description,
                AgentMode = :agentMode, RouterType = :routerType, Num = :num, CallOutCalledNumType = :callOutCalledNumType
          WHERE VDNID = :vdnId AND Num = :oldNum`,
        { replacements: row, type: QueryTypes.UPDATE }
    );
    return ret;
};

Dao.callOutRouterDeleteOne = async (num, vdnId) => {
    const [ret] = await sequelize().query(
        `DELETE FROM t_icc_base_calloutrouter WHERE Num = :num AND VDNID = :vdnId`,
        { replacements: { num, vdnId }, type: QueryTypes.DELETE }
    );
    return ret;
};

Dao.callOutRouterCountByNum = async (vdnId, num) => {
    const rows = await sequelize().query(
        `SELECT COUNT(1) AS c FROM t_icc_base_calloutrouter WHERE VDNID = :vdnId AND Num = :num`,
        { replacements: { vdnId, num }, type: QueryTypes.SELECT }
    );
    return Number(rows?.[0]?.c || 0);
};

Dao.callOutRouterListPage = async ({ vdnId, num, device, chGroup, ch, offset, limit }) => {
    const cond = ['A.VDNID = :vdnId'];
    const repl = { vdnId, offset, limit };
    if (num != null && String(num).trim() !== '') {
        cond.push('A.Num LIKE CONCAT("%", :numLike, "%")');
        repl.numLike = String(num).trim();
    }
    if (device !== undefined && device !== null && device !== '') {
        cond.push('A.Device = :device');
        repl.device = Number(device);
    }
    if (chGroup != null && String(chGroup).trim() !== '') {
        cond.push('A.ChGroup LIKE CONCAT("%", :chGroupLike, "%")');
        repl.chGroupLike = String(chGroup).trim();
    }
    if (ch != null && String(ch).trim() !== '') {
        cond.push('CAST(A.Ch AS CHAR) LIKE CONCAT("%", :chLike, "%")');
        repl.chLike = String(ch).trim();
    }
    const where = cond.join(' AND ');
    const rows = await sequelize().query(
        `SELECT ${ROW_SELECT}
           FROM t_icc_base_calloutrouter A
      LEFT JOIN t_icc_base_channelgroup B ON A.ChGroup = B.Name
          WHERE ${where}
          ORDER BY A.Num ASC
          LIMIT :offset, :limit`,
        { replacements: repl, type: QueryTypes.SELECT }
    );
    return rows;
};

Dao.callOutRouterCount = async ({ vdnId, num, device, chGroup, ch }) => {
    const cond = ['VDNID = :vdnId'];
    const repl = { vdnId };
    if (num != null && String(num).trim() !== '') {
        cond.push('Num LIKE CONCAT("%", :numLike, "%")');
        repl.numLike = String(num).trim();
    }
    if (device !== undefined && device !== null && device !== '') {
        cond.push('Device = :device');
        repl.device = Number(device);
    }
    if (chGroup != null && String(chGroup).trim() !== '') {
        cond.push('ChGroup LIKE CONCAT("%", :chGroupLike, "%")');
        repl.chGroupLike = String(chGroup).trim();
    }
    if (ch != null && String(ch).trim() !== '') {
        cond.push('CAST(Ch AS CHAR) LIKE CONCAT("%", :chLike, "%")');
        repl.chLike = String(ch).trim();
    }
    const where = cond.join(' AND ');
    const rows = await sequelize().query(
        `SELECT COUNT(1) AS c FROM t_icc_base_calloutrouter WHERE ${where}`,
        { replacements: repl, type: QueryTypes.SELECT }
    );
    return Number(rows?.[0]?.c || 0);
};

/** 与 ChannelGroupMapper.selChannelGroupByNum + VDN */
Dao.channelGroupByRouterNum = async (num, vdnId) => {
    const rows = await sequelize().query(
        `SELECT t2.ID AS id, t2.Name AS name, t2.BeginSpanID AS beginSpanId, t2.BeginChannelID AS beginChannelId,
                t2.EndSpanID AS endSpanId, t2.EndChannelID AS endChannelId
           FROM t_icc_base_calloutrouter t1
     INNER JOIN t_icc_base_channelgroup t2 ON t1.ChGroup = t2.Name
          WHERE t1.Num = :num AND t1.VDNID = :vdnId
          LIMIT 1`,
        { replacements: { num, vdnId }, type: QueryTypes.SELECT }
    );
    return rows[0] || null;
};

module.exports = Dao;
