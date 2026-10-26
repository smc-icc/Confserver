const Db = require('./db');
const { QueryTypes } = require('sequelize');

const Dao = {};
let parentIdColumnExists = null;
let itrDefaultFlowIdColumnExists = null;
let realTimeSpeechRecogColumnExists = null;
let asrEngineColumnExists = null;

function sequelize() {
    return Db.db_smcicc.sequelize;
}

async function hasParentIdColumn() {
    if (parentIdColumnExists !== null) {
        return parentIdColumnExists;
    }
    try {
        const rows = await sequelize().query(
            `SHOW COLUMNS FROM t_icc_vdn LIKE 'ParentId'`,
            { type: QueryTypes.SELECT }
        );
        parentIdColumnExists = Array.isArray(rows) && rows.length > 0;
    } catch (e) {
        parentIdColumnExists = false;
    }
    return parentIdColumnExists;
}

function parentIdExpr(columnRef) {
    return `IFNULL(${columnRef}, -1) AS parentId`;
}

async function hasItrDefaultFlowIdColumn() {
    if (itrDefaultFlowIdColumnExists !== null) {
        return itrDefaultFlowIdColumnExists;
    }
    try {
        const rows = await sequelize().query(
            `SHOW COLUMNS FROM t_icc_vdn LIKE 'ItrDefaultFlowId'`,
            { type: QueryTypes.SELECT }
        );
        if (Array.isArray(rows) && rows.length > 0) {
            itrDefaultFlowIdColumnExists = true;
            return true;
        }
        await sequelize().query(
            `ALTER TABLE t_icc_vdn ADD COLUMN ItrDefaultFlowId int(11) NOT NULL DEFAULT 0 COMMENT '全媒体默认ITR流程ID，0=用Omni环境变量'`
        );
        itrDefaultFlowIdColumnExists = true;
        return true;
    } catch (e) {
        itrDefaultFlowIdColumnExists = false;
        return false;
    }
}

function itrDefaultFlowSelect(alias) {
    const col = alias ? `${alias}.ItrDefaultFlowId` : 'ItrDefaultFlowId';
    return `IFNULL(${col}, 0) AS itrDefaultFlowId`;
}

async function hasRealTimeSpeechRecogColumn() {
    if (realTimeSpeechRecogColumnExists !== null) {
        return realTimeSpeechRecogColumnExists;
    }
    try {
        const rows = await sequelize().query(
            `SHOW COLUMNS FROM t_icc_vdn LIKE 'RealTimeSpeechRecog'`,
            { type: QueryTypes.SELECT }
        );
        if (Array.isArray(rows) && rows.length > 0) {
            realTimeSpeechRecogColumnExists = true;
            return true;
        }
        await sequelize().query(
            `ALTER TABLE t_icc_vdn ADD COLUMN RealTimeSpeechRecog int(11) NOT NULL DEFAULT 0 COMMENT '坐席接通后实时转写：0关，1开'`
        );
        realTimeSpeechRecogColumnExists = true;
        return true;
    } catch (e) {
        realTimeSpeechRecogColumnExists = false;
        return false;
    }
}

function realTimeSpeechRecogSelect(alias) {
    const col = alias ? `${alias}.RealTimeSpeechRecog` : 'RealTimeSpeechRecog';
    return `IFNULL(${col}, 0) AS realTimeSpeechRecog`;
}

async function hasAsrEngineColumn() {
    if (asrEngineColumnExists !== null) {
        return asrEngineColumnExists;
    }
    try {
        const rows = await sequelize().query(
            `SHOW COLUMNS FROM t_icc_vdn LIKE 'AsrEngine'`,
            { type: QueryTypes.SELECT }
        );
        if (Array.isArray(rows) && rows.length > 0) {
            asrEngineColumnExists = true;
            return true;
        }
        await sequelize().query(
            `ALTER TABLE t_icc_vdn ADD COLUMN AsrEngine varchar(32) NOT NULL DEFAULT 'ali' COMMENT 'ASR引擎：ali（默认）/funasr/whisper'`
        );
        asrEngineColumnExists = true;
        return true;
    } catch (e) {
        asrEngineColumnExists = false;
        return false;
    }
}

