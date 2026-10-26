const logger = require('../../../logger');
const DirectoryService = require('../../service/smcicc/XmlCurlDirectoryService');
const DialplanService = require('../../service/smcicc/XmlCurlDialplanService');
const ConfigurationService = require('../../service/smcicc/XmlCurlConfigurationService');
const { notFound, pick } = require('../../service/smcicc/xmlCurlCommon');

const TOKEN = process.env.XML_CURL_TOKEN || '';

function authorized(ctx) {
    if (!TOKEN) return process.env.CONF_TENANCY_ENABLED !== '1';
    const q = ctx.query.token || ctx.query.gateway_token;
    const h = ctx.get('x-xml-curl-token') || ctx.get('x-gateway-token');
    const body = Object.assign({}, ctx.query, ctx.request.body || {});
    const b = body.token || body.gateway_token;
    return q === TOKEN || h === TOKEN || b === TOKEN;
}

function requestBody(ctx) {
    return Object.assign({}, ctx.query, ctx.request.body || {});
}

const C = {};

C.dispatch = async (ctx) => {
    ctx.type = 'text/xml; charset=utf-8';
    if (!authorized(ctx)) {
        ctx.status = 403;
        ctx.body = notFound();
        return;
    }
    try {
        const body = requestBody(ctx);
        const section = (pick(body, 'section') || 'directory').toLowerCase();
        if (section === 'dialplan') {
            ctx.body = await DialplanService.dialplanXml(body);
            return;
        }
        if (section === 'configuration') {
            ctx.body = await ConfigurationService.configurationXml(body);
            return;
        }
        if (section === 'directory' || section === 'result') {
            // result bit is ORed by FS when opening other configs; directory handler returns not-found for non-directory
            ctx.body = await DirectoryService.directoryXml(body);
            return;
        }
        ctx.body = notFound();
    } catch (e) {
        logger.error('[xml_curl][dispatch]', e);
        ctx.body = notFound();
    }
};

C.directory = async (ctx) => {
    ctx.type = 'text/xml; charset=utf-8';
    if (!authorized(ctx)) {
        ctx.status = 403;
        ctx.body = notFound();
        return;
    }
    try {
        ctx.body = await DirectoryService.directoryXml(requestBody(ctx));
    } catch (e) {
        logger.error('[xml_curl][directory]', e);
        ctx.body = notFound();
    }
};

C.dialplan = async (ctx) => {
    ctx.type = 'text/xml; charset=utf-8';
    if (!authorized(ctx)) {
        ctx.status = 403;
        ctx.body = notFound();
        return;
    }
    try {
        ctx.body = await DialplanService.dialplanXml(requestBody(ctx));
    } catch (e) {
        logger.error('[xml_curl][dialplan]', e);
        ctx.body = notFound();
    }
};

C.configuration = async (ctx) => {
    ctx.type = 'text/xml; charset=utf-8';
    if (!authorized(ctx)) {
        ctx.status = 403;
        ctx.body = notFound();
        return;
    }
    try {
        ctx.body = await ConfigurationService.configurationXml(requestBody(ctx));
    } catch (e) {
        logger.error('[xml_curl][configuration]', e);
        ctx.body = notFound();
    }
};

module.exports = C;
