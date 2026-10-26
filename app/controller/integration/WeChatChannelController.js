/**
 * 微信渠道配置 — ConfServer 统一管理，同步到 OmniAgent 业务库
 * 存储: config/wechat-channels.json
 */

const fs = require('fs-extra');
const path = require('path');
const http = require('http');
const https = require('https');
const { managed, channelSelector, guardChannelController } = require('../../service/integration/ConfChannelTenancy');

const CONFIG_FILE = path.join(__dirname, '..', '..', '..', 'config', 'wechat-channels.json');

const CHANNEL_KEYS = ['wechat_mp', 'wecom_kf', 'wecom_contact'];

function maskSecret(value) {
  if (!value || value.length <= 8) return '****';
  return value.substring(0, 4) + '****' + value.substring(value.length - 4);
}

function getPublicBaseUrl() {
  // 优先取「公网根地址」保存的本地配置，再回退环境变量。
  // 之前这里只读 env，导致新建/更新的微信渠道 webhook 被写成内网地址
  // （如 http://127.0.0.1:3001/...），微信后台根本访问不到。
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = fs.readJSONSync(CONFIG_FILE);
      if (data && data.public_base_url) {
        return String(data.public_base_url).replace(/\/$/, '');
      }
    }
  } catch {
    /* 配置损坏时回退环境变量 */
  }
  return (process.env.OMNIAGENT_PUBLIC_URL || process.env.PUBLIC_BASE_URL || 'http://127.0.0.1:3001').replace(/\/$/, '');
}

