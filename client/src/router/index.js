import CommunityModules from '@/pages/smcicc/system/CommunityModules';
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
import Router from 'vue-router';

Vue.use(Router);

// 重写路由的push方法
const routerPush = Router.prototype.push;
Router.prototype.push = function push(location) {
  return routerPush.call(this, location).catch(error => error)
}

const routerReplace = Router.prototype.replace;
Router.prototype.replace = function replace(location) {
  return routerReplace.call(this, location).catch(error => error)
}

// 服务管理
import Server from '@/pages/server/index';
import ServerManage from '@/pages/server/manage';
import ServerPublish from '@/pages/server/publish';
import ServerConfig from '@/pages/server/config';
import ChannelIntegrationKeys from '@/pages/smcicc/channel/ChannelIntegrationKeys';
import ChannelWechat from '@/pages/smcicc/channel/ChannelWechat';
import ChannelWebsite from '@/pages/smcicc/channel/ChannelWebsite';
import ChannelApi from '@/pages/smcicc/channel/ChannelApi';
import ChannelTelegram from '@/pages/smcicc/channel/ChannelTelegram';
import ChannelLine from '@/pages/smcicc/channel/ChannelLine';
import ChannelSms from '@/pages/smcicc/channel/ChannelSms';
import ChannelEmail from '@/pages/smcicc/channel/ChannelEmail';
import ChannelWhatsapp from '@/pages/smcicc/channel/ChannelWhatsapp';
import ChannelFacebook from '@/pages/smcicc/channel/ChannelFacebook';
import ChannelInstagram from '@/pages/smcicc/channel/ChannelInstagram';
import ChannelTiktok from '@/pages/smcicc/channel/ChannelTiktok';
import ChannelWeibo from '@/pages/smcicc/channel/ChannelWeibo';
import ChannelMiniprogram from '@/pages/smcicc/channel/ChannelMiniprogram';
import ChannelOps from '@/pages/smcicc/channel/ChannelOps';
import RecordingAccess from '@/pages/smcicc/channel/RecordingAccess';

import AuthManage from '@/common/user-manage';
// import InterfaceDebuger from '@/common/interface-debuger';
import ServerServerMonitor from '@/common/monitor-server';
import ServerPropertyMonitor from '@/common/monitor-property';

// 运维管理
import Operation from '@/pages/operation/index';
import OperationDeploy from '@/pages/operation/deploy';
import OperationExpand from '@/pages/operation/expand';
import OperationTemplates from '@/pages/operation/templates';
import OperationNodes from '@/pages/operation/nodes';
import OperationCheck from '@/pages/operation/check';
import OperationApplication from '@/pages/operation/application';
import OperationBusiness from '@/pages/operation/business';
import OperationBusinessRelation from '@/pages/operation/businessRelation';
import OperationIDCManage from '@/pages/operation/idc';
import OperationImage from '@/pages/operation/image';

import PluginsManage from '@/common/plugins-manage.vue';
//服务级别插件
import ServerPlugins from '@/common/serverPlugins';
//运维级别插件
import OperationPlugins from '@/common/operationPlugins';
//全局插件
import Plugin from '@/common/plugins.vue';

//市场
import Market from '@/market/market';
import SMCIccLayout from '@/pages/smcicc/layout';
import SMCIccVdnBasicInfo from '@/pages/smcicc/vdnadmin/basic-info';
import SMCIccVdnDepartment from '@/pages/smcicc/vdnadmin/department';
import TenantOrganization from '@/pages/smcicc/vdnadmin/TenantOrganization';
import MyVdns from '@/pages/smcicc/vdnadmin/MyVdns';
import SMCIccVdnRole from '@/pages/smcicc/vdnadmin/role';
import SMCIccSystemOutlet from '@/pages/smcicc/system/SystemOutlet';
import SMCIccSystemWelcome from '@/pages/smcicc/system/SystemWelcome';
import SMCIccOnboardingWizard from '@/pages/smcicc/system/OnboardingWizard';
import SMCIccSysUserManager from '@/pages/smcicc/system/SysUserManager';
import SMCIccAccessCodeManager from '@/pages/smcicc/system/AccessCodeManager';
import SMCIccVoiceDriver from '@/pages/smcicc/system/VoiceDriver';
import SMCIccPushAccounts from '@/pages/smcicc/system/PushAccounts';
import RegistrationNotifications from '@/pages/smcicc/system/RegistrationNotifications';
import SbcDomains from '@/pages/smcicc/system/SbcDomains';
import SMCIccVdnAccessAdmin from '@/pages/smcicc/system/ManagerAccountsAdmin';
import WorkNoRangeAdmin from '@/pages/smcicc/system/WorkNoRangeAdmin';
import SMCIccVdnManager from '@/pages/smcicc/system/VdnManager';
import { ICC_DEFAULT_SYSTEM_VUE_ROUTE } from '@/pages/smcicc/system/menuConfig';

