/**
 * 录音接入 — ConfServer 配置，同步到 OmniAgent platform_configs.recording_access
 */
const fs = require('fs-extra');
const path = require('path');
const http = require('http');

const CONFIG_FILE = path.join(__dirname, '..', '..', '..', 'config', 'recording-access.json');

const DEFAULTS = {
  source: 'sftp',
  sftp_host: '192.168.255.128',
  sftp_port: 22,
  sftp_user: 'root',
  sftp_password: '',
  remote_root: '/usr/local/freeswitch-1.10.12/var/lib/freeswitch/recordings',
};

function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      return { ...DEFAULTS, ...fs.readJSONSync(CONFIG_FILE) };
    }
  } catch (e) {
    console.error('[RecordingAccess] load failed:', e.message);
  }
  return { ...DEFAULTS };
}

function saveConfig(cfg) {
  fs.ensureDirSync(path.dirname(CONFIG_FILE));
  const next = { ...DEFAULTS, ...cfg, updated_at: new Date().toISOString() };
  fs.writeJSONSync(CONFIG_FILE, next, { spaces: 2 });
  return next;
}

function mask(cfg) {
  const copy = { ...cfg };
  if (copy.sftp_password) {
    copy.sftp_password_set = true;
    copy.sftp_password = '';
  } else {
    copy.sftp_password_set = false;
  }
  return copy;
}

function syncToOmniAgent(payload) {
  const omniagentUrl = process.env.OMNIAGENT_URL || 'http://172.22.0.7:3001';
  const syncToken = process.env.PLATFORM_SYNC_SECRET || process.env.OMNIAGENT_SYNC_TOKEN || '';
  const postData = JSON.stringify(payload);
  const url = new URL(`${omniagentUrl}/api/platform-config/recording-access/sync`);
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

class RecordingAccessController {
  static async get(ctx) {
    ctx.body = { data: mask(loadConfig()) };
  }

  static async save(ctx) {
    const body = ctx.request.body || {};
    const current = loadConfig();
    const next = saveConfig({
      source: body.source || 'sftp',
      sftp_host: String(body.sftp_host || current.sftp_host || '').trim(),
      sftp_port: Number(body.sftp_port) || 22,
      sftp_user: String(body.sftp_user || current.sftp_user || '').trim(),
      sftp_password: body.sftp_password ? String(body.sftp_password) : current.sftp_password,
      remote_root: String(body.remote_root || current.remote_root || '').trim(),
    });
    let sync = { ok: false };
    try {
      sync = await syncToOmniAgent({
        source: next.source,
        sftp_host: next.sftp_host,
        sftp_port: next.sftp_port,
        sftp_user: next.sftp_user,
        sftp_password: next.sftp_password,
        remote_root: next.remote_root,
      });
      sync = { ok: true, ...(sync || {}) };
    } catch (e) {
      sync = { ok: false, error: e.message };
    }
    ctx.body = { data: mask(next), sync };
  }
}

module.exports = RecordingAccessController;
