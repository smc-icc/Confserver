#!/usr/bin/env node
'use strict';
// Vendor-side helper. Private keys are supplied by path and never embedded in packages.
const fs = require('node:fs/promises'),
  crypto = require('node:crypto');
async function main() {
  const [input, keyFile, output] = process.argv.slice(2);
  if (!input || !keyFile || !output)
    throw Error(
      'Usage: node sign-community.cjs payload.json vendor-private.pem signed.json',
    );
  const bytes = await fs.readFile(input);
  const value = JSON.parse(bytes);
  if (!['smc-license/1', 'smc-component/1'].includes(value.kind))
    throw Error('Unsupported payload kind');
  const key = crypto.createPrivateKey(await fs.readFile(keyFile));
  if (key.asymmetricKeyType !== 'ed25519')
    throw Error('Ed25519 private key required');
  const envelope = {
    payload: bytes.toString('base64'),
    signature: crypto.sign(null, bytes, key).toString('base64'),
  };
  await fs.writeFile(output, JSON.stringify(envelope), {
    flag: 'wx',
    mode: 0o600,
  });
  console.log('Signed document written.');
}
if (require.main === module)
  main().catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  });
