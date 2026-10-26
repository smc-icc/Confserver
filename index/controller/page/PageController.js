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

const captcha = require('svg-captcha')
const CaptchaChallengeStore = require('../../../app/service/auth/CaptchaChallengeStore');

const PageController = {}
const package = require("../../../package.json")
const WebConf = require("../../../config/webConf");

PageController.index = async (ctx) => {

    if (WebConf.isEnableK8s()) {
        await ctx.redirect('/k8s.html');
    } else {
        await ctx.redirect('/tars.html');
    }
};

PageController.title = async (ctx) => {

    ctx.body = {
        title: process.env.TARSNAME || "TARS"
    };
};

PageController.version = async (ctx) => {
    let frameworkVersion = 'N/A';
    if (WebConf.enable) {
        try {
            const AdminService = require('../../../app/service/admin/AdminService');
            frameworkVersion = await AdminService.getVersion();
        } catch (e) {
            // Tars 未连接或 RPC 失败时不影响页面展示
        }
    }
    ctx.body = {
        webVersion: package.version,
        frameworkVersion
    };
};

PageController.k8s_version = async (ctx) => {

    let version = package.version;
    ctx.body = version
};

PageController.captcha = async (ctx) => {
    const cap = captcha.createMathExpr({
        size: 4, // 验证码长度
        ignoreChars: '0o1i', // 验证码字符中排除 0o1i
        noise: 2, // 干扰线条的数量
        color: true, // 验证码的字符是否有颜色，默认没有，如果设定了背景，则默认有
        background: '#cc9966', // 验证码图片背景颜色
        mathMin: 1,
        mathMax: 9,
    })
    if (!ctx.session) throw Object.assign(new Error('Captcha session unavailable'), {status:503});
    const previousId = ctx.session.captchaId;
    delete ctx.session.captcha;
    delete ctx.session.captchaId;
    ctx.set('Cache-Control', 'no-store, max-age=0');
    ctx.session.captchaId = await CaptchaChallengeStore.issue(cap.text, previousId);
    // console.log("ctx.session:" + JSON.stringify(ctx.session, null, 4));
    ctx.set('Content-Type', 'image/svg+xml')
    ctx.body = cap.data
}

PageController.market = async (ctx) => {
    ctx.body = WebConf.market;
}


module.exports = PageController;