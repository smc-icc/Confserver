#!/usr/bin/env node
'use strict';
const fs = require('node:fs/promises'),
  path = require('node:path'),
  crypto = require('node:crypto');
function args(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 2) {
    if (!argv[i].startsWith('--') || !argv[i + 1])
      throw Error(
        '使用 --source 私有源目录 --out 输出目录 --version 版本 [--key 私钥文件]',
      );
    out[argv[i].slice(2)] = argv[i + 1];
  }
  return out;
}
async function build(options) {
  const host = path.resolve(__dirname, '..'),
    source = path.resolve(options.source),
    out = path.resolve(options.out);
  if (
    source === host ||
    source.startsWith(host + path.sep) ||
    out === host ||
    out.startsWith(path.join(host, 'client/src') + path.sep)
  )
    throw Error('企业源工程和输出必须与公共源码隔离');
  if (!/^\d+\.\d+\.\d+(?:-[A-Za-z0-9.-]+)?$/.test(options.version || ''))
    throw Error('版本格式无效');
  await fs.mkdir(out, { recursive: true });
  const client = path.join(host, 'client');
  const Service = require(
    path.join(client, 'node_modules/@vue/cli-service/lib/Service'),
  );
  const service = new Service(client);
  service.loadUserOptions = () => ({
    outputDir: path.join(out, 'web'),
    assetsDir: 'static',
    publicPath: '/pages/server/api/smcicc/community/plugins/flow-designer/web/',
    productionSourceMap: false,
    parallel: false,
    pages: {
      designer: {
        entry: path.join(source, 'client/entry.js'),
        template: path.join(client, 'public/index.html'),
        filename: 'index.html',
        title: '流程设计中心',
      },
    },
    transpileDependencies: ['@logicflow/core', '@logicflow/extension'],
    configureWebpack: {
      resolve: {
        alias: { '@': path.join(client, 'src') },
        modules: [path.join(client, 'node_modules'), 'node_modules'],
      },
      resolveLoader: {
        modules: [path.join(client, 'node_modules'), 'node_modules'],
      },
    },
  });
  await service.run('build', { mode: 'production' });
  // The standalone plugin has no ConfServer page shell to constrain its canvas.
  const htmlPath = path.join(out, 'web/index.html');
  const html = await fs.readFile(htmlPath, 'utf8');
  const viewportStyle = '<style>html,body{height:100%;margin:0;overflow:hidden;font-family:Arial,sans-serif}body>div:first-of-type{height:100%;display:flex;flex-direction:column;min-height:0}body>div:first-of-type>div:first-child{flex-shrink:0}.callflow-root{margin:0!important;width:100%!important;min-height:0!important;height:0;flex:1;overflow:hidden}.callflow-body{min-height:0!important}.itr-flow-page{height:calc(100vh - 56px)!important;min-height:0;overflow:hidden}</style>';
  await fs.writeFile(htmlPath, html.replace('</head>', viewportStyle + '</head>'));

  const modules = [
    'app/controller/smcicc/CallFlowController.js',
    'app/controller/smcicc/ItrFlowController.js',
    'app/service/smcicc/callFlowExport.js',
    'app/service/smcicc/node_registry.json',
  ];
  const wrappers = [];
  for (const id of modules) {
    const text = await fs.readFile(path.join(source, id), 'utf8');
    wrappers.push(
      JSON.stringify(id) +
        ':function(require,module,exports,__dirname,__filename){\n' +
        (id.endsWith('.json') ? 'module.exports=' + text : text) +
        '\n}',
    );
  }
  const backend =
    "'use strict';\nconst path=require('node:path'),{createRequire}=require('node:module');\nconst factories={" +
    wrappers.join(',\n') +
    "};\nmodule.exports=function(host){const cache={};function load(id){if(cache[id])return cache[id].exports;const filename=path.join(host.root,id),native=createRequire(filename);if(!factories[id])return native(filename);const m={exports:{}};cache[id]=m;const requireFromHost=function(request){if(request.startsWith('.')){let p=path.posix.normalize(path.posix.join(path.posix.dirname(id),request));if(!path.posix.extname(p))p+='.js';if(factories[p])return load(p);}return native(request);};factories[id](requireFromHost,m,m.exports,path.dirname(filename),filename);return m.exports;}return{ivr:load('app/controller/smcicc/CallFlowController.js'),itr:load('app/controller/smcicc/ItrFlowController.js')};};\n";
  await fs.writeFile(path.join(out, 'backend.cjs'), backend);
  const files = [];
  async function visit(dir, prefix) {
    for (const item of await fs.readdir(dir, { withFileTypes: true })) {
      const rel = prefix + item.name,
        full = path.join(dir, item.name);
      if (item.isDirectory()) await visit(full, rel + '/');
      else if (item.isFile()) {
        if (rel.endsWith('.map')) throw Error('禁止交付源码映射文件');
        const bytes = await fs.readFile(full);
        files.push({
          path: rel,
          data: bytes.toString('base64'),
          sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
        });
      }
    }
  }
  await visit(path.join(out, 'web'), 'web/');
  const bytes = Buffer.from(backend);
  files.push({
    path: 'backend.cjs',
    data: bytes.toString('base64'),
    sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
  });
  const payload = Buffer.from(
    JSON.stringify({
      kind: 'smc-plugin/1',
      id: 'flow-designer',
      version: options.version,
      hostProtocol: 1,
      files,
    }),
  );
  let signature = null;
  if (options.key) {
    const key = crypto.createPrivateKey(await fs.readFile(options.key));
    if (key.asymmetricKeyType !== 'ed25519') throw Error('需要 Ed25519 私钥');
    signature = crypto.sign(null, payload, key).toString('base64');
  }
  const envelope = { payload: payload.toString('base64'), signature };
  const file = path.join(
    out,
    'flow-designer-' +
      options.version +
      (signature ? '.smcp' : '.unsigned.json'),
  );
  await fs.writeFile(file, JSON.stringify(envelope));
  console.log('插件包：' + file);
  if (!signature) console.log('未签名：仅用于构建审查，不能在生产安装。');
  return file;
}
if (require.main === module)
  build(args(process.argv.slice(2))).catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  });
module.exports = { build };
