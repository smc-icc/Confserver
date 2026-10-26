/**
 * 系统级配置菜单：与 smciccconfig webapp/systemadmin/sysMain.html 一致，
 * action 对应 ConfServer SystemadminCompatController 已实现的 Struts 同名接口。
 */

/** 进入 ICC 配置时默认打开的 Vue 子路由（开通向导） */
export const ICC_DEFAULT_SYSTEM_VUE_ROUTE = 'onboard';

export const ICC_SYSTEM_MENU = [
    {
      key: 'g-account',
      titleKey: 'smcicc.menu.group.account',
      items: [
        {
          id: 'onboard-wizard',
          titleKey: 'smcicc.menu.item.onboard-wizard',
          vueRoute: 'onboard',
        },
        {
          id: 'push-accounts',
          titleKey: 'smcicc.menu.item.push-accounts',
          vueRoute: 'push-accounts',
        },
        {
          id: 'registration-notifications',
          titleKey: 'smcicc.menu.item.registration-notifications',
          vueRoute: 'registration-notifications',
        },
        {
          id: 'sbc-domains',
          requiredModule: 'icc',
          titleKey: 'smcicc.menu.item.sbc-domains',
          vueRoute: 'sbc-domains',
        },
        {
          id: 'vdn-access',
          titleKey: 'smcicc.menu.item.vdn-access',
          vueRoute: 'vdn-access',
        },
        {
          id: 'workno-ranges',
          titleKey: 'smcicc.menu.item.workno-ranges',
          vueRoute: 'workno-ranges',
        },
        {
          id: 'basic-user',
          titleKey: 'smcicc.menu.item.sys-user',
          vueRoute: 'sys-user',
          action: 'loadUserList',
          legacyPath: 'sysUser/sysUserManager.html',
          usePost: true,
        },
      ],
    },
    {
      key: 'g-voice',
      requiredModule: 'icc',
      titleKey: 'smcicc.menu.group.voiceCfg',
      items: [
        {
          id: 'voice-driver',
          titleKey: 'smcicc.menu.item.voice-driver',
          vueRoute: 'voice-driver',
        },
        {
          id: 'basic-access',
          titleKey: 'smcicc.menu.item.access-number',
          vueRoute: 'access-code',
          action: 'loadAccessCodeList',
          legacyPath: 'sysAccessCode/sysAccessCodeManager.html',
          usePost: true,
        },
      ],
    },
  {
    key: 'g-omni-channel',
    titleKey: 'smcicc.menu.group.omniChannel',
    items: [
      {
        id: 'ch-website',
        titleKey: 'smcicc.menu.item.ch-website',
        vueRoute: 'channel-website',
      },
      {
        id: 'ch-facebook',
        titleKey: 'smcicc.menu.item.ch-facebook',
        vueRoute: 'channel-facebook',
      },
      {
        id: 'ch-whatsapp',
        titleKey: 'smcicc.menu.item.ch-whatsapp',
        vueRoute: 'channel-whatsapp',
      },
      {
        id: 'ch-sms',
        titleKey: 'smcicc.menu.item.ch-sms',
        vueRoute: 'channel-sms',
      },
      {
        id: 'ch-email',
        titleKey: 'smcicc.menu.item.ch-email',
        vueRoute: 'channel-email',
      },
      {
        id: 'ch-api',
        titleKey: 'smcicc.menu.item.ch-api',
        vueRoute: 'channel-api',
      },
      {
        id: 'ch-telegram',
        titleKey: 'smcicc.menu.item.ch-telegram',
        vueRoute: 'channel-telegram',
      },
      {
        id: 'ch-line',
        titleKey: 'smcicc.menu.item.ch-line',
        vueRoute: 'channel-line',
      },
      {
        id: 'ch-instagram',
        titleKey: 'smcicc.menu.item.ch-instagram',
        vueRoute: 'channel-instagram',
      },
      {
        id: 'ch-tiktok',
        titleKey: 'smcicc.menu.item.ch-tiktok',
        vueRoute: 'channel-tiktok',
      },
      {
        id: 'ch-weibo',
        titleKey: 'smcicc.menu.item.ch-weibo',
        vueRoute: 'channel-weibo',
      },
      {
        id: 'ch-miniprogram',
        titleKey: 'smcicc.menu.item.ch-miniprogram',
        vueRoute: 'channel-miniprogram',
      },
      {
        id: 'ch-wechat',
        titleKey: 'smcicc.menu.item.ch-wechat',
        vueRoute: 'channel-wechat',
      },
      {
        id: 'ch-ops',
        titleKey: 'smcicc.menu.item.ch-ops',
        vueRoute: 'channel-ops',
      },
      {
        id: 'ch-integration-keys',
        titleKey: 'smcicc.menu.item.ch-integration-keys',
        vueRoute: 'channel-integration-keys',
      },
      {
        id: 'ch-recording-access',
        titleKey: 'smcicc.menu.item.ch-recording-access',
        vueRoute: 'channel-recording-access',
      },
    ],
  },
  {
    key: 'g-vdn',
    titleKey: 'smcicc.menu.group.vdn',
    items: [
      {
        id: 'vdn-cfg',
        titleKey: 'smcicc.menu.item.vdn-workspace',
        vueRoute: 'vdn',
        action: 'loadVdnListJoin',
        legacyPath: 'vdnMrg/vdnManager.html',
        usePost: true,
      },
    ],
  },
];

const byId = {};
ICC_SYSTEM_MENU.forEach((g) => {
  g.items.forEach((it) => {
    byId[it.id] = { ...it, groupTitleKey: g.titleKey };
  });
});

export function getSystemModule(moduleId) {
  return byId[moduleId] || null;
}

export function allSystemModuleIds() {
  return Object.keys(byId);
}
