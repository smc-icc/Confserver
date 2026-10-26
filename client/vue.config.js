const path = require("path")
const CopyWebpackPlugin = require('copy-webpack-plugin')
const BrandFaviconPlugin = require('./build/brand-favicon.cjs')
const server_port = process.env.SERVER_PORT || '4001'

process.setMaxListeners(0);

// require('events').EventEmitter.setMaxListeners(0);

module.exports = {
  outputDir: "./dist",
  assetsDir: "./static",
  productionSourceMap: false,
  runtimeCompiler: true,
  transpileDependencies: ['@logicflow/core', '@logicflow/extension'],
  indexPath: "tars.html",
  css: {
    extract: { ignoreOrder: true },
  },
  pages: {
    index: {
      entry: 'src/index.js',
      template: 'public/index.html',
      filename: 'tars.html',
      title: "细语全媒体智能客服平台",
    },
    k8s: {
      entry: 'src/k8s.js',
      template: 'public/index.html',
      filename: 'k8s.html',
      title: "TarsK8s",
    },
    error: {
      entry: 'src/error.js',
      template: 'public/index.html',
      filename: 'error.html',
      title: "Error",
    },
    login: {
      entry: 'src/sso/login/login.js',
      template: 'src/sso/login/login.html',
      filename: 'login.html',
      title: "login",
    },
    'vdn-access': {
      entry: 'src/sso/vdn-access/vdn-access.js',
      template: 'src/sso/vdn-access/vdn-access.html',
      filename: 'vdn-access.html',
      title: 'VDN Access',
    },
    auth: {
      entry: 'src/sso/auth/auth.js',
      template: 'src/sso/auth/auth.html',
      filename: 'auth.html',
      title: "auth",
    },
    adminPass: {
      entry: 'src/sso/adminPass/adminPass.js',
      template: 'src/sso/adminPass/adminPass.html',
      filename: 'adminPass.html',
      title: "adminPass",
    },
    pass: {
      entry: 'src/sso/pass/pass.js',
      template: 'src/sso/pass/pass.html',
      filename: 'pass.html',
      title: "pass",
    },
    logView: {
      entry: 'src/logView.js',
      template: 'public/logview.html',
      filename: 'logview.html',
      title: 'logView',
    }
  },
  configureWebpack: {
    module: { rules: [{ include: [require.resolve('d3')], use: [{ loader: path.resolve(__dirname, 'build/d3-global-loader.cjs') }] }] },
    resolve: {
      fallback: { path: require.resolve("path-browserify") },
    },
    devtool: process.env.NODE_ENV === 'production' ? false : 'eval-cheap-module-source-map',
    plugins: [
      new BrandFaviconPlugin(),
      new CopyWebpackPlugin(
        {
          patterns:[{
            from: path.resolve(__dirname, './static'),
            to: 'static', // Relative to webpack output.path, including isolated --dest builds.
          }]
        }
      )],
  },
  devServer: {
    // webpack-dev-server：每个带 ws:true 的代理都会在底层 Server 上挂 upgrade 监听，多条易超过默认 10 个触发 MaxListenersExceededWarning
    onListening(devServer) {
      const server = devServer && devServer.server;
      if (server && typeof server.setMaxListeners === "function") {
        server.setMaxListeners(0);
      }
    },
    //是否自动在浏览器中打开
    // 原先 devServer 代理「/」时，GET / 会到 Node（index/PageController）302 到 /tars.html，再由 Vue 默认路由进入 #/server。
    // 去掉通配代理后，用 setupMiddlewares 注册根路径 302（替代已弃用的 onBeforeSetupMiddleware）。
    setupMiddlewares(middlewares, devServer) {
      devServer.app.get("/", (req, res, next) => {
        if (req.method !== "GET" && req.method !== "HEAD") {
          return next();
        }
        res.statusCode = 302;
        res.setHeader("Location", "/tars.html#/server");
        res.end();
      });
      return middlewares;
    },
    // 允许通过自定义域名访问（如 http://master.tars.com:8088），否则 curl/浏览器会报 Invalid Host header
    allowedHosts: "all",
    host: '0.0.0.0',
    //web-dev-server地址
    port: 8088,
    /**
     * 关闭「运行时错误」全屏浮层（保留编译错误）。
     * Element/async-validator 的 unhandledrejection 经 overlay 会变成 [object Object] 刷屏；
     * @vue/cli 合并 client 时函数过滤易失效。调试运行时错误请看浏览器控制台。
     */
    client: {
      overlay: {
        warnings: false,
        errors: true,
        runtimeErrors: false,
      },
    },
    // 代理到 ConfServer（Node）。不要用 `"/"` 通配：会把 multipart POST 等误交给错误管线，出现 405 Method Not Allowed。
    // Vue CLI 5 要求 devServer.proxy 为「对象或字符串」，不能是数组；故用一条正则合并 /pages 与 /api，且只设一次 ws:true。
    proxy: {
      "^/(pages|api)": {
        target: `http://127.0.0.1:${server_port}`,
        changeOrigin: true,
        secure: false,
        ws: true,
        logLevel: "debug",
      },
      "^/(web|files|get_tarsnode|install\\.sh)": {
        target: `http://127.0.0.1:${server_port}`,
        changeOrigin: true,
        secure: false,
        logLevel: "debug",
      },
    },
  }
}