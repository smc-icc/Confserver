/**
 * 按 VDN 列出可配置的 IVR 子流程（flowTrees），供呼入路由等页面下拉选择。
 * 数据来源：ivr_projects 工程 + 已发布的 ivr_flows 运行时 JSON。
 */

const path = require('path');
const fs = require('fs').promises;
const webConf = require('../../../config/webConf');
const ivrStorage = require('./ivrStoragePaths');

function resolveDir(cfgKey, defaultRelPath) {
    const val = webConf[cfgKey];
    if (val && String(val).trim()) return String(val).trim();
    return path.join(__dirname, '../../../data', defaultRelPath);
}

const PROJECTS_DIR = resolveDir('ivr_projects', 'ivr_projects');
const RUNTIME_DIR = resolveDir('ivr_flows', 'ivr_flows');

function numVal(v, def = 0) {
    const n = Number(v);
    return Number.isFinite(n) ? n : def;
}

function parseFlowTreeId(fl) {
    if (fl == null) return 0;
    if (fl.flowTreeId != null && fl.flowTreeId !== '') return numVal(fl.flowTreeId, 0);
    const digits = String(fl.id != null ? fl.id : '').replace(/\D/g, '');
    return numVal(digits, 0);
}

function projectVdnId(project) {
    const g = project.properties?.general || {};
    if (g.projectId != null && g.projectId !== '') return numVal(g.projectId, 0);
    const digits = String(project.id != null ? project.id : '').replace(/\D/g, '');
    return numVal(digits, 0);
}

function flowLabel(id, name, extra) {
    const n = name != null ? String(name).trim() : '';
    if (n) return `${id} — ${n}${extra ? ` (${extra})` : ''}`;
    return `${id}${extra ? ` (${extra})` : ''}`;
}

async function loadProjectFlows(vdnId) {
    const rows = [];
    let projectIds = [];
    try {
        projectIds = await ivrStorage.listProjectIds(PROJECTS_DIR);
    } catch (e) {
        return rows;
    }
    await Promise.all(
        projectIds.map(async (pid) => {
            try {
                const fp = await ivrStorage.resolveProjectFile(PROJECTS_DIR, pid);
                const raw = await fs.readFile(fp, 'utf8');
                const project = JSON.parse(raw);
                const pv = projectVdnId(project);
                if (pv !== vdnId) return;
                const projectName = String(project.name != null ? project.name : pid);
                for (const fl of project.flows || []) {
                    const id = parseFlowTreeId(fl);
                    if (id <= 0) continue;
                    rows.push({
                        id,
                        name: String(fl.name != null ? fl.name : ''),
                        vdnId: pv,
                        projectId: String(project.id != null ? project.id : pid),
                        projectName,
                        source: 'project',
                        label: flowLabel(id, fl.name, projectName),
                    });
                }
            } catch (e) {
                /* skip broken project */
            }
        }),
    );
    return rows;
}

async function loadRuntimeFlows(vdnId) {
    const rows = [];
    let files = [];
    try {
        files = await ivrStorage.listRuntimeFlowFilesForVdn(RUNTIME_DIR, vdnId);
    } catch (e) {
        if (e.code !== 'ENOENT') throw e;
    }
    for (const fp of files) {
        let doc;
        try {
            doc = JSON.parse(await fs.readFile(fp, 'utf8'));
        } catch (e) {
            if (e.code !== 'ENOENT') throw e;
            continue;
        }
        const appName = String(doc.appName != null ? doc.appName : '');
        const appId = doc.appId != null ? String(doc.appId) : '';
        for (const fl of doc.flowTrees || []) {
            const id = numVal(fl.id, parseFlowTreeId(fl));
            if (id <= 0) continue;
            rows.push({
                id,
                name: String(fl.name != null ? fl.name : ''),
                vdnId,
                projectId: appId,
                projectName: appName,
                source: 'runtime',
                label: flowLabel(id, fl.name, appName || '已发布'),
            });
        }
    }
    return rows;
}

async function listFlowsByVdn(vdnId) {
    const vid = numVal(vdnId, 0);
    if (vid <= 0) return { Rows: [], Total: 0 };

    const merged = new Map();
    const fromProject = await loadProjectFlows(vid);
    for (const row of fromProject) {
        merged.set(row.id, row);
    }
    const fromRuntime = await loadRuntimeFlows(vid);
    for (const row of fromRuntime) {
        if (!merged.has(row.id)) merged.set(row.id, row);
    }

    const rows = Array.from(merged.values()).sort((a, b) => a.id - b.id);
    return { Rows: rows, Total: rows.length };
}

module.exports = {
    listFlowsByVdn,
    parseFlowTreeId,
    projectVdnId,
};
