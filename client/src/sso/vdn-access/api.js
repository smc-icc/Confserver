// Only these account/application endpoints are reachable from the restricted portal.
export function createPortalApi(fetchImpl = window.fetch.bind(window)) {
  const base = '/pages/server/api';
  const access = '/smcicc/vdn-access';
  async function request(path, body) {
    let response;
    let result;
    try {
      response = await fetchImpl(base + path, {
        method: body === undefined ? 'GET' : 'POST',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { Accept: 'application/json', ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
        ...(body === undefined ? {} : { body: JSON.stringify(body) })
      });
      result = await response.json();
    } catch (_) {
      throw Object.assign(new Error('Request failed'), { status: 0 });
    }
    if (!response.ok || !result || result.ret_code !== 200 || result.data == null) {
      // Never surface server exception text, request bodies, passwords or tickets.
      throw Object.assign(new Error('Request failed'), { status: response.ok ? Number(result && result.ret_code) || 0 : response.status, code: result && ['DELIVERY_NOT_READY','DELIVERY_FAILED','VERIFICATION_INVALID','CONTACT_EXISTS','CAPTCHA_INVALID','RATE_LIMITED'].includes(result.err_code) ? result.err_code : undefined });
    }
    return result.data;
  }
  return {
    readiness: () => request('/vdn-access/readiness'),
    verification: body => request('/vdn-access/verification', body),
    register: body => request('/vdn-access/register', body),
    login: body => request('/vdn-access/login', body),
    profile: ticket => request(access + '/profile' + (ticket ? '?ticket=' + encodeURIComponent(ticket) : '')),
    requests: () => request(access + '/requests'),
    apply: body => request(access + '/apply', body),
    withdraw: id => request(access + '/withdraw', { id })
  };
}
