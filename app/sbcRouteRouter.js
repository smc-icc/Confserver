'use strict';

const Router = require('koa-router');
const bodyparser = require('koa-bodyparser');
const Controller = require('./controller/smcicc/SbcRouteController');

const router = new Router();
router.use(bodyparser({ enableTypes: ['json'], jsonLimit: '16kb' }));
router.post('/internal/sbc/route', Controller.internal);
module.exports = router;
