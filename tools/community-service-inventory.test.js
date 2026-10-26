const test = require('node:test'),
  assert = require('node:assert/strict'),
  fs = require('node:fs'),
  vm = require('node:vm'),
  path = require('node:path');
const {
  createInventory,
} = require('../app/service/community/service-inventory');
const leaf = (app, name) => ({
  id: '1' + app + '.5' + name,
  name,
  children: [],
});
const tree = [
  {
    id: '1SMC-ICC',
    name: 'SMC-ICC',
    children: [
      'ACDServer',
      'CCSServer',
      'TASServer',
      'IVRServer',
      'ITRServer',
      'AIQCServer',
      'ASRServer',
      'TTSServer',
    ].map((n) => leaf('SMC-ICC', n)),
  },
  { id: '1tars', name: 'tars', children: [leaf('tars', 'tarsregistry')] },
  { id: '1custom', name: 'custom', children: [leaf('custom', 'MyServer')] },
];
const service = (name, node = 'node-a') => ({
  application: 'SMC-ICC',
  server_name: name,
  node_name: node,
  present_state: 'Active',
  process_id: 100,
});
const installed = (names) => ({
  installed: true,
  enabled: true,
  receipt: {
    services: names.map((name) => ({
      application: 'SMC-ICC',
      serverName: name,
      nodeName: 'node-a',
    })),
  },
});
test('Community and license-only state hide all uninstalled ICC registrations without mutating the cached tree', () => {
  for (const state of [
    { modules: {} },
    {
      license: { edition: 'professional' },
      modules: { icc: { installed: false, enabled: true } },
    },
  ]) {
    const inventory = createInventory(state);
    const before = JSON.stringify(tree);
    assert.deepEqual(
      inventory.tree(tree).map((x) => x.name),
      ['tars', 'custom'],
    );
    assert.equal(inventory.visible(service('ACDServer')), false);
    assert.equal(JSON.stringify(tree), before);
  }
});
test('only services and nodes in completed installation receipts appear, independent of current license/enablement', () => {
  const state = {
    modules: {
      icc: installed(['CCSServer', 'ACDServer', 'TASServer']),
      ivr: installed(['IVRServer']),
      itr: installed(['ITRServer']),
    },
  };
  const inventory = createInventory(state),
    result = inventory.tree(tree);
  assert.deepEqual(
    result[0].children.map((x) => x.name),
    ['ACDServer', 'CCSServer', 'TASServer', 'IVRServer', 'ITRServer'],
  );
  assert.equal(inventory.visible(service('CCSServer')), true);
  assert.equal(inventory.visible(service('CCSServer', 'other-node')), false);
  assert.equal(inventory.visible(service('AIQCServer')), false);
  state.modules.icc.enabled = false;
  state.license = null;
  assert.equal(createInventory(state).visible(service('CCSServer')), true);
});
test('installed flag without a concrete receipt cannot manufacture a deployed service', () => {
  assert.equal(
    createInventory({ modules: { icc: { installed: true } } }).visible(
      service('CCSServer'),
    ),
    false,
  );
});
test('custom application services recorded by a signed module remain constrained to their receipt nodes', () => {
  const inventory = createInventory({
    modules: {
      icc: {
        installed: true,
        receipt: {
          services: [
            {
              application: 'CustomerICC',
              serverName: 'CallService',
              nodeName: 'node-a',
            },
          ],
        },
      },
    },
  });
  assert.equal(
    inventory.visible({
      application: 'CustomerICC',
      serverName: 'CallService',
      nodeName: 'node-a',
    }),
    true,
  );
  assert.equal(
    inventory.visible({
      application: 'CustomerICC',
      serverName: 'CallService',
      nodeName: 'node-b',
    }),
    false,
  );
  assert.equal(
    inventory.visible({
      application: 'other',
      serverName: 'OwnService',
      nodeName: 'node-b',
    }),
    true,
  );
});
test('empty business groups are removed and set-level service nodes retain the same installation policy', () => {
  const source = [
    { name: 'Business', children: [tree[0]] },
    { name: 'Tars', children: [tree[1]] },
  ];
  assert.deepEqual(
    createInventory({ modules: {} })
      .tree(source)
      .map((x) => x.name),
    ['Tars'],
  );
  const setTree = [
    {
      id: '1SMC-ICC',
      name: 'SMC-ICC',
      children: [
        {
          id: '1SMC-ICC.2blue',
          name: 'blue',
          children: [
            {
              id: '1SMC-ICC.2blue.3a.4all.5CCSServer',
              name: 'CCSServer',
              children: [],
            },
          ],
        },
      ],
    },
  ];
  assert.equal(
    createInventory({ modules: { icc: installed(['CCSServer']) } }).tree(
      setTree,
    ).length,
    1,
  );
});
test('paged service lists filter before pagination and preserve correct visible totals', async () => {
  const daoCalls = [];
  const rows = [
    service('ACDServer'),
    { application: 'tars', server_name: 'tarsregistry', node_name: 'n' },
    { application: 'custom', server_name: 'MyServer', node_name: 'n' },
  ];
  const mod = { exports: {} };
  const deps = {
    '../../dao/ServerDao': {
      getServerConf: async (p) => {
        daoCalls.push(p);
        return p.curPage && p.pageSize
          ? rows.slice((p.curPage - 1) * p.pageSize, p.curPage * p.pageSize)
          : rows;
      },
      getServerConfAndCount: async () => ({ count: 3, rows: rows.slice(0, 1) }),
    },
    '../community/service-inventory': {
      inventory: async () => createInventory({ modules: {} }),
    },
  };
  vm.runInNewContext(
    fs.readFileSync(
      path.join(__dirname, '../app/service/server/ServerService.js'),
      'utf8',
    ),
    {
      module: mod,
      require: (id) => deps[id] || {},
      Number,
      String,
      Set,
      Array,
      Date,
    },
  );
  const page = await mod.exports.getServerConfList4Tree({
    isPage: 'true',
    curPage: 1,
    pageSize: 1,
  });
  assert.equal(page.count, 2);
  assert.equal(page.rows[0].application, 'tars');
  assert.equal(daoCalls[0].curPage, 0);
  const all = await mod.exports.getServerConfList4Tree({});
  assert.equal(all.length, 2);
});

