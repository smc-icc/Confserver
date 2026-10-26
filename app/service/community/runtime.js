'use strict';
const path = require('node:path');
const { CommunityManager } = require('./state');
const { FlowPluginStore } = require('./plugins');
const { configuredKey } = require('./signature');
let instance;
function runtime() {
  if (!instance) {
    const root = path.resolve(__dirname, '../../..'),
      dir =
        process.env.SMC_COMMUNITY_STATE_DIR ||
        path.join(root, 'data/community');
    const manager = new CommunityManager({
      dir,
      deploymentId: process.env.SMC_DEPLOYMENT_ID || 'unconfigured',
      licensePublicKey: configuredKey('SMC_LICENSE_PUBLIC_KEY_FILE'),
    });
    instance = {
      root,
      dir,
      manager,
      plugins: new FlowPluginStore({
        manager,
        dir: path.join(dir, 'plugins/flow-designer'),
        publicKey: configuredKey('SMC_PLUGIN_PUBLIC_KEY_FILE'),
        hostRoot: root,
      }),
    };
  }
  return instance;
}
function installer() {
  const r = runtime();
  if (!r.installer) {
    const { ComponentInstaller } = require('./installer');
    r.installer = new ComponentInstaller({
      dir: path.join(r.dir, 'jobs'),
      manager: r.manager,
      adapter: require('./tars-adapter').createTarsAdapter(),
    });
  }
  return r.installer;
}
function upgrades() {
  const r = runtime();
  if (!r.upgrades) {
    const { UpgradeCoordinator } = require('./upgrade');
    r.upgrades = new UpgradeCoordinator({
      dir: path.join(r.dir, 'upgrades'),
      manager: r.manager,
      plugins: r.plugins,
      installer: installer(),
      publicKey: configuredKey('SMC_PLUGIN_PUBLIC_KEY_FILE'),
    });
  }
  return r.upgrades;
}
module.exports = { runtime, installer, upgrades };
