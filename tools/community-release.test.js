const test = require('node:test'),
  assert = require('node:assert/strict'),
  fs = require('node:fs/promises'),
  os = require('node:os'),
  path = require('node:path');
const { check } = require('./check-community-release.cjs');
test('community source does not include designer implementations', async () => {
  assert.equal((await check({})).ok, true);
});
test('release verification rejects stale designer chunks and source maps', async (t) => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'community-web-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  await fs.writeFile(path.join(dir, 'old.js'), 'class="call-flow-page"');
  await assert.rejects(() => check({ web: dir }), /编辑器/);
  await fs.writeFile(path.join(dir, 'old.js'), 'console.log("base")');
  await fs.writeFile(path.join(dir, 'old.js.map'), '{}');
  await assert.rejects(() => check({ web: dir }), /source map/);
});
