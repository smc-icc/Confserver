/**
 * FreeSWITCH xml_curl dialplan：接入码 → socket TAS
 *
 * 数据源：t_icc_base_accesscode（开通向导 / 接入码管理写入）
 * - 数字码：精确匹配 destination_number
 * - 通配 `*`：使用 XML_CURL_DIALPLAN_CATCHALL 正则（默认 ^\\d{3,20}$）
 * socket 目标：$${tas_esl_host}:8040（TAS 启动时 global_setvar），
 *   可用 XML_CURL_TAS_SOCKET 覆盖为固定 host:port
 */

const AccessDao = require('../../dao/AccessCodeSMCIccDao');
const { xmlEscape, notFound, pick, escapeRegexLiteral } = require('./xmlCurlCommon');

const CACHE_TTL_MS = Math.max(1000, Number(process.env.XML_CURL_DIALPLAN_CACHE_MS || 5000));
const CATCHALL = process.env.XML_CURL_DIALPLAN_CATCHALL || '^\\d{3,20}$';
const TAS_SOCKET =
    (process.env.XML_CURL_TAS_SOCKET && String(process.env.XML_CURL_TAS_SOCKET).trim()) ||
    '$${tas_esl_host}:8040';

let cache = { at: 0, rows: null };

function socketAction() {
    return `          <action application="socket" data="${xmlEscape(TAS_SOCKET)} async full"/>`;
}

function extensionXml(name, expression) {
    return `      <extension name="${xmlEscape(name)}">
        <condition field="destination_number" expression="${xmlEscape(expression)}">
${socketAction()}
        </condition>
      </extension>`;
}

function buildExtensions(rows) {
    const list = [];
    let hasWildcard = false;
    for (const row of rows || []) {
        const code = String(row.code || '').trim();
        if (!code) continue;
        if (code === '*') {
            hasWildcard = true;
            continue;
        }
        if (!/^\d{1,30}$/.test(code)) continue;
        list.push(extensionXml(`icc_access_${code}`, `^${escapeRegexLiteral(code)}$`));
    }
    if (hasWildcard || list.length === 0) {
        // 无数字接入码时也给 catch-all，避免 FS 呼入完全无路由
        list.push(extensionXml('icc_access_catchall', CATCHALL));
    }
    return list;
}

function dialplanDoc(contextName, extensions) {
    const ctx = xmlEscape(contextName || 'public');
    const body = (extensions || []).join('\n');
    return `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<document type="freeswitch/xml">
  <section name="dialplan" description="SMC ICC access codes">
    <context name="${ctx}">
${body}
    </context>
  </section>
</document>
`;
}

async function loadAccessCodes() {
    const now = Date.now();
    if (cache.rows && now - cache.at < CACHE_TTL_MS) {
        return cache.rows;
    }
    const rows = await AccessDao.listForXmlCurlDialplan();
    cache = { at: now, rows: rows || [] };
    return cache.rows;
}

function requestedDestination(body) {
    return pick(
        body,
        'Hunt-Destination-Number',
        'Caller-Destination-Number',
        'destination_number',
        'Caller-Callee-ID-Number',
        'variable_destination_number'
    );
}

function requestedContext(body) {
    return (
        pick(body, 'Hunt-Context', 'Caller-Context', 'context', 'variable_context') || 'public'
    );
}

function filterExtensionsForDest(allExtXml, dest) {
    if (!dest) return allExtXml;
    // 精确数字接入码优先；catchall 始终保留作兜底
    const exact = [];
    const catchall = [];
    for (const xml of allExtXml) {
        if (xml.indexOf(`icc_access_${dest}"`) >= 0 || xml.indexOf(`icc_access_${dest}'`) >= 0) {
            exact.push(xml);
        } else if (xml.indexOf('icc_access_catchall') >= 0) {
            catchall.push(xml);
        }
    }
    if (exact.length) return exact.concat(catchall);
    return allExtXml;
}

const Service = {};

Service.invalidateCache = () => {
    cache = { at: 0, rows: null };
};

Service.dialplanXml = async (body) => {
    const section = pick(body, 'section');
    if (section && section !== 'dialplan') {
        return notFound();
    }
    const context = requestedContext(body);
    const dest = requestedDestination(body);
    // Never let the legacy catch-all unlock quarantined profiles.
    if (context === 'sbc-cloud-deny') {
        return dialplanDoc(context, ['<extension name="denied"><condition><action application="hangup" data="CALL_REJECTED"/></condition></extension>']);
    }
    if (context === 'sbc-video-visitor') {
        const denied = () => dialplanDoc(context, ['<extension name="video_denied"><condition><action application="hangup" data="CALL_REJECTED"/></condition></extension>']);
        if (process.env.VIDEO_CUSTOMER_ENABLED !== '1') return denied();
        const row = await require('../../dao/VideoSessionDao').findLive(
            pick(body, 'variable_sip_auth_username'), pick(body, 'variable_sip_auth_realm'));
        if (!row || row.id !== pick(body, 'variable_icc_video_session_id') || row.access_code !== dest) return denied();
        return dialplanDoc(context, [`<extension name="video_access"><condition field="destination_number" expression="^${xmlEscape(escapeRegexLiteral(row.access_code))}$">
          <action application="sched_hangup" data="+${Math.max(1, Math.min(1800, Math.floor(Number(row.ttl_seconds) || 1)))} ALLOTTED_TIMEOUT"/>
          <action application="export" data="icc_vdn_id=${xmlEscape(String(row.vdn_id))}"/>
          <action application="export" data="icc_video_session_id=${xmlEscape(row.id)}"/>
          <action application="set" data="hangup_after_bridge=true"/>
${socketAction()}
        </condition></extension>`]);
    }
    const rows = await loadAccessCodes();
    const all = buildExtensions(rows);
    if (!all.length) return notFound();

    const extensions = filterExtensionsForDest(all, dest);
    return dialplanDoc(context, extensions);
};

Service.notFound = notFound;

module.exports = Service;
