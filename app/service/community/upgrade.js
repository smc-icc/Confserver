'use strict';
const fs = require('node:fs/promises'),
  path = require('node:path'),
  crypto = require('node:crypto');
const { CATALOG, fail, entitlement } = require('./policy');
const { verifyEnvelope, validateLicense } = require('./signature');
const { validatePackage } = require('./plugins');
const { validateComponentPlan } = require('./installer');
const professionalModules = ['icc', 'ivr', 'itr'];
const enterpriseModules = Object.keys(CATALOG).filter((id) => id !== 'omni');
const digest = (value) =>
  crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
// One coordinator owns upgrades. Checkpoint every idempotent side effect so a
// process restart can resume using the original TARS task identifiers.
class UpgradeCoordinator {
  constructor(options) {
    this.options = options;
    this.queue = Promise.resolve();
  }
  serial(fn) {
    const result = this.queue.then(fn, fn);
    this.queue = result.catch(() => {});
    return result;
  }
  async read(id) {
    if (!/^[a-f0-9]{64}$/.test(id || '')) fail('升级任务编号无效');
    return JSON.parse(
      await fs.readFile(path.join(this.options.dir, id + '.json'), 'utf8'),
    );
  }
  async atomic(name, value) {
    await fs.mkdir(this.options.dir, { recursive: true });
    const target = path.join(this.options.dir, name),
      tmp = target + '.' + crypto.randomUUID() + '.tmp';
    try {
      await fs.writeFile(tmp, JSON.stringify(value), {
        mode: 0o600,
        flag: 'wx',
      });
      await fs.rename(tmp, target);
    } finally {
      await fs.unlink(tmp).catch(() => {});
    }
  }
  async save(job) {
    job.updatedAt = new Date().toISOString();
    await this.atomic(job.id + '.json', job);
  }
  async active() {
    try {
      const p = JSON.parse(
        await fs.readFile(path.join(this.options.dir, 'current.json'), 'utf8'),
      );
      return await this.read(p.id);
    } catch (e) {
      if (e.code === 'ENOENT') return null;
      throw e;
    }
  }
  view(job) {
    if (!job) return null;
    const {
      id,
      edition,
      phase,
      index,
      modules,
      error,
      component,
      createdAt,
      updatedAt,
    } = job;
    return {
      id,
      edition,
      phase,
      index,
      total: modules.length,
      modules,
      error,
      component,
      createdAt,
      updatedAt,
    };
  }
  async current() {
    return this.view(await this.active());
  }
  decode(bundle, target) {
    if (
      !bundle ||
      bundle.kind !== 'smc-upgrade/1' ||
      !['professional', 'enterprise'].includes(target) ||
      !Array.isArray(bundle.components) ||
      bundle.components.length > 6
    )
      fail('升级包格式无效');
    const manager = this.options.manager;
    const license = validateLicense(
      verifyEnvelope(bundle.license, manager.options.licensePublicKey),
      manager.options.deploymentId,
      (manager.options.now || Date.now)(),
    );
    const edition =
      license.edition === 'registered' ? 'professional' : license.edition;
    if (edition !== target) fail('授权版本与所选升级版本不符', 403);
    const modules =
      edition === 'professional' ? professionalModules : enterpriseModules;
    if (modules.some((id) => !entitlement(license, id)))
      fail('授权未包含此版本所需的全部功能', 403);
    if (
      edition === 'enterprise' &&
      ['voiceSeats', 'concurrentCalls', 'videoConcurrentCalls'].some(
        (k) => !Number.isSafeInteger(license.limits[k]),
      )
    )
      fail('企业版授权必须指定坐席、语音、视频并发配额', 403);
    if (edition === 'professional' && bundle.plugin)
      fail('专业版不包含流程设计器', 403);
    const plans = bundle.components.map((envelope) => {
      const plan = verifyEnvelope(envelope, this.options.publicKey);
      if (
        plan.kind !== 'smc-component/1' ||
        plan.deploymentId !== license.deploymentId ||
        !modules.includes(plan.module)
      )
        fail('组件部署或版本权限不匹配', 403);
      return validateComponentPlan(plan);
    });
    if (new Set(plans.map((p) => p.module)).size !== plans.length)
      fail('升级包包含重复模块');
    const services = plans.flatMap((p) =>
      p.services.map(
        (s) => s.application + '/' + s.serverName + '/' + s.nodeName,
      ),
    );
    if (new Set(services).size !== services.length) fail('升级包包含重复服务');
    if (bundle.plugin) validatePackage(bundle.plugin, this.options.publicKey);
    return { license, edition, modules, plans };
  }
  create(bundle, target, expectedRevision, actor) {
    return this.serial(async () => {
      const parsed = this.decode(bundle, target),
        id = digest(bundle);
      let saved;
      try {
        saved = await this.read(id);
      } catch (e) {
        if (e.code !== 'ENOENT') throw e;
      }
      const active = await this.active();
      if (saved) {
        if (active && active.id !== id && active.phase !== 'complete')
          fail('已有未完成升级，请继续原任务', 409);
        await this.assertLicense(saved, true);
        if (active?.id !== id) await this.atomic('current.json', { id });
        return this.view(saved);
      }
      if (active && active.phase !== 'complete')
        fail('已有未完成升级，请继续原任务', 409);
      const raw = await this.options.manager.read(),
        caps = await this.options.manager.snapshot();
      if (
        !Number.isSafeInteger(expectedRevision) ||
        expectedRevision !== raw.revision
      )
        fail('模块配置已变化，请刷新后重试', 409);
      if (caps.edition === 'enterprise' && target === 'professional')
        fail('升级入口不支持企业版降级', 409);
      if (parsed.license.revision <= raw.highestLicenseRevision)
        fail('拒绝旧授权或重复授权', 409);
      for (const module of parsed.modules) {
        if (module === 'flow-designer') {
          if (!bundle.plugin && !caps.modules[module].installed)
            fail('升级包缺少企业流程设计工具');
        } else if (
          !parsed.plans.some((p) => p.module === module) &&
          !caps.modules[module].installed
        )
          fail('升级包缺少功能组件：' + CATALOG[module].name);
      }
      // These remote package checks are read-only and precede license changes.
      for (const plan of parsed.plans)
        await this.options.installer.options.adapter.preflight(plan);
      const job = {
        id,
        bundle,
        edition: target,
        modules: parsed.modules,
        phase: 'prepared',
        index: 0,
        expectedRevision,
        actor,
        createdAt: new Date().toISOString(),
      };
      await this.save(job);
      await this.atomic('current.json', { id });
      return this.view(job);
    });
  }
  async assertLicense(job, allowPending = false) {
    const parsed = this.decode(job.bundle, job.edition),
      raw = await this.options.manager.read();
    if (JSON.stringify(raw.license) === JSON.stringify(job.bundle.license))
      return parsed;
    if (
      allowPending &&
      !job.licenseImported &&
      raw.highestLicenseRevision < parsed.license.revision
    )
      return parsed;
    fail('升级授权已被替换或失效，请核对当前授权', 409);
  }
  advance(id, retry = false, expectedRevision) {
    return this.serial(async () => {
      const job = await this.read(id),
        active = await this.active();
      if (active?.id !== id) fail('此升级任务已被替换', 409);
      const parsed = await this.assertLicense(job, true);
      if (job.phase === 'complete' || (job.phase === 'failed' && !retry))
        return this.view(job);
      try {
        if (!job.licenseImported) {
          const raw = await this.options.manager.read();
          if (
            retry &&
            Number.isSafeInteger(expectedRevision) &&
            expectedRevision === raw.revision
          ) {
            job.expectedRevision = expectedRevision;
            await this.save(job);
          }
          if (
            JSON.stringify(raw.license) !== JSON.stringify(job.bundle.license)
          )
            await this.options.manager.importLicense(
              job.bundle.license,
              job.expectedRevision,
            );
          job.licenseImported = true;
          job.phase = 'installing';
          delete job.error;
          await this.save(job);
        }
        for (; job.index < parsed.plans.length; job.index++) {
          const child = await this.options.installer.create(
            parsed.plans[job.index],
            job.actor,
          );
          const result = await this.options.installer.advance(child.id, retry);
          job.component = {
            module: result.plan.module,
            phase: result.phase,
            index: result.index,
            total: result.plan.services.length,
          };
          if (result.phase !== 'complete') {
            job.phase = result.phase === 'failed' ? 'failed' : 'installing';
            job.error = result.error;
            await this.save(job);
            return this.view(job);
          }
          job.phase = 'installing';
          delete job.error;
          await this.save(job);
        }
        if (job.bundle.plugin) {
          job.phase = 'installing_designer';
          await this.save(job);
          const s = await this.options.manager.snapshot();
          await this.options.plugins.install(job.bundle.plugin, s.revision);
        }
        // Publish capabilities atomically after every installation succeeds.
        await this.options.manager.update(undefined, (s) => {
          const license = this.options.manager.license(s);
          if (
            JSON.stringify(s.license) !== JSON.stringify(job.bundle.license) ||
            !license
          )
            fail('升级期间授权已变化', 409);
          for (const module of job.modules) {
            if (!s.modules[module]?.installed || !entitlement(license, module))
              fail('升级组件未就绪', 409);
            s.modules[module] = { ...s.modules[module], enabled: true };
          }
        });
        job.phase = 'complete';
        job.index = job.modules.length;
        delete job.error;
        delete job.component;
        await this.save(job);
      } catch (e) {
        job.phase = 'failed';
        job.error = e.status
          ? e.message
          : '升级未完成，请检查组件安装日志后重试';
        await this.save(job);
      }
      return this.view(job);
    });
  }
}
module.exports = { UpgradeCoordinator };
