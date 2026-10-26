'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { fail, moduleId, entitlement, capabilities } = require('./policy');
const { verifyEnvelope, validateLicense } = require('./signature');
// A deployment uses one coordinator process; serialize all managers for a file.
const stateQueues = new Map();
class CommunityManager {
  constructor(options) {
    this.options = options;
    this.file = path.resolve(options.dir, 'modules.json');
  }
  async read() {
    try {
      const s = JSON.parse(await fs.readFile(this.file, 'utf8'));
      if (
        s.schemaVersion !== 1 ||
        s.deploymentId !== this.options.deploymentId ||
        !Number.isSafeInteger(s.revision) ||
        !s.modules
      )
        fail('模块状态损坏或部署不匹配', 503);
      return s;
    } catch (e) {
      if (e.code !== 'ENOENT') throw e;
      return {
        schemaVersion: 1,
        deploymentId: this.options.deploymentId,
        revision: 0,
        highestLicenseRevision: 0,
        license: null,
        modules: {},
      };
    }
  }
  license(state) {
    try {
      return state.license
        ? validateLicense(
            verifyEnvelope(state.license, this.options.licensePublicKey),
            this.options.deploymentId,
            (this.options.now || Date.now)(),
          )
        : null;
    } catch {
      return null;
    }
  }
  async snapshot() {
    const s = await this.read();
    return capabilities(s, this.license(s));
  }
  async update(expected, fn) {
    const run = async () => {
      await fs.mkdir(this.options.dir, { recursive: true });
      const s = await this.read();
      if (expected !== undefined && expected !== s.revision)
        fail('模块配置已变化，请刷新后重试', 409);
      await fn(s);
      s.revision++;
      const tmp = this.file + '.' + crypto.randomUUID() + '.tmp';
      try {
        await fs.writeFile(tmp, JSON.stringify(s, null, 2), {
          mode: 0o600,
          flag: 'wx',
        });
        await fs.rename(tmp, this.file);
      } finally {
        await fs.unlink(tmp).catch(() => {});
      }
      return capabilities(s, this.license(s));
    };
    const key =
      process.platform === 'win32' ? this.file.toLowerCase() : this.file;
    const previous = stateQueues.get(key) || Promise.resolve();
    const result = previous.then(run, run),
      tail = result.then(
        () => undefined,
        () => undefined,
      );
    stateQueues.set(key, tail);
    tail.then(() => {
      if (stateQueues.get(key) === tail) stateQueues.delete(key);
    });
    return result;
  }
  async importLicense(envelope, expected) {
    const lic = validateLicense(
      verifyEnvelope(envelope, this.options.licensePublicKey),
      this.options.deploymentId,
      (this.options.now || Date.now)(),
    );
    return this.update(expected, (s) => {
      validateLicense(
        lic,
        this.options.deploymentId,
        (this.options.now || Date.now)(),
      );
      if (lic.revision <= s.highestLicenseRevision)
        fail('拒绝旧授权或重复授权', 409);
      s.license = envelope;
      s.highestLicenseRevision = lic.revision;
    });
  }
  async markInstalled(id, details, expected) {
    moduleId(id);
    return this.update(expected, (s) => {
      if (!entitlement(this.license(s), id))
        fail('需要有效授权，流程工具需要企业版', 403);
      s.modules[id] = {
        ...s.modules[id],
        installed: true,
        enabled: s.modules[id]?.enabled === true,
        version: details.version,
        receipt: details.receipt || null,
      };
    });
  }
  async setEnabled(id, enabled, expected) {
    moduleId(id);
    if (id === 'omni') fail('全媒体基础模块不可停用');
    if (typeof enabled !== 'boolean') fail('enabled 必须是布尔值');
    return this.update(expected, (s) => {
      if (
        enabled &&
        (!s.modules[id]?.installed || !entitlement(this.license(s), id))
      )
        fail('模块尚未安装或未获授权', 403);
      const candidate = {
        ...s,
        modules: { ...s.modules, [id]: { ...s.modules[id], enabled } },
      };
      if (
        enabled &&
        !capabilities(candidate, this.license(s)).modules[id].available
      )
        fail('模块依赖尚未启用', 409);
      s.modules[id] = { ...s.modules[id], enabled };
    });
  }
}
module.exports = { CommunityManager };
