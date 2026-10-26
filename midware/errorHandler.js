"use strict";
// Development still uses its own historical dependency lock. Release v5 has
// named CommonJS exports; keep this shared app entry point compatible with both.
const exported = require('koa-onerror');
const onerror = typeof exported === 'function' ? exported : exported.onerror;
if (typeof onerror !== 'function') {
    throw new TypeError('Unsupported koa-onerror module interface');
}
module.exports = onerror;
