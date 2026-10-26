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
const PluginDao = require('../../app/dao/PluginDao');

const registry = require("../../rpc").registry
const proxy = require('koa-server-http-proxy');
const { proxyOnError } = require('../proxyUtil');
const PluginService = {};

let thisApp = null;

PluginService.list = async (type) => {

    let rst = await PluginDao.listPlugins(type);

    return {
        ret: 200,
        msg: 'succ',
        data: rst
    };
}

PluginService.listAll = async () => {

    let rst = await PluginDao.listPlugins();

    return {
        ret: 200,
        msg: 'succ',
        data: rst
    };
}

PluginService.delete = async (id) => {

    let rst = await PluginDao.deletePlugin(id);

    return {
        ret: 200,
        msg: 'succ',
        data: rst
    };
}


async function findActiveIndex(obj) {
    try {
        const rst = await registry.findObjectById4Any(obj);
        let activeList = rst.response.arguments.activeEp;

        if (activeList.length > 0) {
            return `${activeList.at(0).host}:${activeList.at(0).port}`;
        }

        activeList = rst.response.arguments.inactiveEp;

        if (activeList.length > 0) {
            return `${activeList.at(0).host}:${activeList.at(0).port}`;
        }

        return null;
    } catch (e) {
        logger.warn('[findActiveIndex]', e.message || e);
        return null;
    }
}

let allPlugins = {}

PluginService.loadPlugins = async (app) => {
    let plugins = [];

    try {
        plugins = await PluginDao.listPlugins();
    } catch (e) {
        logger.error(e.message);
    }

    for (const plugin of plugins) {
        if (plugin.f_extern != 0) {
            continue;
        }
        try {
            if (process.env.TARS_RESID) {
                const target = process.env.TARS_DEPOSIT;

                if (allPlugins[plugin.f_path] != target) {
                    const ws = false;
                    const headers = {
                        ns: process.env.TARS_RESID,
                        'x-obj': plugin.f_obj,
                    };

                    app.use(proxy(plugin.f_path, {
                        target: process.env.TARS_DEPOSIT,
                        ws,
                        changeOrigin: true,
                        headers,
                        onError: proxyOnError,
                    }));

                    allPlugins[plugin.f_path] = target;
                }
            } else {
                const target = await findActiveIndex(plugin.f_obj);

                if (target) {
                    if (allPlugins[plugin.f_path] != target) {
                        logger.info('[loadPlugins]', plugin.f_path, '→', target);
                        const ws = true;
                        const newTarget = 'http://' + target;

                        app.use(proxy(plugin.f_path, {
                            target: newTarget,
                            ws,
                            changeOrigin: true,
                            onError: proxyOnError,
                        }));

                        allPlugins[plugin.f_path] = target;
                    }
                }
            }
        } catch (e) {
            logger.warn('[loadPlugins] plugin skip', plugin && plugin.f_path, e.message || e);
        }
    }

    setTimeout(() => {
        PluginService.loadPlugins(app).catch((e) => {
            logger.error('[loadPlugins] tick', e.message || e);
        });
    }, 5000);
};

PluginService.load = async () => {

    PluginService.loadPlugins(thisApp);

    return {
        ret: 200,
        msg: 'succ',
        data: {}
    };
}

module.exports = PluginService;