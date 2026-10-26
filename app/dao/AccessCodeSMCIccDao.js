const Db = require('./db');
const { QueryTypes } = require('sequelize');

const Dao = {};

function sequelize() {
    return Db.db_smcicc.sequelize;
}

Dao.list = async ({ calledCode = '', page = 1, pageSize = 10 }) => {
    const offset = (Math.max(1, Number(page)) - 1) * Math.max(1, Number(pageSize));
    const limit = Math.max(1, Number(pageSize));
    const rows = await sequelize().query(
        `SELECT a.ID AS id, a.Code AS code, a.VDNID AS vdnId, b.ID AS mediaTypeId, b.Name AS mediaTypeName
           FROM t_icc_base_accesscode a
      LEFT JOIN t_icc_base_mediatype b ON a.MediaType = b.ID
          WHERE a.Code LIKE CONCAT('%', :calledCode, '%')
          ORDER BY CAST(a.Code AS SIGNED) DESC
          LIMIT :offset, :limit`,
        { replacements: { calledCode, offset, limit }, type: QueryTypes.SELECT }
    );
    const totalRow = await sequelize().query(
        `SELECT COUNT(1) AS total
           FROM t_icc_base_accesscode
          WHERE Code LIKE CONCAT('%', :calledCode, '%')`,
        { replacements: { calledCode }, type: QueryTypes.SELECT }
    );
    return { rows, total: Number(totalRow?.[0]?.total || 0) };
};

Dao.findByCode = async (code) => {
    const rows = await sequelize().query(
        `SELECT ID AS id, Code AS code, MediaType AS mediaType
           FROM t_icc_base_accesscode
          WHERE code = :code`,
        { replacements: { code }, type: QueryTypes.SELECT }
    );
    return rows[0] || null;
};

Dao.findAllByCode = async (code) => {
    return sequelize().query(
        `SELECT ID AS id, Code AS code
           FROM t_icc_base_accesscode
          WHERE code = :code`,
        { replacements: { code }, type: QueryTypes.SELECT }
    );
};

Dao.insert = async ({ code, mediaTypeId }) => {
    const [ret] = await sequelize().query(
        `INSERT INTO t_icc_base_accesscode (id, Code, MediaType, VDNID)
         SELECT IFNULL(MAX(id) + 1, 1), :code, :mediaTypeId, -1 FROM t_icc_base_accesscode`,
        { replacements: { code, mediaTypeId }, type: QueryTypes.INSERT }
    );
    return ret;
};

Dao.update = async ({ id, code, mediaTypeId }) => {
    const [ret] = await sequelize().query(
        `UPDATE t_icc_base_accesscode
            SET Code = :code, MediaType = :mediaTypeId
          WHERE ID = :id`,
        { replacements: { id, code, mediaTypeId }, type: QueryTypes.UPDATE }
    );
    return ret;
};

Dao.deleteByIds = async (ids) => {
    if (!ids.length) return 0;
    const marks = ids.map((_, i) => `:id${i}`).join(',');
    const replacements = {};
    ids.forEach((id, i) => { replacements[`id${i}`] = id; });
    const [ret] = await sequelize().query(
        `DELETE FROM t_icc_base_accesscode WHERE ID IN (${marks})`,
        { replacements, type: QueryTypes.DELETE }
    );
    return ret;
};

Dao.listByNotAssign = async () => {
    return sequelize().query(
        `SELECT ID AS id, code, VDNID AS vdnId
           FROM t_icc_base_accesscode
          WHERE VDNID = -1`,
        { type: QueryTypes.SELECT }
    );
};

Dao.listByNotAssignSelf = async (vdnId) => {
    return sequelize().query(
        `SELECT ID AS id, code, VDNID AS vdnId
           FROM t_icc_base_accesscode
          WHERE VDNID = -1 OR VDNID = :vdnId`,
        { replacements: { vdnId }, type: QueryTypes.SELECT }
    );
};

Dao.loadMediaTypeList = async () => {
    return sequelize().query(
        `SELECT ID AS id, Name AS name, IsAccessMedia AS isAccessMedia, IsRunTime AS isRunTime, Description AS description
           FROM t_icc_base_mediatype`,
        { type: QueryTypes.SELECT }
    );
};

/** xml_curl dialplan：全部有效接入码（含通配 *） */
Dao.listForXmlCurlDialplan = async () => {
    return sequelize().query(
        `SELECT ID AS id, Code AS code, MediaType AS mediaType, VDNID AS vdnId
           FROM t_icc_base_accesscode
          WHERE Code IS NOT NULL AND TRIM(Code) <> ''
          ORDER BY ID ASC`,
        { type: QueryTypes.SELECT }
    );
};

module.exports = Dao;
