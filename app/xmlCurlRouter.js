const Router = require('koa-router');
const bodyparser = require('koa-bodyparser');
const C = require('./controller/smcicc/XmlCurlController');

const router = new Router();
router.use(bodyparser({ enableTypes: ['json', 'form', 'text'] }));
router.all('/xml_curl/directory', C.directory);
router.all('/xml_curl/dialplan', C.dialplan);
router.all('/xml_curl/configuration', C.configuration);
// 统一入口：按 POST body 的 section= 分发（推荐 FS gateway-url 指向此路径）
router.all('/xml_curl', C.dispatch);

module.exports = router;
