'use strict';
const { QueryTypes } = require('sequelize');
const Db = require('./db');
const IdentityDao = require('./ExtensionIdentityDao');
const DEFAULT_DOMAIN = process.env.XML_CURL_DOMAIN || '192.168.255.128';
const db = () => Db.db_smcicc.sequelize;
const fields = `d.username,d.domain,d.password,d.user_context,d.vm_password,d.caller_id_name,d.caller_id_number,d.enabled,d.vdn_id`;
const join = `FROM t_icc_sip_directory d JOIN t_icc_base_extension e ON e.Num=d.username AND e.VDN=d.vdn_id
    WHERE d.enabled=1 AND e.IsValid=1`;

function pairedDomain(asked) {
    try {
        const cfg = require('../service/smcicc/SbcDomainConfig').current();
        if (asked === cfg.internal) return cfg.publicDomain;
        if (asked === cfg.publicDomain) return cfg.internal;
    } catch (err) { /* 配置不可读时不扩大查找范围 */ }
    return '';
}

const Dao = {};
// Compatibility name only: readiness checks never create tables or seed accounts.
Dao.ensureTable = IdentityDao.assertReady;
Dao.findUser = async (username, domain, vdnId) => {
    await IdentityDao.assertReady();
    if (!username) return null;
    const asked = domain || DEFAULT_DOMAIN;
    const lookup = async value => db().query(`SELECT ${fields} ${join} AND d.username=:username AND d.domain=:domain
        ${vdnId == null ? '' : 'AND d.vdn_id=:vdnId'} LIMIT 1`,
    { replacements: { username, domain: value, vdnId }, logging: false, type: QueryTypes.SELECT });
    const rows = await lookup(asked);
    if (rows[0]) return rows[0];
    const alias = pairedDomain(asked);
    if (!alias) return null;
    const again = await lookup(alias);
    return again[0] || null;
};
Dao.listByDomain = async domain => {
    await IdentityDao.assertReady();
    return db().query(`SELECT ${fields} ${join} AND d.domain=:domain ORDER BY d.username`,
        { replacements: { domain: domain || DEFAULT_DOMAIN }, logging: false, type: QueryTypes.SELECT });
};
Dao.upsertUser = input => IdentityDao.upsertSip(input);
module.exports = Dao;
