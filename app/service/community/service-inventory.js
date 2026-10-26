'use strict';
// Service registration is not installation. Only completed installation receipts
// expose commercial services; framework and unrelated user applications remain visible.
function createInventory(state) {
  const managed = new Set(),
    installed = new Map();
  const key = (app, server) => JSON.stringify([app, server]);
  for (const row of Object.values(state?.modules || {})) {
    for (const spec of row?.receipt?.services || []) {
      if (
        typeof spec.application !== 'string' ||
        typeof spec.serverName !== 'string' ||
        typeof spec.nodeName !== 'string'
      )
        continue;
      const id = key(spec.application, spec.serverName);
      managed.add(id);
      if (row.installed === true) {
        if (!installed.has(id)) installed.set(id, new Set());
        installed.get(id).add(spec.nodeName);
      }
    }
  }
  function visible(value) {
    const row = value?.dataValues || value || {};
    const app = row.application,
      server = row.server_name || row.serverName;
    if (app === 'tars') return true;
    const id = key(app, server);
    if (app !== 'SMC-ICC' && !managed.has(id)) return true;
    const nodes = installed.get(id);
    if (!nodes?.size) return false;
    const node = row.node_name || row.nodeName;
    return node === undefined || nodes.has(node);
  }
  function tree(nodes) {
    const result = [];
    for (const node of nodes || []) {
      const parts = typeof node.id === 'string' ? node.id.split('.') : [];
      const application = parts.find((p) => p.startsWith('1'))?.slice(1);
      const server = parts.find((p) => p.startsWith('5'))?.slice(1);
      if (
        application &&
        server &&
        !visible({ application, serverName: server })
      )
        continue;
      if (node.children?.length) {
        const children = tree(node.children);
        if (!children.length) continue;
        result.push({ ...node, children });
      } else result.push({ ...node });
    }
    return result;
  }
  return { visible, tree, rows: (rows) => rows.filter(visible) };
}
async function inventory() {
  const { runtime } = require('./runtime');
  return createInventory(await runtime().manager.read());
}
module.exports = { createInventory, inventory };
