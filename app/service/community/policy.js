'use strict';
const CATALOG = Object.freeze({
  omni: { name: '全媒体', commercial: false },
  icc: { name: 'ICC 基础话务', commercial: true },
  ivr: { name: 'IVR 运行', commercial: true, requires: ['icc'] },
  itr: { name: 'ITR 运行', commercial: true },
  outbound: { name: '外呼', commercial: true, requires: ['icc'] },
  aiqc: { name: '质检', commercial: true },
  'flow-designer': { name: '流程设计工具', commercial: true, enterprise: true },
});
function fail(message, status = 400) {
  const e = new Error(message);
  e.status = status;
  throw e;
}
function moduleId(id) {
  if (!Object.hasOwn(CATALOG, id)) fail('未知功能模块');
  return id;
}
function entitlement(license, id) {
  moduleId(id);
  if (
    ['registered', 'professional'].includes(license?.edition) &&
    !['omni', 'icc', 'ivr', 'itr'].includes(id)
  )
    return false;
  return (
    id === 'omni' ||
    Boolean(
      license &&
        license.modules.includes(id) &&
        (!CATALOG[id].enterprise || license.edition === 'enterprise'),
    )
  );
}
function capabilities(state, license) {
  const modules = {};
  for (const [id, meta] of Object.entries(CATALOG)) {
    const row = state.modules[id] || {};
    modules[id] = {
      id,
      name: meta.name,
      installed: id === 'omni' || row.installed === true,
      enabled: id === 'omni' || row.enabled === true,
      licensed: entitlement(license, id),
      version: row.version || null,
    };
    modules[id].available =
      modules[id].installed && modules[id].enabled && modules[id].licensed;
  }
  for (const [id, meta] of Object.entries(CATALOG))
    if (meta.requires?.some((x) => !modules[x].available))
      modules[id].available = false;
  return {
    connections: state.modules.icc?.installed
      ? state.modules.icc.receipt?.connections || {}
      : {},
    schemaVersion: 1,
    deploymentId: state.deploymentId,
    revision: state.revision,
    edition: license?.edition || 'community',
    license: license
      ? {
          licenseId: license.licenseId,
          revision: license.revision,
          expiresAt: license.expiresAt,
        }
      : null,
    limits: ['registered', 'professional'].includes(license?.edition)
      ? {
          voiceSeats: 2,
          sipTrunks: 2,
          concurrentCalls: 2,
          videoConcurrentCalls: 2,
        }
      : license?.limits || {
          voiceSeats: 0,
          sipTrunks: 0,
          concurrentCalls: 0,
          videoConcurrentCalls: 0,
        },
    ivrPolicy:
      license?.edition === 'enterprise'
        ? 'full'
        : ['registered', 'professional'].includes(license?.edition)
        ? 'template_audio_only'
        : 'disabled',
    modules,
  };
}
module.exports = { CATALOG, fail, moduleId, entitlement, capabilities };
