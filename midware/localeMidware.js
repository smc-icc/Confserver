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

const stream = require('stream');
const _ = require('lodash');
const fs = require('fs-extra');
const path = require('path');

let localeMap = {};

let fileNames = fs.readdirSync(path.join(__dirname, '../index/json'));

fileNames.forEach((fileName) => {

	let content = require(path.join(__dirname, '../index/json', fileName));
	localeMap[content.localeCode] = formatJson(content);
});

function formatJson(localeJson) {
	let resultJson = {};
	(function (localeJson, keyPart, resultJson) {
		var args = arguments;
		_.each(localeJson, (value, key) => {
			var newKeyPart = keyPart ? (keyPart + '.' + key) : key;
			if (!_.isObject(value)) {
				resultJson['#' + newKeyPart + '#'] = value;
			} else {
				args.callee(value, newKeyPart, resultJson);
			}
		});
	})(localeJson, '', resultJson)

	return resultJson;
}

function resolveLocale(value, fallback) {
	if (typeof value !== 'string') return fallback;
	const code = value.trim().toLowerCase().replace(/_/g, '-');
	if (Object.prototype.hasOwnProperty.call(localeMap, code)) return code;
	if (/^zh(?:-|$)/.test(code)) return 'cn';
	if (/^en(?:-|$)/.test(code)) return 'en';
	return fallback;
}

module.exports = async (ctx, next) => {
	const preferred = /zh/i.test(ctx.headers['accept-language'] || '') ? 'cn' : 'en';
	const locale = resolveLocale(ctx.cookies.get('locale'), preferred);
	ctx.cookies.set('locale', locale, { httpOnly: false });

	await next();

	// Signed plugin assets and other binary responses must retain their exact bytes.
	if (Buffer.isBuffer(ctx.body)) return;

	if (!!ctx.body) {
		var lan = resolveLocale(ctx.paramsObj && ctx.paramsObj.__locale, locale);
		var content = '';
		var contentType = '';
		if (_.isString(ctx.body)) {
			content = ctx.body;
			contentType = 'string';
		} else if (_.isObject(ctx.body) && !(ctx.body instanceof stream)) {
			content = JSON.stringify(ctx.body);
			contentType = 'object';
		} else {
			return;
		}
		let matchList = content.match(/#[a-zA-Z0-9\._]+#/g);
		_.each(matchList, (matchStr) => {
			let str = localeMap[lan][matchStr]
			if (str) {
				content = content.replace(matchStr, str);
			}
		});
		if (contentType == 'object') {
			ctx.body = JSON.parse(content);
		} else {
			ctx.body = content;
		}
	}
};