'use strict';
// Owned temporary files and isolated child processes only. The wrappers and
// actual Winston transports run unchanged; configuration and scheduling alone
// are stubbed. No VM/customer config/database or production logger is opened.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const Module = require('node:module');
const { spawnSync } = require('node:child_process');
const moment = require('moment');
const root = path.resolve(__dirname, '..');

const CHILD = String.raw`
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const moment = require('moment');
const [target, directory, scenario] = process.argv.slice(1);
const schedules = [];
const original = Module._load;
Module._load = function(id, parent, ...rest) {
  if (parent && parent.filename === target) {
    if (id.endsWith('/config/webConf')) {
      return { webConf: { loggerPath: directory,
        logFileKeepDays: scenario === 'retention' ? 7 : -1, autoClearTime: 2 } };
    }
    if (id === 'node-schedule') return {
      scheduleJob(spec) { schedules.push(spec); }
    };
  }
  return original.call(this, id, parent, ...rest);
};
const logger = require(target);
Module._load = original;
const date = moment().format('YYYYMMDD');
const file = kind => path.join(directory, date + '.' + kind + '.log');
const content = kind => fs.existsSync(file(kind)) ? fs.readFileSync(file(kind), 'utf8') : '';
async function until(check) {
  const deadline = Date.now() + 4000;
  while (!check()) {
    if (Date.now() > deadline) throw new Error('logger fixture timed out');
    await new Promise(resolve => setTimeout(resolve, 25));
  }
}
if (scenario === 'writer') {
  logger.info('info-marker', {safe: 'object'}, ['array'], new Error('writer-stack-marker'));
  logger.warn('warn-marker'); logger.error('error-marker');
  if (logger.debug) logger.debug('debug-marker');
  logger.sql('sql-marker');
  until(() => content('info').includes('error-marker') && content('warn').includes('error-marker') &&
    content('error').includes('error-marker') && content('sql').includes('sql-marker'))
    .then(() => {
      console.log('EXPORTS ' + Object.keys(logger).sort().join(','));
      process.exit(0);
    }).catch(() => process.exit(2));
} else if (scenario === 'retention') {
  until(() => !fs.existsSync(path.join(directory, '20000101.info.log')))
    .then(() => { console.log('SCHEDULES ' + JSON.stringify(schedules)); process.exit(0); })
    .catch(() => process.exit(2));
} else if (scenario === 'io-error') {
  logger.info('io-marker');
  setTimeout(() => { console.log('io-survived'); process.exit(0); }, 400);
} else {
  const code = scenario.startsWith('network:') ? scenario.slice(8) : 'EFIXTURE';
  const error = Object.assign(new Error('exception-marker-' + code), {code});
  setImmediate(() => { throw error; });
  // Fatal errors must be terminated by the actual Winston exception handler,
  // not by this safety timer. Network disconnects in the main wrapper survive.
  if (scenario.startsWith('network:') && target.endsWith(path.join('logger', 'index.js')) &&
      !target.includes(path.join('app', 'logger'))) {
    until(() => content('exceptions').includes('exception-marker-' + code))
      .then(() => { console.log('network-survived'); process.exit(0); })
      .catch(() => process.exit(2));
  } else {
    setTimeout(() => process.exit(3), 7000);
  }
}
`;

function fixture(target, scenario, prepare, inspect) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'smc-release-logger-'));
  try {
    if (prepare) prepare(directory);
    const result = spawnSync(process.execPath, ['-e', CHILD,
      path.join(root, target), directory, scenario], {
      cwd: root, encoding: 'utf8', timeout: 10000,
      env: { ...process.env, TZ: 'UTC' }
    });
    assert.ifError(result.error);
    assert.equal(result.signal, null, result.stderr);
    inspect(directory, result);
  } finally {
    // This path is directly returned by mkdtemp, never a user-supplied directory.
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

function logs(directory) {
  const files = fs.readdirSync(directory);
  assert.ok(files.every(file => /^\d{8}\.(info|warn|error|sql|exceptions)\.log$/.test(file)), files.join(','));
  return Object.fromEntries(files.map(file => {
    const entries = fs.readFileSync(path.join(directory, file), 'utf8').split('\n').filter(Boolean).map(JSON.parse);
    for (const entry of entries) {
      assert.match(entry.timestamp, /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3}$/);
      assert.ok(['info', 'warn', 'error'].includes(entry.level));
      assert.equal(typeof entry.message, 'string');
    }
    return [file.split('.')[1], entries.map(entry => entry.message).join('\n')];
  }));
}

test('release logger uses the exact reviewed dependency versions', () => {
  assert.equal(require('winston/package.json').version, '3.19.0');
  assert.equal(require('winston-daily-rotate-file/package.json').version, '5.0.0');
});

