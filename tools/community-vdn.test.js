const test = require('node:test'),
  assert = require('node:assert/strict'),
  fs = require('node:fs'),
  path = require('node:path'),
  vm = require('node:vm');
function fixture(available = [], options = {}) {
  const compiler = require('../client/node_modules/vue-template-compiler');
  const sfc = compiler.parseComponent(
    fs.readFileSync(
      path.join(__dirname, '../client/src/pages/smcicc/system/VdnManager.vue'),
      'utf8',
    ),
  );
  const states = new Set(available),
    calls = [],
    warnings = [],
    saved = [],
    context = {
      component: null,
      Promise,
      Number,
      String,
      Set,
      Array,
      moduleAvailable: (id) => states.has(id),
      productModules: { canDesign: options.designer === true },
      refreshModules: options.refresh || (() => Promise.resolve()),
      ServiceRouteManager: {},
      AgentUserManager: {},
      VdnExtensionPanel: {},
      VdnChannelManager: {},
      OmniOrgBind: {},
      EnterpriseFlowFrame: {},
    };
  vm.runInNewContext(
    sfc.script.content
      .replace(/^import .*;\s*$/gm, '')
      .replace('export default', 'component ='),
    context,
  );
  const definition = context.component,
    instance = definition.data();
  Object.assign(instance, {
    $route: { query: { tab: 'basic', vdnId: '1' }, path: '/smcicc/system/vdn' },
    $router: { replace: () => Promise.resolve() },
    $root: { $emit() {} },
    $nextTick: (fn) => fn(),
    $t: (k) => k,
    $message: { warning: (m) => warnings.push(m), success() {} },
    $refs: { vdnFormRef: { clearValidate() {}, validate: (fn) => fn(true) } },
    $ajax: {
      postJSON: async (url, payload) => {
        calls.push(url);
        if (url.endsWith('/editVdn')) {
          saved.push(payload);
          return { result: 1 };
        }
        if (url.endsWith('/loadAllVdns'))
          return { Rows: [{ id: 1, name: 'Existing', parentId: -1 }] };
        if (url.endsWith('/loadTasList')) return [{ myId: 3, myName: 'TAS' }];
        if (url.endsWith('/checkAccessCodeByVdnId'))
          return { accessCodeIds: '7;' };
        if (url.endsWith('/loadAccessCodeListByNotAssignSelf')) {
          if (!states.has('icc')) throw Error('403 module disabled');
          return { Rows: [{ id: 7, code: '10086' }], ids: '7' };
        }
        if (url.endsWith('/loadVdnNodeBindList'))
          return { Rows: [{ nodeId: 3 }] };
        return { Rows: [], Total: 0 };
      },
      getJSON: async (url) => {
        calls.push(url);
        if (options.basicError) throw Error('basic info failed');
        return {
          id: 1,
          name: 'Existing',
          startRecord: 1,
          sipExtStatusSupport: 1,
          itrDefaultFlowId: 1001,
        };
      },
    },
    $axios: {
      get: async (url) => {
        calls.push(url);
        if (!states.has('itr') && !options.designer)
          throw Error('403 itr disabled');
        return { data: { data: { items: [{ id: 1001, name: 'Flow' }] } } };
      },
    },
  });
  for (const [name, fn] of Object.entries(definition.methods))
    instance[name] = fn.bind(instance);
  for (const [name, fn] of Object.entries(definition.computed))
    Object.defineProperty(instance, name, { get: () => fn.call(instance) });
  return { instance, definition, states, calls, warnings, saved };
}
const row = {
  id: 1,
  name: 'Existing',
  parentId: -1,
  startRecord: 1,
  sipExtStatusSupport: 1,
  itrDefaultFlowId: 1001,
};
const commercial = (url) => /AccessCode|TasList|NodeBind|itrflow/.test(url);
test('Community existing/add/copy VDN options never request unlicensed ICC or ITR endpoints', async () => {
  const f = fixture();
  await f.instance.onVdnRowClick(row);
  assert.equal(f.warnings.length, 0);
  assert.equal(f.calls.filter(commercial).length, 0);
  assert.ok(f.calls.some((x) => x.endsWith('/loadBasicInfo')));
  assert.ok(f.calls.some((x) => x.endsWith('/loadAllVdns')));
  f.calls.length = 0;
  await f.instance.openVdnAdd();
  assert.equal(f.warnings.length, 0);
  assert.equal(f.calls.filter(commercial).length, 0);
  f.instance.vdnSelection = [row];
  await f.instance.openVdnCopy();
  assert.equal(f.calls.filter(commercial).length, 0);
});
test('professional keeps ICC/ITR options and enterprise designer-only permission can load node and flow lists', async () => {
  const f = fixture(['icc', 'itr']);
  await f.instance.onVdnRowClick(row);
  assert.equal(f.warnings.length, 0);
  for (const suffix of [
    'loadAccessCodeListByNotAssignSelf',
    'checkAccessCodeByVdnId',
    'loadTasList',
    'loadVdnNodeBindList',
    'itrflow/list',
  ])
    assert.ok(
      f.calls.some((x) => x.endsWith('/' + suffix)),
      suffix,
    );
  const designer = fixture([], { designer: true });
  designer.states.add('flow-designer');
  await designer.instance.onVdnRowClick(row);
  assert.equal(designer.warnings.length, 0);
  assert.equal(
    designer.calls.some((x) => /AccessCode/.test(x)),
    false,
  );
  assert.ok(designer.calls.some((x) => x.endsWith('/itrflow/list')));
});
test('a genuine basic-info failure still reports configuration failure', async () => {
  const f = fixture([], { basicError: true });
  await f.instance.onVdnRowClick(row);
  assert.deepEqual(f.warnings, ['smcicc.system.vdn.configLoadFailed']);
});
test('mount waits for capability resolution before its first VDN data request', async () => {
  let finish;
  const pending = new Promise((resolve) => (finish = resolve));
  const f = fixture([], { refresh: () => pending });
  const run = f.definition.mounted.call(f.instance);
  await Promise.resolve();
  assert.equal(f.calls.length, 0);
  finish();
  await run;
  assert.ok(f.calls.some((x) => x.endsWith('/loadVdnListJoin')));
  assert.equal(f.calls.filter(commercial).length, 0);
});
test('basic-only save omits hidden telephony fields and bindings; licensed save includes them', async () => {
  for (const enabled of [false, true]) {
    const f = fixture(enabled ? ['icc', 'itr'] : []);
    await f.instance.onVdnRowClick(row);
    f.instance.vdnForm.nodeIds = [3];
    f.instance.vdnForm.accessSelected = [7];
    f.instance.vdnAccessAllIdsCsv = '7';
    f.instance.vdnForm.itrDefaultFlowId = 1001;
    f.instance.submitVdn();
    await new Promise((resolve) => setImmediate(resolve));
    const payload = f.saved[0];
    assert.ok(payload);
    assert.equal(payload['vdn.name'], 'Existing');
    for (const field of [
      'nodeIds',
      'accessCodeIdsAssign',
      'accessCodeIds',
      'startRecord',
      'recordWorkNo',
      'sipExtStatusSupport',
      'realTimeSpeechRecog',
      'asrEngine',
      'itrDefaultFlowId',
    ])
      assert.equal(Object.hasOwn(payload, field), enabled, field);
  }
});
function serviceFixture() {
  const nodeCalls = [],
    accessCalls = [],
    updates = [];
  const nodes = [3],
    access = [7];
  const module = { exports: {} };
  const dao = {
    findByVdnId: async (id) => ({ id, name: 'Existing', parentId: -1 }),
    updateByVdn: async (p) => updates.push(p),
    checkServiceRouteAccessCodeRef: async () => 0,
    updateAccessCodeToNotAssign: async (ids) => {
      accessCalls.push(['clear', ids]);
      access.splice(0);
    },
    updateAccessCodeByVdn: async ({ accessCodeIds }) => {
      accessCalls.push(['assign', accessCodeIds]);
      access.splice(0, access.length, ...accessCodeIds);
    },
  };
  const deps = {
    '../../dao/VdnSMCIccDao': dao,
    './VdnNodeBindService': {
      replaceForVdn: async (id, ids) => {
        nodeCalls.push(ids);
        nodes.splice(0, nodes.length, ...ids);
      },
    },
    './ccsReloadService': { scheduleNotify() {}, SCOPE_VDN: 0 },
    '../integration/OmniUserSync': { syncVdn: async () => {} },
  };
  vm.runInNewContext(
    fs.readFileSync(
      path.join(__dirname, '../app/service/smcicc/VdnService.js'),
      'utf8',
    ),
    {
      module,
      require: (id) => {
        assert.ok(id in deps, id);
        return deps[id];
      },
      Number,
      String,
      Set,
      Array,
    },
  );
  return {
    service: module.exports,
    nodeCalls,
    accessCalls,
    updates,
    nodes,
    access,
  };
}
test('saving base VDN fields preserves omitted node and access bindings', async () => {
  const f = serviceFixture();
  const result = await f.service.editVdn({
    paramsObj: { 'vdn.id': 1, 'vdn.name': 'Renamed', 'vdn.parentId': -1 },
  });
  assert.equal(result.result, 1);
  assert.deepEqual(f.nodes, [3]);
  assert.deepEqual(f.access, [7]);
  assert.equal(f.nodeCalls.length, 0);
  assert.equal(f.accessCalls.length, 0);
  assert.equal(f.updates[0].startRecord, undefined);
});
test('explicit empty licensed node/access selection still clears bindings', async () => {
  const f = serviceFixture();
  const result = await f.service.editVdn({
    paramsObj: {
      'vdn.id': 1,
      'vdn.name': 'Existing',
      'vdn.parentId': -1,
      nodeIds: [],
      accessCodeIds: '7',
      accessCodeIdsAssign: '',
    },
  });
  assert.equal(result.result, 1);
  assert.deepEqual(f.nodes, []);
  assert.deepEqual(f.access, []);
});
