/**
 * ConfServer → OmniAgent 坐席账号同步客户端。
 *
 * 约定：
 * - managed mode: explicit VDN + source ID references; receiving backend reads current credentials/status
 * - legacy mode: uid = WorkNO
 * - email = 配置台 Email；没有则留空
 * - password = ICC 明文密码；Omni 侧哈希。修改未传密码则 Omni 保留原密码
 * - ICC 落库成功后再调；同步失败只打日志，不回滚 ICC
 */
const http = require('http');
const https = require('https');
const { isIP } = require('net');

function isValidEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || ''));
}

function resolveEmail(workNo, email) {
  const e = String(email || '').trim();
  if (e && isValidEmail(e)) return e.toLowerCase();
  return null;
}

function postJson(pathname, payload) {
  const omniagentUrl = process.env.OMNIAGENT_URL || 'http://127.0.0.1:3001';
  const syncToken = process.env.PLATFORM_SYNC_SECRET || process.env.OMNIAGENT_SYNC_TOKEN || '';
  const accountId = parseInt(process.env.OMNIAGENT_ACCOUNT_ID || '1', 10);
  const body = pathname.includes('/managed-users/') || pathname.includes('/vdns/') ? payload : { account_id: accountId, ...payload };
  const postData = JSON.stringify(body);
  const url = new URL(`${omniagentUrl}${pathname}`);
  const lib = url.protocol === 'https:' ? https : http;
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
    const req = lib.request(options, (res) => {
      let raw = '';
      res.on('data', (chunk) => { raw += chunk; });
      res.on('end', () => {
        let parsed = {};
        try {
          parsed = JSON.parse(raw || '{}');
        } catch (_) {
          parsed = { error: raw || `HTTP ${res.statusCode}` };
        }
        if (res.statusCode >= 200 && res.statusCode < 300) resolve(parsed);
        else reject(new Error(parsed.error || `HTTP ${res.statusCode}`));
      });
    });
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Omni user sync timeout'));
    });
    req.write(postData);
    req.end();
  });
}

async function syncSafe(label, payload) {
  try {
    const result = await postJson('/api/platform-config/users/sync', payload);
    console.log(`[OmniUserSync] ${label} ok`, {
      action: payload.action,
      work_no: payload.work_no,
      email: payload.email,
    });
    return { ok: true, ...(result || {}) };
  } catch (e) {
    console.error(`[OmniUserSync] ${label} failed:`, e.message || e);
    return { ok: false, error: e.message || String(e) };
  }
}

const OmniUserSync = {};

/**
 * @param {{ workNo: string, name?: string, email?: string|null, password?: string|null, previousWorkNo?: string|null, role?: string }} u
 */
OmniUserSync.upsert = async (u) => {
  if (process.env.CONF_TENANCY_ENABLED === '1') return syncManaged('upsert', u);
  const workNo = String(u.workNo || '').trim();
  if (!workNo) return { ok: false, error: 'workNo empty' };
  const payload = {
    action: 'upsert',
    work_no: workNo,
    previous_work_no: u.previousWorkNo ? String(u.previousWorkNo).trim() : null,
    name: u.name != null ? String(u.name).trim() : workNo,
    email: resolveEmail(workNo, u.email),
    role: u.role === 'administrator' ? 'administrator' : 'agent',
  };
  if (u.password != null && String(u.password).trim() !== '') {
    payload.password = String(u.password);
  }
  return syncSafe('upsert', payload);
};

/**
 * @param {{ workNo: string, previousWorkNo?: string|null, email?: string|null }} u
 */
OmniUserSync.remove = async (u) => {
  if (process.env.CONF_TENANCY_ENABLED === '1') return syncManaged('delete', u);
  const workNo = String(u.workNo || '').trim();
  if (!workNo) return { ok: false, error: 'workNo empty' };
  return syncSafe('delete', {
    action: 'delete',
    work_no: workNo,
    previous_work_no: u.previousWorkNo ? String(u.previousWorkNo).trim() : null,
    email: u.email ? resolveEmail(workNo, u.email) : undefined,
  });
};

