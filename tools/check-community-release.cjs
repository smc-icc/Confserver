#!/usr/bin/env node
'use strict';
const fs = require('node:fs/promises'),
  path = require('node:path');
const forbidden = [
  'client/src/pages/smcicc/call-flow-designer.vue',
  'client/src/pages/smcicc/itr-flow-designer.vue',
  'client/src/pages/smcicc/call-flow',
  'client/src/pages/smcicc/itr-flow',
  'client/src/assets/img/CallFlow',
  'app/controller/smcicc/CallFlowController.js',
  'app/controller/smcicc/ItrFlowController.js',
  'app/service/smcicc/callFlowExport.js',
];
async function check({ root = path.resolve(__dirname, '..'), web }) {
  const failures = [];
  for (const rel of forbidden)
    try {
      await fs.access(path.join(root, rel));
      failures.push('公共源码包含企业工具: ' + rel);
    } catch (e) {
      if (e.code !== 'ENOENT') throw e;
    }
  let inspected = 0;
  if (web) {
    async function visit(dir) {
      for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) await visit(full);
        else if (entry.isFile()) {
          inspected++;
          if (entry.name.endsWith('.map'))
            failures.push('公共构建包含 source map: ' + full);
          if (/\.(?:js|css|html)$/.test(entry.name)) {
            const text = await fs.readFile(full, 'utf8');
            if (
              /call-flow-page|itr-flow-page|smc_call_subflow|LogicFlow.prototype/.test(
                text,
              )
            )
              failures.push('公共构建包含编辑器实现: ' + full);
          }
        }
      }
    }
    await visit(path.resolve(web));
  }
  if (failures.length) throw Error(failures.join('\n'));
  return {
    ok: true,
    sourceRoot: root,
    web: web ? path.resolve(web) : null,
    filesInspected: inspected,
  };
}
if (require.main === module) {
  const args = process.argv.slice(2),
    web = args.includes('--web') ? args[args.indexOf('--web') + 1] : undefined;
  check({ web })
    .then((r) => console.log(JSON.stringify(r, null, 2)))
    .catch((e) => {
      console.error(e.message);
      process.exitCode = 1;
    });
}
module.exports = { check, forbidden };
