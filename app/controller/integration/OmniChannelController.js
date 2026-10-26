/**
 * 全渠道配置 — ConfServer 统一管理，同步到 OmniAgent
 * 存储: config/omni-channels.json
 */

const fs = require('fs-extra');
const path = require('path');
const http = require('http');
const https = require('https');
const { managed, channelSelector, guardChannelController } = require('../../service/integration/ConfChannelTenancy');

const CONFIG_FILE = path.join(__dirname, '..', '..', '..', 'config', 'omni-channels.json');

const CHANNEL_KEYS = [
  'web_widget',
  'api',
  'telegram',
  'line',
  'twilio_sms',
  'sms',
  'email',
  'whatsapp',
  'facebook',
  'instagram',
  'tiktok',
  'weibo',
  'miniprogram',
];

const SECRET_FIELDS = {
  telegram: ['bot_token'],
  line: ['line_channel_secret', 'line_channel_token'],
  twilio_sms: ['auth_token'],
  email: ['imap_password', 'smtp_password'],
  whatsapp: ['access_token'],
  facebook: ['page_access_token', 'user_access_token'],
  instagram: ['access_token'],
  tiktok: ['access_token', 'refresh_token'],
  weibo: ['app_secret'],
};

function maskSecret(value) {
  if (!value || value.length <= 8) return '****';
  return value.substring(0, 4) + '****' + value.substring(value.length - 4);
}

/** 公网根地址：优先取本地配置（由「公网根地址」保存），回退环境变量 */
function getPublicBaseUrl() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = fs.readJSONSync(CONFIG_FILE);
      if (data.public_base_url) return String(data.public_base_url).replace(/\/$/, '');
    }
  } catch {
    /* 读配置失败则回退环境变量 */
  }
  return (process.env.OMNIAGENT_PUBLIC_URL || process.env.PUBLIC_BASE_URL || 'http://127.0.0.1:3001').replace(/\/$/, '');
}

function defaultConfig() {
  const channels = {};
  for (const k of CHANNEL_KEYS) channels[k] = [];
  return {
    account_id: parseInt(process.env.OMNIAGENT_ACCOUNT_ID || '1', 10),
    public_base_url: getPublicBaseUrl(),
    channels,
  };
}

function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = fs.readJSONSync(CONFIG_FILE);
      if (!data.channels) data.channels = defaultConfig().channels;
      for (const k of CHANNEL_KEYS) {
        if (!Array.isArray(data.channels[k])) data.channels[k] = [];
      }
      return data;
    }
  } catch (e) {
    console.error('[OmniChannelController] load failed:', e.message);
    if (managed()) throw new Error('Stored channel configuration unreadable; refusing to replace it');
  }
  return defaultConfig();
}

function saveConfig(config) {
  fs.ensureDirSync(path.dirname(CONFIG_FILE));
  config.updated_at = new Date().toISOString();
  fs.writeJSONSync(CONFIG_FILE, config, { spaces: 2 });
}