function asrEngineSelect(alias) {
    const col = alias ? `${alias}.AsrEngine` : 'AsrEngine';
    return `IFNULL(${col}, 'ali') AS asrEngine`;
}

Dao.listJoin = async ({ vdnName = '', page = 1, pageSize = 10 }) => {
    const offset = (Math.max(1, Number(page)) - 1) * Math.max(1, Number(pageSize));
    const limit = Math.max(1, Number(pageSize));
    const selectParentId = (await hasParentIdColumn())
        ? parentIdExpr('vdn.ParentId')
        : '-1 AS parentId';
    const selectItrFlow = (await hasItrDefaultFlowIdColumn())
        ? itrDefaultFlowSelect('vdn')
        : '0 AS itrDefaultFlowId';
    const selectRtsr = (await hasRealTimeSpeechRecogColumn())
        ? realTimeSpeechRecogSelect('vdn')
        : '0 AS realTimeSpeechRecog';
    const selectAsrEngine = (await hasAsrEngineColumn())
        ? asrEngineSelect('vdn')
        : "'ali' AS asrEngine";
    const rows = await sequelize().query(
        `SELECT vdn.ID AS id, vdn.Name AS name, ${selectParentId}, ${selectItrFlow}, ${selectRtsr}, ${selectAsrEngine},
                vdn.StartRecord AS startRecord, IFNULL(vdn.RecordWorkNo, 0) AS recordWorkNo,
                IFNULL(vdn.SipExtStatusSupport, 0) AS sipExtStatusSupport
           FROM t_icc_vdn vdn
          WHERE (:vdnName = '' OR vdn.Name LIKE CONCAT('%', :vdnName, '%'))
          ORDER BY vdn.ID ASC
          LIMIT :offset, :limit`,
        { replacements: { vdnName, offset, limit }, type: QueryTypes.SELECT }
    );
    const totalRow = await sequelize().query(
        `SELECT COUNT(1) AS total
           FROM t_icc_vdn vdn
          WHERE (:vdnName = '' OR vdn.Name LIKE CONCAT('%', :vdnName, '%'))`,
        { replacements: { vdnName }, type: QueryTypes.SELECT }
    );
    return { rows, total: Number(totalRow?.[0]?.total || 0) };
};

Dao.findByVdnId = async (id) => {
    const selectParentId = (await hasParentIdColumn())
        ? parentIdExpr('ParentId')
        : '-1 AS parentId';
    const selectItrFlow = (await hasItrDefaultFlowIdColumn())
        ? itrDefaultFlowSelect()
        : '0 AS itrDefaultFlowId';
    const rows = await sequelize().query(
        `SELECT ID AS id, Name AS name, ${selectParentId}, ${selectItrFlow}
           FROM t_icc_vdn
          WHERE ID = :id`,
        { replacements: { id }, type: QueryTypes.SELECT }
    );
    return rows[0] || null;
};

Dao.findByName = async (name) => {
    const selectParentId = (await hasParentIdColumn())
        ? parentIdExpr('ParentId')
        : '-1 AS parentId';
    const rows = await sequelize().query(
        `SELECT ID AS id, Name AS name, ${selectParentId}
           FROM t_icc_vdn
          WHERE Name = :name`,
        { replacements: { name }, type: QueryTypes.SELECT }
    );
    return rows[0] || null;
};

