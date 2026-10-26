'use strict';
const { fail } = require('./policy');
const crypto = require('node:crypto');
function createTarsAdapter(dependencies) {
  const { servers, admin, patches, configs } = dependencies || {
    servers: require('../server/ServerService'),
    tasks: require('../task/TaskService'),
    admin: require('../admin/AdminService'),
    patches: require('../patch/PatchService'),
    configs: require('../config/ConfigService'),
  };
  return {
    async preflight(plan) {
      for (const s of plan.services) {
        const patch = await patches.find({
          where: { id: s.patchId, server: s.application + '.' + s.serverName },
        });
        if (!patch) fail('发布包不存在或不属于目标服务');
        const existing = await servers.getServerConf(
          s.application,
          s.serverName,
          s.nodeName,
        );
        if (existing?.length && !s.allowExisting)
          fail('目标已有服务；安装计划需明确允许复用', 409);
        if (!existing?.length && !s.deploy) fail('新服务缺少部署配置');
      }
    },
    async ensure(s, actor) {
      let rows = await servers.getServerConf(
        s.application,
        s.serverName,
        s.nodeName,
      );
      if (!rows?.length) {
        const def = s.deploy;
        if (!Array.isArray(def.adapters) || !def.adapters.length)
          fail('缺少服务 Adapter 配置');
        await servers.addServerConf({
          ...def,
          application: s.application,
          server_name: s.serverName,
          operator: actor,
          developer: actor,
          adapters: def.adapters.map((a) => ({ ...a, node_name: s.nodeName })),
        });
        rows = await servers.getServerConf(
          s.application,
          s.serverName,
          s.nodeName,
        );
      }
      if (rows?.length !== 1) fail('目标服务记录不唯一', 409);
      for (const c of s.configs || []) {
        const params = {
          application: s.application,
          server_name: s.serverName,
          level: 5,
          filename: c.filename,
          config: c.content,
          uid: actor,
          force: false,
        };
        if (!(await configs.hasConfigFile(params)))
          await configs.addConfigFile(params);
      }
      return { id: rows[0].id };
    },
    async submit(_id, command, spec, taskNo, actor) {
      const itemNo = crypto
        .createHash('sha256')
        .update(taskNo + ':' + command)
        .digest('hex')
        .slice(0, 32);
      const code = await admin.addTask({
        taskNo,
        serial: true,
        userName: actor,
        isElegant: false,
        eachNum: 1,
        taskItemReq: [
          {
            taskNo,
            itemNo,
            application: spec.application,
            serverName: spec.serverName,
            nodeName: spec.nodeName,
            command,
            userName: actor,
            parameters:
              command === 'patch_tars'
                ? {
                    patch_id: String(spec.patchId),
                    bak_flag: '1',
                    group_name: '',
                  }
                : {},
          },
        ],
      });
      if (Number(code) !== 0)
        fail('TARS 未确认任务提交，请核对原任务编号', 502);
      return taskNo;
    },
    async task(taskNo) {
      // AdminRegistry DbProxy::getTaskRsp distinguishes -1 (missing) from -3 (DB failure).
      // Preserve this distinction: an RPC/DB error never authorizes resubmission.
      const task = await admin.getTaskRsp(taskNo);
      if (task === -1) return { missing: true };
      if (
        !task ||
        typeof task !== 'object' ||
        !Number.isInteger(Number(task.status))
      )
        fail('TARS 任务状态查询失败', 503);
      return { status: Number(task.status) };
    },
    async healthy(s) {
      const r = await admin.getServerState(
        s.application,
        s.serverName,
        s.nodeName,
      );
      return (
        Number(r.__return) === 0 &&
        String(r.state?.presentStateInNode).toLowerCase() === 'active' &&
        String(r.state?.presentStateInReg).toLowerCase() === 'active'
      );
    },
  };
}
module.exports = { createTarsAdapter };
