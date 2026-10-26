/**
 * FreeSWITCH mod_xml_curl 公共工具（directory / dialplan / configuration 共用）
 */

function xmlEscape(s) {
    return String(s == null ? '' : s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function notFound() {
    return `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<document type="freeswitch/xml">
  <section name="result">
    <result status="not found"/>
  </section>
</document>
`;
}

function pick(body, ...keys) {
    const src = body || {};
    for (const k of keys) {
        if (src[k] != null && String(src[k]).trim() !== '') {
            return String(src[k]).trim();
        }
    }
    return '';
}

/** 转义后作为 destination_number 精确匹配正则 */
function escapeRegexLiteral(s) {
    return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = {
    xmlEscape,
    notFound,
    pick,
    escapeRegexLiteral,
};
