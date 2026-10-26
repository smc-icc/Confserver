const Db = require('./db');
const { QueryTypes } = require('sequelize');
const Identity = require('./ExtensionIdentityDao');
const VideoConfig = require('./AgentVideoConfigDao');

const Dao = {};

function sequelize() {
    return Db.db_smcicc.sequelize;
}

Dao.list = async ({ vdnId, workNo = '', extNum = '', pageNum = 1, pageSize = 30 }) => {
    const offset = (Math.max(1, Number(pageNum)) - 1) * Math.max(1, Number(pageSize));
    const limit = Math.max(1, Number(pageSize));
    const rows = await sequelize().query(
        `SELECT VDNID AS vdnId, WorkNO AS workNo, Passwd AS passwd, ExtNum AS extNum,
                id, ifuse AS ifUse, AutoDialNO AS autoDialNo, IsAutoDial AS isAutoDial, MyID AS myId
           FROM t_icc_telag_staticlogin
          WHERE VDNID = :vdnId
            AND ExtNum LIKE :extNum
            AND WorkNO LIKE :workNo
          ORDER BY WorkNO * 1 ASC
          LIMIT :offset, :limit`,
        { replacements: { vdnId, extNum: `%${extNum}%`, workNo: `%${workNo}%`, offset, limit }, type: QueryTypes.SELECT }
    );
    const totalRow = await sequelize().query(
        `SELECT COUNT(1) AS total
           FROM t_icc_telag_staticlogin
          WHERE VDNID = :vdnId
            AND ExtNum LIKE :extNum
            AND WorkNO LIKE :workNo`,
        { replacements: { vdnId, extNum: `%${extNum}%`, workNo: `%${workNo}%` }, type: QueryTypes.SELECT }
    );
    return { rows, total: Number(totalRow?.[0]?.total || 0) };
};

Dao.findByPrimary = async ({ vdnId, workNo }) => {
    return sequelize().query(
        `SELECT VDNID AS vdnId, WorkNO AS workNo, Passwd AS passwd, ExtNum AS extNum,
                id, ifuse AS ifUse, AutoDialNO AS autoDialNo, IsAutoDial AS isAutoDial, MyID AS myId
           FROM t_icc_telag_staticlogin
          WHERE VDNID = :vdnId AND WorkNO = :workNo`,
        { replacements: { vdnId, workNo }, type: QueryTypes.SELECT }
    );
};

Dao.countByWorkNo = async ({ vdnId, workNo, oldWorkNo = '' }) => {
    const row = await sequelize().query(
        `SELECT COUNT(1) AS c
           FROM t_icc_telag_staticlogin
          WHERE vdnId = :vdnId
            AND workno = :workNo
            AND workno <> :oldWorkNo`,
        { replacements: { vdnId, workNo, oldWorkNo }, type: QueryTypes.SELECT }
    );
    return Number(row?.[0]?.c || 0);
};

Dao.countByExtNum = async ({ vdnId, extNum, oldExtNum = '' }) => {
    const row = await sequelize().query(
        `SELECT COUNT(1) AS c
           FROM t_icc_telag_staticlogin
          WHERE vdnId = :vdnId
            AND extNum = :extNum
            AND extNum <> :oldExtNum`,
        { replacements: { vdnId, extNum, oldExtNum }, type: QueryTypes.SELECT }
    );
    return Number(row?.[0]?.c || 0);
};

async function assertIdentity(row, transaction) {
    if (Number(row.ifUse) !== 1 || !row.extNum) return;
    const [user] = await sequelize().query('SELECT ID AS id FROM t_user_users WHERE WorkNO=:workNo AND VDNID=:vdnId FOR UPDATE',
        { replacements: { workNo: row.workNo, vdnId: row.vdnId }, type: QueryTypes.SELECT, transaction, logging: false });
    if (!user) throw Object.assign(new Error('坐席不存在或不属于当前 VDN'), { status: 409 });
    const [extension] = await sequelize().query('SELECT Num AS num FROM t_icc_base_extension WHERE Num=:extension AND VDN=:vdnId AND IsValid=1 FOR UPDATE',
        { replacements: { extension: row.extNum, vdnId: row.vdnId }, type: QueryTypes.SELECT, transaction, logging: false });
    if (!extension) throw Object.assign(new Error('电话分机不存在、已停用或不属于当前 VDN'), { status: 409 });
    await VideoConfig.assertTelephoneAvailable({ extension: row.extNum, userId: user.id, vdnId: row.vdnId, workNo: row.oldWorkNo || row.workNo }, transaction);
}

