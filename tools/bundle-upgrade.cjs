#!/usr/bin/env node
'use strict';
// Combines vendor-signed documents; no private key or enterprise source is included.
const fs = require('node:fs/promises'),
  path = require('node:path');
async function main() {
  const [manifestFile, output] = process.argv.slice(2);
  if (!manifestFile || !output)
    throw Error(
      'Usage: node tools/bundle-upgrade.cjs manifest.json upgrade.smcu',
    );
  const manifest = JSON.parse(await fs.readFile(manifestFile, 'utf8')),
    base = path.dirname(path.resolve(manifestFile));
  const envelope = async (name) => {
    if (typeof name !== 'string') throw Error('Missing signed file path');
    const doc = JSON.parse(await fs.readFile(path.resolve(base, name), 'utf8'));
    if (typeof doc.payload !== 'string' || typeof doc.signature !== 'string')
      throw Error('Expected a signed envelope');
    return doc;
  };
  if (!Array.isArray(manifest.components))
    throw Error('components must be an array of signed plan paths');
  const bundle = {
    kind: 'smc-upgrade/1',
    license: await envelope(manifest.license),
    components: await Promise.all(manifest.components.map(envelope)),
  };
  if (manifest.plugin) bundle.plugin = await envelope(manifest.plugin);
  const bytes = JSON.stringify(bundle);
  if (Buffer.byteLength(bytes) > 67 * 1024 * 1024)
    throw Error('Upgrade bundle exceeds upload limit');
  await fs.writeFile(output, bytes, { flag: 'wx', mode: 0o600 });
  console.log(
    'Upgrade bundle written. ConfServer validates all signatures before installation.',
  );
}
if (require.main === module)
  main().catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  });