Dao.insertVdn = async ({ id, name, parentId }) => {
    await require('../service/integration/VdnIdSafety').assertUnused(id);
    if (!(await hasParentIdColumn())) {
        const [ret] = await sequelize().query(
            `INSERT INTO t_icc_vdn (
                id, Name, MaxAgentSignIn, MaxWebCall, MaxOBSCall, MaxPSTNCall, CancelQueueDTMF,
                MaxTalkingTime, AnswerStyle, SystemVoiceID, MaxWaitAnswerTime, AgentGroupAllocPolicy,
                WaitingMusic, MaxACWTime, StartRecord, CallOutCallingNum, OnceSolveRefDays, OBSFlowFileName,
                CallOutCallingNumType, CallOutCalledNumType, SipExtStatusSupport
            ) VALUES (
                :id, :name, 80, 20, 30, 40, '', -1, 1, 205, 30, 0, 'queue.wav', 20, 1, '38258421', 30, 'flow_2049.xml', -1, -1, 1
            )`,
            { replacements: { id, name }, type: QueryTypes.INSERT }
        );
        return ret;
    }
    const [ret] = await sequelize().query(
        `INSERT INTO t_icc_vdn (
            id, Name, MaxAgentSignIn, MaxWebCall, MaxOBSCall, MaxPSTNCall, CancelQueueDTMF,
            MaxTalkingTime, AnswerStyle, SystemVoiceID, MaxWaitAnswerTime, AgentGroupAllocPolicy,
            WaitingMusic, MaxACWTime, StartRecord, CallOutCallingNum, OnceSolveRefDays, OBSFlowFileName, ParentId,
            CallOutCallingNumType, CallOutCalledNumType, SipExtStatusSupport
        ) VALUES (
            :id, :name, 80, 20, 30, 40, '', -1, 1, 205, 30, 0, 'queue.wav', 20, 1, '38258421', 30, 'flow_2049.xml', :parentId, -1, -1, 1
        )`,
        { replacements: { id, name, parentId }, type: QueryTypes.INSERT }
    );
    return ret;
};

Dao.updateByVdn = async ({ id, name, parentId, startRecord, recordWorkNo, sipExtStatusSupport, itrDefaultFlowId, realTimeSpeechRecog, asrEngine }) => {
    const hasFlags = startRecord !== undefined || recordWorkNo !== undefined
        || sipExtStatusSupport !== undefined || realTimeSpeechRecog !== undefined;
    const start = Number(startRecord) ? 1 : 0;
    const workNo = start && Number(recordWorkNo) ? 1 : 0;
    const sipExt = Number(sipExtStatusSupport) ? 1 : 0;
    const includeRtsr = realTimeSpeechRecog !== undefined && (await hasRealTimeSpeechRecogColumn());
    const includeAsrEngine = asrEngine !== undefined && (await hasAsrEngineColumn());
    const validEngines = ['ali', 'funasr', 'whisper'];
    const safeEngine = validEngines.includes(asrEngine) ? asrEngine : 'ali';
    const flagSql = hasFlags
        ? (startRecord !== undefined ? ', StartRecord = :startRecord' : '')
            + (startRecord !== undefined || recordWorkNo !== undefined ? ', RecordWorkNo = :recordWorkNo' : '')
            + (sipExtStatusSupport !== undefined ? ', SipExtStatusSupport = :sipExtStatusSupport' : '')
            + (includeRtsr ? ', RealTimeSpeechRecog = :realTimeSpeechRecog' : '')
            + (includeAsrEngine ? ', AsrEngine = :asrEngine' : '')
        : (includeAsrEngine ? ', AsrEngine = :asrEngine' : '');
    const flags = hasFlags
        ? {
            startRecord: start,
            recordWorkNo: workNo,
            sipExtStatusSupport: sipExt,
            ...(includeRtsr ? { realTimeSpeechRecog: Number(realTimeSpeechRecog) ? 1 : 0 } : {}),
            ...(includeAsrEngine ? { asrEngine: safeEngine } : {}),
          }
        : (includeAsrEngine ? { asrEngine: safeEngine } : {});
    const flowId = Math.max(0, Number(itrDefaultFlowId) || 0);
    const itrSql = (await hasItrDefaultFlowIdColumn()) && itrDefaultFlowId !== undefined
        ? ', ItrDefaultFlowId = :itrDefaultFlowId'
        : '';
    const itrFlags = itrSql ? { itrDefaultFlowId: flowId } : {};
    if (!(await hasParentIdColumn())) {
        const [ret] = await sequelize().query(
            `UPDATE t_icc_vdn
                SET ID = :id, Name = :name${flagSql}${itrSql}
              WHERE ID = :id`,
            { replacements: { id, name, ...flags, ...itrFlags }, type: QueryTypes.UPDATE }
        );
        return ret;
    }
    const [ret] = await sequelize().query(
        `UPDATE t_icc_vdn
            SET ID = :id, Name = :name, ParentId = :parentId${flagSql}${itrSql}
          WHERE ID = :id`,
        { replacements: { id, name, parentId, ...flags, ...itrFlags }, type: QueryTypes.UPDATE }
    );
    return ret;
};

