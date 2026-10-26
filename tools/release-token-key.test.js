"use strict";
// All keys here are public, deterministic synthetic fixtures, not credentials.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const { resolve } = require('node:path');
const Module = require('node:module');
const jwt = require('jsonwebtoken');
const key = createHash('sha256').update('synthetic-confserver-token-fixture').digest('hex');
const otherKey = createHash('sha256').update('different-synthetic-confserver-token-fixture').digest('hex');
const cwd = resolve(__dirname, '..');

function child(code, overrides = {}) {
    const env = { ...process.env };
    for (const name of ['CONFSERVER_JWT_SECRET', 'JWT_SECRET', 'PLATFORM_SYNC_SECRET',
        'AIQC_CALLBACK_TOKEN', 'NODE_ENV', 'SMC_CONFSERVER_RELEASE', 'NODE_OPTIONS']) delete env[name];
    Object.assign(env, overrides);
    return spawnSync(process.execPath, ['-e', code], { cwd, env, encoding: 'utf8', timeout: 10000 });
}
function rejected(result, values = []) {
    assert.equal(result.status, 1, result.error?.message);
    assert.match(result.stderr, /CONFSERVER_JWT_SECRET/);
    assert.equal(result.stdout, '');
    for (const value of values.filter(Boolean)) assert.ok(!result.stderr.includes(value), 'secret leaked in error');
}
const fingerprint = `const c=require('node:crypto');const k=require('./sso/token-key');
console.log(c.createHash('sha256').update(k).digest('hex'));`;

function services() {
    const original = Module._load;
    const dbPath = resolve(cwd, 'sso/db-service/token/TokenService.js');
    const k8sPath = resolve(cwd, 'sso/k8s-service/token/TokenService.js');
    const stub = new Proxy({}, { get() { return () => { throw new Error('unexpected external service call'); }; } });
    Module._load = function (id, parent, ...rest) {
        if ((parent?.filename === dbPath && id === '../../dao/TokenDao') ||
            (parent?.filename === k8sPath && id === '../user/UserService')) return stub;
        return original.call(this, id, parent, ...rest);
    };
    try { return [require(dbPath), require(k8sPath)]; }
    finally { Module._load = original; }
}
process.env.CONFSERVER_JWT_SECRET = key;

// Each startup-policy check uses a new child process; no module-cache bypass.
test('production and unknown modes reject missing credentials without echoing values', () => {
    for (const NODE_ENV of ['production', 'prd', 'remote', 'unknown']) {
        rejected(child("require('./sso/token-key')", { NODE_ENV }));
    }
    for (const NODE_ENV of ['', 'development', 'local', 'dev', 'kdev']) {
        rejected(child("require('./sso/token-key')", { NODE_ENV, SMC_CONFSERVER_RELEASE: '1' }));
    }
});

test('missing release key fails actual bin/www before logger or database imports', () => {
    const result = child(`const M=require('node:module');const load=M._load;
M._load=function(id,parent,...rest){if(['../logger','../config/webConf','../app'].includes(id))throw Error('SIDE_EFFECT_IMPORT');return load.call(this,id,parent,...rest)};
require('./bin/www');`, { NODE_ENV: 'production' });
    rejected(result);
    assert.ok(!result.stderr.includes('SIDE_EFFECT_IMPORT'));
});

test('malformed and repeated keys fail closed even in development', () => {
    for (const value of ['short', 'a'.repeat(64), 'abcd'.repeat(16), 'g'.repeat(64), key + ' ', key + '\n']) {
        rejected(child("require('./sso/token-key')", { NODE_ENV: 'development', CONFSERVER_JWT_SECRET: value }), [value]);
    }
});

test('other service keys cannot be reused in the ConfServer trust domain', () => {
    for (const name of ['JWT_SECRET', 'PLATFORM_SYNC_SECRET', 'AIQC_CALLBACK_TOKEN']) {
        rejected(child("require('./sso/token-key')", { NODE_ENV: 'production', CONFSERVER_JWT_SECRET: key, [name]: key.toUpperCase() }), [key, key.toUpperCase()]);
    }
});

