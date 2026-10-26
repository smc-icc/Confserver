'use strict';

const TABLES = ['t_icc_base_extension', 't_icc_sip_directory', 't_icc_extension_allocator', 't_icc_extension_reservation'];
function identifier(value) {
    if (!/^[a-zA-Z0-9_]+$/.test(value)) throw Error('Unsupported schema identifier');
    return '`' + value + '`';
}
async function inspectExtensionSchema(query) {
    const tables = await query("SELECT TABLE_NAME, ENGINE FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME IN ('t_icc_base_extension','t_icc_sip_directory','t_icc_extension_allocator','t_icc_extension_reservation')");
    const engines = Object.fromEntries(tables.map(t => [t.TABLE_NAME, t.ENGINE]));
    const keys = await query("SELECT TABLE_NAME, INDEX_NAME, GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS cols FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME IN ('t_icc_base_extension','t_icc_sip_directory') AND NON_UNIQUE=0 GROUP BY TABLE_NAME, INDEX_NAME");
    const foreign = await query("SELECT CONSTRAINT_NAME FROM information_schema.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE() AND TABLE_NAME='t_icc_sip_directory' AND REFERENCED_TABLE_NAME='t_icc_base_extension' AND CONSTRAINT_NAME='fk_sip_extension' AND UPDATE_RULE='CASCADE' AND DELETE_RULE='CASCADE'");
    const fields = await query("SELECT TABLE_NAME,COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND ((TABLE_NAME='t_icc_base_extension' AND COLUMN_NAME='IsValid') OR (TABLE_NAME='t_icc_sip_directory' AND COLUMN_NAME='vdn_id'))");
    const ownership = await query("SELECT GROUP_CONCAT(COLUMN_NAME ORDER BY ORDINAL_POSITION) AS childCols,GROUP_CONCAT(REFERENCED_COLUMN_NAME ORDER BY ORDINAL_POSITION) AS parentCols FROM information_schema.KEY_COLUMN_USAGE WHERE CONSTRAINT_SCHEMA=DATABASE() AND TABLE_NAME='t_icc_sip_directory' AND CONSTRAINT_NAME='fk_sip_extension'");
    const ready = TABLES.every(t => engines[t] === 'InnoDB')
        && keys.some(k => k.TABLE_NAME === 't_icc_base_extension' && k.cols === 'Num')
        && keys.some(k => k.TABLE_NAME === 't_icc_sip_directory' && k.cols === 'username')
        && foreign.length === 1 && fields.length === 2
        && ownership[0] && ownership[0].childCols === 'vdn_id,username' && ownership[0].parentCols === 'VDN,Num';
    return { ready: Boolean(ready), engines };
}

