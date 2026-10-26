const Db = require('./db');
const { QueryTypes } = require('sequelize');
const VideoConfig = require('./AgentVideoConfigDao');
const Identity = require('./ExtensionIdentityDao');

const Dao = {};

function sequelize() {
    return Db.db_smcicc.sequelize;
}

Dao.listByVdn = async ({ vdnId, workNo = '', name = '', page = 1, pageSize = 20 }) => {
    const offset = (Math.max(1, Number(page)) - 1) * Math.max(1, Number(pageSize));
    const limit = Math.max(1, Number(pageSize));
    const w = String(workNo || '').trim();
    const n = String(name || '').trim();
    const whereExtra = [];
    const repl = { vdnId: Number(vdnId), offset, limit };
    if (w) {
        whereExtra.push('A.WorkNO LIKE CONCAT(\'%\', :workNo, \'%\')');
        repl.workNo = w;
    }
    if (n) {
        whereExtra.push('A.Name LIKE CONCAT(\'%\', :name, \'%\')');
        repl.name = n;
    }
    const extraSql = whereExtra.length ? ` AND ${whereExtra.join(' AND ')}` : '';
    const rows = await sequelize().query(
        `SELECT A.ID AS id, A.WorkNO AS workNo, A.Name AS name, A.PassWord AS password,
                A.ExtensionTel AS extensionTel, A.CalledTel AS calledTel, A.MobileTel AS mobileTel,
                A.Email AS email, A.VDNID AS vdnId, A.IsValid AS isValid, A.AgentActivate AS agentActivate,
                A.DefaultGroup AS defaultGroup,
                B.ClientReleaseMode AS clientReleaseMode, B.AgentReleaseMode AS agentReleaseMode,
                B.AutoAnswerCall AS autoAnswerCall, B.NotPlayWorkNO AS notPlayWorkNO,
                B.AgentHookMode AS agentHookMode,
                C.IfUse AS useTelAgent, C.ExtNum AS telAgentExtendNO,
                C.IsAutoDial AS isAutoDial, C.AutoDialNO AS autoDialNO
           FROM t_user_users A
           LEFT JOIN t_user_attributes B ON A.ID = B.UserID
           LEFT JOIN t_icc_telag_staticlogin C ON A.VDNID = C.VDNID AND A.WorkNO = C.WorkNO
          WHERE A.VDNID = :vdnId
            AND IFNULL(A.IsSystem, 0) = 0
            ${extraSql}
          ORDER BY A.WorkNO ASC
          LIMIT :offset, :limit`,
        { replacements: repl, type: QueryTypes.SELECT }
    );
    const countRows = await sequelize().query(
        `SELECT COUNT(1) AS total
           FROM t_user_users A
          WHERE A.VDNID = :vdnId
            AND IFNULL(A.IsSystem, 0) = 0
            ${extraSql}`,
        { replacements: repl, type: QueryTypes.SELECT }
    );
    return { rows: await VideoConfig.attach(rows), total: Number(countRows?.[0]?.total || 0) };
};

Dao.existsWorkNo = async ({ workNo, vdnId, excludeId = null, transaction = null }) => {
    const repl = { workNo: String(workNo), vdnId: Number(vdnId) };
    let sql = `SELECT ID AS id FROM t_user_users WHERE WorkNO = :workNo AND VDNID = :vdnId`;
    if (excludeId != null && excludeId !== '') {
        sql += ' AND ID != :excludeId';
        repl.excludeId = Number(excludeId);
    }
    sql += ' LIMIT 1';
    const rows = await sequelize().query(sql, { replacements: repl, type: QueryTypes.SELECT, transaction });
    return rows.length > 0;
};

Dao.extensionExists = async ({ vdnId, telNo }) => {
    const tel = String(telNo || '').trim();
    if (!tel) return true;
    const rows = await sequelize().query(
        `SELECT Num AS num FROM t_icc_base_extension
          WHERE VDN = :vdnId AND Num = :telNo LIMIT 1`,
        { replacements: { vdnId: Number(vdnId), telNo: tel }, type: QueryTypes.SELECT }
    );
    return rows.length > 0;
};

Dao.countStaticLoginByExt = async ({ extNum, excludeWorkNo = '' }) => {
    const ext = String(extNum || '').trim();
    if (!ext) return 0;
    const repl = { extNum: ext };
    let sql = `SELECT COUNT(1) AS c FROM t_icc_telag_staticlogin WHERE ExtNum = :extNum AND IFNULL(IfUse,0) = 1`;
    if (excludeWorkNo) {
        sql += ' AND WorkNO != :excludeWorkNo';
        repl.excludeWorkNo = String(excludeWorkNo);
    }
    const rows = await sequelize().query(sql, { replacements: repl, type: QueryTypes.SELECT });
    return Number(rows?.[0]?.c || 0);
};

