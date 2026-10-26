/**
 * http-proxy-middleware / koa-server-http-proxy 断连时避免未处理错误
 */
const logger = require('../logger');

function proxyOnError(err, req, res) {
    const code = err && err.code;
    logger.warn('[plugin proxy]', code || err.message, req && req.url);
    if (res && typeof res.writeHead === 'function' && !res.headersSent) {
        try {
            if (code === 'ECONNRESET' || code === 'ECONNREFUSED' || code === 'ETIMEDOUT' || code === 'ENOTFOUND') {
                res.writeHead(504);
            } else {
                res.writeHead(502);
            }
            res.end();
        } catch (_) {
            /* ignore */
        }
    }
}

module.exports = { proxyOnError };