// DDL implicitly commits. Call only from an explicit installer/maintenance job,
// with writers stopped and a private backup; never from a request handler.
async function migrateExtensionSchema(query, { apply = false } = {}) {
    const lock = await query("SELECT GET_LOCK(CONCAT(DATABASE(), ':extension-schema'), 5) AS acquired");
    if (Number(lock[0].acquired) !== 1) throw Error('Extension schema maintenance is already running');
    try {
        const state = await inspectExtensionSchema(query);
        if (!state.engines.t_icc_base_extension) throw Error('Extension master table is missing');
        const duplicate = await query('SELECT Num FROM t_icc_base_extension GROUP BY Num HAVING COUNT(*)>1 LIMIT 1');
        if (duplicate.length) throw Error('Duplicate global extension numbers; resolve ownership before migration');
        const fields = await query("SELECT COLUMN_NAME, COLUMN_TYPE, CHARACTER_SET_NAME, COLLATION_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='t_icc_base_extension'");
        const num = fields.find(f => f.COLUMN_NAME === 'Num');
        const vdn = fields.find(f => f.COLUMN_NAME === 'VDN');
        if (!num || !/^varchar\((\d+)\)$/i.test(num.COLUMN_TYPE) || !vdn || !/^int(?:\(\d+\))?(?: unsigned)?$/i.test(vdn.COLUMN_TYPE)) throw Error('Unsupported extension key types');
        const width = Number(/^varchar\((\d+)\)$/i.exec(num.COLUMN_TYPE)[1]);
        const stringType = `VARCHAR(${width}) CHARACTER SET ${identifier(num.CHARACTER_SET_NAME)} COLLATE ${identifier(num.COLLATION_NAME)}`;
        let childFields = [];
        if (state.engines.t_icc_sip_directory) {
            childFields = await query("SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='t_icc_sip_directory'");
            const invalid = await query("SELECT d.id FROM t_icc_sip_directory d LEFT JOIN t_icc_base_extension e ON e.Num=d.username WHERE e.Num IS NULL OR d.domain='*' OR d.domain='' OR CHAR_LENGTH(d.username)>? LIMIT 1", [width]);
            if (invalid.length) throw Error('Orphan SIP identity or invalid domain; explicit reconciliation required');
            if ((await query('SELECT username FROM t_icc_sip_directory GROUP BY username HAVING COUNT(*)>1 LIMIT 1')).length) throw Error('Duplicate SIP identities per extension; explicit reconciliation required');
            if (childFields.some(f => f.COLUMN_NAME === 'vdn_id') && (await query('SELECT d.id FROM t_icc_sip_directory d JOIN t_icc_base_extension e ON e.Num=d.username WHERE d.vdn_id IS NOT NULL AND d.vdn_id<>e.VDN LIMIT 1')).length) throw Error('SIP identity has conflicting VDN ownership');
        }
        if (!apply || state.ready) return { ...state, preflight: 'passed', changed: false };
        await query('SET SESSION lock_wait_timeout=10');
        if (state.engines.t_icc_base_extension !== 'InnoDB') await query('ALTER TABLE t_icc_base_extension ENGINE=InnoDB');
        if (!fields.some(f => f.COLUMN_NAME === 'IsValid')) await query('ALTER TABLE t_icc_base_extension ADD COLUMN IsValid TINYINT NOT NULL DEFAULT 1');
        const indexes = await query("SELECT INDEX_NAME, GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS cols FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='t_icc_base_extension' AND NON_UNIQUE=0 GROUP BY INDEX_NAME");
        if (!indexes.some(k => k.cols === 'Num')) await query('ALTER TABLE t_icc_base_extension ADD UNIQUE KEY uk_extension_num (Num)');
        if (!state.engines.t_icc_sip_directory) {
            await query(`CREATE TABLE t_icc_sip_directory (
                id INT NOT NULL AUTO_INCREMENT, username ${stringType} NOT NULL, vdn_id ${vdn.COLUMN_TYPE} NOT NULL,
                domain VARCHAR(128) NOT NULL, password VARCHAR(128) NOT NULL, user_context VARCHAR(64) NOT NULL DEFAULT 'default',
                vm_password VARCHAR(64), caller_id_name VARCHAR(128), caller_id_number VARCHAR(64), enabled TINYINT NOT NULL DEFAULT 1,
                remark VARCHAR(255), PRIMARY KEY(id), UNIQUE KEY uk_sip_user_domain(username,domain), UNIQUE KEY uk_sip_extension(username),
                CONSTRAINT fk_sip_extension FOREIGN KEY(vdn_id,username) REFERENCES t_icc_base_extension(VDN,Num) ON UPDATE CASCADE ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
        } else {
            if (state.engines.t_icc_sip_directory !== 'InnoDB') await query('ALTER TABLE t_icc_sip_directory ENGINE=InnoDB');
            if (!childFields.some(f => f.COLUMN_NAME === 'vdn_id')) await query(`ALTER TABLE t_icc_sip_directory ADD COLUMN vdn_id ${vdn.COLUMN_TYPE} NULL`);
            await query('UPDATE t_icc_sip_directory d JOIN t_icc_base_extension e ON e.Num=d.username SET d.vdn_id=e.VDN WHERE d.vdn_id IS NULL');
            await query(`ALTER TABLE t_icc_sip_directory MODIFY username ${stringType} NOT NULL, MODIFY vdn_id ${vdn.COLUMN_TYPE} NOT NULL`);
            const unique = await query("SELECT INDEX_NAME, GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS cols FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='t_icc_sip_directory' AND NON_UNIQUE=0 GROUP BY INDEX_NAME");
            if (!unique.some(k => k.cols === 'username')) await query('ALTER TABLE t_icc_sip_directory ADD UNIQUE KEY uk_sip_extension(username)');
            const fk = await query("SELECT CONSTRAINT_NAME FROM information_schema.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE() AND TABLE_NAME='t_icc_sip_directory' AND CONSTRAINT_NAME='fk_sip_extension'");
            if (!fk.length) await query('ALTER TABLE t_icc_sip_directory ADD CONSTRAINT fk_sip_extension FOREIGN KEY(vdn_id,username) REFERENCES t_icc_base_extension(VDN,Num) ON UPDATE CASCADE ON DELETE CASCADE');
        }
        await query('CREATE TABLE IF NOT EXISTS t_icc_extension_allocator (ID TINYINT NOT NULL PRIMARY KEY, NextNum BIGINT UNSIGNED NOT NULL) ENGINE=InnoDB');
        await query('INSERT IGNORE INTO t_icc_extension_allocator (ID,NextNum) VALUES (1,990001)');
        await query(`CREATE TABLE IF NOT EXISTS t_icc_extension_reservation (
            Num ${stringType} NOT NULL PRIMARY KEY, VDN ${vdn.COLUMN_TYPE} NOT NULL, Actor VARCHAR(255) NOT NULL,
            TokenHash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL, ExpiresAt DATETIME(3) NOT NULL,
            UNIQUE KEY uk_extension_token(TokenHash), KEY ix_extension_expiry(ExpiresAt)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
        const result = await inspectExtensionSchema(query);
        if (!result.ready) throw Error('Extension migration verification failed; keep maintenance mode and backup');
        return { ...result, preflight: 'passed', changed: true };
    } finally {
        await query("SELECT RELEASE_LOCK(CONCAT(DATABASE(), ':extension-schema'))");
    }
}
module.exports = { inspectExtensionSchema, migrateExtensionSchema };