test('hidden service detail and live-state endpoints reject old direct links', async () => {
  const module = { exports: {} };
  const deps = {
    '../../service/server/ServerService': {
      getServerConfById: async () => ({ dataValues: service('ACDServer') }),
    },
    '../../service/community/service-inventory': {
      inventory: async () => createInventory({ modules: {} }),
    },
    '../../../logger': { error() {} },
    lodash: { isEmpty: (x) => !x },
    '../../service/auth/AuthService': { hasOpeAuth: async () => true },
    '../../../tools/util': { viewFilter: (x) => x },
  };
  vm.runInNewContext(
    fs.readFileSync(
      path.join(__dirname, '../app/controller/server/ServerController.js'),
      'utf8',
    ),
    {
      module,
      require: (id) => deps[id] || {},
      Number,
      String,
      Set,
      Array,
      Date,
      parseInt,
    },
  );
  for (const method of ['getServerConfById', 'getRealtimeState']) {
    const ctx = {
      paramsObj: { id: 1 },
      uid: 'admin',
      makeResObj(code, message, data) {
        this.body = { ret_code: code, err_msg: message, data };
      },
      makeErrResObj() {
        this.body = { ret_code: 500 };
      },
    };
    await module.exports[method](ctx);
    assert.equal(ctx.status, 403);
    assert.equal(ctx.body.ret_code, 403);
  }
});
test('stale commercial tabs are cleared after full tree refresh while installed framework tabs survive', () => {
  const compiler = require('../client/node_modules/vue-template-compiler');
  const sfc = compiler.parseComponent(
    fs.readFileSync(
      path.join(__dirname, '../client/src/pages/server/index.vue'),
      'utf8',
    ),
  );
  const context = {
    component: null,
    serverHistory: {},
    callChain: {},
    manage: {},
    publish: {},
    config: {},
    serverMonitor: {},
    propertyMonitor: {},
    userManage: {},
    serverPlugins: {},
  };
  const script = sfc.script.content
    .replace(/^import[\s\S]*?from [^;]+;[\r\n]*/gm, '')
    .replace('export default', 'component =');
  vm.runInNewContext(script, context);
  const replaced = [],
    saved = [];
  const state = {
    BTabs: [{ id: '1SMC-ICC.5ACDServer' }, { id: '1tars.5tarsregistry' }],
    treeid: '1SMC-ICC.5ACDServer',
    $router: {
      replace: (p) => {
        replaced.push(p);
        return Promise.resolve();
      },
    },
    setLocalStorage: (...p) => saved.push(p),
  };
  context.component.methods.pruneUninstalledTabs.call(
    state,
    createInventory({ modules: {} }).tree(tree),
  );
  assert.equal(state.BTabs.length, 1);
  assert.equal(state.BTabs[0].id, '1tars.5tarsregistry');
  assert.equal(state.treeid, 'home');
  assert.deepEqual(replaced, ['/server']);
  assert.equal(saved.length, 2);
});

test('inactive-list shape and search totals exclude uninstalled registrations',async()=>{
 const rows=[service('ACDServer'),{application:'tars',server_name:'tarsregistry',node_name:'n'}];const policy={inventory:async()=>createInventory({modules:{}})};
 const mod={exports:{}};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../app/service/server/ServerService.js'),'utf8'),{module:mod,require:id=>id==='../../dao/ServerDao'?{getInactiveServerConfList:async()=>rows}:id==='../community/service-inventory'?policy:{},Number,String,Set,Array,Date});
 const inactive=await mod.exports.getInactiveServerConfList('','','',1,1);assert.ok(Array.isArray(inactive));assert.equal(inactive.length,1);assert.equal(inactive[0].application,'tars');
 const controller={exports:{}};const deps={'../../dao/ServerDao':{getServerConfBySearchKey:async()=>({count:rows.length,rows})},'../../service/community/service-inventory':policy,'../../../logger':{error(){}},'../../../tools/util':{viewFilter:x=>x}};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../app/controller/server/ServerController.js'),'utf8'),{module:controller,require:id=>deps[id]||{},Number,String,Set,Array,Date,parseInt});
 const ctx={paramsObj:{searchkey:'',curr_page:1,page_size:1},makeResObj(code,message,data){this.body={ret_code:code,data};},makeErrResObj(){this.body={ret_code:500};}};
 await controller.exports.getServerSearch(ctx);assert.equal(ctx.body.ret_code,200);assert.equal(ctx.body.data.count,1);assert.equal(ctx.body.data.rows[0].application,'tars');
});
