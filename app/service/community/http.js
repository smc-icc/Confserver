'use strict';
const crypto = require('node:crypto');
const { runtime, installer, upgrades } = require('./runtime');
const { verifyEnvelope, configuredKey } = require('./signature');
const { fail } = require('./policy');
async function admin(ctx) {
  const c = await require('../integration/OnboardIdentity').context(ctx);
  if (c.role !== 'system') fail('仅系统管理员可管理组件或流程工具', 403);
  return c;
}
function revision(p) {
  if (!Number.isSafeInteger(p.expectedRevision) || p.expectedRevision < 0)
    fail('请提供当前配置修订号', 409);
  return p.expectedRevision;
}
function action(fn) {
  return async (ctx) => {
    try {
      const data = await fn(ctx, ctx.paramsObj || {});
      if (data !== undefined) ctx.body = { ret_code: 200, data };
    } catch (e) {
      ctx.status = e.status || 500;
      ctx.body = {
        ret_code: ctx.status,
        err_msg: e.status ? e.message : '操作未完成，请查看服务日志',
      };
      if (!e.status) require('../../../logger').error('[community]', e);
    }
  };
}
function createController(options = {}) {
  const getRuntime = options.runtime || runtime,
    getInstaller = options.installer || installer,
    getUpgrades = options.upgrades || upgrades,
    authorize = options.admin || admin,
    identity =
      options.identity ||
      ((ctx) => require('../integration/OnboardIdentity').context(ctx)),
    pluginKey =
      options.pluginKey || (() => configuredKey('SMC_PLUGIN_PUBLIC_KEY_FILE'));
  const Controller = {};
  Controller.snapshot = action(async (ctx) => {
    const c = await identity(ctx);
    return {
      ...(await getRuntime().manager.snapshot()),
      canManage: c.role === 'system',
      canDesign: c.role === 'system',
    };
  });
  Controller.license = action(async (ctx, p) => {
    await authorize(ctx);
    return getRuntime().manager.importLicense(p.envelope, revision(p));
  });
  Controller.enable = action(async (ctx, p) => {
    await authorize(ctx);
    return getRuntime().manager.setEnabled(p.module, p.enabled, revision(p));
  });
  Controller.installPlugin = action(async (ctx, p) => {
    await authorize(ctx);
    return getRuntime().plugins.install(p.envelope, revision(p));
  });
  Controller.installComponent = action(async (ctx, p) => {
    await authorize(ctx);
    const plan = verifyEnvelope(p.envelope, pluginKey());
    if (
      plan.kind !== 'smc-component/1' ||
      plan.deploymentId !== getRuntime().manager.options.deploymentId
    )
      fail('组件计划部署不匹配', 403);
    const job = await getInstaller().create(plan, ctx.uid);
    return getInstaller().advance(job.id);
  });
  Controller.job = action(async (ctx, p) => {
    await authorize(ctx);
    return getInstaller().advance(p.id, p.retry === true);
  });
  Controller.upgrade = action(async (ctx, p) => {
    await authorize(ctx);
    // Save and return before issuing RPCs; losing the upload response cannot
    // lose the task. The browser resumes it via the job endpoint.
    return getUpgrades().create(p.bundle, p.edition, revision(p), ctx.uid);
  });
  Controller.upgradeJob = action(async (ctx, p) => {
    await authorize(ctx);
    return getUpgrades().advance(p.id, p.retry === true, p.expectedRevision);
  });
  Controller.currentUpgrade = action(async (ctx) => {
    await authorize(ctx);
    return { job: await getUpgrades().current() };
  });
  Controller.asset = action(async (ctx) => {
    await authorize(ctx);
    const asset = ctx.params.asset;
    const result = await getRuntime().plugins.asset(asset);
    const ext = require('node:path').extname(asset).toLowerCase();
    const types = {
      '.html': 'text/html',
      '.js': 'application/javascript',
      '.css': 'text/css',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.svg': 'image/svg+xml',
      '.woff': 'font/woff',
      '.woff2': 'font/woff2',
      '.ttf': 'font/ttf',
      '.ico': 'image/x-icon',
    };
    ctx.type = types[ext] || 'application/octet-stream';
    ctx.set('Cache-Control', 'no-store');
    ctx.body = result.bytes;
  });
  return Controller;
}
const Controller = createController();
function upgradeUploadGate(options = {}) {
  return async (ctx, next) => {
    try {
      await (options.admin || admin)(ctx);
    } catch (e) {
      ctx.status = e.status || 503;
      ctx.body = {
        ret_code: ctx.status,
        err_msg: e.status ? e.message : '暂时无法确认升级权限',
      };
      return;
    }
    await next();
  };
}
function pluginUploadGate(options = {}) {
  return async (ctx, next) => {
    try {
      await (options.admin || admin)(ctx);
      const snapshot = await (
        options.snapshot || (() => runtime().manager.snapshot())
      )();
      if (
        snapshot.edition !== 'enterprise' ||
        !snapshot.modules['flow-designer']?.licensed
      )
        fail('需要企业版流程工具授权', 403);
    } catch (e) {
      ctx.status = e.status || 503;
      ctx.body = {
        ret_code: ctx.status,
        err_msg: e.status ? e.message : '暂时无法确认安装权限',
      };
      return;
    }
    await next();
  };
}
function runtimeMiddleware(options = {}) {
  return async (ctx, next) => {
    if (ctx.path !== '/api/smcicc/community/runtime') return next();
    if (ctx.method !== 'GET') {
      ctx.status = 405;
      return;
    }
    const expected =
        options.token ?? process.env.SMC_MODULE_SERVICE_TOKEN ?? '',
      actual = ctx.get('x-smc-module-token');
    if (
      expected.length < 32 ||
      Buffer.byteLength(actual) !== Buffer.byteLength(expected) ||
      !crypto.timingSafeEqual(Buffer.from(actual), Buffer.from(expected))
    ) {
      ctx.status = 401;
      ctx.body = { error: '服务认证失败' };
      return;
    }
    try {
      ctx.body = {
        data: await (options.snapshot
          ? options.snapshot()
          : runtime().manager.snapshot()),
      };
      ctx.set('Cache-Control', 'no-store');
    } catch {
      ctx.status = 503;
      ctx.body = { error: '模块状态暂不可用' };
    }
  };
}
module.exports = {
  Controller,
  createController,
  action,
  admin,
  runtimeMiddleware,
  pluginUploadGate,
  upgradeUploadGate,
};
