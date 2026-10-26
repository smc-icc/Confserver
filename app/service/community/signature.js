'use strict';
const crypto = require('node:crypto');
const fs = require('node:fs');
const { fail } = require('./policy');
function verifyEnvelope(envelope, key, maxBytes = 256 * 1024) {
  if (!key) fail('未配置签名公钥', 503);
  if (
    !envelope ||
    typeof envelope.payload !== 'string' ||
    typeof envelope.signature !== 'string' ||
    envelope.payload.length > Math.ceil((maxBytes * 4) / 3) + 4
  )
    fail('签名文档格式或大小无效');
  if (
    envelope.payload.length % 4 !== 0 ||
    /[^A-Za-z0-9+/=]/.test(envelope.payload) ||
    envelope.signature.length !== 88
  )
    fail('签名文档编码无效');
  const bytes = Buffer.from(envelope.payload, 'base64'),
    signature = Buffer.from(envelope.signature, 'base64');
  if (
    bytes.toString('base64') !== envelope.payload ||
    signature.toString('base64') !== envelope.signature
  )
    fail('签名文档编码无效');
  if (bytes.length > maxBytes || signature.length !== 64)
    fail('签名文档大小无效');
  let pub;
  try {
    pub = key.type === 'public' ? key : crypto.createPublicKey(key);
  } catch {
    fail('签名公钥配置无效', 503);
  }
  if (
    pub.asymmetricKeyType !== 'ed25519' ||
    !crypto.verify(null, bytes, pub, signature)
  )
    fail('签名校验失败', 403);
  try {
    return JSON.parse(bytes.toString('utf8'));
  } catch {
    fail('签名文档不是 JSON');
  }
}
function configuredKey(name) {
  const file = process.env[name];
  return file ? fs.readFileSync(file) : null;
}
function validateLicense(value, deploymentId, now = Date.now()) {
  if (
    value?.kind !== 'smc-license/1' ||
    value.deploymentId !== deploymentId ||
    typeof value.licenseId !== 'string' ||
    !value.licenseId ||
    !Number.isSafeInteger(value.revision) ||
    value.revision < 1 ||
    !['registered', 'professional', 'enterprise'].includes(value.edition)
  )
    fail('授权类型、部署或版本无效', 403);
  const start = Date.parse(value.notBefore),
    end = Date.parse(value.expiresAt);
  if (
    !Number.isFinite(start) ||
    !Number.isFinite(end) ||
    start > now ||
    end <= now ||
    end <= start
  )
    fail('授权尚未生效或已到期', 403);
  if (
    !Array.isArray(value.modules) ||
    value.modules.some((x) => typeof x !== 'string') ||
    !value.limits ||
    typeof value.limits !== 'object' ||
    Array.isArray(value.limits)
  )
    fail('授权功能或配额格式无效', 403);
  for (const n of Object.values(value.limits))
    if (!Number.isSafeInteger(n) || n < 0) fail('授权配额必须为非负整数', 403);
  return value;
}
module.exports = { verifyEnvelope, configuredKey, validateLicense };
