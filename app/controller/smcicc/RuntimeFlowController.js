'use strict';
const path = require('node:path'),
  fs = require('node:fs/promises');
const { action, admin } = require('../../service/community/http');
const { runtime } = require('../../service/community/runtime');
const { fail } = require('../../service/community/policy');
async function allowed(ctx, module) {
  await admin(ctx);
  const snapshot = await runtime().manager.snapshot();
  if (!snapshot.modules[module].available && !snapshot.modules['flow-designer'].available)
    fail('对应流程运行模块未启用', 403);
}
module.exports = {
  ivrList: action(async (ctx) => {
    await allowed(ctx, 'ivr');
    return require('../../service/smcicc/callFlowFlowListService').listFlowsByVdn(
      Number(ctx.paramsObj.vdnId || 0),
    );
  }),
  itrList: action(async (ctx) => {
    await allowed(ctx, 'itr');
    const web = require('../../../config/webConf'),
      dir = web.itr_flows || path.resolve(__dirname, '../../../data/itr_flows');
    let names;
    try {
      names = await fs.readdir(dir);
    } catch (e) {
      if (e.code !== 'ENOENT') throw e;
      names = [];
    }
    const items = [];
    for (const name of names.filter((n) => /^flow_\d+\.json$/.test(n))) {
      const doc = JSON.parse(await fs.readFile(path.join(dir, name), 'utf8'));
      items.push({ id: doc.id, name: doc.name || name });
    }
    return { items };
  }),
};