for (const target of ['logger/index.js', 'app/logger/index.js']) {
  test(target + ' preserves filename, timestamp, levels, object/error and SQL routing', () => {
    fixture(target, 'writer', null, (directory, result) => {
      assert.equal(result.status, 0, result.stderr);
      assert.equal(result.stderr, '');
      const content = logs(directory);
      assert.match(content.info, /info-marker/);
      assert.match(content.info, /\{"safe":"object"\}/);
      assert.match(content.info, /\["array"\]/);
      assert.match(content.info, /Error: writer-stack-marker/);
      assert.match(content.info, /warn-marker/);
      assert.match(content.info, /error-marker/);
      assert.doesNotMatch(content.info, /debug-marker|sql-marker/);
      assert.match(content.warn, /warn-marker/); assert.match(content.warn, /error-marker/);
      assert.doesNotMatch(content.warn, /info-marker|debug-marker|sql-marker/);
      assert.match(content.error, /error-marker/);
      assert.doesNotMatch(content.error, /info-marker|warn-marker|debug-marker|sql-marker/);
      assert.match(content.sql, /sql-marker/);
      assert.doesNotMatch(content.sql, /info-marker|warn-marker|error-marker|debug-marker/);
      assert.match(result.stdout, /info-marker/);
      assert.doesNotMatch(result.stdout, /debug-marker|sql-marker/);
      const exports = target.startsWith('app/') ? '_formatInfo,error,info,sql,warn' : '_formatInfo,debug,error,info,sql,warn';
      assert.ok(result.stdout.includes('EXPORTS ' + exports), result.stdout);
    });
  });

  test(target + ' retains existing date-file retention without deleting unrelated files', () => {
    fixture(target, 'retention', directory => {
      fs.writeFileSync(path.join(directory, '20000101.info.log'), 'old-owned-log');
      fs.writeFileSync(path.join(directory, moment.utc().format('YYYYMMDD') + '.other.log'), 'current');
      fs.writeFileSync(path.join(directory, '20000101.keep.txt'), 'not-a-log');
      fs.writeFileSync(path.join(directory, 'keep.log'), 'not-a-date-log');
    }, (directory, result) => {
      assert.equal(result.status, 0, result.stderr);
      assert.equal(result.stderr, '');
      assert.equal(fs.existsSync(path.join(directory, '20000101.info.log')), false);
      for (const file of ['20000101.keep.txt', 'keep.log', moment.utc().format('YYYYMMDD') + '.other.log']) {
        assert.ok(fs.existsSync(path.join(directory, file)), file);
      }
      assert.ok(result.stdout.includes('SCHEDULES ["2 * * *"]'), result.stdout);
    });
  });
}

test('main logger survives all three expected network disconnect exception codes', () => {
  for (const code of ['ECONNRESET', 'EPIPE', 'ECONNABORTED']) {
    fixture('logger/index.js', 'network:' + code, null, (directory, result) => {
      assert.equal(result.status, 0, result.stderr);
      assert.match(result.stdout, /network-survived/);
      assert.doesNotMatch(result.stdout, /exception-marker/);
      assert.equal(result.stderr, '');
      assert.match(logs(directory).exceptions, new RegExp('exception-marker-' + code));
    });
  }
});

test('main logger records a non-network uncaught exception and exits 1 without duplicate console', () => {
  fixture('logger/index.js', 'fatal', null, (directory, result) => {
    assert.equal(result.status, 1, result.stderr);
    assert.doesNotMatch(result.stdout + result.stderr, /exception-marker/);
    assert.match(logs(directory).exceptions, /exception-marker-EFIXTURE/);
  });
});

test('app logger preserves its console plus file exception policy and default fatal exit', () => {
  fixture('app/logger/index.js', 'network:ECONNRESET', null, (directory, result) => {
    assert.equal(result.status, 1, result.stderr);
    assert.match(result.stdout + result.stderr, /exception-marker-ECONNRESET/);
    assert.match(logs(directory).exceptions, /exception-marker-ECONNRESET/);
  });
});

test('real file transport failure is visible, credential-safe and not an uncaught exception', () => {
  fixture('logger/index.js', 'io-error', directory => {
    // Actual EISDIR, not a synthetic emitted error; deliberately fail info.log.
    fs.mkdirSync(path.join(directory, moment.utc().format('YYYYMMDD') + '.info.log'));
  }, (directory, result) => {
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /io-survived/);
    assert.match(result.stderr, /\[ConfServer logger\] log transport failure/);
    assert.doesNotMatch(result.stderr, /EISDIR|smc-release-logger|io-marker/);
    assert.doesNotMatch(fs.readFileSync(path.join(directory,
      moment.utc().format('YYYYMMDD') + '.exceptions.log'), 'utf8'), /EISDIR|uncaughtException/);
  });
});