test('explicit key survives fresh processes and uses case-insensitive hex bytes', () => {
    const first = child(fingerprint, { NODE_ENV: 'production', CONFSERVER_JWT_SECRET: key });
    const second = child(fingerprint, { NODE_ENV: 'production', CONFSERVER_JWT_SECRET: key.toUpperCase() });
    assert.equal(first.status, 0); assert.equal(second.status, 0);
    assert.equal(first.stdout, second.stdout); assert.equal(first.stderr, '');
    assert.ok(!first.stdout.includes(key));
});

test('development ephemeral key is process-wide and changes on restart', () => {
    const first = child(fingerprint, { NODE_ENV: 'development' });
    const second = child(fingerprint, { NODE_ENV: 'development' });
    assert.equal(first.status, 0); assert.equal(second.status, 0);
    assert.notEqual(first.stdout, second.stdout);
    assert.match(first.stderr, /Development-only ephemeral JWT key/);
    const same = child(`const a=require('./sso/token-key');const b=require('./sso/token-key');if(a!==b)process.exit(2)`, { NODE_ENV: 'local' });
    assert.equal(same.status, 0);
});

test('DB and K8S SSO mutually verify HS256 tokens without external imports', async () => {
    const [db, k8s] = services();
    for (const issuer of [db, k8s]) {
        assert.equal(issuer.signWebIDToken({}, 60000), null);
        const token = issuer.signWebIDToken({ uid: 'synthetic' }, 60000);
        assert.equal(jwt.decode(token, { complete: true }).header.alg, 'HS256');
        for (const verifier of [db, k8s]) assert.equal((await verifier.verifyWebIDToken(token)).uid, 'synthetic');
    }
});

test('both actual SSO implementations reject wrong keys and none/HS384/HS512', async () => {
    const all = services();
    const wrong = jwt.sign({ uid: 'synthetic' }, Buffer.from(otherKey, 'hex'));
    const bad = [wrong, jwt.sign({ uid: 'synthetic' }, '', { algorithm: 'none' }),
        ...['HS384', 'HS512'].map(algorithm => jwt.sign({ uid: 'synthetic' }, Buffer.from(key, 'hex'), { algorithm }))];
    for (const verifier of all) for (const token of bad) {
        assert.deepEqual(await verifier.verifyWebIDToken(token), { code: -2, uid: null });
    }
});

test('both SSO implementations preserve expiry and not-before error codes', async () => {
    for (const service of services()) {
        assert.deepEqual(await service.verifyWebIDToken(service.signWebIDToken({ uid: 'synthetic' }, -60000)), { code: -1, uid: null });
        const future = jwt.sign({ uid: 'synthetic' }, Buffer.from(key, 'hex'), { algorithm: 'HS256', notBefore: 60 });
        assert.deepEqual(await service.verifyWebIDToken(future), { code: -3, uid: null });
    }
});

test('rotated key rejects prior tokens in fresh actual SSO processes', () => {
    const token = jwt.sign({ uid: 'synthetic' }, Buffer.from(key, 'hex'), { algorithm: 'HS256' });
    const verify = `const M=require('node:module');const load=M._load;
M._load=function(id,parent,...rest){if(id==='../../dao/TokenDao'||id==='../user/UserService')return {};return load.call(this,id,parent,...rest)};
(async()=>{for(const service of [require('./sso/db-service/token/TokenService'),require('./sso/k8s-service/token/TokenService')]){
const result=await service.verifyWebIDToken(process.env.SYNTHETIC_TOKEN);if(result.code!==-2||result.uid!==null)process.exit(2)}})().catch(()=>process.exit(3));`;
    const result = child(verify, { NODE_ENV: 'production', CONFSERVER_JWT_SECRET: otherKey, SYNTHETIC_TOKEN: token });
    assert.equal(result.status, 0); assert.equal(result.stdout, ''); assert.equal(result.stderr, '');
});
