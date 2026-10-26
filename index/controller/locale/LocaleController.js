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

const logger = require('../../../logger');
const fs = require('fs-extra');
const path = require('path');

// 与 app/controller/locale 共用 locale/，避免 index/json 过期导致缺 home/smcicc 等键
const localeDir = path.join(__dirname, '../../../locale');

function loadLocaleMap() {
	const locale = {};
	const fileNames = fs.readdirSync(localeDir);
	fileNames.forEach((fileName) => {
		if (!/\.json$/i.test(fileName)) return;
		const full = path.join(localeDir, fileName);
		try {
			delete require.cache[require.resolve(full)];
		} catch (e) {
			// ignore resolve miss on first load
		}
		const content = require(full);
		if (content && content.localeCode) {
			locale[content.localeCode] = content;
		}
	});
	return locale;
}

let locale = loadLocaleMap();

const LocaleController = {};
LocaleController.getLocale = async (ctx) => {
	try {
		locale = loadLocaleMap();
	} catch (e) {
		logger.error('[getLocale] reload failed', e);
	}
	ctx.makeResObj(200, '', locale || {});
};

module.exports = LocaleController;
