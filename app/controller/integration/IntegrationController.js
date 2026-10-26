/**
 * Integration Key Controller — 管理第三方 API 密钥
 * 数据存储: ConfServer/config/integrations.json
 * 同时通过 REST API 同步到 OmniAgent 后端
 */

const fs = require('fs-extra');
const path = require('path');
const http = require('http');

const CONFIG_FILE = path.join(__dirname, '..', '..', '..', 'config', 'integrations.json');

const INTEGRATION_DEFS = [
  { key: 'openai_api_key',           name: 'OpenAI',            vendor: 'OpenAI',   description: 'OpenAI API Key' },
  { key: 'slack_bot_token',          name: 'Slack Bot Token',   vendor: 'Slack',    description: 'Slack Bot User OAuth Token' },
  { key: 'slack_signing_secret',     name: 'Slack 签名密钥',     vendor: 'Slack',    description: 'Slack Signing Secret' },
  { key: 'linear_api_key',           name: 'Linear',            vendor: 'Linear',   description: 'Linear API Key' },
  { key: 'shopify_api_key',          name: 'Shopify API Key',   vendor: 'Shopify',  description: 'Shopify API Key' },
  { key: 'shopify_api_secret',       name: 'Shopify Secret',    vendor: 'Shopify',  description: 'Shopify API Secret' },
  { key: 'twitter_consumer_key',     name: 'Twitter API Key',   vendor: 'Twitter',  description: 'Twitter Consumer Key' },
  { key: 'twitter_consumer_secret',  name: 'Twitter Secret',    vendor: 'Twitter',  description: 'Twitter Consumer Secret' },
  { key: 'whatsapp_verify_token',    name: 'WhatsApp Verify',   vendor: 'Meta',     description: 'WhatsApp Webhook Verify Token' },
  { key: 'whatsapp_access_token',    name: 'WhatsApp Token',    vendor: 'Meta',     description: 'WhatsApp Cloud API Access Token' },
  { key: 'instagram_verify_token',   name: 'Instagram Verify',  vendor: 'Meta',     description: 'Instagram Webhook Verify Token' },
  { key: 'stripe_secret_key',        name: 'Stripe Secret',     vendor: 'Stripe',   description: 'Stripe Secret Key' },
  { key: 'stripe_webhook_secret',    name: 'Stripe Webhook',    vendor: 'Stripe',   description: 'Stripe Webhook Secret' },
];

function maskValue(value) {
  if (!value || value.length <= 8) return '****';
  return value.substring(0, 4) + '****' + value.substring(value.length - 4);
}

function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      return fs.readJSONSync(CONFIG_FILE);
    }
  } catch (e) {
    console.error('[IntegrationController] Failed to load config:', e.message);
  }
  return {};
}

function saveConfig(config) {
  fs.ensureDirSync(path.dirname(CONFIG_FILE));
  fs.writeJSONSync(CONFIG_FILE, config, { spaces: 2 });
}

/**
 * Sync integration key to OmniAgent backend via REST API.
 */
function syncToOmniAgent(key, value) {
  const omniagentUrl = process.env.OMNIAGENT_URL || 'http://127.0.0.1:3001';
  const authToken = process.env.OMNIAGENT_AUTH_TOKEN || '';

  const postData = JSON.stringify({ value });

  const url = new URL(`${omniagentUrl}/api/platform-config/integrations/${key}`);
  const options = {
    hostname: url.hostname,
    port: url.port,
    path: url.pathname,
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData),
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    },
    timeout: 3000,
  };

  const req = http.request(options, (res) => {
    let body = '';
    res.on('data', (chunk) => body += chunk);
    res.on('end', () => {
      if (res.statusCode === 200) {
        console.log(`[IntegrationController] Synced ${key} to OmniAgent`);
      } else {
        console.warn(`[IntegrationController] Sync ${key} failed: HTTP ${res.statusCode} ${body}`);
      }
    });
  });

  req.on('error', (e) => {
    console.warn(`[IntegrationController] Cannot sync to OmniAgent (${e.message}) — key saved locally`);
  });
  req.on('timeout', () => {
    req.destroy();
    console.warn('[IntegrationController] Sync timeout — key saved locally');
  });

  req.write(postData);
  req.end();
}

class IntegrationController {
  /**
   * GET /api/integrations/list — 列出所有集成及其配置状态
   */
  static async list(ctx) {
    const config = loadConfig();
    const items = INTEGRATION_DEFS.map(def => ({
      id: def.key,
      name: def.name,
      vendor: def.vendor,
      description: def.description,
      endpoint_masked: config[def.key] ? maskValue(config[def.key]) : '(未配置)',
      configured: !!config[def.key],
      updated_at: config[`${def.key}_updated`] || '',
    }));
    ctx.body = { code: 0, data: { items } };
  }

  /**
   * PUT /api/integrations/update — 保存单个集成密钥
   * Body: { key: string, value: string }
   */
  static async update(ctx) {
    const { key, value } = ctx.request.body;
    if (!key || value === undefined) {
      ctx.body = { code: -1, message: 'key and value are required' };
      return;
    }
    const def = INTEGRATION_DEFS.find(d => d.key === key);
    if (!def) {
      ctx.body = { code: -1, message: `Unknown integration key: ${key}` };
      return;
    }

    const config = loadConfig();
    config[key] = value;
    config[`${key}_updated`] = new Date().toISOString();
    saveConfig(config);

    // Sync to OmniAgent backend via REST API
    syncToOmniAgent(key, value);

    ctx.body = { code: 0, message: 'ok', data: { key } };
  }

  /**
   * DELETE /api/integrations/delete — 删除单个集成密钥
   * Body: { key: string }
   */
  static async delete(ctx) {
    const { key } = ctx.request.body;
    if (!key) {
      ctx.body = { code: -1, message: 'key is required' };
      return;
    }
    const config = loadConfig();
    delete config[key];
    delete config[`${key}_updated`];
    saveConfig(config);
    ctx.body = { code: 0, message: 'ok' };
  }

  /**
   * GET /api/integrations/export — 导出所有已配置的密钥（非脱敏，仅供内部使用）
   */
  static async exportKeys(ctx) {
    const config = loadConfig();
    const result = {};
    for (const def of INTEGRATION_DEFS) {
      if (config[def.key]) {
        result[def.key] = config[def.key];
      }
    }
    ctx.body = { code: 0, data: result };
  }
}

module.exports = IntegrationController;
