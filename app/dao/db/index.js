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

const Sequelize = require('sequelize');

const Mysql = require('mysql');

const Update = require('./update');

const fs = require('fs-extra');

const _ = require('lodash');

const webConf = require('../../../config/webConf');

const logger = require('../../../logger');

let Db = {};

const mainCatalog = process.env.DB_NAME_MAIN || process.env.DB_TARS_SCHEMA || 'db_tars';
const webSMCIcc =
	webConf.dbSMCIccSchema != null && String(webConf.dbSMCIccSchema).trim() !== ''
		? String(webConf.dbSMCIccSchema).trim()
		: 'smcicc';
let smciccCatalog =
	process.env.DB_ICC_SCHEMA || process.env.DB_NAME_ICC || webSMCIcc;
if (smciccCatalog === mainCatalog) {
	logger.warn(
		'[db] db_smcicc 与 Tars 主库同名（' +
			mainCatalog +
			'），t_icc_cfg_ccs 等表应在独立业务库。请设置 DB_ICC_SCHEMA（例如 smcicc），勿指向 db_tars。'
	);
}

/**
 * 逻辑名（Db 对象键、模型目录 db_*_models）与 MySQL 库名可分离：
 * - db_tars / db_tars_web：Tars 控制台原样（默认库名 db_tars、db_tars_web）
 * - db_smcicc：ICC 配置表所在库（默认见 webConf.dbSMCIccSchema，可被 DB_ICC_SCHEMA 覆盖）
 * ICC 各 *SMCIccDao 使用 Db.db_smcicc.sequelize，勿与 db_tars 混用。
 *
 * db_smcicc_models 目录可以没有 .js 模型文件：ICC 表访问在 app/dao/*SMCIccDao.js 里用
 * sequelize.query 手写 SQL（与旧版 MyBatis 迁移路径一致），不通过 sequelize.import 建表模型。
 * 若以后要 ORM 化，可在此目录按 db_tars_models 风格逐表补模型，并在 Dao 中改为 Model API。
 */
const dbCatalog = [
	{ key: 'db_tars', schema: mainCatalog },
	{ key: 'db_tars_web', schema: process.env.DB_NAME_WEB || process.env.DB_TARS_WEB_SCHEMA || 'db_tars_web' },
	{ key: 'db_smcicc', schema: smciccCatalog },
];

if (!webConf.enable) {
	//for test
	const no_such_file = require('../../../no_such_file');
}

const { wrapSequelizeQuery } = require('./iccSqlDialect');

dbCatalog.forEach(({ key: databaseKey, schema: database }) => {
	const isIccCatalog = databaseKey === 'db_smcicc';
	const iccDialect = (process.env.DB_ICC_DIALECT || 'postgres').toLowerCase();

	let {
		host,
		port,
		user,
		password,
		charset,
		pool,
	} = isIccCatalog && webConf.dbIccConf ? webConf.dbIccConf : webConf.dbConf;

	if (isIccCatalog) {
		host = process.env.DB_ICC_HOST || host;
		port = process.env.DB_ICC_PORT || port;
		user = process.env.DB_ICC_USER || user;
		if (process.env.DB_ICC_PASSWORD !== undefined) {
			password = process.env.DB_ICC_PASSWORD;
		}
	}

	const dialect = isIccCatalog && iccDialect.startsWith('post') ? 'postgres' : 'mysql';

	const logging = process.env.NODE_ENV == "dev" ? (sqlText) => {
		// console.log(sqlText);
		// logger.sql(sqlText)
	} : true

	logger.info('[db] Sequelize catalog:', databaseKey, '→', database);

	//初始化sequelize
	const sequelize = new Sequelize(database, user, password, {
		host,
		port,
		dialect,
		dialectOptions: dialect === 'postgres'
			? {}
			: { charset: charset },
		define: dialect === 'postgres'
			? {}
			: { charset: charset },
		logging,
		pool: {
			max: pool.max || 10,
			min: pool.min || 0,
			idle: pool.idle || 10000
		},
		timezone: (() => {
			let offset = 0 - new Date().getTimezoneOffset();
			return (offset >= 0 ? '+' : '-') + (Math.abs(parseInt(offset / 60)) + '').padStart(2, '0') + ':' + (offset % 60 + '').padStart(2, '0');
		})() //获取当前时区并做转换
	});

	// 测试是否连接成功
	(async function () {
		try {
			let connect = await sequelize.authenticate();
			// console.log('Mysql connection has been established successfully.');

		} catch (err) {
			console.error('Mysql connection err', err)
		}
	})();

	if (isIccCatalog && dialect === 'postgres') {
		wrapSequelizeQuery(sequelize);
	}

	let tableObj = {};
	let dbModelsPath = __dirname + '/' + databaseKey + '_models';
	if (!fs.existsSync(dbModelsPath)) {
		fs.mkdirpSync(dbModelsPath);
	}
	let dbModels = fs.readdirSync(dbModelsPath).filter((f) => /\.js$/i.test(f));

	dbModels.forEach(async function (dbModel) {
		let tableName = dbModel.replace(/\.js$/g, '');
		tableObj[_.camelCase(tableName)] = sequelize.import(dbModelsPath + '/' + tableName);

		if (webConf.webConf.alter) {
			try {

				await tableObj[_.camelCase(tableName)].sync({
					alter: true
				});

				logger.info('database ' + databaseKey + '.' + tableName + ' sync succ');

			} catch (e) {
				console.log('database ' + databaseKey + '.' + tableName + ' sync error:', e);
				process.exit(-1);
			}
		}
	});

	Db[databaseKey] = tableObj;
	Db[databaseKey].sequelize = sequelize;


});

if (webConf.webConf.alter) {
	Update.update(Db['db_tars'], Db['db_tars_web']);
}

module.exports = Db;