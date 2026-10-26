'use strict';
const http = require('node:http');
const https = require('node:https');
const { isIP } = require('node:net');
const safeErrors = require('./RegistrationNotificationErrors');
function unavailable(status = 503) {
  return Object.assign(new Error('Registration delivery unavailable'), { status });
}
function createDelivery({ baseUrl, token, request } = {}) {
  function call(path, body, method = body === undefined ? 'GET' : 'POST') {
    if (!token) throw unavailable();
    const url = new URL('/api/platform-config/conf-registration/' + path, baseUrl);
    const h = url.hostname;
    const local = h === 'localhost' || /^[a-z0-9_-]+$/i.test(h) || (isIP(h) === 4 && /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(h));
    if (url.username || url.password || (url.protocol !== 'https:' && !(url.protocol === 'http:' && local))) throw unavailable();
    if (request) return request(url, { method, token, body });
    const payload = body === undefined ? '' : JSON.stringify(body);
    return new Promise((resolve, reject) => {
      const fail = (status = 503) => reject(unavailable(status));
      const req = (url.protocol === 'https:' ? https : http).request(url, {
        method, timeout: 10000,
        headers: { 'x-platform-sync-token': token, 'content-type': 'application/json', ...(payload ? { 'content-length': Buffer.byteLength(payload) } : {}) },
      }, res => {
        let text = '';
        res.on('data', chunk => { text += chunk; if (text.length > 65536) { res.destroy(); fail(); } });
        res.on('error', () => fail());
        res.on('end', () => {
          if (res.statusCode < 200 || res.statusCode >= 300) {
            const status = [400, 409, 429, 502].includes(res.statusCode) ? res.statusCode : 503;
            let code; try { code = JSON.parse(text).error_code; } catch { /* no response details */ }
            if (typeof code === 'string' && Object.hasOwn(safeErrors, code)) return reject(Object.assign(unavailable(status), {code}));
            return fail(status);
          }
          try { resolve(JSON.parse(text)); } catch { fail(); }
        });
      });
      req.on('error', () => fail());
      req.on('timeout', () => { req.destroy(); fail(); });
      if (payload) req.write(payload);
      req.end();
    });
  }
  return {
    readiness: () => call('readiness'),
    send: async input => { const result = await call('deliver', input); if (result?.success !== true) throw unavailable(); return result; },
    getConfig: () => call('config'),
    saveConfig: input => call('config', input, 'PUT'),
    test: input => call('test', input),
  };
}
let singleton;
function get() { return singleton || (singleton = createDelivery({ baseUrl: process.env.OMNIAGENT_URL || 'http://omni-backend:3001', token: process.env.PLATFORM_SYNC_SECRET })); }
module.exports = { createDelivery, readiness: () => get().readiness(), send: input => get().send(input), getConfig: () => get().getConfig(), saveConfig: input => get().saveConfig(input), test: input => get().test(input) };
