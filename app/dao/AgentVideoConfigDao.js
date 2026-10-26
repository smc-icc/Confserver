'use strict';
const { QueryTypes } = require('sequelize');

const fields = ['videoEnabled', 'videoSameExtension', 'videoExtension', 'videoPassword', 'videoWebEnabled', 'videoMobileEnabled', 'webSipEnabled', 'webVideoEnabled', 'videoExtensionMode'];
const defaults = () => ({ videoEnabled: false, videoSameExtension: false, videoExtension: '', videoWebEnabled: false, videoMobileEnabled: false, webSipEnabled: false, webVideoEnabled: false, videoExtensionMode: undefined, videoPasswordConfigured: false });
const hasVideoFields = input => fields.some(key => Object.prototype.hasOwnProperty.call(input, key));
const missingTable = error => ['ER_NO_SUCH_TABLE', 'ER_BAD_TABLE_ERROR'].includes((error.original || error.parent || error).code);
const missingColumn = error => (error.original || error.parent || error).code === 'ER_BAD_FIELD_ERROR';
function fail(message, status = 409) { throw Object.assign(new Error(message), { status, videoConfig: true }); }
function flag(value) {
    if ([true, 1, '1'].includes(value)) return true;
    if ([false, 0, '0', null, undefined, ''].includes(value)) return false;
    fail('视频开关参数无效', 400);
}
function mode(value, same) {
    if (value === 'shared_phone' || value === 'independent_video') return value;
    return same ? 'shared_phone' : 'independent_video';
}

