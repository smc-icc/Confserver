const test = require('node:test'),
  assert = require('node:assert/strict');
const { allowed } = require('./export-community.cjs');
test('source exports exclude runtime data, secrets, history and stale build outputs', () => {
  for (const file of [
    '.git/config',
    'backups/client/static/js/old.js',
    'data/flows/1.json',
    '.env',
    'backend/.env',
    'client/dist/old.js',
    'vendor/private.pem',
  ])
    assert.equal(allowed(file), false);
  assert.equal(allowed('client/build/brand-favicon.cjs'), true);
  assert.equal(allowed('backend/src/modules/auth.ts'), true);
  assert.throws(
    () => allowed('client/src/pages/smcicc/itr-flow-designer.vue'),
    /企业/,
  );
});

test('exports only versioned files and preserves untracked working files', async (t) => {
  const fs = require('node:fs/promises'),
    path = require('node:path'),
    os = require('node:os'),
    { execFileSync } = require('node:child_process');
  const { exportSource } = require('./export-community.cjs');
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'smc-public-source-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const source = path.join(dir, 'source'),
    output = path.join(dir, 'output');
  await fs.mkdir(path.join(source, 'app'), { recursive: true });
  await fs.writeFile(path.join(source, 'app/main.js'), 'module.exports = 1;');
  await fs.writeFile(
    path.join(source, 'app/local-only.js'),
    'local developer file',
  );
  execFileSync('git', ['init', '--quiet'], { cwd: source, stdio: 'pipe' });
  execFileSync('git', ['add', 'app/main.js'], { cwd: source, stdio: 'pipe' });
  await exportSource(source, output);
  assert.match(
    await fs.readFile(path.join(output, 'app/main.js'), 'utf8'),
    /exports/,
  );
  await assert.rejects(() => fs.access(path.join(output, 'app/local-only.js')));
  assert.equal(
    await fs.readFile(path.join(source, 'app/local-only.js'), 'utf8'),
    'local developer file',
  );
  const manifest = JSON.parse(
    await fs.readFile(
      path.join(output, 'community-source-manifest.json'),
      'utf8',
    ),
  );
  assert.equal(manifest.files.length, 1);
});
