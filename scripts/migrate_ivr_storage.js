#!/usr/bin/env node
'use strict';
/** 一次性迁移：扁平 ivr_projects/*.json、ivr_flows/flow_*.json → 子目录布局 */

const path = require('path');
const fs = require('fs').promises;
const ivrStorage = require('../app/service/smcicc/ivrStoragePaths');

const ROOT = path.join(__dirname, '../data');
const PROJECTS_DIR = path.join(ROOT, 'ivr_projects');
const RUNTIME_DIR = path.join(ROOT, 'ivr_flows');

async function migrateProjects() {
    let entries;
    try {
        entries = await fs.readdir(PROJECTS_DIR);
    } catch (e) {
        if (e.code === 'ENOENT') return 0;
        throw e;
    }
    let n = 0;
    for (const name of entries) {
        if (!name.endsWith('.json')) continue;
        const id = name.replace(/\.json$/, '');
        try {
            await ivrStorage.migrateLegacyProjectFile(PROJECTS_DIR, id);
            console.log('project:', id);
            n += 1;
        } catch (e) {
            console.warn('skip project', id, e.message);
        }
    }
    return n;
}

(async () => {
    const pc = await migrateProjects();
    console.log(`Done: ${pc} project(s) migrated. (运行时流程仅支持 VDN{n}/flow_{app}/flow_{app}.json，请在设计器发布)`);
})().catch((e) => {
    console.error(e);
    process.exit(1);
});
