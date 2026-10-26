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

import Vue from 'vue';
import './plugins/ui';
import './plugins/ajax';
// import './plugins/charts';

import App from './App';
import router from './router';
import {i18n, loadLang} from './locale/i18n'

import './assets/icon-font/iconfont.css'

Vue.config.productionTip = false;

Vue.config.errorHandler = (err, vm, info) => {
  const msg =
    err instanceof Error
      ? err.message || String(err)
      : typeof err === 'string'
        ? err
        : (() => {
            try {
              return JSON.stringify(err);
            } catch (e) {
              return String(err);
            }
          })();
  console.error('[Vue]', info, msg, err);
};

/* eslint-disable no-new */
loadLang.call(this).then(() => {
  new Vue({
    i18n: i18n,
    el: '#app',
    router,
    components: {App},
    template: '<App/>'
  });
})

