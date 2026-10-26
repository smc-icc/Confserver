const Db = require('./db');
const { QueryTypes } = require('sequelize');

const TARGET_TYPE_IVR_ADMIN = 'IVR_ADMIN';
const Dao = {};

function sequelize() {
    return Db.db_smcicc.sequelize;
}

/** MySQL + Sequelize 6：DELETE/INSERT 有时返回标量而非 [result, meta] 元组 */
function mutationResult(result) {
    return Array.isArray(result) ? result[0] : result;
}

Dao.listByVdnId = async (vdnId, targetType = TARGET_TYPE_IVR_ADMIN) => sequelize().query(
    `SELECT b.ID AS id,
            b.VDNID AS vdnId,
            b.NodeID AS nodeId,
            b.TargetType AS targetType,
            b.Enabled AS enabled,
            IFNULL(b.Remark, '') AS remark,
            t.MyName AS myName
       FROM t_icc_vdn_node_bind b
  LEFT JOIN t_icc_cfg_tas t ON t.MyID = b.NodeID
      WHERE b.VDNID = :vdnId
        AND b.TargetType = :targetType
      ORDER BY b.NodeID ASC`,
    { replacements: { vdnId, targetType }, type: QueryTypes.SELECT }
);

Dao.listActiveNodeIdsByVdnId = async (vdnId, targetType = TARGET_TYPE_IVR_ADMIN) => {
    const rows = await sequelize().query(
        `SELECT DISTINCT NodeID AS nodeId
           FROM t_icc_vdn_node_bind
          WHERE VDNID = :vdnId
            AND TargetType = :targetType
            AND Enabled = 1
            AND NodeID > 0`,
        { replacements: { vdnId, targetType }, type: QueryTypes.SELECT }
    );
    return rows.map((row) => Number(row.nodeId)).filter((nodeId) => nodeId > 0);
};

Dao.deleteByVdnIds = async (vdnIds, targetType = null) => {
    if (!Array.isArray(vdnIds) || !vdnIds.length) return 0;
    const marks = vdnIds.map((_, idx) => `:id${idx}`).join(',');
    const replacements = {};
    vdnIds.forEach((id, idx) => {
        replacements[`id${idx}`] = id;
    });
    let where = `VDNID IN (${marks})`;
    if (targetType) {
        replacements.targetType = targetType;
        where += ' AND TargetType = :targetType';
    }
    const ret = mutationResult(await sequelize().query(
        `DELETE FROM t_icc_vdn_node_bind WHERE ${where}`,
        { replacements, type: QueryTypes.DELETE }
    ));
    return ret;
};

Dao.insertBatch = async ({ vdnId, nodeIds, targetType = TARGET_TYPE_IVR_ADMIN }) => {
    if (!Array.isArray(nodeIds) || !nodeIds.length) return 0;
    const idRows = await sequelize().query(
        'SELECT IFNULL(MAX(ID), 0) AS maxId FROM t_icc_vdn_node_bind',
        { type: QueryTypes.SELECT }
    );
    let nextId = Number(idRows?.[0]?.maxId || 0);
    const values = [];
    const replacements = { vdnId, targetType };
    nodeIds.forEach((nodeId, idx) => {
        nextId += 1;
        replacements[`id${idx}`] = nextId;
        replacements[`nodeId${idx}`] = nodeId;
        values.push(`(:id${idx}, :vdnId, :nodeId${idx}, :targetType, 1, '')`);
    });
    const ret = mutationResult(await sequelize().query(
        `INSERT INTO t_icc_vdn_node_bind (ID, VDNID, NodeID, TargetType, Enabled, Remark)
         VALUES ${values.join(',')}`,
        { replacements, type: QueryTypes.INSERT }
    ));
    return ret;
};

Dao.replaceByVdnId = async ({ vdnId, nodeIds, targetType = TARGET_TYPE_IVR_ADMIN }) => {
    await Dao.deleteByVdnIds([vdnId], targetType);
    return Dao.insertBatch({ vdnId, nodeIds, targetType });
};

Dao.TARGET_TYPE_IVR_ADMIN = TARGET_TYPE_IVR_ADMIN;

module.exports = Dao;
