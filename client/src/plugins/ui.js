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
import ElementUI from 'element-ui';
import 'element-ui/lib/theme-chalk/index.css';
import VueCookie from 'vue-cookie';

import '@/assets/css/element-ui.css';
import Icon from '@/components/icon';
import TarsFormItem from '@/components/tars-form-item';
import locale from 'element-ui/lib/locale';
import langZh from 'element-ui/lib/locale/lang/zh-CN';
import langEn from 'element-ui/lib/locale/lang/en';

const localeMap = { cn: langZh, en: langEn };
const localeKey = VueCookie.get('locale') || 'cn';
locale.use(localeMap[localeKey] || langZh);

if (ElementUI.Tabs && ElementUI.Tabs.watch) {
  ElementUI.Tabs.watch.currentName = function currentName() {
    this.$nextTick(() => {
      const nav = this.$refs && this.$refs.nav;
      if (!this._isDestroyed && nav && typeof nav.scrollToActiveTab === 'function') {
        nav.scrollToActiveTab();
      }
    });
  };
}

function syncFormItemLabel(vm) {
  const root = vm && vm.$el;
  if (!root || root.nodeType !== 1 || !root.classList || !root.classList.contains('el-form-item')) return;
  const label = Array.prototype.find.call(
    root.children,
    (el) => el.classList && el.classList.contains('el-form-item__label'),
  );
  if (!label) return;
  const content = Array.prototype.find.call(
    root.children,
    (el) => el.classList && el.classList.contains('el-form-item__content'),
  );
  const field = content && (
    content.querySelector('input.el-input__inner, textarea, select')
    || content.querySelector('input:not([type="hidden"])')
  );
  if (!field) {
    label.removeAttribute('for');
    return;
  }
  let id = field.getAttribute('id');
  const owner = id ? document.getElementById(id) : null;
  if (!id || (owner && owner !== field)) {
    id = `el-field-${vm._uid}`;
    field.setAttribute('id', id);
  }
  if (label.getAttribute('for') !== id) label.setAttribute('for', id);
}

const formItemOpts = ElementUI.FormItem && (ElementUI.FormItem.options || ElementUI.FormItem);
if (formItemOpts) {
  const prevFormItemMounted = formItemOpts.mounted;
  formItemOpts.mounted = function formItemMounted() {
    if (typeof prevFormItemMounted === 'function') prevFormItemMounted.call(this);
    this.$nextTick(() => syncFormItemLabel(this));
  };
  const prevFormItemUpdated = formItemOpts.updated;
  formItemOpts.updated = function formItemUpdated() {
    if (typeof prevFormItemUpdated === 'function') prevFormItemUpdated.call(this);
    syncFormItemLabel(this);
  };
}

Vue.use(ElementUI, { locale: localeMap[localeKey] || langZh });
Vue.component(Icon.name, Icon);
Vue.component(TarsFormItem.name, TarsFormItem);

function UILoading() {
  this.loading = null;
}

UILoading.prototype.show = function (text) {
  if (this.loading) {
    this.hide();
  }

  const loading = ElementUI.Loading.service({
    fullscreen: true,
    text: text || 'Loading',
    background: 'rgba(0,0,0,0)',
  });

  this.loading = loading;
  return this;
};

UILoading.prototype.hide = function () {
  if (this.loading) {
    this.loading.close();
    this.loading = null;
  }
  return this;
};

UILoading.show = function (text) {
  if (!UILoading._loading) {
    UILoading._loading = new UILoading();
  }
  return UILoading._loading.show(text);
};

UILoading.hide = function () {
  if (!UILoading._loading) {
    UILoading._loading = new UILoading();
  }
  return UILoading._loading.hide();
};

Object.defineProperty(Vue.prototype, '$Loading', {
  get() {
    if (!this._loading) {
      this._loading = new UILoading();
    }
    return this._loading;
  },
  set(val) {},
});

Object.defineProperty(Vue.prototype, '$loading', {
  get() {
    if (!this._loading) {
      this._loading = new UILoading();
    }
    return this._loading;
  },
  set(val) {},
});

//////////////////////////////////////////////////////////////////////////////////////

const tip = {
  error: (msg) => {
    Vue.prototype.$message({
      showClose: true,
      message: msg,
      type: 'error',
    });
  },
  success: (msg) => {
    Vue.prototype.$message({
      showClose: true,
      message: msg,
      type: 'success',
    });
  },
  warning: (msg) => {
    Vue.prototype.$message({
      showClose: true,
      message: msg,
      type: 'warning',
    });
  },
};
Object.defineProperty(Vue.prototype, '$tip', {
  get() {
    return tip;
  },
  set(val) {},
});
