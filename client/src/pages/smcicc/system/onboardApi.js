export default async function onboardApi(method, action, body = {}) {
  const suffix = method === 'get' && body.vdnId ? `?vdnId=${encodeURIComponent(body.vdnId)}` : '';
  const response = await fetch(`/pages/server/api/smcicc/onboard/${action}${suffix}`, {
    method: method.toUpperCase(), credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
    ...(method === 'get' ? {} : { body: JSON.stringify(body) }),
  });
  let result;
  try { result = await response.json(); } catch (_) { throw new Error('登录已失效或服务未响应，请重新登录后重试'); }
  if (!response.ok || (result.ret_code != null && ![0, 200].includes(Number(result.ret_code)))) throw new Error(result.err_msg || '请求未完成，请重试');
  return result.data != null ? result.data : result;
}

