/**
 * FreeSWITCH xml_curl configuration：动态下发可热更新的 ACL 等
 *
 * 当前支持：
 * - acl.conf：XML_CURL_ACL_CIDRS（逗号分隔），默认含 docker 网段与本机
 * 其它 configuration（sofia.conf 等）回 not found，继续用 FS 本地文件
 */

const { xmlEscape, notFound, pick } = require('./xmlCurlCommon');

const DEFAULT_CIDRS = '127.0.0.1/32,172.22.0.0/16,192.168.0.0/16,10.0.0.0/8';

function parseCidrs() {
    const raw = process.env.XML_CURL_ACL_CIDRS || DEFAULT_CIDRS;
    return String(raw)
        .split(/[,;\s]+/)
        .map((s) => s.trim())
        .filter(Boolean);
}

function aclNodes(cidrs) {
    return cidrs
        .map((cidr) => `          <node type="allow" cidr="${xmlEscape(cidr)}"/>`)
        .join('\n');
}

function aclConfXml(cidrs) {
    const nodes = aclNodes(cidrs);
    return `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<document type="freeswitch/xml">
  <section name="configuration">
    <configuration name="acl.conf" description="Network Lists">
      <network-lists>
        <list name="lan" default="deny">
${nodes}
        </list>
        <list name="domains" default="deny">
${nodes}
        </list>
        <list name="loopback.auto" default="allow">
          <node type="allow" cidr="127.0.0.1/32"/>
        </list>
      </network-lists>
    </configuration>
  </section>
</document>
`;
}

function configName(body) {
    const keyName = pick(body, 'key_name');
    const keyValue = pick(body, 'key_value');
    const tagName = pick(body, 'tag_name');
    if (keyName === 'name' && keyValue) return keyValue;
    if (tagName === 'configuration' && keyValue) return keyValue;
    return pick(body, 'name', 'configuration');
}

const Service = {};

Service.configurationXml = async (body) => {
    const section = pick(body, 'section');
    if (section && section !== 'configuration') {
        return notFound();
    }
    const name = configName(body);
    if (name === 'acl.conf') {
        return aclConfXml(parseCidrs());
    }
    // sofia / event_socket / conference 等仍走 FS 本地文件
    return notFound();
};

Service.notFound = notFound;

module.exports = Service;
