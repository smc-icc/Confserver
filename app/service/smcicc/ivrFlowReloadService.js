/**
 * ConfServer publish → IVR AdminObj validate + hot-reload.
 */

const logger = require('../../../logger');
const ivrAdminResolver = require('./ivrAdminResolver');
const { ivrAdminPrx, ivrAdminStruct } = require('../util/rpcClient');

const RPC_TIMEOUT_MS = 15000;

function mapErrors(errors) {
    if (!errors) return [];
  const list = Array.isArray(errors) ? errors : errors.value || [];
    return list.map((e) => ({
        code: e.code,
        message: e.message,
        nodeId: e.nodeId,
        nodeIndex: e.nodeIndex,
    }));
}

function makeValidateReq(vdnId, flowJson) {
    const req = new ivrAdminStruct.stIvrFlowValidateReq_t();
    req.readFromObject({ vdnId: Number(vdnId), flowJson: String(flowJson) });
    return req;
}

function makeReloadReq(vdnId, flowJson) {
    const req = new ivrAdminStruct.stIvrFlowReloadReq_t();
    req.readFromObject({
        vdnId: Number(vdnId),
        flowJson: String(flowJson),
        persistToDisk: true,
    });
    return req;
}

async function publishToNode(target, vdnId, flowJson) {
    const base = {
        nodeId: target.nodeId,
        nodeName: target.nodeName,
        adminObj: target.adminObj,
    };
    if (!target.adminObj) {
        return {
            ...base,
            ok: false,
            syntax: null,
            graph: null,
            reload: null,
            errors: [{ code: -1, message: target.error || 'AdminObj 不可用' }],
        };
    }

    const prx = ivrAdminPrx(target.adminObj);
    prx.setTimeout(RPC_TIMEOUT_MS);

    try {
        const vreq = makeValidateReq(vdnId, flowJson);
        const syntaxRes = await prx.ValidateFlowSyntax(vreq);
        const syntax = {
            passed: Boolean(syntaxRes.rsp && syntaxRes.rsp.passed),
            errors: mapErrors(syntaxRes.rsp && syntaxRes.rsp.errors),
        };
        if (!syntax.passed) {
            return { ...base, ok: false, syntax, graph: null, reload: null, errors: syntax.errors };
        }

        const graphRes = await prx.ValidateFlowGraph(vreq);
        const graph = {
            passed: Boolean(graphRes.rsp && graphRes.rsp.passed),
            errors: mapErrors(graphRes.rsp && graphRes.rsp.errors),
        };
        if (!graph.passed) {
            return { ...base, ok: false, syntax, graph, reload: null, errors: graph.errors };
        }

        const rreq = makeReloadReq(vdnId, flowJson);
        const reloadRes = await prx.ReloadFlow(rreq);
        const rsp = reloadRes.rsp || {};
        const reloadErrors = mapErrors(rsp.errors);
        const reloadOk = Number(reloadRes.__return) === 0 && reloadErrors.length === 0;
        const reload = {
            flowId: rsp.flowId,
            sn: rsp.sn,
            nodeCount: rsp.nodeCount,
        };
        return {
            ...base,
            ok: reloadOk,
            syntax,
            graph,
            reload,
            errors: reloadErrors,
        };
    } catch (e) {
        logger.error('[ivrFlowReloadService] RPC failed node=%s obj=%s', target.nodeName, target.adminObj, e);
        return {
            ...base,
            ok: false,
            syntax: null,
            graph: null,
            reload: null,
            errors: [{ code: -2, message: String(e.message || e) }],
        };
    }
}

/**
 * Validate syntax + graph, then reload on all resolved IVR nodes.
 * @returns {Promise<{ok:boolean, nodes:Array, errors:Array}>}
 */
async function publish(vdnId, flowJson) {
    let targets;
    try {
        targets = await ivrAdminResolver.resolveAdminObjs(vdnId);
    } catch (e) {
        return {
            ok: false,
            nodes: e.nodes || [],
            errors: [{ code: -1, message: String(e.message || e) }],
            syntax: null,
            graph: null,
            reload: null,
        };
    }

    const nodes = [];
    for (const target of targets) {
        nodes.push(await publishToNode(target, vdnId, flowJson));
    }

    const ok = nodes.length > 0 && nodes.every((n) => n.ok);
    const errors = nodes.flatMap((n) => n.errors || []);
    const first = nodes.find((n) => n.syntax) || nodes[0] || null;
    return {
        ok,
        nodes,
        errors,
        syntax: first && first.syntax,
        graph: first && first.graph,
        reload: nodes.find((n) => n.reload && n.ok)?.reload || null,
    };
}

module.exports = {
    publish,
    publishToNode,
};