OmniUserSync.syncSystemSuperuser = async ({ password, email: savedEmail }) => {
  const secret = process.env.PLATFORM_SYNC_SECRET || process.env.OMNIAGENT_SYNC_TOKEN;
  const email = savedEmail == null ? process.env.OMNI_SYSTEM_ADMIN_EMAIL : savedEmail;
  const accountId = Number(process.env.OMNIAGENT_ACCOUNT_ID || '1');
  if (!secret || !isValidEmail(email) || !Number.isSafeInteger(accountId) || accountId <= 0) {
    return { ok: false, error: 'System superuser sync configuration missing' };
  }
  const url = new URL(process.env.OMNIAGENT_URL || 'http://127.0.0.1:3001');
  const h = url.hostname;
  const privateHost = h === 'localhost' || h === '127.0.0.1' || h === '[::1]' ||
    (isIP(h) === 4 && (/^10\./.test(h) || /^192\.168\./.test(h) || /^172\.(1[6-9]|2\d|3[01])\./.test(h))) ||
    h === 'omni-backend'; // Known Docker service name, not an arbitrary external DNS name.
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && privateHost)) {
    return { ok: false, error: 'System superuser sync requires HTTPS or private backend networking' };
  }
  try {
    const result = await postJson('/api/platform-config/system-superuser/sync', {
      uid: 'admin', email: String(email).trim().toLowerCase(), password, account_id: accountId,
    });
    if (!result || result.success !== true || !result.data || result.data.system_superuser !== true) {
      return { ok: false, error: 'System superuser sync acknowledgement invalid' };
    }
    return { ok: true, data: result.data };
  } catch {
    return { ok: false, error: 'System superuser sync failed' };
  }
};

async function managedPost(path, payload) {
  if (!process.env.PLATFORM_SYNC_SECRET) return { ok: false, error: 'PLATFORM_SYNC_SECRET required' };
  const url = new URL(process.env.OMNIAGENT_URL || 'http://127.0.0.1:3001');
  const h = url.hostname;
  const local = h === 'localhost' || h === '127.0.0.1' || h === '[::1]' || h === 'omni-backend' ||
    (isIP(h) === 4 && (/^10\./.test(h) || /^192\.168\./.test(h) || /^172\.(1[6-9]|2\d|3[01])\./.test(h)));
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && local)) return { ok: false, error: 'Private backend networking or HTTPS required' };
  try {
    const result = await postJson(path, payload);
    if (result?.success !== true) throw new Error('Invalid sync acknowledgement');
    return { ok: true, data: result.data };
  } catch {
    console.error('[OmniUserSync] managed projection pending', { path, vdnId: payload.vdn_id, sourceId: payload.source_user_id, action: payload.action });
    return { ok: false, sync_pending: true, error: 'Conf tenancy projection pending; reconcile from authoritative source' };
  }
}
OmniUserSync.syncVdn = async (vdnId, action = 'upsert', accountId) => {
  if (process.env.CONF_TENANCY_ENABLED !== '1') return { ok: true, skipped: true };
  return managedPost('/api/platform-config/vdns/sync', {
    action, vdn_id: Number(vdnId), ...(accountId ? { account_id: Number(accountId) } : {}),
  });
};
async function syncManaged(action, u) {
  const vdnId = Number(u.vdnId);
  if (!Number.isSafeInteger(vdnId)) return { ok: false, error: 'Explicit vdnId required' };
  if (vdnId <= 0) return { ok: true, skipped: true, reason: 'Non-business VDN is not a system superuser' };
  try {
    let sourceId = Number(u.sourceUserId || 0);
    if (action === 'upsert') {
      // Inserts often return a status, not the source ID. Resolve only inside the explicit VDN.
      const { QueryTypes } = require('sequelize');
      const Db = require('../../dao/db');
      const found = await Db.db_smcicc.sequelize.query(
        'SELECT ID AS id FROM t_user_users WHERE VDNID = :vdnId AND WorkNO = :workNo',
        { replacements: { vdnId, workNo: String(u.workNo).trim() }, type: QueryTypes.SELECT });
      if (found.length !== 1 || (sourceId && sourceId !== Number(found[0].id))) throw new Error('Source identity mismatch');
      sourceId = Number(found[0].id);
      const map = await OmniUserSync.syncVdn(vdnId);
      if (!map.ok) return map;
    }
    if (!Number.isSafeInteger(sourceId) || sourceId <= 0) throw new Error('Source ID required');
    // Names/status/passwords come from live ICC on the receiving side, not from a stale request.
    const result = await managedPost('/api/platform-config/managed-users/sync', {
      action, vdn_id: vdnId, source_user_id: sourceId, work_no: String(u.workNo).trim(),
    });
    if (!result.ok) console.error('[OmniUserSync] managed projection pending', { vdnId, sourceId, action });
    return result;
  } catch { return { ok: false, sync_pending: true, error: 'Source identity unavailable for managed sync' }; }
}
OmniUserSync.resolveEmail = resolveEmail;

module.exports = OmniUserSync;