Dao.getById = async (userId) => {
    const rows = await sequelize().query(
        `SELECT A.ID AS id, A.WorkNO AS workNo, A.Name AS name, A.PassWord AS password,
                A.Email AS email, A.VDNID AS vdnId, A.CalledTel AS calledTel
           FROM t_user_users A WHERE A.ID = :userId LIMIT 1`,
        { replacements: { userId: Number(userId) }, type: QueryTypes.SELECT }
    );
    return rows[0] || null;
};

/**
 * 与 S_icc_AG_InsertUser 等价，但 personalized 用 INSERT IGNORE：
 * 现网删除坐席时常留下 t_icc_ag_personalized 孤儿行，原 SP 会撞主键并中途失败
 * （users/attributes 已提交），导致前端看到失败、Omni 也未同步。
 */
Dao.insertAgent = async (p, transaction) => {
    if (p.extensionTel) { const error = new Error('软件分机请在 Omni 分机绑定管理中分配'); error.status = 409; throw error; }
    const run = (sql, replacements, type) => sequelize().query(sql, { replacements, type, transaction });
    const repl = {
        workNo: p.workNo,
        name: p.name,
        password: p.password,
        extensionTel: p.extensionTel || '',
        calledTel: p.calledTel || '',
        mobileTel: p.mobileTel || '',
        vdnId: Number(p.vdnId),
        defaultGroup: Number(p.defaultGroup || 1),
        clientReleaseMode: Number(p.clientReleaseMode),
        agentReleaseMode: Number(p.agentReleaseMode),
        autoAnswerCall: Number(p.autoAnswerCall),
        notPlayWorkNO: Number(p.notPlayWorkNO),
        agentHookMode: Number(p.agentHookMode),
        useTelAgent: Number(p.useTelAgent || 0),
        telAgentExtendNO: p.telAgentExtendNO || '',
        isAutoDial: p.isAutoDial == null || p.isAutoDial === '' ? null : Number(p.isAutoDial),
        autoDialNO: p.autoDialNO || '',
    };
    await run(
        `INSERT INTO t_user_users
            (WorkNO, NAME, PassWord, ExtensionTel, CalledTel, MobileTel,
             VDNID, DefaultGroup, IsSystem, IsValid, AgentActivate)
         VALUES
            (:workNo, :name, :password, :extensionTel, :calledTel, :mobileTel,
             :vdnId, :defaultGroup, 0, 1, 1)`,
        repl, QueryTypes.INSERT
    );
    const idRows = await run(
        `SELECT ID AS id FROM t_user_users WHERE WorkNO = :workNo AND VDNID = :vdnId LIMIT 1`,
        { workNo: repl.workNo, vdnId: repl.vdnId }, QueryTypes.SELECT
    );
    const agentId = Number(idRows?.[0]?.id);
    if (!agentId) throw new Error('insertAgent: agent id not found after insert');
    repl.agentId = agentId;

    await run(
        `INSERT INTO t_user_attributes
            (UserID, ClientReleaseMode, AgentReleaseMode, AutoAnswerCall,
             IsCheckEstNum, NotPlayWorkNO, AgentHookMode)
         VALUES
            (:agentId, :clientReleaseMode, :agentReleaseMode, :autoAnswerCall,
             1, :notPlayWorkNO, :agentHookMode)`,
        repl, QueryTypes.INSERT
    );
    await run(
        `INSERT IGNORE INTO t_icc_ag_personalized
            (AgentID, TextProcTime, PopMsgTime, MaxPageSize, TransferConnectMode,
             ShowLoginWindow, AutoBusyAfterTalk, AutoSigin, ShowWhenCalling, RestTime)
         VALUES
            (:agentId, 10, 3, 10, 1, 1, 0, 1, 1, 600)`,
        { agentId }, QueryTypes.INSERT
    );

    if (repl.useTelAgent === 1) {
        await run(
            `DELETE FROM t_icc_telag_staticlogin WHERE VDNID = :vdnId AND WorkNO = :workNo`,
            { vdnId: repl.vdnId, workNo: repl.workNo }, QueryTypes.DELETE
        );
        const maxRows = await run(
            `SELECT IFNULL(MAX(ID)+1, 1) AS nid FROM t_icc_telag_staticlogin`,
            {}, QueryTypes.SELECT
        );
        await run(
            `INSERT INTO t_icc_telag_staticlogin
                (ID, WorkNO, VDNID, Passwd, ExtNum, IfUse, IsAutoDial, AutoDialNO, MyID)
             VALUES
                (:nid, :workNo, :vdnId, :password, :telAgentExtendNO, :useTelAgent,
                 :isAutoDial, :autoDialNO, 90)`,
            { ...repl, nid: Number(maxRows?.[0]?.nid || 1) }, QueryTypes.INSERT
        );
    }

    if (p.email) {
        await run(
            `UPDATE t_user_users SET Email = :email WHERE ID = :agentId`,
            { email: p.email, agentId }, QueryTypes.UPDATE
        );
    }
    return agentId;
};

