/** Managed SaaS must never inherit legacy anonymous-admin or trusted-IP bypasses. */
function configureManagedLogin(loginConf, env = process.env) {
  if (env.CONF_TENANCY_ENABLED !== '1') return loginConf;
  if (env.TARS_ENABLE_LOGIN !== 'true' || loginConf.enableLogin !== true) {
    throw new Error('CONF_TENANCY_ENABLED=1 requires explicit TARS_ENABLE_LOGIN=true and real ticket authentication');
  }
  loginConf.ignoreIps = [];
  const publicPaths = new Set([
    '/static', '/favicon.ico', '/favicon.svg', '/adminPass.html', '/login.html',
    '/pages/server/api/adminModifyPass', '/pages/server/api/get_locale', '/pages/server/api/login',
    '/pages/server/api/isEnableLdap', '/pages/server/api/authList', '/pages/server/api/ticket',
    '/pages/server/api/smcicc/authentication/getCaptcha', '/pages/server/api/smcicc/authentication/login',
    '/api/smcicc/authentication/getCaptcha', '/api/smcicc/authentication/login',
    '/xml_curl', '/xml_curl/directory', '/xml_curl/dialplan', '/xml_curl/configuration',
    '/internal/sbc/route',
  ]);
  loginConf.ignore = (loginConf.ignore || []).filter(p => publicPaths.has(p));
  // The login form needs a captcha before it can obtain an authenticated ticket.
  loginConf.ignore.push(/^\/web\/captcha$/);
  loginConf.ignore.push(/^\/vdn-access\.html$/, /^\/pages\/server\/api\/vdn-access\/(?:register|login|verification|readiness)$/);
  return loginConf;
}
module.exports = { configureManagedLogin };
