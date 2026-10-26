const Dao = require('../../dao/SipDirectoryDao');
const { xmlEscape, notFound, pick } = require('./xmlCurlCommon');

const DEFAULT_DOMAIN = process.env.XML_CURL_DOMAIN || '192.168.255.128';

// Formal phones may register using either configured SBC domain. Resolve the
// directory identity's own domain first, then its explicit alias only if absent.
// Select the domain inside cond(), not a SIP contact (contacts contain colons).
function pairedRegistrationDialString(u) {
    if (u.video_visitor || !/^[1-9][0-9]{2,19}$/.test(u.username || '')) return '';
    try {
        const cfg = require('./SbcDomainConfig').current();
        const alternate = u.domain === cfg.internal ? cfg.publicDomain
            : u.domain === cfg.publicDomain ? cfg.internal : '';
        if (!alternate) return '';
        const primary = '${sofia_contact(${dialed_user}@' + u.domain + ')}';
        const selected = '${cond(' + primary + ' == error/user_not_registered ? ' + alternate + ' : ' + u.domain + ')}';
        return '{presence_id=${dialed_user}@${dialed_domain}}${sofia_contact(${dialed_user}@' + selected + ')}';
    } catch (err) { return ''; } // Invalid domain configuration never widens lookup.
}

function userXml(u) {
    const id = xmlEscape(u.username);
    const dialString = pairedRegistrationDialString(u);
    const pwd = xmlEscape(u.password);
    const ctx = xmlEscape(u.user_context || 'default');
    const vm = xmlEscape(u.vm_password || u.username);
    const cidName = xmlEscape(u.caller_id_name || `Extension ${u.username}`);
    const cidNum = xmlEscape(u.caller_id_number || u.username);
    // Only an explicitly configured managed TLS realm uses the proxy's observed
    // connection. Handset private/public Contact addresses are unreachable from FS.
    const tlsProxyContact = process.env.XML_CURL_TLS_PROXY_REALM &&
        u.domain === process.env.XML_CURL_TLS_PROXY_REALM;
    return `            <user id="${id}">
              <params>
                <param name="password" value="${pwd}"/>
                <param name="vm-password" value="${vm}"/>
${dialString ? `                <param name="dial-string" value="${xmlEscape(dialString)}"/>` : ''}
              </params>
              <variables>
                <variable name="toll_allow" value="${u.video_visitor ? '' : 'domestic,international,local'}"/>
                <variable name="accountcode" value="${id}"/>
                <variable name="icc_vdn_id" value="${xmlEscape(String(u.vdn_id))}"/>
                <variable name="user_context" value="${ctx}"/>
${tlsProxyContact ? `                <variable name="sip-force-contact" value="NDLB-tls-connectile-dysfunction"/>` : ''}
${u.video_visitor ? `                <variable name="icc_video_session_id" value="${xmlEscape(u.id)}"/>
                <variable name="icc_video_access_code" value="${xmlEscape(u.access_code)}"/>` : ''}
                <variable name="effective_caller_id_name" value="${cidName}"/>
                <variable name="effective_caller_id_number" value="${cidNum}"/>
              </variables>
            </user>`;
}

function directoryDoc(domain, users) {
    const d = xmlEscape(domain || DEFAULT_DOMAIN);
    const body = (users || []).map((u) => userXml(u)).join('\n');
    return `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<document type="freeswitch/xml">
  <section name="directory">
    <domain name="${d}">
      <params>
        <param name="dial-string" value="{presence_id=\${dialed_user}@\${dialed_domain}}\${sofia_contact(\${dialed_user}@\${dialed_domain})}"/>
      </params>
      <groups>
        <group name="default">
          <users>
${body}
          </users>
        </group>
      </groups>
    </domain>
  </section>
</document>
`;
}

const Service = {};

Service.directoryXml = async (body) => {
    const section = pick(body, 'section');
    if (section && section !== 'directory') {
        return notFound();
    }
    const domain = pick(body, 'domain', 'sip_auth_realm', 'key_value') || DEFAULT_DOMAIN;
    const user = pick(body, 'user', 'sip_auth_username', 'sip_to_user');
    const tagName = pick(body, 'tag_name');
    const keyName = pick(body, 'key_name');
    const keyValue = pick(body, 'key_value');

    let username = user;
    if (!username && tagName === 'user' && keyName === 'id') {
        username = keyValue;
    }

    if (username) {
        if (/^(voice|video)_/.test(username)) {
            if (process.env.VIDEO_CUSTOMER_ENABLED !== '1') return notFound();
            const row = await require('../../dao/VideoSessionDao').findLive(username, domain);
            if (!row) return notFound();
            return directoryDoc(row.domain, [{ ...row, video_visitor: true, user_context: 'sbc-video-visitor', vm_password: '', caller_id_name: username.startsWith('voice_') ? 'Voice visitor' : 'Video visitor' }]);
        }
        const row = await Dao.findUser(username, domain);
        if (!row) return notFound();
        return directoryDoc(row.domain || domain, [row]);
    }

    if (tagName === 'domain' || !username) {
        const rows = await Dao.listByDomain(domain);
        if (!rows.length) return notFound();
        return directoryDoc(domain, rows);
    }
    return notFound();
};

Service.notFound = notFound;

module.exports = Service;
