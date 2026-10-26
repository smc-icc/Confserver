const fs = require('fs');
const path = require('path');

const MODE_FILE = path.join(__dirname, '../../../data/voice-driver.json');

function xmlCandidates() {
    const list = [];
    if (process.env.TAS_CONFIG_XML) list.push(process.env.TAS_CONFIG_XML);
    list.push('/usr/local/app/tars/TASServer/conf/tas_config.xml');
    list.push(path.join(__dirname, '../../../../TASServer/conf/tas_config.xml'));
    return list.filter(Boolean);
}

function resolveXml() {
    for (const file of xmlCandidates()) {
        try {
            if (fs.existsSync(file)) return file;
        } catch (e) {
            /* ignore unreadable candidates */
        }
    }
    return null;
}

function readMode() {
    try {
        const raw = JSON.parse(fs.readFileSync(MODE_FILE, 'utf8'));
        if (raw && (raw.mode === 'freeswitch' || raw.mode === 'ehang')) return raw.mode;
    } catch (e) {
        /* missing file */
    }
    return '';
}

function writeMode(mode) {
    fs.mkdirSync(path.dirname(MODE_FILE), { recursive: true });
    fs.writeFileSync(MODE_FILE, JSON.stringify({ mode }, null, 2));
}

function attr(xml, tag, name) {
    const re = new RegExp(`<${tag}\\b[^>]*\\b${name}="([^"]*)"`, 'i');
    const hit = xml.match(re);
    return hit ? hit[1] : '';
}

function setAttr(xml, tag, name, value) {
    const safe = String(value == null ? '' : value).replace(/[\r\n"]/g, '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
    const re = new RegExp(`(<${tag}\\b[^>]*\\b${name}=")([^"]*)(")`, 'i');
    if (!re.test(xml)) return xml;
    return xml.replace(re, `$1${safe}$3`);
}

function textOf(xml, tag) {
    const re = new RegExp(`<${tag}>([^<]*)</${tag}>`, 'i');
    const hit = xml.match(re);
    return hit ? hit[1] : '';
}

function setText(xml, tag, value) {
    const safe = String(value == null ? '' : value).replace(/[<>]/g, '');
    const re = new RegExp(`(<${tag}>)([^<]*)(</${tag}>)`, 'i');
    if (!re.test(xml)) return xml;
    return xml.replace(re, `$1${safe}$3`);
}

function inferMode(moduleType) {
    const t = String(moduleType || '').toLowerCase();
    if (t.includes('ehang') || t.includes('isx')) return 'ehang';
    return 'freeswitch';
}

function readXmlConfig(xml) {
    return {
        moduleType: attr(xml, 'Module', 'Type'),
        esl: {
            ip: attr(xml, 'Connect', 'IP'),
            port: attr(xml, 'Connect', 'Port'),
            password: attr(xml, 'Connect', 'PassWord'),
            timeout: attr(xml, 'Connect', 'TimeOut'),
            checkExtStatusPeriod: attr(xml, 'Connect', 'CheckExtStatusPeriod'),
            reportSocketHost: textOf(xml, 'ReportSocketHost'),
        },
        sipOutbound: {
            ip: attr(xml, 'SIPOutbound', 'IP'),
            port: attr(xml, 'SIPOutbound', 'Port'),
            userName: attr(xml, 'SIPOutbound', 'UserName'),
            password: attr(xml, 'SIPOutbound', 'PassWord'),
            prefix: attr(xml, 'SIPOutbound', 'Prefix'),
            voiceCodes: attr(xml, 'SIPOutbound', 'VoiceCodes'),
            dtmfType: attr(xml, 'SIPOutbound', 'DtmfType'),
        },
        sipInbound: {
            fromAddr: attr(xml, 'SIPInBound', 'FromAddr'),
            port: attr(xml, 'SIPInBound', 'Port'),
            voiceCodes: attr(xml, 'SIPInBound', 'VoiceCodes'),
            dtmfType: attr(xml, 'SIPInBound', 'DtmfType'),
        },
    };
}

function applyXml(xml, body) {
    let next = xml;
    const esl = body.esl || {};
    const pairs = [
        ['Connect', 'IP', esl.ip],
        ['Connect', 'Port', esl.port],
        ['Connect', 'PassWord', esl.password],
        ['Connect', 'TimeOut', esl.timeout],
        ['Connect', 'CheckExtStatusPeriod', esl.checkExtStatusPeriod],
    ];
    pairs.forEach(([tag, name, value]) => {
        if (value !== undefined && value !== null && String(value) !== '') next = setAttr(next, tag, name, value);
    });
    if (esl.reportSocketHost != null && String(esl.reportSocketHost) !== '') {
        next = setText(next, 'ReportSocketHost', esl.reportSocketHost);
    }
    const out = body.sipOutbound || {};
    [
        ['IP', out.ip],
        ['Port', out.port],
        ['UserName', out.userName],
        ['PassWord', out.password],
        ['Prefix', out.prefix],
        ['VoiceCodes', out.voiceCodes],
        ['DtmfType', out.dtmfType],
    ].forEach(([name, value]) => {
        if (value !== undefined && value !== null && String(value) !== '') next = setAttr(next, 'SIPOutbound', name, value);
    });
    const inbound = body.sipInbound || {};
    [
        ['FromAddr', inbound.fromAddr],
        ['Port', inbound.port],
        ['VoiceCodes', inbound.voiceCodes],
        ['DtmfType', inbound.dtmfType],
    ].forEach(([name, value]) => {
        if (value !== undefined && value !== null && String(value) !== '') next = setAttr(next, 'SIPInBound', name, value);
    });
    return next;
}

const Service = {};

Service.load = async () => {
    const xmlPath = resolveXml();
    let parsed = null;
    if (xmlPath) {
        const xml = fs.readFileSync(xmlPath, 'utf8');
        parsed = readXmlConfig(xml);
    }
    const saved = readMode();
    return {
        mode: saved || (parsed ? inferMode(parsed.moduleType) : 'freeswitch'),
        xmlAvailable: !!xmlPath,
        xmlPath: xmlPath || '',
        moduleType: parsed ? parsed.moduleType : '',
        esl: parsed ? parsed.esl : {},
        sipOutbound: parsed ? parsed.sipOutbound : {},
        sipInbound: parsed ? parsed.sipInbound : {},
        xmlCurl: {
            endpoint: '/xml_curl',
            sections: ['directory', 'dialplan', 'configuration'],
        },
    };
};

Service.save = async (body) => {
    const mode = body.mode === 'ehang' ? 'ehang' : 'freeswitch';
    writeMode(mode);
    const xmlPath = resolveXml();
    let xmlWritten = false;
    if (mode === 'freeswitch' && xmlPath && (body.esl || body.sipOutbound || body.sipInbound)) {
        const xml = fs.readFileSync(xmlPath, 'utf8');
        const next = applyXml(xml, body);
        if (next !== xml) fs.writeFileSync(xmlPath, next);
        xmlWritten = true;
    }
    const loaded = await Service.load();
    return { ok: true, xmlWritten, ...loaded };
};

module.exports = Service;
