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
const cwd = process.cwd();
const path = require('path');
const fs = require('fs-extra');

/** IVR 运行时流程目录（与 tarsnode 下 SMC-ICC.IVRServer/flows 一致，供流程设计器发布） */
const TARS_IVR_FLOWS_DIR = 'C:/tars-install/tars/tarsnode/data/SMC-ICC.IVRServer/flows';

let conf = {
    ENABLE_LOCAL_CONFIG: false,
    webConf: {
        host: 'master.tars.com',
        port: 3000, //服务启动端口
        loggerPath: path.join(__dirname, '../log'), //本地日志的目录
        logFileKeepDays: '1', //日志保留时间
        strict: false, //true: tarslog模式(tarslog需要首先从框架上迁移走, 基础框架服务器上不能部署其他服务)
        uploadLogin: false, //上传文件是否需要登录(开发或者调试时可以放开)
        alter: true, //变更db结构
    },
    pkgUploadPath: {
        path: 'C:/tars-install/patchs/tars.upload'
    },
    //防洪水攻击配置
    limitConf: {
        enableLimit: true, //是否启用此配置
        limit: 5000, //限制访问的次数
        interval: 1000 * 60 * 10, //限制的时间间隔，单位为ms，如：1小时内限制访问5000次
        whilteList: [], //白名单IP
        blackList: [] //黑名单IP
    },
    ldapConf: {
        enableLDAP: false, // 是否启用LDAP用户登录验证
        url: 'ldap://ldap.tars.com:10389', // LDAPServer地址
        basedn: 'ou=starsf,dc=tars,dc=com', // LDAP根目录|ou组织单位子目录|dc域名部分dc=tars,dc=com为tars.com
        reconnect: true,
        timeout: 30000, // LDAP创建client请求超时时间
        timeLimit: 30, // LDAPsearch超时时间，秒为单位
        syncAllUserSchedule: '*/5 * * * *', // 全量同步LDAP用户,每5分钟同步一次
        maxInCache: 10 * 60 * 1000 // 全量LDAP用户数据在内存中最大时间,应大于同步任务的时间
    },
    dbConf: {
        host: '127.0.0.1', // 数据库地址
        port: '3306', // 数据库端口
        user: 'tarsAdmin', // 用户名
        password: 'Tars@2019', // 密码
        charset: 'utf8', // 数据库编码
        pool: {
            max: 10, // 连接池中最大连接数量
            min: 0, // 连接池中最小连接数量
            idle: 10000 // 如果一个线程 10 秒钟内没有被使用过的话，那么就释放线程
        }
    },
    /**
     * ICC 业务库 MySQL catalog（默认 smcicc）。
     * 可被环境变量 DB_ICC_SCHEMA 或 DB_NAME_ICC 覆盖；勿与 db_tars 同名。
     */
    dbSMCIccSchema: 'smcicc',
    /**
     * ICC 业务库连接（db_smcicc 专用，默认 PostgreSQL）。
     * 环境变量：DB_ICC_HOST/PORT/USER/PASSWORD、DB_ICC_DIALECT=postgres|mysql
     */
    dbIccConf: {
        host: process.env.DB_ICC_HOST || '127.0.0.1',
        port: process.env.DB_ICC_PORT || '5432',
        user: process.env.DB_ICC_USER || 'postgres',
        password: process.env.DB_ICC_PASSWORD || '',
        charset: 'utf8',
        pool: {
            max: 10,
            min: 0,
            idle: 10000,
        },
    },
    /**
     * IVR 呼叫流程配置工具
     * ivr_projects：工程目录（{projectId}/{projectId}.json，含多流程 graph）
     * ivr_flows：发布到 IVR 的运行时目录（VDN{publishVdn}/flow_{appId}/flow_{appId}.json）
     * 默认写入 TARS 节点 flows（与 IVRServer bin 同级）；可被环境变量 IVR_FLOWS_DIR 覆盖。
     */
    ivr_projects: path.join(__dirname, '../data/ivr_projects'),
    ivr_flows: TARS_IVR_FLOWS_DIR,
    /** ICC NodeID → TARS node_name，部署差异兜底，例：{ "101": "master.tars.com" } */
    ivrNodeIdToTarsNode: {},
    client: path.join(cwd, 'config/tars.conf'), //连接普通TARS环境的配置
    enable: true, //启用普通的版本
    show: true, //显示TARS tab

    k8s: {
        client: path.join(cwd, 'config/k8s.conf'),
        namespace: 'tars-dev',
        apiPrefix: 'apis/k8s.tars.io/v1beta2', // 与k8s的交互配置
        upload: 'api/v1beta2/timage', // tarsimage上传交互
        cache: true, //从cache中加载
    },
    market: {
        url: 'https://m.k.tarsyun.com',
        /** 为 true 时不拉取远程嵌入页，避免 api.k.tarsyun.com 等证书/网络问题拖垮控制台 */
        disabled: false,
    },
    isEnableK8s: () => {
        return process.env.ENABLE_K8S == "true" || false;
    },

};

