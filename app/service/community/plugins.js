'use strict';
const fs = require('node:fs/promises'),
  path = require('node:path'),
  crypto = require('node:crypto');
const { verifyEnvelope } = require('./signature');
const { fail } = require('./policy');
const digest = (b) => crypto.createHash('sha256').update(b).digest('hex');
function safePath(p) {
  return (
    typeof p === 'string' &&
    p.length < 240 &&
    !p.includes('\\') &&
    !p.startsWith('/') &&
    p
      .split('/')
      .every(
        (x) =>
          /^[\p{L}\p{N}_.-]+$/u.test(x) &&
          x !== '.' &&
          x !== '..' &&
          !x.endsWith('.') &&
          !/^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(x),
      )
  );
}
function validatePackage(envelope, key) {
  const pkg = verifyEnvelope(envelope, key, 48 * 1024 * 1024);
  if (
    pkg.kind !== 'smc-plugin/1' ||
    pkg.id !== 'flow-designer' ||
    pkg.hostProtocol !== 1 ||
    !/^\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?$/.test(pkg.version || '') ||
    !Array.isArray(pkg.files) ||
    pkg.files.length > 2048
  )
    fail('插件类型、版本或宿主协议不兼容');
  const names = new Set();
  let size = 0;
  for (const f of pkg.files) {
    if (
      !safePath(f.path) ||
      f.path.endsWith('.map') ||
      names.has(f.path) ||
      typeof f.data !== 'string'
    )
      fail('插件路径无效或重复');
    const bytes = Buffer.from(f.data, 'base64');
    size += bytes.length;
    if (size > 32 * 1024 * 1024 || digest(bytes) !== f.sha256)
      fail('插件文件校验失败或超过大小限制');
    names.add(f.path);
  }
  if (
    !names.has('backend.cjs') ||
    !names.has('web/index.html') ||
    pkg.files.some(
      (f) => f.path !== 'backend.cjs' && !f.path.startsWith('web/'),
    )
  )
    fail('插件文件清单不完整或包含未允许的路径');
  return pkg;
}
class FlowPluginStore {
  constructor(options) {
    this.options = options;
    this.cached = null;
    this.releases = new Map();
  }
  async install(envelope, expected) {
    const pkg = validatePackage(envelope, this.options.publicKey);
    const raw = await this.options.manager.read(),
      caps = await this.options.manager.snapshot();
    if (
      caps.edition !== 'enterprise' ||
      !caps.modules['flow-designer'].licensed
    )
      fail('需要企业版流程工具授权', 403);
    if (raw.revision !== expected) fail('模块配置已变化', 409);
    const hash = digest(Buffer.from(envelope.payload, 'base64'));
    if (raw.modules['flow-designer']?.receipt?.digest === hash) return caps;
    const base = this.options.dir;
    await fs.mkdir(base, { recursive: true });
    const stage = path.join(base, '.staging-' + crypto.randomUUID()),
      target = path.join(base, hash);
    await fs.mkdir(stage);
    try {
      for (const f of pkg.files) {
        const dest = path.join(stage, f.path);
        await fs.mkdir(path.dirname(dest), { recursive: true });
        await fs.writeFile(dest, Buffer.from(f.data, 'base64'), {
          mode: 0o600,
          flag: 'wx',
        });
      }
      await fs.writeFile(
        path.join(stage, 'signed-package.json'),
        JSON.stringify(envelope),
        { mode: 0o600 },
      );
      try {
        await fs.rename(stage, target);
      } catch (e) {
        if (!['EEXIST', 'ENOTEMPTY', 'EPERM'].includes(e.code)) throw e;
        await this.verifyRelease(hash);
      }
      const result = await this.options.manager.markInstalled(
        'flow-designer',
        { version: pkg.version, receipt: { digest: hash } },
        expected,
      );
      this.cached = null;
      return result;
    } finally {
      await fs.rm(stage, { recursive: true, force: true });
    }
  }
  async verifyRelease(hash) {
    if (this.releases.has(hash)) return this.releases.get(hash);
    if (!/^[a-f0-9]{64}$/.test(hash || '')) fail('插件安装记录无效', 503);
    const dir = path.join(this.options.dir, hash);
    const envelope = JSON.parse(
      await fs.readFile(path.join(dir, 'signed-package.json'), 'utf8'),
    );
    if (digest(Buffer.from(envelope.payload, 'base64')) !== hash)
      fail('插件安装签名校验失败', 503);
    const release = {
      dir,
      pkg: validatePackage(envelope, this.options.publicKey),
      hash,
    };
    this.releases.set(hash, release);
    return release;
  }
  async active() {
    const caps = await this.options.manager.snapshot();
    if (!caps.modules['flow-designer'].available)
      fail('企业流程工具未安装、未启用或未获授权', 403);
    const state = await this.options.manager.read();
    return this.verifyRelease(state.modules['flow-designer']?.receipt?.digest);
  }
  async checkedFile(release, p) {
    const f = release.pkg.files.find((x) => x.path === p);
    if (!f) fail('插件资源不存在', 404);
    const file = path.join(release.dir, p),
      real = await fs.realpath(file);
    if (!real.startsWith((await fs.realpath(release.dir)) + path.sep))
      fail('插件资源路径无效', 403);
    const bytes = await fs.readFile(file);
    if (digest(bytes) !== f.sha256) fail('插件文件校验失败', 503);
    return { file, bytes };
  }
  async asset(p) {
    if (!safePath(p)) fail('插件资源路径无效', 400);
    const release = await this.active();
    return this.checkedFile(release, 'web/' + p);
  }
  async handlers() {
    const release = await this.active();
    const backend = await this.checkedFile(release, 'backend.cjs');
    if (this.cached?.hash === release.hash) return this.cached.handlers;
    delete require.cache[require.resolve(backend.file)];
    const factory = require(backend.file);
    if (typeof factory !== 'function') fail('插件后端接口不兼容', 503);
    const handlers = factory({ root: this.options.hostRoot, protocol: 1 });
    if (!handlers?.ivr || !handlers?.itr) fail('插件后端接口不完整', 503);
    this.cached = { hash: release.hash, handlers };
    return handlers;
  }
}
module.exports = { FlowPluginStore, validatePackage, safePath };
