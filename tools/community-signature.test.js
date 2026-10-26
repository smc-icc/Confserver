const test = require('node:test'),
  assert = require('node:assert/strict'),
  crypto = require('node:crypto');
const { verifyEnvelope } = require('../app/service/community/signature');
test('multi-megabyte signed plugin payloads validate without regex stack overflow', () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
  const text = 'x'.repeat(16 * 1024 * 1024);
  const bytes = Buffer.from(JSON.stringify({ text }));
  const envelope = {
    payload: bytes.toString('base64'),
    signature: crypto.sign(null, bytes, privateKey).toString('base64'),
  };
  assert.equal(
    verifyEnvelope(envelope, publicKey, 20 * 1024 * 1024).text.length,
    text.length,
  );
});