const ICC_DEFAULT_SYSTEM_PATH = `/smcicc/system/${ICC_DEFAULT_SYSTEM_VUE_ROUTE}`;

const getComponent = (component) => {
    return {
        default: component,
        market: Market,
    }
}
export default new Router({
  routes: [{
      path: '/server',
      name: 'Server',
      components: getComponent(Server),
      children: [{
          path: ':treeid/manage',
          component: ServerManage,
        },
        {
          path: ':treeid/publish',
          component: ServerPublish,
        },
        {
          path: ':treeid/config',
          component: ServerConfig,
        },
        {
          path: ':treeid/server-monitor',
          component: ServerServerMonitor,
        },
        {
          path: ':treeid/property-monitor',
          component: ServerPropertyMonitor,
        },
        {
          path: ':treeid/user-manage',
          component: AuthManage,
        },
        {
          path: ':treeid/plugins',
          component: ServerPlugins,
        },
      ],
    },
    {
      path: '/operation',
      name: 'Operation',
      components: getComponent(Operation),
      redirect: '/operation/deploy',
      children: [{
          path: 'deploy',
          component: OperationDeploy,
        },
        {
          path: 'expand',
          component: OperationExpand,
        },
        {
          path: 'templates',
          component: OperationTemplates,
        },
        {
          path: 'nodes',
          component: OperationNodes,
        },
        {
          path: 'check',
          component: OperationCheck,
        },
        {
          path: 'application',
          component: OperationApplication,
        },
        {
          path: 'business',
          component: OperationBusiness,
        },
        {
          path: 'businessRelation',
          component: OperationBusinessRelation,
        },
        {
          path: 'idc',
          component: OperationIDCManage,
        },
        {
          path: 'image',
          component: OperationImage
        },
        {
          path: 'plugins/*',
          component: OperationPlugins,
        },
      ],
    },
    {
      path: '/smcicc',
      components: getComponent(SMCIccLayout),
      redirect: ICC_DEFAULT_SYSTEM_PATH,
      children: [
        { path: 'vdnadmin/basic-info', name: 'SMCIccVdnBasicInfo', component: SMCIccVdnBasicInfo },
        { path: 'vdnadmin/department', name: 'SMCIccVdnDepartment', component: SMCIccVdnDepartment },
        { path: 'vdnadmin/workspace', name: 'MyVdns', component: MyVdns },
        { path: 'vdnadmin/organization', name: 'TenantOrganization', component: TenantOrganization },
        { path: 'vdnadmin/role', name: 'SMCIccVdnRole', component: SMCIccVdnRole },
        {
          path: 'system',
          component: SMCIccSystemOutlet,
          redirect: ICC_DEFAULT_SYSTEM_PATH,
          children: [
            { path: 'welcome', name: 'SMCIccSystemWelcome', component: SMCIccSystemWelcome },
            { path: 'community-modules', name: 'CommunityModules', component: CommunityModules },
            { path: 'onboard', name: 'SMCIccOnboard', component: SMCIccOnboardingWizard },
            { path: 'sys-user', name: 'SMCIccSysUser', component: SMCIccSysUserManager },
            { path: 'odbc', redirect: { path: '/smcicc/system/voice-driver' } },
            { path: 'sip-ext', redirect: { path: '/smcicc/system/voice-driver', query: { mode: 'ehang', section: 'sip' } } },
            { path: 'access-code', name: 'SMCIccAccessCode', component: SMCIccAccessCodeManager },
            { path: 'voice-driver', name: 'SMCIccVoiceDriver', component: SMCIccVoiceDriver },
            { path: 'registration-notifications', name: 'RegistrationNotifications', component: RegistrationNotifications },
            { path: 'sbc-domains', name: 'SbcDomains', component: SbcDomains },
            { path: 'push-accounts', name: 'SMCIccPushAccounts', component: SMCIccPushAccounts },
            { path: 'vdn-access', name: 'SMCIccVdnAccessAdmin', component: SMCIccVdnAccessAdmin },
            { path: 'workno-ranges', name: 'WorkNoRangeAdmin', component: WorkNoRangeAdmin },
            { path: 'ehang-mc', redirect: { path: '/smcicc/system/voice-driver', query: { mode: 'ehang', section: 'mc' } } },
            { path: 'ehang-prd', redirect: { path: '/smcicc/system/voice-driver', query: { mode: 'ehang', section: 'prd' } } },
            { path: 'ehang-isx', redirect: { path: '/smcicc/system/voice-driver', query: { mode: 'ehang', section: 'isx' } } },
            { path: 'mc100', redirect: { path: '/smcicc/system/voice-driver', query: { mode: 'ehang' } } },
            { path: 'comm', redirect: { path: '/smcicc/system/voice-driver', query: { mode: 'ehang' } } },
            { path: 'hmp', redirect: { path: '/smcicc/system/voice-driver', query: { mode: 'ehang' } } },
            { path: 'ccs', redirect: { path: '/smcicc/system/voice-driver' } },
            { path: 'acd', redirect: { path: '/smcicc/system/voice-driver' } },
            { path: 'channel-group', redirect: { path: '/smcicc/system/voice-driver', query: { mode: 'ehang', section: 'channel-group' } } },
            { path: 'channel-config', redirect: { path: '/smcicc/system/voice-driver', query: { mode: 'ehang', section: 'channel' } } },
            { path: 'vdn', name: 'SMCIccVdn', component: SMCIccVdnManager },
            { path: 'agent-user', redirect: { path: '/smcicc/system/vdn', query: { tab: 'agent' } } },
            { path: 'service-route', redirect: { path: '/smcicc/system/vdn', query: { tab: 'route', route: 'voice' } } },
            { path: 'channel-integration-keys', name: 'SMCIccChannelIntegrationKeys', component: ChannelIntegrationKeys },
            { path: 'channel-website', name: 'SMCIccChannelWebsite', component: ChannelWebsite },
            { path: 'channel-facebook', name: 'SMCIccChannelFacebook', component: ChannelFacebook },
            { path: 'channel-whatsapp', name: 'SMCIccChannelWhatsapp', component: ChannelWhatsapp },
            { path: 'channel-sms', name: 'SMCIccChannelSms', component: ChannelSms },
            { path: 'channel-email', name: 'SMCIccChannelEmail', component: ChannelEmail },
            { path: 'channel-api', name: 'SMCIccChannelApi', component: ChannelApi },
            { path: 'channel-telegram', name: 'SMCIccChannelTelegram', component: ChannelTelegram },
            { path: 'channel-line', name: 'SMCIccChannelLine', component: ChannelLine },
            { path: 'channel-instagram', name: 'SMCIccChannelInstagram', component: ChannelInstagram },
            { path: 'channel-tiktok', name: 'SMCIccChannelTiktok', component: ChannelTiktok },
            { path: 'channel-weibo', name: 'SMCIccChannelWeibo', component: ChannelWeibo },
            { path: 'channel-miniprogram', name: 'SMCIccChannelMiniprogram', component: ChannelMiniprogram },
            { path: 'channel-wechat', name: 'SMCIccChannelWechat', component: ChannelWechat },
            { path: 'channel-ops', name: 'SMCIccChannelOps', component: ChannelOps },
            { path: 'channel-recording-access', name: 'SMCIccRecordingAccess', component: RecordingAccess },
            { path: 'channel-wechat-mp', redirect: { path: 'channel-wechat', query: { tab: 'wechat_mp' } } },
            { path: 'channel-wecom-kf', redirect: { path: 'channel-wechat', query: { tab: 'wecom_kf' } } },
            { path: 'channel-wecom-contact', redirect: { path: 'channel-wechat', query: { tab: 'wecom_contact' } } },
            { path: 'channel-access', redirect: 'channel-integration-keys' },
            { path: 'm/:moduleId', redirect: { path: '/smcicc/system/voice-driver' } },
          ],
        },
      ],
    },
    { path: '/smcicc/callflow', redirect: { path: '/smcicc/system/vdn', query: { tab: 'ivr' } } },
    { path: '/smcicc/itrflow', redirect: { path: '/smcicc/system/vdn', query: { tab: 'itr' } } },
    { path: '/smcicc/org-bind', redirect: { path: '/smcicc/system/vdn', query: { tab: 'route', route: 'media' } } },
    {
      path: '/market',
      name: 'Market',
      components: {
            market: Market
      }
    },
    {
      path: '/plugins/*',
      name: 'Plugin',
      components: getComponent(Plugin)
    },
    {
      path: '/plugins-manage',
      name: 'PluginManage',
      components: getComponent(PluginsManage)
    },

    {
      path: '/integrations',
      redirect: '/smcicc/system/channel-integration-keys',
    },
    {
      path: '*',
      redirect: '/server',
    },
  ],
  scrollBehavior(to, from, savedPosition) {
    return {
      x: 0,
      y: 0
    }
  }
});