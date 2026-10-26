import Vue from 'vue';
import VueI18n from 'vue-i18n';
import VueRouter from 'vue-router';
import ElementUI from 'element-ui';
import zh from 'element-ui/lib/locale/lang/zh-CN';
import en from 'element-ui/lib/locale/lang/en';
import 'element-ui/lib/theme-chalk/index.css';
import '@/assets/theme/element-to-let/index.css';
import cnMessages from '../../../../locale/cn.json';
import enMessages from '../../../../locale/en.json';
import VdnAccess from './VdnAccess.vue';

// Local messages avoid a management API dependency before authentication.
Vue.use(VueI18n);
Vue.use(VueRouter);
const locale = /(?:^|;\s*)locale=en(?:;|$)/.test(document.cookie) ? 'en' : 'cn';
document.documentElement.lang = locale === 'en' ? 'en' : 'zh-CN';
const i18n = new VueI18n({ locale, fallbackLocale: 'cn', messages: {
  cn: { ...zh, smcicc: { vdnAccess: cnMessages.smcicc.vdnAccess } },
  en: { ...en, smcicc: { vdnAccess: enMessages.smcicc.vdnAccess } }
} });
Vue.use(ElementUI, { i18n: (key, value) => i18n.t(key, value) });
Vue.config.productionTip = false;
const toLogin = (_to, _from, next) => { window.location.replace('/login.html'); next(false); };
const router = new VueRouter({ mode: 'hash', routes: [
  { path: '/', redirect: '/register' }, { path: '/register', component: VdnAccess },
  { path: '/apply', redirect: '/register' }, { path: '/progress', beforeEnter: toLogin }, { path: '/login', beforeEnter: toLogin },
  { path: '*', redirect: '/register' }
] });
new Vue({ i18n, router, render: h => h('router-view') }).$mount('#vdn-access-app');