function defaultConfig() {
  return {
    account_id: parseInt(process.env.OMNIAGENT_ACCOUNT_ID || '1', 10),
    public_base_url: getPublicBaseUrl(),
    channels: {
      wechat_mp: [],
      wecom_kf: [],
      wecom_contact: [],
    },
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
    console.error('[WeChatChannelController] load failed:', e.message);
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

function webhookUrl(type, row) {
  const base = getPublicBaseUrl();
  if (type === 'wechat_mp') {
    return `${base}/webhooks/wechat/mp/${encodeURIComponent(row.app_id)}`;
  }
  if (type === 'wecom_kf' && row.omni_channel_id) {
    return `${base}/webhooks/wecom/kf/${row.omni_channel_id}`;
  }
  if (type === 'wecom_contact' && row.omni_channel_id) {
    return `${base}/webhooks/wecom/contact/${row.omni_channel_id}`;
  }
  return '';
}

function sanitizeRow(type, row) {
  const out = { ...row };
  if (type === 'wechat_mp') {
    out.app_secret_masked = maskSecret(row.app_secret);
    delete out.app_secret;
  }
  if (type === 'wecom_kf') {
    out.secret_masked = maskSecret(row.secret);
    delete out.secret;
  }
  if (type === 'wecom_contact') {
    out.contact_secret_masked = maskSecret(row.contact_secret);
    delete out.contact_secret;
  }
  out.webhook_url = webhookUrl(type, row);
  return out;
}

function syncToOmniAgent(payload) {
  const omniagentUrl = process.env.OMNIAGENT_URL || 'http://127.0.0.1:3001';
  const syncToken = process.env.PLATFORM_SYNC_SECRET || (managed() ? '' : process.env.OMNIAGENT_SYNC_TOKEN) || '';
  if (managed() && !syncToken) throw new Error('Managed channel synchronization requires PLATFORM_SYNC_SECRET');

  const postData = JSON.stringify(payload);
  const url = new URL(`${omniagentUrl}/api/platform-config/wechat-channels/sync`);
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
    timeout: 8000,
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

function buildSyncData(type, row) {
  if (type === 'wechat_mp') {
    return {
      name: row.name,
      app_id: row.app_id,
      app_secret: row.app_secret,
      token: row.token,
      encoding_aes_key: row.encoding_aes_key || undefined,
      account_type: row.account_type || 'service',
      // 渠道能力：未认证订阅号（含个人号）没有客服消息权限，填 false 后
      // Omni 改走被动回复 + 积压队列，ITR 发精简菜单。认证后改回 true 即可。
      // 旧配置没有这些字段，按「有客服消息权限」处理，保持既有行为。
      supports_active_reply: row.supports_active_reply !== false,
      passive_reply_enabled: row.passive_reply_enabled === true,
      route_ttl_seconds: Number(row.route_ttl_seconds) || 300,
      pending_reply_max: Number(row.pending_reply_max) || 20,
      // 坐席回复超时：客户发言窗口内坐席没回出内容即视为超时，把会话收回给 ITR
      // 走这里的超时流程。0 = 不启用。两种渠道形态（可/不可主动推送）都适用，
      // 区别只在各自挂哪个流程。
      reply_timeout_seconds: Number(row.reply_timeout_seconds) || 0,
      reply_timeout_flow_id: Number(row.reply_timeout_flow_id) || 0,
      // 二级超时：再等这么久坐席仍未回，把提示升级为「引导留言 / 按 9 转留言」。
      // 0=不启用；只对能主动推送的形态有效（被动回复没有主动联系的通道）。
      reply_timeout_level2_seconds: Number(row.reply_timeout_level2_seconds) || 0,
      // 被动回复积压的存活时长：超过它的积压视为陈旧、取回时丢弃，
      // 避免客户下次发言收到几小时前的旧消息。默认 300。
      pending_ttl_seconds: Number(row.pending_ttl_seconds) || 300,
      // 会话闲置回收（秒）：客户最后发言后超过它无新消息，就回收会话（清归属与流程状态），
      // 下次发言重新走菜单/路由。默认 300（5 分钟）；0 = 不回收。
      idle_recycle_seconds: Number(row.idle_recycle_seconds) || 300,
      // 路由配置：整表下发给 Omni（它按 (channel_id, trigger, priority) 写进 channel_route）。
      // 触发点与语义见 docs/业务引擎设计.md 第四章。删掉一条就该真的删掉，所以是替换不是合并。
      routes: Array.isArray(row.routes) ? row.routes : undefined,
      inbox_name: row.inbox_name || row.name,
    };
  }
  if (type === 'wecom_kf') {
    return {
      name: row.name,
      corp_id: row.corp_id,
      secret: row.secret,
      token: row.token,
      encoding_aes_key: row.encoding_aes_key || undefined,
      open_kfid: row.open_kfid || undefined,
      // 路由：让微信客服也能配自己的进线流程与超时流程，不跟随公众号。
      routes: Array.isArray(row.routes) ? row.routes : undefined,
      inbox_name: row.inbox_name || row.name,
    };
  }
  return {
    name: row.name,
    corp_id: row.corp_id,
    contact_secret: row.contact_secret,
    token: row.token,
    encoding_aes_key: row.encoding_aes_key || undefined,
    agent_id: row.agent_id || undefined,
    inbox_name: row.inbox_name || row.name,
  };
}

class WeChatChannelController {
  static async list(ctx) {
    const config = loadConfig();
    const data = {};
    for (const type of CHANNEL_KEYS) {
      data[type] = (config.channels[type] || []).map((row) => sanitizeRow(type, row));
    }
    ctx.body = {
      code: 0,
      data: {
        account_id: managed() ? null : config.account_id,
        tenancy_enabled: managed(),
        public_base_url: getPublicBaseUrl(),
        channels: data,
      },
    };
  }

  static async create(ctx) {
    const { channel_type, ...fields } = ctx.request.body || {};
    if (!CHANNEL_KEYS.includes(channel_type)) {
      ctx.body = { code: -1, message: 'invalid channel_type' };
      return;
    }

    const config = loadConfig();
    const row = {
      conf_id: newConfId(channel_type),
      omni_channel_id: null,
      omni_inbox_id: null,
      ...fields,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    try {
      const syncRes = await syncToOmniAgent({
        action: 'upsert',
        channel_type,
        ...channelSelector(config, row),
        data: buildSyncData(channel_type, row),
      });
      row.omni_channel_id = syncRes.data?.omni_channel_id ?? null;
      row.omni_inbox_id = syncRes.data?.omni_inbox_id ?? null;
      row.webhook_url = syncRes.data?.webhook_url || webhookUrl(channel_type, row);
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
    if (!CHANNEL_KEYS.includes(channel_type)) {
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

    const row = { ...list[idx], ...fields, updated_at: new Date().toISOString() };
    if (channel_type === 'wechat_mp' && !fields.app_secret) row.app_secret = list[idx].app_secret;
    if (channel_type === 'wecom_kf' && !fields.secret) row.secret = list[idx].secret;
    if (channel_type === 'wecom_contact' && !fields.contact_secret) row.contact_secret = list[idx].contact_secret;

    try {
      const syncRes = await syncToOmniAgent({
        action: 'upsert',
        channel_type,
        ...channelSelector(config, row),
        omni_channel_id: row.omni_channel_id,
        data: buildSyncData(channel_type, row),
      });
      row.omni_channel_id = syncRes.data?.omni_channel_id ?? row.omni_channel_id;
      row.omni_inbox_id = syncRes.data?.omni_inbox_id ?? row.omni_inbox_id;
      row.webhook_url = syncRes.data?.webhook_url || webhookUrl(channel_type, row);
    } catch (e) {
      ctx.body = { code: -1, message: `同步 OmniAgent 失败: ${managed() ? '同步服务拒绝操作，请检查 VDN 归属及服务端日志' : e.message}` };
      return;
    }

    list[idx] = row;
    config.channels[channel_type] = list;
    saveConfig(config);
    ctx.body = { code: 0, data: sanitizeRow(channel_type, row) };
  }

  static async remove(ctx) {
    const { channel_type, conf_id } = ctx.params;
    if (!CHANNEL_KEYS.includes(channel_type)) {
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

module.exports = guardChannelController(WeChatChannelController, loadConfig);
