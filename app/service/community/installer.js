'use strict';
const fs = require('node:fs/promises'),
  path = require('node:path'),
  crypto = require('node:crypto');
const { moduleId, fail } = require('./policy');
function validateComponentPlan(plan) {
  moduleId(plan?.module);
  if (
    ['omni', 'flow-designer'].includes(plan.module) ||
    !/^\d+\.\d+\.\d+(?:-[A-Za-z0-9.-]+)?$/.test(plan.version || '') ||
    !Array.isArray(plan.services) ||
    !plan.services.length ||
    plan.services.length > 16
  )
    fail('组件安装计划无效');
  for (const s of plan.services)
    if (
      !/^[A-Za-z][A-Za-z0-9_-]*$/.test(s.application) ||
      !/^[A-Za-z][A-Za-z0-9_]*$/.test(s.serverName) ||
      typeof s.nodeName !== 'string' ||
      !s.nodeName ||
      !Number.isSafeInteger(s.patchId) ||
      s.patchId < 1
    )
      fail('组件服务定义无效');
  return plan;
}
class ComponentInstaller {
  constructor(options) {
    this.options = options;
    this.running = new Map();
    this.moduleQueues = new Map();
  }
  withModule(module, fn) {
    const previous = this.moduleQueues.get(module) || Promise.resolve();
    const result = previous.then(fn, fn),
      tail = result.then(
        () => undefined,
        () => undefined,
      );
    this.moduleQueues.set(module, tail);
    tail.then(() => {
      if (this.moduleQueues.get(module) === tail)
        this.moduleQueues.delete(module);
    });
    return result;
  }
  async get(id) {
    if (!/^[a-f0-9]{64}$/.test(id)) fail('安装任务编号无效');
    return JSON.parse(
      await fs.readFile(path.join(this.options.dir, id + '.json'), 'utf8'),
    );
  }
  async save(job) {
    await fs.mkdir(this.options.dir, { recursive: true });
    const target = path.join(this.options.dir, job.id + '.json'),
      tmp = target + '.' + crypto.randomUUID() + '.tmp';
    job.updatedAt = new Date().toISOString();
    await fs.writeFile(tmp, JSON.stringify(job, null, 2), { mode: 0o600 });
    await fs.rename(tmp, target);
  }
  async current(module) {
    try {
      return JSON.parse(
        await fs.readFile(
          path.join(this.options.dir, module + '.current.json'),
          'utf8',
        ),
      );
    } catch (e) {
      if (e.code === 'ENOENT') return null;
      throw e;
    }
  }
  async point(module, id) {
    await fs.mkdir(this.options.dir, { recursive: true });
    const file = path.join(this.options.dir, module + '.current.json'),
      tmp = file + '.' + crypto.randomUUID() + '.tmp';
    await fs.writeFile(tmp, JSON.stringify({ id }), { mode: 0o600 });
    await fs.rename(tmp, file);
  }
  create(plan, actor) {
    const module = moduleId(plan?.module);
    return this.withModule(module, () => this.createPlan(plan, actor));
  }
  async createPlan(plan, actor) {
    validateComponentPlan(plan);
    if (!(await this.options.manager.snapshot()).modules[plan.module]?.licensed)
      fail('当前版本未授权此组件', 403);
    const id = crypto
      .createHash('sha256')
      .update(JSON.stringify(plan))
      .digest('hex');
    try {
      return await this.get(id);
    } catch (e) {
      if (e.code !== 'ENOENT') throw e;
    }
    const current = await this.current(plan.module);
    if (current && current.id !== id) {
      const previous = await this.get(current.id);
      if (!['complete', 'failed'].includes(previous.phase))
        fail('此模块已有未完成安装任务，请先恢复原任务', 409);
    }
    await this.options.adapter.preflight(plan);
    const job = {
      id,
      plan,
      actor,
      phase: 'prepared',
      index: 0,
      services: [],
      createdAt: new Date().toISOString(),
    };
    await this.point(plan.module, id);
    await this.save(job);
    return job;
  }
  async advance(id, retry = false) {
    if (this.running.has(id)) return this.running.get(id);
    const run = (async () => {
      const job = await this.get(id);
      return this.withModule(job.plan.module, () => this.execute(id, retry));
    })();
    this.running.set(id, run);
    try {
      return await run;
    } finally {
      this.running.delete(id);
    }
  }
  async submit(job, service, command, spec) {
    service.unknownCommand = command;
    job.phase = 'submitting';
    await this.save(job);
    try {
      await this.options.adapter.submit(
        service.id,
        command,
        spec,
        service[command + 'Task'],
        job.actor,
      );
      delete service.unknownCommand;
      await this.save(job);
      return true;
    } catch {
      job.phase = 'submission_unknown';
      job.error =
        '任务提交结果不确定，请先核对原 TARS 任务 ' + service[command + 'Task'];
      await this.save(job);
      return false;
    }
  }
  async lookup(job, service, command) {
    try {
      const task = await this.options.adapter.task(service[command + 'Task']);
      if (task?.missing === true) return task;
      if (!Number.isInteger(Number(task?.status)))
        throw Error('invalid status');
      return task;
    } catch {
      job.phase = 'task_query_unknown';
      job.error = '任务状态暂不可确认，保留原任务编号并继续查询';
      await this.save(job);
      return null;
    }
  }
  async execute(id, retry) {
    const job = await this.get(id);
    if (job.phase === 'complete') return job;
    const current = await this.current(job.plan.module);
    if (current && current.id !== id)
      fail('此模块已选择其他安装计划，不能恢复旧任务', 409);
    if (!current) await this.point(job.plan.module, id);
    if (job.phase === 'failed' && !retry) return job;
    if (retry) {
      const failed = job.services[job.index];
      if (failed?.failedCommand) {
        delete failed[failed.failedCommand + 'Task'];
        delete failed.failedCommand;
      }
      job.phase = 'prepared';
      delete job.error;
      await this.save(job);
    }
    try {
      if (
        !(await this.options.manager.snapshot()).modules[job.plan.module]
          ?.licensed
      )
        fail('安装期间授权失效', 403);
      for (; job.index < job.plan.services.length; job.index++) {
        const spec = job.plan.services[job.index];
        let service = job.services[job.index];
        if (!service) {
          job.phase = 'deploying';
          await this.save(job);
          service = { ...(await this.options.adapter.ensure(spec, job.actor)) };
          job.services[job.index] = service;
          await this.save(job);
        }
        for (const command of ['patch_tars', 'start_tars']) {
          if (service[command + 'Done']) continue;
          const key = command + 'Task',
            existed = Boolean(service[key]);
          if (!existed) {
            service[key] = crypto.randomUUID().replace(/-/g, '');
            if (!(await this.submit(job, service, command, spec))) return job;
          }
          let task = await this.lookup(job, service, command);
          if (!task) return job;
          if (task.missing === true) {
            // TARS may evict non-publish tasks after an AdminRegistry restart.
            // Confirm the desired service state before replaying a start command.
            if (command === 'start_tars') {
              try {
                if (await this.options.adapter.healthy(spec)) {
                  service[command + 'Done'] = true;
                  delete service.unknownCommand;
                  await this.save(job);
                  continue;
                }
              } catch {
                job.phase = 'task_query_unknown';
                job.error = '启动任务与服务状态暂不可确认';
                await this.save(job);
                return job;
              }
            }
            service.unknownCommand = command;
            if (!retry || !existed) {
              job.phase = 'submission_unknown';
              job.error = '原任务尚不存在，确认后可重试；不会自动重复发布';
              await this.save(job);
              return job;
            }
            // Reuse both taskNo and deterministic itemNo when absence is confirmed.
            if (!(await this.submit(job, service, command, spec))) return job;
            task = await this.lookup(job, service, command);
            if (!task) return job;
            if (task.missing === true) {
              job.phase = 'submission_unknown';
              job.error = '提交后仍未确认任务，请保留原编号继续核对';
              await this.save(job);
              return job;
            }
          }
          delete service.unknownCommand;
          job.phase = command;
          delete job.error;
          await this.save(job);
          if (Number(task.status) !== 2) {
            if ([3, 4, 5].includes(Number(task.status))) {
              service.failedCommand = command;
              fail('TARS 任务失败: ' + service[key], 502);
            }
            return job;
          }
          service[command + 'Done'] = true;
          await this.save(job);
        }
        job.phase = 'verifying';
        delete job.error;
        await this.save(job);
        let healthy;
        try {
          healthy = await this.options.adapter.healthy(spec);
        } catch {
          job.error = '服务状态暂不可确认，继续保留安装任务';
          await this.save(job);
          return job;
        }
        if (!healthy) return job;
        await this.save(job);
      }
      await this.options.manager.markInstalled(job.plan.module, {
        version: job.plan.version,
        receipt: {
          connections: job.plan.connections || {},
          jobId: job.id,
          services: job.plan.services.map((s) => ({
            application: s.application,
            serverName: s.serverName,
            nodeName: s.nodeName,
          })),
        },
      });
      job.phase = 'complete';
      delete job.error;
      await this.save(job);
    } catch (e) {
      job.phase = 'failed';
      job.error = e.status
        ? e.message
        : '安装未完成，请查看 TARS 任务与服务日志后重试';
      await this.save(job);
    }
    return job;
  }
}
module.exports = { ComponentInstaller, validateComponentPlan };