Dao.updateAccessCodeByVdn = async ({ vdnId, accessCodeIds }) => {
    if (!accessCodeIds.length) return 0;
    const marks = accessCodeIds.map((_, i) => `:id${i}`).join(',');
    const replacements = { vdnId };
    accessCodeIds.forEach((id, i) => { replacements[`id${i}`] = id; });
    const [ret] = await sequelize().query(
        `UPDATE t_icc_base_accesscode
            SET VDNID = :vdnId
          WHERE ID IN (${marks})`,
        { replacements, type: QueryTypes.UPDATE }
    );
    return ret;
};

Dao.updateAccessCodeToNotAssign = async (accessCodeIds) => {
    if (!accessCodeIds.length) return 0;
    const marks = accessCodeIds.map((_, i) => `:id${i}`).join(',');
    const replacements = {};
    accessCodeIds.forEach((id, i) => { replacements[`id${i}`] = id; });
    const [ret] = await sequelize().query(
        `UPDATE t_icc_base_accesscode
            SET VDNID = -1
          WHERE ID IN (${marks})`,
        { replacements, type: QueryTypes.UPDATE }
    );
    return ret;
};

Dao.listAccessCodesByVdnId = async (vdnId) => {
    return sequelize().query(
        `SELECT ID AS id, code, VDNID AS vdnId
           FROM t_icc_base_accesscode
          WHERE VDNID = :vdnId`,
        { replacements: { vdnId }, type: QueryTypes.SELECT }
    );
};

Dao.checkServiceRouteAccessCodeRef = async ({ vdnId, accessCodeId }) => {
    const rows = await sequelize().query(
        `SELECT COUNT(1) AS total
           FROM t_icc_vdn_serviceroute
          WHERE AccessCodeID = :accessCodeId
            AND VDNID = :vdnId`,
        { replacements: { vdnId, accessCodeId }, type: QueryTypes.SELECT }
    );
    return Number(rows?.[0]?.total || 0);
};

Dao.callDeleteVdnFK = async (vdnId) => {
    await sequelize().query('CALL S_CFG_DeleteVdnFK(:ivdnId, @msg)', {
        replacements: { ivdnId: vdnId },
        type: QueryTypes.RAW,
    });
    const rows = await sequelize().query('SELECT @msg AS msg', { type: QueryTypes.SELECT });
    return Number(rows?.[0]?.msg || 0);
};

Dao.deleteVdnById = async (id) => {
    const [ret] = await sequelize().query(
        `DELETE FROM t_icc_vdn WHERE ID = :id`,
        { replacements: { id }, type: QueryTypes.DELETE }
    );
    return ret;
};

Dao.countByVdnId = async (vdnId) => {
    const rows = await sequelize().query(
        `SELECT COUNT(1) AS total FROM t_icc_vdn WHERE ID = :vdnId`,
        { replacements: { vdnId }, type: QueryTypes.SELECT }
    );
    return Number(rows?.[0]?.total || 0);
};

Dao.countByVdnName = async (vdnName) => {
    const rows = await sequelize().query(
        `SELECT COUNT(1) AS total FROM t_icc_vdn WHERE Name = :vdnName`,
        { replacements: { vdnName }, type: QueryTypes.SELECT }
    );
    return Number(rows?.[0]?.total || 0);
};

Dao.countChildren = async (parentId) => {
    if (!(await hasParentIdColumn())) {
        return 0;
    }
    const rows = await sequelize().query(
        `SELECT COUNT(1) AS total
           FROM t_icc_vdn
          WHERE IFNULL(ParentId, -1) = :parentId`,
        { replacements: { parentId }, type: QueryTypes.SELECT }
    );
    return Number(rows?.[0]?.total || 0);
};

