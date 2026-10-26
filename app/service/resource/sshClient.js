'use strict';

// Keep the unchanged developer node-ssh 5 constructor export working while
// the release lock uses the named CommonJS export introduced in node-ssh 13.
const exported = require('node-ssh');
const NodeSSH = typeof exported === 'function' ? exported : exported.NodeSSH;
if (typeof NodeSSH !== 'function') {
    throw new TypeError('Unsupported node-ssh constructor export');
}
module.exports = NodeSSH;