Dao.insert = async (row, transaction) => {
    if (!transaction) return Identity.withTransaction(t => Dao.insert(row, t));
    await assertIdentity(row, transaction);
    const [ret] = await sequelize().query(
        `INSERT INTO t_icc_telag_staticlogin
            (VDNID, WorkNO, Passwd, ExtNum, id, ifuse, AutoDialNO, IsAutoDial, MyID)
         VALUES
            (:vdnId, :workNo, :passwd, :extNum, :id, :ifUse, :autoDialNo, :isAutoDial, :myId)`,
        { replacements: row, type: QueryTypes.INSERT, transaction, logging: false }
    );
    return ret;
};

Dao.updateByOldWorkNo = async (row, transaction) => {
    if (!transaction) return Identity.withTransaction(t => Dao.updateByOldWorkNo(row, t));
    await assertIdentity(row, transaction);
    const { vdnId, passwd, extNum, ifUse, autoDialNo, isAutoDial, myId, workNo, oldWorkNo } = row;
    const [ret] = await sequelize().query(
        `UPDATE t_icc_telag_staticlogin
            SET Passwd = :passwd,
                ExtNum = :extNum,
                ifuse = :ifUse,
                AutoDialNO = :autoDialNo,
                IsAutoDial = :isAutoDial,
                MyID = :myId,
                WorkNO = :workNo
          WHERE VDNID = :vdnId
            AND WorkNO = :oldWorkNo`,
        { replacements: { vdnId, passwd, extNum, ifUse, autoDialNo, isAutoDial, myId, workNo, oldWorkNo }, type: QueryTypes.UPDATE, transaction, logging: false }
    );
    return ret;
};

Dao.deleteByWorkNo = async ({ workNo }) => {
    const [ret] = await sequelize().query(
        `DELETE FROM t_icc_telag_staticlogin WHERE WorkNO = :workNo`,
        { replacements: { workNo }, type: QueryTypes.DELETE }
    );
    return ret;
};

Dao.getUserPasswordByWorkNo = async ({ workNo, vdnId }) => {
    const rows = await sequelize().query(
        `SELECT PassWord AS password
           FROM t_user_users
          WHERE VDNID = :vdnId
            AND WorkNO = :workNo
          LIMIT 1`,
        { replacements: { workNo, vdnId }, type: QueryTypes.SELECT }
    );
    return rows[0]?.password || '';
};

Dao.getUserByWorkNo = async ({ workNo = '', vdnId }) => {
    return sequelize().query(
        `SELECT WorkNO AS workNo
           FROM t_user_users
          WHERE VDNID = :vdnId
            AND WorkNO LIKE :workNo
          ORDER BY WorkNO ASC
          LIMIT 0, 10`,
        { replacements: { workNo: `${workNo}%`, vdnId }, type: QueryTypes.SELECT }
    );
};

Dao.getUserList = async ({ key = '', vdnId }) => {
    return sequelize().query(
        `SELECT ID AS id, WorkNO AS workNo, Name AS name
           FROM t_user_users
          WHERE VDNID = :vdnId
            AND WorkNO LIKE CONCAT(:key, '%')
          ORDER BY WorkNO ASC`,
        { replacements: { key, vdnId }, type: QueryTypes.SELECT }
    );
};

Dao.listAllStaticLoginWorkNos = async () => {
    return sequelize().query(
        `SELECT WorkNO AS workNo FROM t_icc_telag_staticlogin`,
        { type: QueryTypes.SELECT }
    );
};

module.exports = Dao;
