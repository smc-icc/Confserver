'use strict';

const { QueryTypes } = require('sequelize');
const Db = require('./db');

const EXTENSION = /^[1-9]\d{2,19}$/;
const VISITOR = /^(voice|video)_[a-f0-9]{32}$/;

function names(input) {
    return [...new Set([input.from_user, input.to_user, input.ruri_user].map(value => String(value || '')).filter(Boolean))];
}

async function query(sql, replacements) {
    return Db.db_smcicc.sequelize.query(sql, { replacements, type: QueryTypes.SELECT, logging: false });
}

async function load(input, scopeVdnId = null) {
    const users = names(input);
    const extensions = users.filter(name => EXTENSION.test(name));
    const visitors = users.filter(name => VISITOR.test(name));
    const called = String(input.ruri_user || input.to_user || '');
    const scopeSql = scopeVdnId == null ? '' : ' AND d.vdn_id=:scopeVdnId';
    const routeScope = scopeVdnId == null ? '' : ' AND VDNID=:scopeVdnId';
    const leaseScope = scopeVdnId == null ? '' : ' AND s.vdn_id=:scopeVdnId';
    const directory = extensions.length ? await query(
        `SELECT d.username AS username, d.vdn_id AS vdn_id, d.domain AS domain
         FROM t_icc_sip_directory d
         JOIN t_icc_base_extension e ON e.Num=d.username AND e.VDN=d.vdn_id
         WHERE d.enabled=1 AND e.IsValid=1 AND d.username IN (:extensions)${scopeSql}`,
        { extensions, scopeVdnId }) : [];
    const routes = EXTENSION.test(called) ? await query(
        `SELECT CalledCode AS called, VDNID AS vdn_id
         FROM t_icc_vdn_serviceroute
         WHERE IsValid=1 AND CalledCode=:called${routeScope}`,
        { called, scopeVdnId }) : [];
    let leases = [];
    if (visitors.length && process.env.VIDEO_CUSTOMER_ENABLED === '1') {
        try {
            leases = await query(
                `SELECT s.username AS username, s.vdn_id AS vdn_id, s.access_code AS access_code
                 FROM t_icc_video_session s
                 JOIN t_icc_base_accesscode a ON a.Code=s.access_code AND a.VDNID=s.vdn_id
                 WHERE s.username IN (:visitors) AND s.domain=:domain AND s.revoked_at IS NULL
                   AND s.expires_at > UTC_TIMESTAMP(3) AND s.password<>''${leaseScope}
                   AND (SELECT COUNT(*) FROM t_icc_base_accesscode x WHERE x.Code=s.access_code)=1`,
                { visitors, domain: String(input.domain || ''), scopeVdnId });
        } catch (err) {
            if (!(err.original && err.original.code === 'ER_NO_SUCH_TABLE')) throw err;
        }
    }
    return {
        directory: directory.map(row => ({ username: row.username, vdn_id: Number(row.vdn_id), domain: row.domain })),
        routes: routes.map(row => ({ called: String(row.called), vdn_id: Number(row.vdn_id) })),
        leases: leases.map(row => ({ username: row.username, vdn_id: Number(row.vdn_id), access_code: String(row.access_code) })),
    };
}

module.exports = { load };