if (process.env.NODE_ENV == "local") {

    conf.dbConf = {
        host: '127.0.0.1', // 数据库地址
        port: '3306', // 数据库端口
        user: 'tarsAdmin', // 用户名tarsAdmin
        password: 'Tars@2019', // 密码Tars@2019
        charset: 'utf8', // 数据库编码
        pool: {
            max: 10, // 连接池中最大连接数量
            min: 0, // 连接池中最小连接数量
            idle: 10000 // 如果一个线程 10 秒钟内没有被使用过的话，那么就释放线程
        }
    };

    conf.webConf.host = '0.0.0.0';
    conf.webConf.port = 4001;
    conf.webConf.alter = false;
    conf.webConf.alter = true;

    conf.market = {
        url: 'http://localhost:6001',
        disabled: true,
    };

    conf.client = path.join(cwd, 'config/tars-dev.conf');
    process.env.ENABLE_K8S = "false";

} else if (process.env.NODE_ENV == "remote") {
    conf.ENABLE_LOCAL_CONFIG = true;

    conf.dbConf = {
        host: '172.30.0.47', // 数据库地址
        port: '3306', // 数据库端口
        user: 'tarsAdmin', // 用户名
        password: 'Tars@2019', // 密码
        charset: 'utf8', // 数据库编码
        pool: {
            max: 10, // 连接池中最大连接数量
            min: 0, // 连接池中最小连接数量
            idle: 10000 // 如果一个线程 10 秒钟内没有被使用过的话，那么就释放线程
        }
    };

    conf.webConf.host = '0.0.0.0';
    conf.webConf.port = 4001;
    conf.enable = true;
    conf.market = {
        url: 'http://localhost:6001',
        disabled: true,
    };
    conf.webConf.alter = false;
    conf.client = path.join(cwd, 'config/tars-remote.conf');
    process.env.ENABLE_K8S = "true";

} else if (process.env.NODE_ENV == "dev") {

    conf.dbConf = {
        host: '127.0.0.1', // 数据库地址
        port: '3306', // 数据库端口
        user: 'tarsAdmin', // 用户名tarsAdmin
        password: 'Tars@2019', // 密码Tars@2019
        charset: 'utf8', // 数据库编码
        pool: {
            max: 10, // 连接池中最大连接数量
            min: 0, // 连接池中最小连接数量
            idle: 10000 // 如果一个线程 10 秒钟内没有被使用过的话，那么就释放线程
        }
    };


    conf.webConf.host = '0.0.0.0';
    conf.webConf.port = 4001;
    conf.webConf.alter = true;

    conf.client = path.join(cwd, 'config/tars-dev.conf');
    process.env.ENABLE_K8S = "false";

} else if (process.env.NODE_ENV == "k8s") {
    // conf.ENABLE_LOCAL_CONFIG = true;
    // conf.dbConf = {
    //     host: '127.0.0.1', // 数据库地址
    //     port: '3306', // 数据库端口
    //     user: 'tarsAdmin', // 用户名
    //     password: 'Tars@2019', // 密码
    //     charset: 'utf8', // 数据库编码
    //     pool: {
    //         max: 10, // 连接池中最大连接数量
    //         min: 0, // 连接池中最小连接数量
    //         idle: 10000 // 如果一个线程 10 秒钟内没有被使用过的话，那么就释放线程
    //     }
    // };

    // conf.dbConf = null;

    conf.webConf.host = '0.0.0.0';
    conf.webConf.port = 4001;

    // conf.client = path.join(cwd, 'config/tars-k8s.conf');

    process.env.ENABLE_K8S = "true";
    // conf.enable = false;
    // conf.market = {
    //     enable: true,
    //     url: 'http://localhost:6001'
    // };

    conf.k8s.namespace = 'tars-dev';
} else if (process.env.NODE_ENV == "all") {

    conf.ENABLE_LOCAL_CONFIG = true;
    conf.dbConf = {
        host: '127.0.0.1', // 数据库地址
        port: '3306', // 数据库端口
        user: 'tarsAdmin', // 用户名tarsAdmin
        password: 'Tars@2019', // 密码Tars@2019
        charset: 'utf8', // 数据库编码
        pool: {
            max: 10, // 连接池中最大连接数量
            min: 0, // 连接池中最小连接数量
            idle: 10000 // 如果一个线程 10 秒钟内没有被使用过的话，那么就释放线程
        }
    };
    conf.webConf.host = '0.0.0.0';
    conf.webConf.port = 4001;

    conf.client = path.join(cwd, 'config/tars-dev.conf');

    process.env.ENABLE_K8S = "true";
    // conf.market = {
    //     url: 'http://localhost:6001'
    // };
    // conf.market.url = 'https://m.k.tarsyun.com';
    conf.market.url = 'http://localhost:6001';
    conf.market.disabled = true;
    conf.webConf.alter = false;
    // conf.webConf.alter = true;
    conf.k8s.namespace = 'tars-dev';
    // conf.k8s.namespace = 'od-prod';
}

