'use strict';

const fs = require('fs');
const path = require('path');

const DEFAULTS = {
    internal: 'cloud-sbc.internal.invalid',
    publicDomain: 'omni.seami.cloud',
};
const HOST = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)*[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const IPV4 = /^(?:\d{1,3}\.){3}\d{1,3}$/;

let cache = { key: '', value: null };

function filePath() {
    return process.env.SBC_DOMAIN_CONFIG || path.join(process.cwd(), 'data', 'sbc-domains.json');
}

function reject(message) {
    const error = new Error(message);
    error.status = 400;
    return error;
}

function host(value, label) {
    const name = String(value == null ? '' : value).trim().toLowerCase();
    if (!HOST.test(name) || IPV4.test(name) || name.includes('*')) throw reject(label + '必须是域名，不能是 IP、端口或通配符');
    return name;
}

function normalize(input) {
    const source = input && typeof input === 'object' ? input : {};
    const internal = host(source.internal, '内部域名');
    const publicDomain = host(source.publicDomain, '公网域名');
    if (internal === publicDomain) throw reject('内部域名和公网域名不能相同');
    return { internal, publicDomain, names: new Set([internal, publicDomain]) };
}

function defaults() {
    return normalize(DEFAULTS);
}

function current() {
    const file = filePath();
    try {
        const stat = fs.statSync(file);
        const key = file + ':' + stat.mtimeMs + ':' + stat.size;
        if (cache.value && cache.key === key) return cache.value;
        const value = normalize(JSON.parse(fs.readFileSync(file, 'utf8')));
        cache = { key, value };
        return value;
    } catch (err) {
        if (err && err.code === 'ENOENT') {
            const value = defaults();
            cache = { key: file + ':default', value };
            return value;
        }
        if (err && err.status === 400) throw err;
        const error = new Error('SBC 域名配置不可读');
        error.status = 503;
        throw error;
    }
}

function view() {
    const value = current();
    return {
        internal: value.internal,
        publicDomain: value.publicDomain,
        source: cache.key.endsWith(':default') ? 'default' : 'file',
    };
}

function save(input) {
    const value = normalize(input);
    const file = filePath();
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const tmp = file + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify({ internal: value.internal, publicDomain: value.publicDomain }, null, 2) + '\n', { mode: 0o600 });
    fs.renameSync(tmp, file);
    cache = { key: file + ':' + fs.statSync(file).mtimeMs + ':' + fs.statSync(file).size, value };
    return view();
}

module.exports = { current, view, save, normalize, defaults, DEFAULTS };
