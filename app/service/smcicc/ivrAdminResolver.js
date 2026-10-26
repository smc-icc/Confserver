/**
 * Resolve VDN → ICC NodeID → TARS node_name → AdminObj endpoint.
 */

const Db = require('../../dao/db');
const webConf = require('../../../config/webConf');
const { QueryTypes } = require('sequelize');
const { tAdapterConf } = require('../../dao/db').db_tars;

const ADMIN_SERVANT = 'SMC-ICC.IVRServer.AdminObj';
const IVR_APPLICATION = 'SMC-ICC';
const IVR_SERVER = 'IVRServer';
const DEVICE_TYPE_IVR = 5;
const TARGET_TYPE_IVR_ADMIN = 'IVR_ADMIN';

function smciccSequelize() {
    return Db.db_smcicc.sequelize;
}

function tarsSequelize() {
    return Db.db_tars.sequelize;
}

function buildAdminObj(endpoint) {
    const ep = String(endpoint || '').trim();
    if (!ep) return null;
    return `${ADMIN_SERVANT}@${ep}`;
}

async function listBoundNodeIds(vdnId) {
    try {
        const rows = await smciccSequelize().query(
            `SELECT DISTINCT NodeID AS nodeId
               FROM t_icc_vdn_node_bind
              WHERE VDNID = :vdnId
                AND TargetType = :targetType
                AND Enabled = 1
                AND NodeID > 0`,
            {
                replacements: { vdnId, targetType: TARGET_TYPE_IVR_ADMIN },
                type: QueryTypes.SELECT,
            },
        );
        return rows.map((r) => Number(r.nodeId)).filter((n) => n > 0);
    } catch (e) {
        return [];
    }
}

async function listCompatRouteNodeIds(vdnId) {
    const rows = await smciccSequelize().query(
        `SELECT DISTINCT NodeID AS nodeId
           FROM t_icc_vdn_serviceroute
          WHERE VDNID = :vdnId
            AND DeviceType = :deviceType
            AND NodeID > 0`,
        {
            replacements: { vdnId, deviceType: DEVICE_TYPE_IVR },
            type: QueryTypes.SELECT,
        },
    );
    return rows.map((r) => Number(r.nodeId)).filter((n) => n > 0);
}

async function listIvrNodeIds(vdnId) {
    const bindNodeIds = await listBoundNodeIds(vdnId);
    if (bindNodeIds.length) {
        return bindNodeIds;
    }
    return listCompatRouteNodeIds(vdnId);
}

async function resolveTarsNodeName(nodeId) {
    const mapping = webConf.ivrNodeIdToTarsNode || {};
    if (mapping[String(nodeId)]) {
        return String(mapping[String(nodeId)]).trim();
    }

    const tasRows = await smciccSequelize().query(
        `SELECT LocalIP AS localIp FROM t_icc_cfg_tas WHERE MyID = :nodeId LIMIT 1`,
        { replacements: { nodeId }, type: QueryTypes.SELECT },
    );
    const localIp = tasRows[0]?.localIp;
    if (localIp) {
        const nodeRows = await tarsSequelize().query(
            `SELECT node_name AS nodeName FROM t_node_info WHERE endpoint_ip = :ip LIMIT 1`,
            { replacements: { ip: localIp }, type: QueryTypes.SELECT },
        );
        if (nodeRows[0]?.nodeName) {
            return nodeRows[0].nodeName;
        }
    }

    const serverRows = await tarsSequelize().query(
        `SELECT DISTINCT node_name AS nodeName
           FROM t_server_conf
          WHERE application = :app AND server_name = :server`,
        {
            replacements: { app: IVR_APPLICATION, server: IVR_SERVER },
            type: QueryTypes.SELECT,
        },
    );
    if (serverRows.length === 1) {
        return serverRows[0].nodeName;
    }
    return null;
}

async function resolveAdminObjForNode(nodeName) {
    const row = await tAdapterConf.findOne({
        raw: true,
        where: {
            application: IVR_APPLICATION,
            server_name: IVR_SERVER,
            node_name: nodeName,
            servant: ADMIN_SERVANT,
        },
    });
    if (!row || !row.endpoint) {
        return null;
    }
    return buildAdminObj(row.endpoint);
}

/**
 * @returns {Promise<Array<{nodeId:number, nodeName:string|null, adminObj:string|null, error:string|null}>>}
 */
async function resolveAdminObjs(vdnId) {
    const nodeIds = await listIvrNodeIds(vdnId);
    if (!nodeIds.length) {
        const err = new Error('VDN 未配置 IVR 节点绑定（t_icc_vdn_node_bind）或兼容服务路由（DeviceType=5 且 NodeID>0）');
        err.code = 'IVR_ROUTE_MISSING';
        throw err;
    }

    const nodes = [];
    for (const nodeId of nodeIds) {
        const nodeName = await resolveTarsNodeName(nodeId);
        if (!nodeName) {
            nodes.push({
                nodeId,
                nodeName: null,
                adminObj: null,
                error: `无法将 NodeID=${nodeId} 映射到 TARS node_name`,
            });
            continue;
        }
        const adminObj = await resolveAdminObjForNode(nodeName);
        if (!adminObj) {
            nodes.push({
                nodeId,
                nodeName,
                adminObj: null,
                error: `节点 ${nodeName} 未注册 ${ADMIN_SERVANT}`,
            });
            continue;
        }
        nodes.push({ nodeId, nodeName, adminObj, error: null });
    }

    if (!nodes.some((n) => n.adminObj)) {
        const err = new Error('未解析到任何可用的 IVR AdminObj endpoint');
        err.code = 'IVR_ADMIN_MISSING';
        err.nodes = nodes;
        throw err;
    }
    return nodes;
}

module.exports = {
    ADMIN_SERVANT,
    buildAdminObj,
    listBoundNodeIds,
    listCompatRouteNodeIds,
    listIvrNodeIds,
    resolveAdminObjForNode,
    resolveAdminObjs,
    resolveTarsNodeName,
};
