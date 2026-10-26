#!/usr/bin/env node
/**
 * ICC 迁移：生成 vdnadmin native vs 代理差集、systemadmin 路由与 Controller 完整性报告。
 * 用法：node tools/smcicc-inventory.js
 * 输出：tools/smcicc-action-inventory.json 与 tools/smcicc-action-inventory.md
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const strutsPath = path.join(root, 'app/service/smcicc/strutsActions.json');
const vdnCompatPath = path.join(root, 'app/controller/smcicc/VdnadminCompatController.js');
const sysCompatPath = path.join(root, 'app/controller/smcicc/SystemadminCompatController.js');
const apiConfPath = path.join(root, 'app/smciccApiConf.js');

const struts = JSON.parse(fs.readFileSync(strutsPath, 'utf8'));
const vdnadminAll = struts['struts-vdnadmin'] || [];
const systemadminStruts = struts['struts-systemadmin'] || [];

function extractNativeVdnadminKeys(jsSource) {
    const start = jsSource.indexOf('const nativeHandlers = {');
    if (start === -1) return [];
    const sub = jsSource.slice(start);
    const end = sub.indexOf('\n};');
    const block = sub.slice(0, end);
    const keys = [];
    const re = /^\s{4}([a-zA-Z_][a-zA-Z0-9_]*)\s*:/gm;
    let m;
    while ((m = re.exec(block)) !== null) {
        keys.push(m[1]);
    }
    return keys;
}

function extractSystemadminCompatActions(jsSource) {
    const start = jsSource.indexOf('const systemadminCompatActions = [');
    if (start === -1) return [];
    const sub = jsSource.slice(start);
    const end = sub.indexOf('\n];');
    const inner = sub.slice(sub.indexOf('[') + 1, end);
    const keys = [];
    const re = /'([a-zA-Z0-9_]+)'/g;
    let m;
    while ((m = re.exec(inner)) !== null) {
        keys.push(m[1]);
    }
    return keys;
}

const vdnJs = fs.readFileSync(vdnCompatPath, 'utf8');
const nativeVdn = extractNativeVdnadminKeys(vdnJs);
const nativeSet = new Set(nativeVdn);
const vdnProxy = vdnadminAll.filter((a) => !nativeSet.has(a));

const apiConfJs = fs.readFileSync(apiConfPath, 'utf8');
const systemadminRoutes = extractSystemadminCompatActions(apiConfJs);

/** 从 SystemadminCompatController.js 解析 module.exports 的键，避免 require 拉起 Sequelize */
function extractModuleExportKeys(jsSource) {
    const lines = jsSource.split(/\r?\n/);
    let start = -1;
    for (let i = 0; i < lines.length; i += 1) {
        if (lines[i].includes('module.exports = {')) {
            start = i;
            break;
        }
    }
    if (start === -1) return [];
    const keys = [];
    for (let i = start + 1; i < lines.length; i += 1) {
        const line = lines[i];
        if (/^\s*\};\s*$/.test(line)) break;
        const m = line.match(/^\s{4}([a-zA-Z_][a-zA-Z0-9_]*)\s*:/);
        if (m) keys.push(m[1]);
    }
    return keys;
}

const sysCompatJs = fs.readFileSync(sysCompatPath, 'utf8');
const systemadminExportKeys = new Set(extractModuleExportKeys(sysCompatJs));

const sysMissing = [];
const sysOk = [];
for (const action of systemadminRoutes) {
    if (systemadminExportKeys.has(action)) {
        sysOk.push(action);
    } else {
        sysMissing.push(action);
    }
}

const strutsSysSet = new Set(systemadminStruts);
const routesSet = new Set(systemadminRoutes);
const inStrutsNotInRoutes = systemadminStruts.filter((a) => !routesSet.has(a));
const inRoutesNotInStruts = systemadminRoutes.filter((a) => !strutsSysSet.has(a));

const report = {
    generatedAt: new Date().toISOString(),
    vdnadmin: {
        totalStrutsActions: vdnadminAll.length,
        nativeImplemented: nativeVdn.length,
        nativeActionNames: nativeVdn.sort(),
        proxyFallbackCount: vdnProxy.length,
        proxyFallbackActions: vdnProxy.sort(),
    },
    systemadmin: {
        routesInSMCIccApiConf: systemadminRoutes.length,
        controllerBoundOk: sysOk.length,
        controllerMissingHandler: sysMissing,
        strutsXmlActionCount: systemadminStruts.length,
        inStrutsXmlNotRegisteredInApiConf: inStrutsNotInRoutes,
        registeredInApiConfNotInStrutsXml: inRoutesNotInStruts,
    },
};

const jsonOut = path.join(__dirname, 'smcicc-action-inventory.json');
fs.writeFileSync(jsonOut, JSON.stringify(report, null, 2), 'utf8');

const md = [
    '# ICC Action 迁移清单（自动生成）',
    '',
    `生成时间：${report.generatedAt}（运行 \`node tools/smcicc-inventory.js\`）`,
    '',
    '## vdnadmin（/smcicc/vdnadmin/:action）',
    '',
    `- Struts 清单总数：**${report.vdnadmin.totalStrutsActions}**`,
    `- Node 已实现（nativeHandlers）：**${report.vdnadmin.nativeImplemented}**`,
    `- 仍依赖 ICC_LEGACY_BASE_URL 代理：**${report.vdnadmin.proxyFallbackCount}**`,
    '',
    '### 仍走代理的 action',
    '',
    ...report.vdnadmin.proxyFallbackActions.map((a) => `- \`${a}\``),
    '',
    '## systemadmin（/smcicc/systemadmin/:action）',
    '',
    `- smciccApiConf 注册数：**${report.systemadmin.routesInSMCIccApiConf}**`,
    `- Controller 已绑定函数：**${report.systemadmin.controllerBoundOk}**`,
    `- **缺失处理器（需修复）**：${report.systemadmin.controllerMissingHandler.length}`,
    '',
    ...(report.systemadmin.controllerMissingHandler.length
        ? report.systemadmin.controllerMissingHandler.map((a) => `- \`${a}\``)
        : ['- （无）']),
    '',
    '### struts-systemadmin.xml 中有但未在 smciccApiConf 注册',
    '',
    ...(report.systemadmin.inStrutsXmlNotRegisteredInApiConf.length
        ? report.systemadmin.inStrutsXmlNotRegisteredInApiConf.map((a) => `- \`${a}\``)
        : ['- （无）']),
    '',
    '### 已在 smciccApiConf 注册但不在 strutsActions.json 的 struts-systemadmin 列表',
    '',
    ...(report.systemadmin.registeredInApiConfNotInStrutsXml.length
        ? report.systemadmin.registeredInApiConfNotInStrutsXml.map((a) => `- \`${a}\``)
        : ['- （无）']),
    '',
].join('\n');

const mdOut = path.join(__dirname, 'smcicc-action-inventory.md');
fs.writeFileSync(mdOut, md, 'utf8');

console.log('Wrote', jsonOut);
console.log('Wrote', mdOut);
console.log('vdnadmin native:', nativeVdn.length, 'proxy:', vdnProxy.length);
console.log('systemadmin missing handlers:', sysMissing.length);
