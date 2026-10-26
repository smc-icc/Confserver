"use strict";

// Independent from Omni JWT and service-to-service credentials. Keep the key
// process-wide so both SSO implementations use exactly the same trust domain.
const crypto = require('node:crypto');
const env = process.env;
const configured = env.CONFSERVER_JWT_SECRET;
const development = [undefined, '', 'development', 'local', 'dev', 'kdev'].includes(env.NODE_ENV);
const strict = env.SMC_CONFSERVER_RELEASE === '1' || !development;

function invalid(message) {
    // Never include the supplied value in exceptions or logs.
    throw new Error('CONFSERVER_JWT_SECRET: ' + message);
}

let secret;
if (configured !== undefined && configured !== '') {
    if (!/^[a-fA-F0-9]{64}$/.test(configured) || /^(.{1,16})\1+$/.test(configured)) {
        invalid('requires an independently generated 32-byte hex key (openssl rand -hex 32)');
    }
    if (['JWT_SECRET', 'PLATFORM_SYNC_SECRET', 'AIQC_CALLBACK_TOKEN'].some(name =>
        env[name] && env[name].toLowerCase() === configured.toLowerCase())) {
        invalid('must not reuse another service credential');
    }
    // Decode hex rather than relying on spelling/case as HMAC key material.
    secret = Buffer.from(configured, 'hex');
} else if (strict) {
    invalid('required for production/release startup');
} else {
    secret = crypto.randomBytes(32);
    console.warn('[ConfServer] Development-only ephemeral JWT key; sessions expire on process restart. Set CONFSERVER_JWT_SECRET for stable sessions.');
}

module.exports = secret;
