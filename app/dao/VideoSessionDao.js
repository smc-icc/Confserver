'use strict';
const { QueryTypes } = require('sequelize');
const Db = require('./db');
module.exports.findLive = async (username, domain) => {
    if (process.env.VIDEO_CUSTOMER_ENABLED !== '1' || !/^(voice|video)_[a-f0-9]{32}$/.test(username || '') || !domain) return null;
    try {
        const rows = await Db.db_smcicc.sequelize.query(`SELECT s.id,s.username,s.password,s.domain,s.vdn_id,s.access_code,
            TIMESTAMPDIFF(SECOND,UTC_TIMESTAMP(3),s.expires_at) AS ttl_seconds
            FROM t_icc_video_session s
            JOIN t_icc_base_accesscode a ON a.Code=s.access_code AND a.VDNID=s.vdn_id
            WHERE s.username=:username AND s.domain=:domain AND s.revoked_at IS NULL
              AND s.expires_at > UTC_TIMESTAMP(3) AND s.password<>''
              AND (SELECT COUNT(*) FROM t_icc_base_accesscode x WHERE x.Code=s.access_code)=1 LIMIT 1`,
        { replacements: { username, domain }, type: QueryTypes.SELECT, logging: false });
        return rows[0] || null;
    } catch (err) {
        if (err.original && err.original.code === 'ER_NO_SUCH_TABLE') return null;
        throw err;
    }
};