function newConfId(type) {
  return `${type}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function isValidChannelType(type) {
  return CHANNEL_KEYS.includes(type);
}

function syncToOmniAgent(payload) {
  const omniagentUrl = process.env.OMNIAGENT_URL || 'http://127.0.0.1:3001';
  const syncToken = process.env.PLATFORM_SYNC_SECRET || (managed() ? '' : process.env.OMNIAGENT_SYNC_TOKEN) || '';
  if (managed() && !syncToken) throw new Error('Managed channel synchronization requires PLATFORM_SYNC_SECRET');

  const postData = JSON.stringify(payload);
  const url = new URL(`${omniagentUrl}/api/platform-config/channels/sync`);
  const options = {
    hostname: url.hostname,
    port: url.port || (url.protocol === 'https:' ? 443 : 80),
    path: url.pathname,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData),
      ...(syncToken ? { 'X-Platform-Sync-Token': syncToken } : {}),
    },
    timeout: 15000,
  };

  return new Promise((resolve, reject) => {
    const req = (url.protocol === 'https:' ? https : http).request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body || '{}');
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            reject(new Error(parsed.error || `HTTP ${res.statusCode}`));
          }
        } catch (e) {
          reject(new Error(body || `HTTP ${res.statusCode}`));
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('sync timeout'));
    });
    req.write(postData);
    req.end();
  });
}

/** 调用 Omni 的 platform-config 接口（GET/PUT，path 由调用方指定） */
function callOmniPlatformConfig(path, method, payload) {
  const omniagentUrl = process.env.OMNIAGENT_URL || 'http://127.0.0.1:3001';
  const syncToken = process.env.PLATFORM_SYNC_SECRET || (managed() ? '' : process.env.OMNIAGENT_SYNC_TOKEN) || '';
  if (managed() && !syncToken) throw new Error('Managed channel synchronization requires PLATFORM_SYNC_SECRET');
  const body = payload ? JSON.stringify(payload) : '';
  const url = new URL(`${omniagentUrl}/api/platform-config/${path}`);
  const options = {
    hostname: url.hostname,
    port: url.port || (url.protocol === 'https:' ? 443 : 80),
    path: url.pathname,
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(body ? { 'Content-Length': Buffer.byteLength(body) } : {}),
      ...(syncToken ? { 'X-Platform-Sync-Token': syncToken } : {}),
    },
    timeout: 15000,
  };

  return new Promise((resolve, reject) => {
    const req = (url.protocol === 'https:' ? https : http).request(options, (res) => {
      let raw = '';
      res.on('data', (chunk) => { raw += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(raw || '{}');
          if (res.statusCode >= 200 && res.statusCode < 300) resolve(parsed);
          else reject(new Error(parsed.error || `HTTP ${res.statusCode}`));
        } catch (e) {
          reject(new Error(raw || `HTTP ${res.statusCode}`));
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('omni platform-config timeout'));
    });
    if (body) req.write(body);
    req.end();
  });
}

/** 从 Omni 读当前生效的公网根地址 */
function fetchOmniPublicBaseUrl() {
  return callOmniPlatformConfig('public-base-url', 'GET');
}

/** 下发公网根地址到 Omni（写 DB + 刷新内存缓存，立即生效，无需重建容器） */
function pushOmniPublicBaseUrl(publicBaseUrl) {
  return callOmniPlatformConfig('public-base-url', 'PUT', { public_base_url: publicBaseUrl });
}

/** 从 Omni 读当前生效的短信服务商配置 */
function fetchOmniSmsProvider() {
  return callOmniPlatformConfig('sms-provider', 'GET');
}

/** 下发短信服务商配置到 Omni（写 DB + 刷新内存缓存，立即生效，无需重建容器） */
function pushOmniSmsProvider(smsProvider) {
  return callOmniPlatformConfig('sms-provider', 'PUT', { sms_provider: smsProvider });
}

function buildSyncData(row) {
  const copy = { ...row };
  const meta = [
    'conf_id', 'omni_channel_id', 'omni_inbox_id', 'webhook_url', 'website_token',
    'widget_script_url', 'identifier', 'hmac_token', 'created_at', 'updated_at', 'vdn_id', 'account_id',
  ];
  for (const k of meta) delete copy[k];
  for (const key of Object.keys(copy)) {
    if (key.endsWith('_masked')) delete copy[key];
  }
  if (copy.provider_config && typeof copy.provider_config === 'string') {
    try {
      copy.provider_config = JSON.parse(copy.provider_config);
    } catch {
      copy.provider_config = {};
    }
  }
  if (copy.imap_enabled !== undefined) copy.imap_enabled = Boolean(copy.imap_enabled);
  if (copy.smtp_enabled !== undefined) copy.smtp_enabled = Boolean(copy.smtp_enabled);
  if (copy.hmac_mandatory !== undefined) copy.hmac_mandatory = Boolean(copy.hmac_mandatory);
  return copy;
}

function sanitizeRow(type, row) {
  const out = { ...row };
  const secrets = SECRET_FIELDS[type] || [];
  for (const field of secrets) {
    if (out[field]) {
      out[`${field}_masked`] = maskSecret(String(out[field]));
      delete out[field];
    }
  }
  return out;
}

function preserveSecrets(type, row, prev, fields) {
  const secrets = SECRET_FIELDS[type] || [];
  for (const field of secrets) {
    if (!fields[field] && prev[field]) row[field] = prev[field];
  }
}

class OmniChannelController {
  static async list(ctx) {
    const { channel_type } = ctx.params;
    if (!isValidChannelType(channel_type)) {
      ctx.body = { code: -1, message: 'invalid channel_type' };
      return;
    }
    const config = loadConfig();
    const rows = (config.channels[channel_type] || []).map((row) => sanitizeRow(channel_type, row));
    ctx.body = {
      code: 0,
      data: {
        account_id: managed() ? null : config.account_id,
        tenancy_enabled: managed(),
        public_base_url: getPublicBaseUrl(),
        channel_type,
        channels: rows,
      },
    };
  }

  static async create(ctx) {
    const { channel_type } = ctx.params;
    const fields = ctx.request.body || {};
    if (!isValidChannelType(channel_type)) {
      ctx.body = { code: -1, message: 'invalid channel_type' };
      return;
    }

    const config = loadConfig();
    const row = {
      conf_id: newConfId(channel_type),
      omni_channel_id: null,
      omni_inbox_id: null,
      ...fields,
      // 微博开放平台的事件回调一定带 X-Omni-Signature，默认强制校验；
      // 否则任何知道 identifier 的人都能伪造入站消息。调用方显式传值时不覆盖。
      ...(channel_type === 'weibo' && fields.hmac_mandatory === undefined
        ? { hmac_mandatory: true }
        : {}),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    try {
      const syncRes = await syncToOmniAgent({
        action: 'upsert',
        channel_type,
        ...channelSelector(config, row),
        data: buildSyncData(row),
      });
      const data = syncRes.data || {};
      row.omni_channel_id = data.omni_channel_id ?? null;
      row.omni_inbox_id = data.omni_inbox_id ?? null;
      row.webhook_url = data.webhook_url || row.webhook_url || '';
      if (data.website_token) row.website_token = data.website_token;
      if (data.widget_script_url) row.widget_script_url = data.widget_script_url;
      if (data.identifier) row.identifier = data.identifier;
      if (data.hmac_token) row.hmac_token = data.hmac_token;
      if (data.extra) Object.assign(row, data.extra);
    } catch (e) {
      ctx.body = { code: -1, message: `同步 OmniAgent 失败: ${managed() ? '同步服务拒绝操作，请检查 VDN 归属及服务端日志' : e.message}` };
      return;
    }

    config.channels[channel_type].push(row);
    saveConfig(config);
    ctx.body = { code: 0, data: sanitizeRow(channel_type, row) };
  }

  static async update(ctx) {
    const { channel_type, conf_id } = ctx.params;
    const fields = ctx.request.body || {};
    if (!isValidChannelType(channel_type)) {
      ctx.body = { code: -1, message: 'invalid channel_type' };
      return;
    }

    const config = loadConfig();
    const list = config.channels[channel_type] || [];
    const idx = list.findIndex((r) => r.conf_id === conf_id);
    if (idx < 0) {
      ctx.body = { code: -1, message: 'channel not found' };
      return;
    }

    const prev = list[idx];
    const row = { ...prev, ...fields, updated_at: new Date().toISOString() };
    preserveSecrets(channel_type, row, prev, fields);

    try {
      const syncRes = await syncToOmniAgent({
        action: 'upsert',
        channel_type,
        ...channelSelector(config, row),
        omni_channel_id: row.omni_channel_id,
        data: buildSyncData(row),
      });
      const data = syncRes.data || {};
      row.omni_channel_id = data.omni_channel_id ?? row.omni_channel_id;
      row.omni_inbox_id = data.omni_inbox_id ?? row.omni_inbox_id;
      if (data.webhook_url) row.webhook_url = data.webhook_url;
      if (data.website_token) row.website_token = data.website_token;
      if (data.widget_script_url) row.widget_script_url = data.widget_script_url;
      if (data.identifier) row.identifier = data.identifier;
      if (data.hmac_token) row.hmac_token = data.hmac_token;
    } catch (e) {
      ctx.body = { code: -1, message: `同步 OmniAgent 失败: ${managed() ? '同步服务拒绝操作，请检查 VDN 归属及服务端日志' : e.message}` };
      return;
    }

    list[idx] = row;
    config.channels[channel_type] = list;
    saveConfig(config);
    ctx.body = { code: 0, data: sanitizeRow(channel_type, row) };
  }

  /** 读取公网根地址（以 Omni 运行时值为准，Omni 不可达时退回本地配置） */
  static async getPublicBaseUrlConfig(ctx) {
    let omni = null;
    try {
      omni = await fetchOmniPublicBaseUrl();
    } catch (e) {
      console.error('[OmniChannelController] 读取 Omni 公网根地址失败:', e.message);
    }
    ctx.body = {
      code: 0,
      data: {
        public_base_url: omni?.public_base_url || getPublicBaseUrl(),
        source: omni?.source || 'conf',
      },
    };
  }

  /** 保存公网根地址：先下发 Omni（写库并即时生效），成功后再落本地配置 */
  static async updatePublicBaseUrlConfig(ctx) {
    const { public_base_url: raw } = ctx.request.body || {};
    const url = String(raw || '').trim().replace(/\/$/, '');
    if (!url) {
      ctx.body = { code: -1, message: 'public_base_url 不能为空' };
      return;
    }
    try {
      const res = await pushOmniPublicBaseUrl(url);
      const config = loadConfig();
      config.public_base_url = res.public_base_url || url;
      saveConfig(config);
      ctx.body = { code: 0, data: { public_base_url: config.public_base_url } };
    } catch (e) {
      ctx.body = { code: -1, message: `下发 OmniAgent 失败: ${managed() ? '同步服务拒绝操作，请检查 VDN 归属及服务端日志' : e.message}` };
    }
  }

  /** 读取短信服务商配置（以 Omni 侧当前生效值为准，回退到本地配置） */
  static async getSmsProviderConfig(ctx) {
    let omni = null;
    try {
      omni = await fetchOmniSmsProvider();
    } catch (e) {
      console.error('[OmniChannelController] 读取 Omni 短信服务商配置失败:', e.message);
    }
    const local = loadConfig().sms_provider || null;
    ctx.body = {
      code: 0,
      data: {
        sms_provider: omni?.sms_provider ?? local,
        source: omni ? 'omni' : 'conf',
      },
    };
  }

  /**
   * 保存短信服务商配置：先下发 Omni（写库并即时生效），成功后再落本地配置。
   * 传 null 表示清空下发值，回退到渠道级配置。
   */
  static async updateSmsProviderConfig(ctx) {
    const body = ctx.request.body || {};
    const raw = Object.prototype.hasOwnProperty.call(body, 'sms_provider')
      ? body.sms_provider
      : body;
    if (raw !== null && (typeof raw !== 'object' || Array.isArray(raw))) {
      ctx.body = { code: -1, message: 'sms_provider 应为 JSON 对象或 null' };
      return;
    }
    try {
      const res = await pushOmniSmsProvider(raw);
      const config = loadConfig();
      if (raw === null) delete config.sms_provider;
      else config.sms_provider = res.sms_provider ?? raw;
      saveConfig(config);
      ctx.body = { code: 0, data: { sms_provider: res.sms_provider ?? null } };
    } catch (e) {
      ctx.body = { code: -1, message: `下发 OmniAgent 失败: ${managed() ? '同步服务拒绝操作，请检查 VDN 归属及服务端日志' : e.message}` };
    }
  }

  static async remove(ctx) {
    const { channel_type, conf_id } = ctx.params;
    if (!isValidChannelType(channel_type)) {
      ctx.body = { code: -1, message: 'invalid channel_type' };
      return;
    }

    const config = loadConfig();
    const list = config.channels[channel_type] || [];
    const idx = list.findIndex((r) => r.conf_id === conf_id);
    if (idx < 0) {
      ctx.body = { code: -1, message: 'channel not found' };
      return;
    }

    const row = list[idx];
    if (row.omni_channel_id) {
      try {
        await syncToOmniAgent({
          action: 'delete',
          channel_type,
          ...channelSelector(config, row),
          omni_channel_id: row.omni_channel_id,
        });
      } catch (e) {
        ctx.body = { code: -1, message: `删除 OmniAgent 渠道失败: ${managed() ? '同步服务拒绝操作，请检查 VDN 归属及服务端日志' : e.message}` };
        return;
      }
    }

    list.splice(idx, 1);
    config.channels[channel_type] = list;
    saveConfig(config);
    ctx.body = { code: 0, message: 'ok' };
  }
}

module.exports = guardChannelController(OmniChannelController, loadConfig);
