'use strict';
// In-process loopback fixture only: no VM, external SSH server, customer key or
// arbitrary command is used. The host private key exists only in test memory.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { generateKeyPairSync } = require('node:crypto');
const { once } = require('node:events');
const Module = require('node:module');
const path = require('node:path');
const { Server } = require('ssh2');
const NodeSSH = require('../app/service/resource/sshClient');
const servicePath = path.resolve(__dirname, '../app/service/resource/ResourceService.js');
const USER = 'synthetic-test-user';
const PASSWORD = 'public-synthetic-loopback-fixture-only';

function loadResourceService(Client = NodeSSH) {
  const previous = require.cache[servicePath];
  delete require.cache[servicePath];
  const original = Module._load;
  Module._load = function (id, parent, ...rest) {
    if (parent?.filename === servicePath) {
      if (id === './sshClient') return Client;
      if (['../../dao/NodeInfoDao', '../../dao/ResourceDao', '../../dao/ServerDao'].includes(id)) {
        return new Proxy({}, { get: () => () => { throw new Error('unexpected DAO call in SSH fixture'); } });
      }
      if (id === '../../../config/webConf') return { webConf: {} };
      if (id === '../../../logger') return { error() { throw new Error('SSH fixture must not log credentials'); } };
    }
    return original.call(this, id, parent, ...rest);
  };
  try { return require(servicePath); }
  finally {
    Module._load = original;
    delete require.cache[servicePath];
    if (previous) require.cache[servicePath] = previous;
  }
}

async function within(promise, milliseconds) {
  let timer;
  try {
    return await Promise.race([promise, new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error('loopback fixture did not close')), milliseconds);
    })]);
  } finally { clearTimeout(timer); }
}

async function sshFixture(fn) {
  const { privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    privateKeyEncoding: { type: 'pkcs1', format: 'pem' },
    publicKeyEncoding: { type: 'spki', format: 'pem' }
  });
  const connections = new Set();
  const closes = [];
  let closed = 0;
  const server = new Server({ hostKeys: [privateKey] }, client => {
    connections.add(client);
    closes.push(new Promise(done => client.once('close', () => {
      closed += 1; connections.delete(client); done();
    })));
    // Authentication rejection is expected by one test and must not be an
    // unhandled EventEmitter error. No error or supplied password is printed.
    client.on('error', () => {});
    client.on('authentication', ctx => {
      if (ctx.method === 'password' && ctx.username === USER && ctx.password === PASSWORD) ctx.accept();
      else ctx.reject(['password']);
    });
    client.on('ready', () => client.on('session', accept => {
      const session = accept();
      session.on('exec', (acceptExec, rejectExec, info) => {
        if (!['smc-fixture-success', 'smc-fixture-failure'].includes(info.command)) {
          rejectExec(); return;
        }
        const stream = acceptExec();
        if (info.command === 'smc-fixture-success') {
          stream.write('synthetic success 中文'); stream.exit(0);
        } else {
          stream.stderr.write('synthetic stderr'); stream.exit(7);
        }
        stream.end();
      });
    }));
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  try {
    await fn(server.address().port);
    assert.equal(closes.length, 1, 'must use the local fixture exactly once');
    await within(Promise.all(closes), 3000);
    assert.equal(closed, 1, 'execSSH must dispose its client');
  } finally {
    for (const client of connections) client.end();
    await within(new Promise((done, fail) => server.close(error => error ? fail(error) : done())), 3000);
  }
}

function fakeClient({ connectError = false, execError = false, disposeError = false } = {}) {
  const calls = [];
  class Client {
    async connect(config) {
      calls.push(['connect', config]);
      if (connectError) throw new Error(PASSWORD);
      return this;
    }
    async execCommand(command) {
      calls.push(['exec', command]);
      if (execError) throw new Error(PASSWORD);
      return { code: 0, stdout: 'synthetic-success', stderr: '' };
    }
    dispose() {
      calls.push(['dispose']);
      if (disposeError) throw new Error(PASSWORD);
    }
  }
  return { Client, calls };
}

const syntheticConfig = { port: 22, user: USER, password: PASSWORD };

test('release SSH client executes through actual ResourceService and closes connection', { timeout: 15000 }, async () => {
  assert.equal(require('node-ssh/package.json').version, '13.2.1');
  assert.equal(typeof NodeSSH, 'function');
  await sshFixture(async port => {
    const result = await loadResourceService().execSSH('127.0.0.1', 'smc-fixture-success', { ...syntheticConfig, port });
    assert.deepEqual(result, { ip: '127.0.0.1', rst: true, msg: 'synthetic success 中文' });
  });
});

test('real SSH nonzero exit preserves stderr response and releases connection', { timeout: 15000 }, async () => {
  await sshFixture(async port => {
    const result = await loadResourceService().execSSH('127.0.0.1', 'smc-fixture-failure', { ...syntheticConfig, port });
    assert.deepEqual(result, { ip: '127.0.0.1', rst: false, msg: 'synthetic stderr' });
  });
});

test('real SSH authentication failure returns generic error without credentials', { timeout: 15000 }, async () => {
  await sshFixture(async port => {
    const result = await loadResourceService().execSSH('127.0.0.1', 'smc-fixture-success', {
      ...syntheticConfig, port, password: 'wrong-public-synthetic-password'
    });
    assert.deepEqual(result, { ip: '127.0.0.1', rst: false, msg: '#api.resource.sshFailed#' });
    assert.ok(!JSON.stringify(result).includes(PASSWORD));
  });
});

test('SSH service preserves configuration mapping and disposes once on success', async () => {
  const { Client, calls } = fakeClient();
  assert.deepEqual(await loadResourceService(Client).execSSH('192.0.2.10', 'synthetic-command', syntheticConfig), {
    ip: '192.0.2.10', rst: true, msg: 'synthetic-success'
  });
  assert.deepEqual(calls, [
    ['connect', { host: '192.0.2.10', port: 22, username: USER, password: PASSWORD }],
    ['exec', 'synthetic-command'], ['dispose']
  ]);
});

test('SSH service disposes after connection failure without leaking error text', async () => {
  const { Client, calls } = fakeClient({ connectError: true });
  assert.deepEqual(await loadResourceService(Client).execSSH('192.0.2.10', 'synthetic-command', syntheticConfig), {
    ip: '192.0.2.10', rst: false, msg: '#api.resource.sshFailed#'
  });
  assert.deepEqual(calls.map(([name]) => name), ['connect', 'dispose']);
});

test('SSH service disposes after command failure without leaking error text', async () => {
  const { Client, calls } = fakeClient({ execError: true });
  assert.deepEqual(await loadResourceService(Client).execSSH('192.0.2.10', 'synthetic-command', syntheticConfig), {
    ip: '192.0.2.10', rst: false, msg: '#api.resource.sshFailed#'
  });
  assert.deepEqual(calls.map(([name]) => name), ['connect', 'exec', 'dispose']);
});

test('SSH disposal failure never replaces the original API result', async () => {
  for (const connectError of [false, true]) {
    const { Client, calls } = fakeClient({ connectError, disposeError: true });
    const result = await loadResourceService(Client).execSSH('192.0.2.10', 'synthetic-command', syntheticConfig);
    assert.deepEqual(result, { ip: '192.0.2.10', rst: !connectError,
      msg: connectError ? '#api.resource.sshFailed#' : 'synthetic-success' });
    assert.equal(calls.filter(([name]) => name === 'dispose').length, 1);
  }
});
