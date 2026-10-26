/**
 * 全媒体运营配置 — Conf 落盘后同步 Omni platform_configs.omni_ops
 */
const fs = require('fs-extra');
const path = require('path');
const http = require('http');

const CONFIG_FILE = path.join(__dirname, '..', '..', '..', 'config', 'omni-ops.json');

const DEFAULTS = {
  welcome_text: '您好，请问有什么可以帮您？',
  queue_tip: '正在为您转接人工客服，请稍候…',
  connect_tip: '{{agentName}}坐席为您服务',
  sensitive_words: [],
  sensitive_mode: 'mask',
  label_defaults: [
    { title: '重要', color: '#f56c6c' },
    { title: '跟进', color: '#e6a23c' },
    { title: '已解决', color: '#67c23a' },
  ],
  asr_url: '',
  asr_timeout_ms: 20000,
};

function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      return { ...DEFAULTS, ...fs.readJSONSync(CONFIG_FILE) };
    }
  } catch (e) {
    console.error('[OmniOps] load failed:', e.message);
  }
  return { ...DEFAULTS };
}

function saveConfig(cfg) {
  fs.ensureDirSync(path.dirname(CONFIG_FILE));
  const next = { ...DEFAULTS, ...cfg, updated_at: new Date().toISOString() };
  if (!Array.isArray(next.sensitive_words)) next.sensitive_words = [];
  if (!Array.isArray(next.label_defaults)) next.label_defaults = DEFAULTS.label_defaults;
  fs.writeJSONSync(CONFIG_FILE, next, { spaces: 2 });
  return next;
}

function syncToOmniAgent(payload) {
  const omniagentUrl = process.env.OMNIAGENT_URL || 'http://127.0.0.1:3001';
  const syncToken = process.env.PLATFORM_SYNC_SECRET || process.env.OMNIAGENT_SYNC_TOKEN || '';
  const postData = JSON.stringify(payload);
  const url = new URL(`${omniagentUrl}/api/platform-config/ops/sync`);
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
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body || '{}');
          if (res.statusCode >= 200 && res.statusCode < 300) resolve(parsed);
          else reject(new Error(parsed.error || `HTTP ${res.statusCode}`));
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

function probeAsr(_asrUrl) {
  const omniagentUrl = process.env.OMNIAGENT_URL || 'http://127.0.0.1:3001';
  const url = new URL(`${omniagentUrl}/api/platform-config/asr/health`);
  return new Promise((resolve) => {
    const req = http.request({
      hostname: url.hostname,
      port: url.port || 80,
      path: url.pathname,
      method: 'GET',
      timeout: 5000,
    }, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(body || '{}')); }
        catch { resolve({ ok: false, error: body || `HTTP ${res.statusCode}` }); }
      });
    });
    req.on('error', (e) => resolve({ ok: false, error: e.message }));
    req.on('timeout', () => { req.destroy(); resolve({ ok: false, error: 'timeout' }); });
    req.end();
  });
}

class OmniOpsController {
  static async get(ctx) {
    ctx.body = { data: loadConfig() };
  }

  static async save(ctx) {
    const body = ctx.request.body || {};
    const current = loadConfig();
    const words = Array.isArray(body.sensitive_words)
      ? body.sensitive_words
      : String(body.sensitive_words_text || '')
        .split(/[\n,，]/)
        .map((s) => String(s).trim())
        .filter(Boolean);
    const next = saveConfig({
      welcome_text: String(body.welcome_text ?? current.welcome_text),
      queue_tip: String(body.queue_tip ?? current.queue_tip),
      connect_tip: String(body.connect_tip ?? current.connect_tip),
      sensitive_words: words,
      sensitive_mode: body.sensitive_mode === 'block' ? 'block' : 'mask',
      label_defaults: Array.isArray(body.label_defaults) ? body.label_defaults : current.label_defaults,
      asr_url: String(body.asr_url ?? current.asr_url ?? '').trim(),
      asr_timeout_ms: Number(body.asr_timeout_ms) || current.asr_timeout_ms || 20000,
    });
    let sync = { ok: false };
    try {
      const res = await syncToOmniAgent(next);
      sync = { ok: true, ...(res || {}) };
    } catch (e) {
      sync = { ok: false, error: e.message };
    }
    ctx.body = { data: next, sync };
  }

  static async asrHealth(ctx) {
    const cfg = loadConfig();
    ctx.body = await probeAsr(cfg.asr_url);
  }
}

module.exports = OmniOpsController;