function createAgentVideoConfigDao(db) {
    const select = (sql, replacements, transaction) => db.query(sql, { replacements, transaction, type: QueryTypes.SELECT, logging: false });
    const exec = (sql, replacements, transaction) => db.query(sql, { replacements, transaction, logging: false });
    const attach = async rows => {
        const result = rows.map(row => ({ ...row, ...defaults() }));
        if (!rows.length) return result;
        let configs;
        try {
            configs = await select(`SELECT V.UserID AS id, V.VDNID AS vdnId, V.Enabled AS videoEnabled,
                V.SameExtension AS videoSameExtension, V.VideoExtension AS videoExtension,
                V.WebEnabled AS videoWebEnabled, V.MobileEnabled AS videoMobileEnabled,
                V.WebSipEnabled AS webSipEnabled, V.WebVideoEnabled AS webVideoEnabled,
                V.VideoExtensionMode AS videoExtensionMode,
                EXISTS (SELECT 1 FROM t_icc_sip_directory D
                    WHERE D.username = CASE WHEN V.SameExtension=1 THEN U.ExtensionTel ELSE V.VideoExtension END
                      AND D.vdn_id=V.VDNID AND COALESCE(D.password,'')<>'') AS videoPasswordConfigured
                FROM t_icc_agent_video_config V JOIN t_user_users U ON U.ID=V.UserID AND U.VDNID=V.VDNID
                WHERE V.UserID IN (:ids)`, { ids: rows.map(row => Number(row.id)) });
        } catch (error) {
            if (missingTable(error)) return result;
            if (!missingColumn(error)) throw error;
            configs = await select(`SELECT V.UserID AS id, V.VDNID AS vdnId, V.Enabled AS videoEnabled,
                V.SameExtension AS videoSameExtension, V.VideoExtension AS videoExtension,
                V.WebEnabled AS videoWebEnabled, V.MobileEnabled AS videoMobileEnabled,
                EXISTS (SELECT 1 FROM t_icc_sip_directory D
                    WHERE D.username = CASE WHEN V.SameExtension=1 THEN U.ExtensionTel ELSE V.VideoExtension END
                      AND D.vdn_id=V.VDNID AND COALESCE(D.password,'')<>'') AS videoPasswordConfigured
                FROM t_icc_agent_video_config V JOIN t_user_users U ON U.ID=V.UserID AND U.VDNID=V.VDNID
                WHERE V.UserID IN (:ids)`, { ids: rows.map(row => Number(row.id)) });
        }
        return result.map(row => {
            const config = configs.find(c => Number(c.id) === Number(row.id) && Number(c.vdnId) === Number(row.vdnId));
            if (!config) return row;
            const same = flag(config.videoSameExtension);
            const webVideo = config.webVideoEnabled == null ? flag(config.videoWebEnabled) : flag(config.webVideoEnabled);
            return { ...row, videoEnabled: flag(config.videoEnabled), videoSameExtension: same,
                videoExtension: same ? '' : String(config.videoExtension || ''),
                videoWebEnabled: webVideo, videoMobileEnabled: flag(config.videoMobileEnabled),
                webSipEnabled: flag(config.webSipEnabled), webVideoEnabled: webVideo,
                videoExtensionMode: mode(config.videoExtensionMode, same),
                videoPasswordConfigured: flag(config.videoPasswordConfigured) };
        });
    };
    const conflicts = async ({ extension, userId, vdnId, workNo }, transaction, includeOwn = false, telephone = false) => select(`SELECT 1 AS conflict
        FROM t_user_users WHERE ExtensionTel=:extension AND NOT (ID=:userId AND VDNID=:vdnId)
        UNION ALL SELECT 1 AS conflict FROM t_icc_telag_staticlogin
            WHERE ExtNum=:extension AND IFNULL(IfUse,0)=1 ${includeOwn ? '' : 'AND NOT (WorkNO=:workNo AND VDNID=:vdnId)'}
        UNION ALL SELECT 1 AS conflict FROM t_icc_agent_video_config
            WHERE VideoExtension=:extension ${telephone ? '' : 'AND NOT (UserID=:userId AND VDNID=:vdnId)'} LIMIT 1`,
    { extension, userId, vdnId, workNo: workNo || '' }, transaction);
    const assertTelephoneAvailable = async ({ extension, userId = 0, vdnId, workNo = '' }, transaction) => {
        if (!extension) return;
        let rows;
        try { rows = await conflicts({ extension, userId, vdnId, workNo }, transaction, false, true); }
        catch (error) {
            if (!missingTable(error)) throw error;
            rows = await select(`SELECT 1 AS conflict FROM t_user_users WHERE ExtensionTel=:extension AND NOT (ID=:userId AND VDNID=:vdnId)
                UNION ALL SELECT 1 AS conflict FROM t_icc_telag_staticlogin WHERE ExtNum=:extension AND IFNULL(IfUse,0)=1
                AND NOT (WorkNO=:workNo AND VDNID=:vdnId) LIMIT 1`, { extension, userId, vdnId, workNo }, transaction);
        }
        if (rows.length) fail('分机号已被其他坐席的电话或视频身份占用');
    };
    const saveIn = async ({ userId, vdnId, input }, transaction) => {
        if (!hasVideoFields(input)) return;
        if (!transaction) throw new Error('Video configuration requires the agent save transaction');
        if (!Number.isSafeInteger(Number(vdnId)) || Number(vdnId) < 1 || !Number.isSafeInteger(Number(userId)) || Number(userId) < 1) fail('请选择明确的 VDN 和坐席', 400);
        const [user] = await select('SELECT ID AS id, VDNID AS vdnId, WorkNO AS workNo, COALESCE(ExtensionTel,\'\') AS extensionTel FROM t_user_users WHERE ID=:userId AND VDNID=:vdnId FOR UPDATE', { userId, vdnId }, transaction);
        if (!user || Number(user.vdnId) !== Number(vdnId)) fail('坐席不存在或不属于当前 VDN', 403);
        let old;
        try {
            [old] = await select(`SELECT Enabled AS videoEnabled, SameExtension AS videoSameExtension, VideoExtension AS videoExtension,
                WebEnabled AS videoWebEnabled, MobileEnabled AS videoMobileEnabled FROM t_icc_agent_video_config
                WHERE VDNID=:vdnId AND UserID=:userId FOR UPDATE`, { userId, vdnId }, transaction);
        } catch (error) {
            if (!missingTable(error)) throw error;
        }
        if (old) {
            try {
                const [modern] = await select(`SELECT WebSipEnabled AS webSipEnabled, WebVideoEnabled AS webVideoEnabled,
                    VideoExtensionMode AS videoExtensionMode FROM t_icc_agent_video_config
                    WHERE VDNID=:vdnId AND UserID=:userId FOR UPDATE`, { userId, vdnId }, transaction);
                Object.assign(old, modern || {});
            } catch (error) {
                if (!missingColumn(error) && !missingTable(error)) throw error;
            }
        }
        const config = { ...defaults(), ...old };
        for (const key of fields) if (Object.prototype.hasOwnProperty.call(input, key)) config[key] = input[key];
        config.videoEnabled = flag(config.videoEnabled);
        const requestedWebVideo = Object.prototype.hasOwnProperty.call(input, 'webVideoEnabled') ? input.webVideoEnabled
            : Object.prototype.hasOwnProperty.call(input, 'videoWebEnabled') ? input.videoWebEnabled : config.webVideoEnabled ?? config.videoWebEnabled;
        config.videoWebEnabled = flag(requestedWebVideo);
        config.webVideoEnabled = config.videoWebEnabled;
        config.videoMobileEnabled = flag(config.videoMobileEnabled);
        config.webSipEnabled = flag(Object.prototype.hasOwnProperty.call(input, 'webSipEnabled') ? input.webSipEnabled : config.webSipEnabled);
        const inputHasMode = Object.prototype.hasOwnProperty.call(input, 'videoExtensionMode');
        const inputHasSame = Object.prototype.hasOwnProperty.call(input, 'videoSameExtension');
        const requestedMode = inputHasMode ? input.videoExtensionMode
            : inputHasSame ? (flag(input.videoSameExtension) ? 'shared_phone' : 'independent_video')
            : config.videoExtensionMode;
        config.videoExtensionMode = mode(requestedMode, flag(config.videoSameExtension));
        config.videoSameExtension = config.videoExtensionMode === 'shared_phone';
        const password = config.videoPassword == null ? '' : config.videoPassword;
        if (typeof password !== 'string' || (password && (password.length < 12 || password.length > 128))) fail('SIP 口令必须为 12-128 位；留空保留原口令', 400);
        if (config.videoSameExtension && password) fail('同分机模式复用电话 SIP 口令，不能设置第二个密码', 400);
        config.videoExtension = config.videoSameExtension ? null : String(config.videoExtension || '').trim() || null;
        const extension = config.videoSameExtension ? user.extensionTel : config.videoExtension;
        if ((config.videoEnabled || password) && !extension) fail('请先配置视频分机；同分机模式须先绑定 Omni 软件分机', 400);
        if (extension && (config.videoEnabled || !config.videoSameExtension)) {
            if (!/^[1-9]\d{2,11}$/.test(extension)) fail('视频分机号必须为 3-12 位数字，且不能以 0 开头', 400);
            if (!config.videoSameExtension && extension === user.extensionTel) fail('独立视频分机不能等于本人的电话分机');
            const [owner] = await select('SELECT VDN AS vdnId, IsValid AS enabled FROM t_icc_base_extension WHERE Num=:extension FOR UPDATE', { extension }, transaction);
            if (!owner || Number(owner.vdnId) !== Number(vdnId) || Number(owner.enabled) !== 1) fail('视频分机必须是当前 VDN 已存在且启用的分机');
            if ((await conflicts({ extension, userId, vdnId, workNo: user.workNo }, transaction, !config.videoSameExtension)).length) fail('视频分机已被电话或视频身份占用');
            const [directory] = await select('SELECT enabled FROM t_icc_sip_directory WHERE username=:extension AND vdn_id=:vdnId FOR UPDATE', { extension, vdnId }, transaction);
            if (!directory || Number(directory.enabled) !== 1) fail('请先在分机管理中启用该分机的 SIP 账号');
        }
        if (password) await exec('UPDATE t_icc_sip_directory SET password=:password WHERE username=:extension AND vdn_id=:vdnId', { password, extension, vdnId }, transaction);
        const oldMode = mode(old?.videoExtensionMode, flag(old?.videoSameExtension));
        const oldWebVideo = old?.webVideoEnabled == null ? flag(old?.videoWebEnabled) : flag(old.webVideoEnabled);
        const oldValues = { ...old, webVideoEnabled: oldWebVideo, webSipEnabled: flag(old?.webSipEnabled) };
        const changed = !old || password || ['videoEnabled', 'videoMobileEnabled', 'webSipEnabled', 'webVideoEnabled'].some(key => oldValues[key] !== config[key]) || oldMode !== config.videoExtensionMode || (old.videoExtension || null) !== config.videoExtension;
        if (!changed) return;
        await exec(`INSERT INTO t_icc_agent_video_config (VDNID,UserID,Enabled,SameExtension,VideoExtension,WebEnabled,MobileEnabled,WebSipEnabled,WebVideoEnabled,VideoExtensionMode,Revision,RegistrationSid,RegistrationClient,UpdatedAt)
            VALUES (:vdnId,:userId,:videoEnabled,:videoSameExtension,:videoExtension,:webVideoEnabled,:videoMobileEnabled,:webSipEnabled,:webVideoEnabled,:videoExtensionMode,1,NULL,NULL,UTC_TIMESTAMP(3))
            ON DUPLICATE KEY UPDATE Enabled=VALUES(Enabled),SameExtension=VALUES(SameExtension),VideoExtension=VALUES(VideoExtension),
                WebEnabled=VALUES(WebEnabled),MobileEnabled=VALUES(MobileEnabled),WebSipEnabled=VALUES(WebSipEnabled),WebVideoEnabled=VALUES(WebVideoEnabled),VideoExtensionMode=VALUES(VideoExtensionMode),Revision=Revision+1,
                RegistrationSid=NULL,RegistrationClient=NULL,UpdatedAt=UTC_TIMESTAMP(3)`, { userId, vdnId,
            videoEnabled: Number(config.videoEnabled), videoSameExtension: Number(config.videoSameExtension), videoExtension: config.videoExtension,
            webVideoEnabled: Number(config.webVideoEnabled), videoWebEnabled: Number(config.webVideoEnabled), videoMobileEnabled: Number(config.videoMobileEnabled), webSipEnabled: Number(config.webSipEnabled), videoExtensionMode: config.videoExtensionMode }, transaction);
    };
    const save = async (input, transaction) => {
        try { return await saveIn(input, transaction); }
        catch (error) {
            if (missingTable(error)) fail('请先安装坐席视频配置表迁移，再保存视频配置', 503);
            if (error.name === 'SequelizeUniqueConstraintError' || (error.original || error.parent || error).code === 'ER_DUP_ENTRY') fail('视频分机已被其他坐席占用');
            throw error;
        }
    };
    const remove = async ({ userId, vdnId }, transaction) => {
        try { await exec('DELETE FROM t_icc_agent_video_config WHERE UserID=:userId AND VDNID=:vdnId', { userId, vdnId }, transaction); }
        catch (error) { if (!missingTable(error)) throw error; }
    };
    return { attach, save, assertTelephoneAvailable, remove };
}
let singleton;
const instance = () => singleton || (singleton = createAgentVideoConfigDao(require('./db').db_smcicc.sequelize));
module.exports = { createAgentVideoConfigDao, hasVideoFields };
for (const name of ['attach', 'save', 'assertTelephoneAvailable', 'remove']) module.exports[name] = (...args) => instance()[name](...args);