Dao.updateAgent = async (p, transaction) => {
    if (!transaction) return Identity.withTransaction(t => Dao.updateAgent(p, t));
    const [bound] = await sequelize().query("SELECT COALESCE(ExtensionTel,'') AS extension FROM t_user_users WHERE ID=:id AND VDNID=:vdn FOR UPDATE", { replacements: { id:Number(p.id), vdn:Number(p.vdnId) }, type:QueryTypes.SELECT, transaction });
    if (!bound) throw new Error('操作员不存在或不属于当前 VDN');
    if (p.extensionTel && p.extensionTel !== bound.extension) { const error = new Error('软件分机请在 Omni 分机绑定管理中修改'); error.status=409; throw error; }
    await sequelize().query(
        `CALL S_icc_AG_UpdateUser(
            :agentId, :workNo, :name, :password, :extensionTel, :calledTel, :mobileTel,
            :vdnId, :defaultGroup, :clientReleaseMode, :agentReleaseMode,
            :autoAnswerCall, :notPlayWorkNO, :agentHookMode, :useTelAgent,
            :telAgentExtendNO, :isAutoDial, :autoDialNO, :oldWorkNo
        )`,
        {
            transaction,
            replacements: {
                agentId: Number(p.id),
                workNo: p.workNo,
                name: p.name,
                password: p.password,
                extensionTel: bound.extension,
                calledTel: p.calledTel || '',
                mobileTel: p.mobileTel || '',
                vdnId: Number(p.vdnId),
                defaultGroup: Number(p.defaultGroup || 1),
                clientReleaseMode: Number(p.clientReleaseMode),
                agentReleaseMode: Number(p.agentReleaseMode),
                autoAnswerCall: Number(p.autoAnswerCall),
                notPlayWorkNO: Number(p.notPlayWorkNO),
                agentHookMode: Number(p.agentHookMode),
                useTelAgent: Number(p.useTelAgent || 0),
                telAgentExtendNO: p.telAgentExtendNO || '',
                isAutoDial: p.isAutoDial == null || p.isAutoDial === '' ? null : Number(p.isAutoDial),
                autoDialNO: p.autoDialNO || '',
                oldWorkNo: p.oldWorkNo || p.workNo,
            },
        }
    );
    if (p.email != null) {
        await sequelize().query(
            `UPDATE t_user_users SET Email = :email WHERE ID = :id`,
            { replacements: { email: p.email || null, id: Number(p.id) }, type: QueryTypes.UPDATE, transaction }
        );
    }
};

Dao.setValid = async ({ id, vdnId, isValid }) => {
    const [ret] = await sequelize().query(
        `UPDATE t_user_users
            SET IsValid = :isValid
          WHERE ID = :id
            AND VDNID = :vdnId
            AND IFNULL(IsSystem, 0) = 0`,
        {
            replacements: { id: Number(id), vdnId: Number(vdnId), isValid: Number(isValid) ? 1 : 0 },
            type: QueryTypes.UPDATE,
        }
    );
    return ret;
};

Dao.deleteAgents = async (ids, transaction) => {
    if (!ids.length) return [];
    if (!transaction) return Identity.withTransaction(t => Dao.deleteAgents(ids, t));
    const marks = ids.map((_, i) => `:d${i}`).join(',');
    const repl = {};
    ids.forEach((id, i) => { repl[`d${i}`] = Number(id); });
    const users = await sequelize().query(
        `SELECT ID AS id, WorkNO AS workNo, Email AS email, VDNID AS vdnId
           FROM t_user_users WHERE ID IN (${marks})`,
        { replacements: repl, type: QueryTypes.SELECT, transaction }
    );
    for (const u of users) {
        await VideoConfig.remove({ userId: u.id, vdnId: u.vdnId }, transaction);
        await sequelize().query(
            `DELETE FROM t_icc_telag_staticlogin WHERE WorkNO = :workNo AND VDNID = :vdnId`,
            { replacements: { workNo: u.workNo, vdnId: u.vdnId }, type: QueryTypes.DELETE, transaction }
        );
        await sequelize().query(
            `DELETE FROM t_user_attributes WHERE UserID = :id`,
            { replacements: { id: u.id }, type: QueryTypes.DELETE, transaction }
        );
        await sequelize().query(
            `DELETE FROM t_icc_ag_personalized WHERE AgentID = :id`,
            { replacements: { id: u.id }, type: QueryTypes.DELETE, transaction }
        );
    }
    await sequelize().query(
        `DELETE FROM t_user_users WHERE ID IN (${marks})`,
        { replacements: repl, type: QueryTypes.DELETE, transaction }
    );
    return users;
};

module.exports = Dao;
