// Preserve structured HTTP errors so upgrade failures remain actionable.
export async function communityRequest(
  path,
  { method = 'GET', data, fetcher = fetch } = {},
) {
  let response;
  try {
    response = await fetcher('/pages/server/api/smcicc/community/' + path, {
      method,
      credentials: 'same-origin',
      redirect: 'error',
      headers: {
        Accept: 'application/json',
        ...(data === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      ...(data === undefined ? {} : { body: JSON.stringify(data) }),
    });
  } catch {
    throw new Error('网络请求失败，请确认服务可用后刷新；登录失效时请重新登录');
  }
  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error('服务返回异常，请刷新或重新登录后重试');
  }
  if (!response.ok || result?.ret_code !== 200 || result.data == null)
    throw new Error(result?.err_msg || '操作未完成，请刷新或重新登录后重试');
  return result.data;
}