Dao.listAllSimple = async () => {
    const selectParentId = (await hasParentIdColumn())
        ? parentIdExpr('ParentId')
        : '-1 AS parentId';
    return sequelize().query(
        `SELECT ID AS id, Name AS name, ${selectParentId}
           FROM t_icc_vdn
          ORDER BY ID ASC`,
        { type: QueryTypes.SELECT }
    );
};

Dao.loadUserListByVdn = async ({ vdnId, page = 1, pageSize = 10 }) => {
    const offset = (Math.max(1, Number(page)) - 1) * Math.max(1, Number(pageSize));
    const limit = Math.max(1, Number(pageSize));
    const rows = await sequelize().query(
        `SELECT * FROM t_user_users
          WHERE VDNID = :vdnId
          ORDER BY ID ASC
          LIMIT :offset, :limit`,
        { replacements: { vdnId, offset, limit }, type: QueryTypes.SELECT }
    );
    const countRows = await sequelize().query(
        `SELECT COUNT(1) AS total FROM t_user_users WHERE VDNID = :vdnId`,
        { replacements: { vdnId }, type: QueryTypes.SELECT }
    );
    return { rows, total: Number(countRows?.[0]?.total || 0) };
};

Dao.selectByWorkNoNVdnId = async ({ workNo, vdnId }) => {
    return sequelize().query(
        `SELECT ID AS id, WorkNO AS workNo, Name AS name, PassWord AS password, VDNID AS vdnId
           FROM t_user_users
          WHERE VDNID = :vdnId AND WorkNO = :workNo`,
        { replacements: { workNo, vdnId }, type: QueryTypes.SELECT }
    );
};

Dao.insertUserByVdn = async ({ workNo, name, password, vdnId }) => {
    const [ret, meta] = await sequelize().query(
        `INSERT INTO t_user_users (WorkNO, Name, PassWord, IsSystem, VDNID, AgentActivate)
         VALUES (:workNo, :name, :password, 0, :vdnId, 1)`,
        { replacements: { workNo, name, password, vdnId }, type: QueryTypes.INSERT }
    );
    const userId = Number((meta && meta.insertId) || (ret && ret.insertId) || 0);
    return { ret, userId };
};

Dao.insertGrantPowerForVdnUser = async ({ userId, vdnId }) => {
    const [ret] = await sequelize().query(
        `INSERT INTO t_user_grantpower (OwnerType, OwnerId, PowerId, IsOwn, Description, VDNID)
         VALUES (3, :userId, 10000, 1, NULL, :vdnId)`,
        { replacements: { userId, vdnId }, type: QueryTypes.INSERT }
    );
    return ret;
};

Dao.updateUserByVdn = async ({ id, workNo, name, password }) => {
    const [ret] = await sequelize().query(
        `UPDATE t_user_users
            SET WorkNO = :workNo, Name = :name, PassWord = :password
          WHERE ID = :id`,
        { replacements: { id, workNo, name, password }, type: QueryTypes.UPDATE }
    );
    return ret;
};

Dao.getUserById = async (userId) => {
    const rows = await sequelize().query(
        `SELECT ID AS id, WorkNO AS workno, Name AS name, PassWord AS password, VDNID AS vdnid
           FROM t_user_users
          WHERE ID = :userId`,
        { replacements: { userId }, type: QueryTypes.SELECT }
    );
    return rows[0] || null;
};

Dao.deleteVdnUser = async (userId) => {
    const [ret] = await sequelize().query(
        `DELETE FROM t_user_users WHERE ID = :userId`,
        { replacements: { userId }, type: QueryTypes.DELETE }
    );
    return ret;
};

Dao.deleteStaticLoginByWorkNo = async (workNo) => {
    const [ret] = await sequelize().query(
        `DELETE FROM t_icc_telag_staticlogin WHERE WorkNO = :workNo`,
        { replacements: { workNo }, type: QueryTypes.DELETE }
    );
    return ret;
};

module.exports = Dao;
