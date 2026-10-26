const test = require('node:test'),
  assert = require('node:assert/strict'),
  vm = require('node:vm'),
  fs = require('node:fs');
const adapt = require('../client/build/d3-global-loader.cjs');
test('legacy d3 can initialize inside a strict webpack module', () => {
  const source = fs.readFileSync(
    require.resolve('../client/node_modules/d3/d3.js'),
    'utf8',
  );
  const context = { module: { exports: {} } };
  vm.runInNewContext(
    '(function(){"use strict";' + adapt(source) + '})()',
    context,
  );
  assert.equal(context.module.exports.version, '3.5.17');
});
