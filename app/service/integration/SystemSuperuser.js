const sha1 = require('sha1');
const OmniUserSync = require('./OmniUserSync');

const UID = 'admin';
function validatePassword(encoded, plain) {
  if (typeof plain !== 'string' || !plain || Buffer.byteLength(plain, 'utf8') > 72 || sha1(plain) !== encoded) {
    throw new Error('系统超级用户改密需要新版页面提交匹配的密码（最多 72 字节）');
  }
}
function assertBusinessUser(uid) {
  if (String(uid).trim().toLowerCase() === UID) throw new Error('初始化超级用户不能通过普通用户管理创建或删除');
}
function normalizeEmail(value) {
  if (typeof value !== 'string') throw new Error('请输入管理员邮箱');
  const email = value.trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('请输入有效的管理员邮箱');
  return email;
}
async function syncPassword(plain, email) {
  let result;
  try { result = await OmniUserSync.syncSystemSuperuser({ password: plain, email }); }
  catch { result = { ok: false }; }
  // A failed projection must be visible. Never persist plaintext for later background retries.
  return { sync_pending: !result.ok, ...(result.ok ? {} : {
    sync_message: 'ConfManager 密码已保存，Omni 同步未完成；请登录 ConfManager 后再次提交改密以重试同步',
  }) };
}
module.exports = { UID, validatePassword, assertBusinessUser, normalizeEmail, syncPassword };
