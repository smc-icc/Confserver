/**
 * Resolve CCSServer CCSObj endpoints from t_adapter_conf (or CCS_OBJ env).
 */

const { tAdapterConf } = require('../../dao/db').db_tars;

const CCS_APPLICATION = process.env.CCS_APPLICATION || 'SMC-ICC';
const CCS_SERVER = process.env.CCS_SERVER || 'CCSServer';
const CCS_SERVANT = process.env.CCS_SERVANT || `${CCS_APPLICATION}.${CCS_SERVER}.CCSObj`;

function buildCcsObj(endpoint) {
    const ep = String(endpoint || '').trim();
    if (!ep) return null;
    return `${CCS_SERVANT}@${ep}`;
}

function envCcsObjs() {
    const raw = process.env.CCS_OBJ || process.env.SMC_ICC_CCS_OBJ || '';
    return String(raw)
        .split(/[;\n]/)
        .map((s) => s.trim())
        .filter(Boolean)
        .map((ccsObj, i) => ({ nodeName: `env${i}`, ccsObj, error: null }));
}

async function resolveCcsObjs() {
    const fromEnv = envCcsObjs();
    if (fromEnv.length) {
        return fromEnv;
    }

    const rows = await tAdapterConf.findAll({
        raw: true,
        where: {
            application: CCS_APPLICATION,
            server_name: CCS_SERVER,
            servant: CCS_SERVANT,
        },
    });
    const nodes = (rows || [])
        .map((row) => {
            const ccsObj = buildCcsObj(row.endpoint);
            return {
                nodeName: row.node_name || '',
                ccsObj,
                error: ccsObj ? null : `节点 ${row.node_name || '?'} 未注册 ${CCS_SERVANT} endpoint`,
            };
        })
        .filter((n) => n.ccsObj || n.error);

    if (!nodes.some((n) => n.ccsObj)) {
        const err = new Error(`未解析到任何可用的 ${CCS_SERVANT} endpoint（可设 CCS_OBJ）`);
        err.code = 'CCS_OBJ_MISSING';
        err.nodes = nodes;
        throw err;
    }
    return nodes;
}

module.exports = {
    CCS_APPLICATION,
    CCS_SERVER,
    CCS_SERVANT,
    buildCcsObj,
    resolveCcsObjs,
};
