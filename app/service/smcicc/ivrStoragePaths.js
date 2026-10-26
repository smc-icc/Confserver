/**
 * IVR 工程 / 运行时流程文件路径与备份（目录结构：{root}/{id}/{id}.json）
 */

const path = require('path');
const fs = require('fs').promises;

/** 备份后缀时间戳：YYYYMMDDHHmm（本地时间） */
function backupTimestamp() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}`;
}

function projectFilePath(projectsDir, projectId) {
    return path.join(projectsDir, projectId, `${projectId}.json`);
}

function legacyProjectFilePath(projectsDir, projectId) {
    return path.join(projectsDir, `${projectId}.json`);
}

/** 发布 VDN 目录名，如 VDN1 */
function vdnDirName(publishVdnId) {
    return `VDN${publishVdnId}`;
}

/** 应用流程目录/文件名，如 flow_70 */
function appFlowBaseName(appId) {
    return `flow_${appId}`;
}

/**
 * 运行时布局：VDN{publishVdn}/flow_{appId}/flow_{appId}.json
 * publishVdn = 发布目标 VDN；appId = 工程 general.projectId（如 proj_flow_70 → 70）
 */
function runtimeFilePath(runtimeDir, publishVdnId, appId) {
    const appPart = appFlowBaseName(appId);
    return path.join(runtimeDir, vdnDirName(publishVdnId), appPart, `${appPart}.json`);
}

async function fileExists(fp) {
    try {
        await fs.access(fp);
        return true;
    } catch (e) {
        if (e.code === 'ENOENT') return false;
        throw e;
    }
}

/** 若目标文件存在，复制为 {file}.{timestamp} 备份 */
async function backupFileIfExists(filePath) {
    try {
        await fs.access(filePath);
    } catch (e) {
        if (e.code === 'ENOENT') return null;
        throw e;
    }
    const backupPath = `${filePath}.${backupTimestamp()}`;
    await fs.copyFile(filePath, backupPath);
    return backupPath;
}

async function ensureParentDir(filePath) {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
}

/** 将旧版扁平文件迁移到 {id}/{id}.json（若新路径尚不存在） */
async function migrateLegacyProjectFile(projectsDir, projectId) {
    const modern = projectFilePath(projectsDir, projectId);
    const legacy = legacyProjectFilePath(projectsDir, projectId);
    try {
        await fs.access(modern);
        return modern;
    } catch (e) {
        if (e.code !== 'ENOENT') throw e;
    }
    try {
        await fs.access(legacy);
    } catch (e) {
        if (e.code === 'ENOENT') throw e;
        throw e;
    }
    await ensureParentDir(modern);
    await fs.rename(legacy, modern);
    return modern;
}

/** 列出某 VDN 下已发布的应用流程文件（VDN{n}/flow_{app}/flow_{app}.json） */
async function listRuntimeFlowFilesForVdn(runtimeDir, publishVdnId) {
    const files = [];
    const vdnDir = path.join(runtimeDir, vdnDirName(publishVdnId));
    let entries;
    try {
        entries = await fs.readdir(vdnDir, { withFileTypes: true });
    } catch (e) {
        if (e.code === 'ENOENT') return [];
        throw e;
    }
    await Promise.all(entries.map(async (ent) => {
        if (!ent.isDirectory() || !ent.name.startsWith('flow_')) return;
        const inner = path.join(vdnDir, ent.name, `${ent.name}.json`);
        if (await fileExists(inner)) files.push(inner);
    }));
    return files;
}

/** 解析工程文件路径（自动迁移旧版扁平文件） */
async function resolveProjectFile(projectsDir, projectId) {
    const modern = projectFilePath(projectsDir, projectId);
    try {
        await fs.access(modern);
        return modern;
    } catch (e) {
        if (e.code !== 'ENOENT') throw e;
    }
    return migrateLegacyProjectFile(projectsDir, projectId);
}

/** 列出所有工程 id（兼容扁平与目录两种布局） */
async function listProjectIds(projectsDir) {
    let entries;
    try {
        entries = await fs.readdir(projectsDir, { withFileTypes: true });
    } catch (e) {
        if (e.code === 'ENOENT') return [];
        throw e;
    }
    const ids = new Set();
    await Promise.all(entries.map(async (ent) => {
        if (ent.isFile() && ent.name.endsWith('.json') && !/\.json\.\d+$/.test(ent.name)) {
            ids.add(ent.name.replace(/\.json$/, ''));
            return;
        }
        if (ent.isDirectory()) {
            const inner = path.join(projectsDir, ent.name, `${ent.name}.json`);
            if (await fileExists(inner)) {
                ids.add(ent.name);
            }
        }
    }));
    return [...ids];
}

/** 写入工程 JSON：先备份旧文件，再写入新路径 */
async function writeProjectJson(projectsDir, projectId, doc) {
    const fp = projectFilePath(projectsDir, projectId);
    try {
        await resolveProjectFile(projectsDir, projectId);
    } catch (e) {
        if (e.code !== 'ENOENT') throw e;
    }
    const backupPath = await backupFileIfExists(fp);
    await ensureParentDir(fp);
    await fs.writeFile(fp, JSON.stringify(doc, null, 2), 'utf8');
    return { filePath: fp, backupPath };
}

/** 写入运行时 flow JSON：先备份旧文件，再写入新路径 */
async function writeRuntimeFlowJson(runtimeDir, publishVdnId, appId, doc) {
    const fp = runtimeFilePath(runtimeDir, publishVdnId, appId);
    const backupPath = await backupFileIfExists(fp);
    await ensureParentDir(fp);
    await fs.writeFile(fp, JSON.stringify(doc, null, 2), 'utf8');
    return { filePath: fp, backupPath, publishVdnId, appId };
}

async function removeProjectStorage(projectsDir, projectId) {
    const modern = projectFilePath(projectsDir, projectId);
    const legacy = legacyProjectFilePath(projectsDir, projectId);
    let removed = false;
    try {
        await fs.unlink(modern);
        removed = true;
    } catch (e) {
        if (e.code !== 'ENOENT') throw e;
    }
    try {
        await fs.unlink(legacy);
        removed = true;
    } catch (e) {
        if (e.code !== 'ENOENT') throw e;
    }
    try {
        await fs.rmdir(path.join(projectsDir, projectId));
    } catch (e) {
        if (e.code !== 'ENOENT') {
            /* 目录非空则保留 */
        }
    }
    if (!removed) {
        const err = new Error('not found');
        err.code = 'ENOENT';
        throw err;
    }
}

module.exports = {
    backupTimestamp,
    projectFilePath,
    legacyProjectFilePath,
    vdnDirName,
    appFlowBaseName,
    runtimeFilePath,
    listRuntimeFlowFilesForVdn,
    backupFileIfExists,
    migrateLegacyProjectFile,
    resolveProjectFile,
    listProjectIds,
    writeProjectJson,
    writeRuntimeFlowJson,
    removeProjectStorage,
};
