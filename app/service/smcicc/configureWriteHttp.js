const axios = require('axios');

const DEFAULT_PORT = Number(process.env.ICC_XML_WRITE_PORT || 8080);
const DEFAULT_PATH = process.env.ICC_XML_WRITE_PATH || '/ConfigureWrite/write';

/**
 * 向板卡/ConfigureWriter 服务 POST 写出 XML（与 Java 侧 filename + content 表单一致）。
 * - 默认：`http://{host}:${ICC_XML_WRITE_PORT||8080}${ICC_XML_WRITE_PATH||/ConfigureWrite/write}`
 * - Sidecar/统一出口：设置 `ICC_XML_WRITE_RELAY_URL`（无尾斜杠）时，请求发往 `${RELAY}${DEFAULT_PATH}`，忽略 host/port。
 */
async function postConfigureWrite(host, filename, content, options = {}) {
    const relay = (process.env.ICC_XML_WRITE_RELAY_URL || '').replace(/\/$/, '');
    const pathSuffix = process.env.ICC_XML_WRITE_PATH || DEFAULT_PATH;
    const url = relay ? `${relay}${pathSuffix}` : `http://${host}:${DEFAULT_PORT}${pathSuffix}`;
    const body = new URLSearchParams();
    body.append('filename', filename);
    body.append('content', content);
    const timeout = options.timeout != null ? options.timeout : 20000;
    return axios({
        method: 'post',
        url,
        data: body.toString(),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
        timeout,
        responseType: 'json',
        validateStatus: () => true,
    });
}

module.exports = {
    postConfigureWrite,
    DEFAULT_PORT,
    DEFAULT_PATH,
};