/**
 * 环境变量（可选）：
 * - TARS_MARKET_URL：覆盖应用商店嵌入基地址（例：内网镜像或本地 http://127.0.0.1:6001）
 * - TARS_MARKET_DISABLE：设为 1 或 true 时禁用远程应用商店，不再请求 m.k.tarsyun.com / api.k.tarsyun.com
 */
if (process.env.TARS_MARKET_DISABLE === 'true' || process.env.TARS_MARKET_DISABLE === '1') {
    conf.market.disabled = true;
}
if (process.env.TARS_MARKET_URL !== undefined && process.env.TARS_MARKET_URL !== '') {
    conf.market.url = process.env.TARS_MARKET_URL;
}

/**
 * ICC / 业务库：覆盖 webConf.dbConf（勿提交密码）。
 * - Tars：DB_NAME_MAIN、DB_NAME_WEB 见 app/dao/db/index.js（默认 db_tars / db_tars_web）。
 * - ICC 配置表：独立连接 Db.db_smcicc；默认库名见 webConf.dbSMCIccSchema（默认 smcicc），可用 DB_ICC_SCHEMA / DB_NAME_ICC 覆盖。
 */
if (process.env.DB_HOST) {
    conf.dbConf.host = process.env.DB_HOST;
}
if (process.env.DB_PORT) {
    conf.dbConf.port = process.env.DB_PORT;
}
if (process.env.DB_USER) {
    conf.dbConf.user = process.env.DB_USER;
}
if (process.env.DB_PASSWORD !== undefined) {
    conf.dbConf.password = process.env.DB_PASSWORD;
}

if (process.env.WEB_ALTER === 'false' || process.env.WEB_ALTER === '0') {
    conf.webConf.alter = false;
}
if (process.env.LIMIT_ENABLE === 'false' || process.env.LIMIT_ENABLE === '0') {
    conf.limitConf.enableLimit = false;
}
if (process.env.XML_CURL_FS_IP) {
    const ips = String(process.env.XML_CURL_FS_IP).split(',').map((s) => s.trim()).filter(Boolean);
    conf.limitConf.whilteList = (conf.limitConf.whilteList || []).concat(ips);
}

if (process.env.IVR_PROJECTS_DIR !== undefined && process.env.IVR_PROJECTS_DIR !== '') {
    conf.ivr_projects = process.env.IVR_PROJECTS_DIR;
}
if (process.env.IVR_FLOWS_DIR !== undefined && process.env.IVR_FLOWS_DIR !== '') {
    conf.ivr_flows = process.env.IVR_FLOWS_DIR;
}
if (process.env.ITR_RELOAD_URL !== undefined && process.env.ITR_RELOAD_URL !== '') {
    conf.itr_reload_url = process.env.ITR_RELOAD_URL;
}
if (process.env.ITR_RUNTIME_FLOWS !== undefined && process.env.ITR_RUNTIME_FLOWS !== '') {
    conf.itr_runtime_flows = process.env.ITR_RUNTIME_FLOWS;
}

// ConfManage shares the framework patch volume in Linux/offline deployments.
if (process.env.PKG_UPLOAD_PATH) {
    conf.pkgUploadPath.path = process.env.PKG_UPLOAD_PATH;
}

module.exports = conf;