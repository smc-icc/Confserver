/**
 * Tencent is pleased to support the open source community by making Tars available.
 *
 * Copyright (C) 2016THL A29 Limited, a Tencent company. All rights reserved.
 *
 * Licensed under the BSD 3-Clause License (the "License"); you may not use this file except
 * in compliance with the License. You may obtain a copy of the License at
 *
 * https://opensource.org/licenses/BSD-3-Clause
 *
 * Unless required by applicable law or agreed to in writing, software distributed
 * under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR
 * CONDITIONS OF ANY KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations under the License.
 */

const logger = require('../../logger');
const loginConf = require('../../../config/loginConf');

const LoginController = {};

LoginController.isEnableLogin = async (ctx) => {
	try {
		ctx.makeResObj(200, '', {enableLogin: loginConf.enableLogin || false});
	} catch (e) {
		logger.error('[getLoginUid]', e, ctx);
		ctx.makeErrResObj();
	}
};

LoginController.getLoginUid = async (ctx) => {
	try {
		ctx.makeResObj(200, '', {uid: ctx.uid || ''});
	} catch (e) {
		logger.error('[getLoginUid]', e, ctx);
		ctx.makeErrResObj();
	}
};
/*
LoginController.logout = async (ctx) => {
	try {
		logger.info('[logout]', ctx);
		// 清除cookie
		ctx.cookies.set('ticket', '');
		ctx.cookies.set('uid', '');
		// 重定向到登录页面
		ctx.redirect('/login.html');
	} catch (e) {
		logger.error('[logout]', e, ctx);
		ctx.makeErrResObj();
	}
};
*/
module.exports = LoginController;