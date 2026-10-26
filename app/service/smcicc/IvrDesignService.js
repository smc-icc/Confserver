const axios = require('axios');
const Dao = require('../../dao/IvrDesignSMCIccDao');
const CcsDao = require('../../dao/CcsSMCIccDao');

const CONST_IPANDPORT_MAX_LENGTH = 50;
const XML_WRITE_PORT = 8080;
const XML_WRITE_PATH = '/ConfigureWrite/write';
const XML_WRITE_FILE_NAME = 'ServerURL.xml';

const Svc = {};

function toInt(v, d = 0) {
    if (v === null || v === undefined || v === '') return d;
    const n = Number(v);
    return Number.isNaN(n) ? d : n;
}

function pick(p, key) {
    if (!p) return undefined;
    if (p.ivrDesign && typeof p.ivrDesign === 'object' && Object.prototype.hasOwnProperty.call(p.ivrDesign, key)) {
        return p.ivrDesign[key];
    }
    const dotted = `ivrDesign.${key}`;
    if (Object.prototype.hasOwnProperty.call(p, dotted)) return p[dotted];
    if (Object.prototype.hasOwnProperty.call(p, key)) return p[key];
    return undefined;
}

function parseRow(p) {
    return {
        pid: toInt(pick(p, 'pid'), 0),
        ipAndPort: String(pick(p, 'ipAndPort') || '').trim(),
        dir4Source: String(pick(p, 'dir4Source') || '').trim(),
        dir4Target: String(pick(p, 'dir4Target') || '').trim(),
    };
}

function mapRow(r) {
    if (!r) return null;
    return {
        pid: r.pid,
        ipAndPort: r.ipAndPort,
        dir4Source: r.dir4Source,
        dir4Target: r.dir4Target,
        lastDeployDate: r.lastDeployDate,
        deployUser: r.deployUserId != null ? { id: r.deployUserId, name: r.deployUserName } : null,
    };
}

function pageOf(ctx) {
    const page = Math.max(1, toInt(ctx.paramsObj.page, 1));
    const pagesize = Math.max(1, toInt(ctx.paramsObj.pagesize, 10));
    return { offset: (page - 1) * pagesize, pagesize, page };
}

function escXml(v) {
    return String(v ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

/** 与 IvrDesignCreator.assembleContent 一致 */
function buildServerUrlXml(d) {
    const ipAndPort = d.ipAndPort;
    const dir4Source = d.dir4Source;
    const dir4Target = d.dir4Target;
    if (!ipAndPort) throw new Error('生成ServerURL.xml配置文件内容时出错，ipAndPort数据为空');
    if (!dir4Source) throw new Error('生成ServerURL.xml配置文件内容时出错，dir4Source数据为空');
    if (!dir4Target) throw new Error('生成ServerURL.xml配置文件内容时出错，dir4Target数据为空');
    return `<?xml version="1.0" encoding="UTF-8"?>
<server>
  <url name="SaveProject" url="./servlet/SaveFileServlet" path="${escXml(dir4Source)}" />
  <url name="SaveIVR" url="./servlet/SaveFileServlet" path="${escXml(dir4Target)}" />
  <url name="OpenProject" url="./servlet/GetFileServlet" path="${escXml(dir4Source)}" />
  <url name="GetAllProject" url="./servlet/GetFileListServlet" path="${escXml(dir4Source)}" />
</server>`;
}

function computeCopyIpAndPort(oldVal) {
    const prefix = 'copy';
    const cutLen = prefix.length - (CONST_IPANDPORT_MAX_LENGTH - oldVal.length);
    return cutLen > 0 ? prefix + oldVal.substring(0, oldVal.length - cutLen) : prefix + oldVal;
}

Svc.loadIvrDesignList = async (ctx) => {
    const localIp = ctx.paramsObj.localIp != null && ctx.paramsObj.localIp !== ''
        ? String(ctx.paramsObj.localIp)
        : '';
    const { offset, pagesize } = pageOf(ctx);
    const [Rows, Total] = await Promise.all([
        Dao.ivrDesignList(localIp, offset, pagesize),
        Dao.ivrDesignCount(localIp),
    ]);
    return { Rows: Rows.map(mapRow), Total };
};

Svc.addIvrDesign = async (ctx) => {
    const row = parseRow(ctx.paramsObj || {});
    if (!row.ipAndPort) return 0;
    try {
        const dup = await Dao.ivrDesignDupCount({ ipAndPort: row.ipAndPort, excludePid: 0 });
        if (dup > 0) return -1;
        await Dao.ivrDesignInsert(row);
        return 1;
    } catch (e) {
        return 0;
    }
};

Svc.editIvrDesign = async (ctx) => {
    const row = parseRow(ctx.paramsObj || {});
    if (!row.pid) return 0;
    try {
        const dup = await Dao.ivrDesignDupCount({ ipAndPort: row.ipAndPort, excludePid: row.pid });
        if (dup > 0) return -1;
        const ret = await Dao.ivrDesignUpdate(row);
        return Number(ret || 0) > 0 ? 1 : 0;
    } catch (e) {
        return 0;
    }
};

Svc.deleteIvrDesign = async (ctx) => {
    const pids = String(ctx.paramsObj.pids || '')
        .split(',')
        .map((x) => toInt(x.trim(), 0))
        .filter((x) => x > 0);
    if (!pids.length) return false;
    try {
        const ret = await Dao.ivrDesignDelete(pids);
        return Number(ret || 0) > 0;
    } catch (e) {
        return false;
    }
};

Svc.copyIvrDesign = async (ctx) => {
    const row = parseRow(ctx.paramsObj || {});
    if (!row.ipAndPort) return false;
    const newIp = computeCopyIpAndPort(row.ipAndPort);
    try {
        await Dao.ivrDesignInsert({
            ipAndPort: newIp,
            dir4Source: row.dir4Source,
            dir4Target: row.dir4Target,
        });
        return true;
    } catch (e) {
        return false;
    }
};

Svc.deployIvrDesignXML = async (ctx) => {
    const pid = toInt(ctx.paramsObj.pid, 0);
    if (!pid) return { result: false, msg: '发布XML异常' };

    const row = await Dao.getIvrDesignXmlRow(pid);
    if (!row) return { result: false, msg: '发布XML异常' };

    let xmlContent;
    try {
        xmlContent = buildServerUrlXml(row);
    } catch (e) {
        return { result: false, msg: e.message || '组装IVR流程设计XML发生异常' };
    }

    const lip = String(row.ipAndPort || '').trim();
    const host = lip.split(':')[0];
    if (!host) {
        return { result: false, msg: '发布XML异常' };
    }

    const body = new URLSearchParams();
    body.append('filename', XML_WRITE_FILE_NAME);
    body.append('content', xmlContent);

    let rsp;
    try {
        rsp = await axios({
            method: 'post',
            url: `http://${host}:${XML_WRITE_PORT}${XML_WRITE_PATH}`,
            data: body.toString(),
            headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
            timeout: 20000,
            responseType: 'json',
            validateStatus: () => true,
        });
    } catch (e) {
        return { result: false, msg: '发布XML异常' };
    }

    const data = rsp?.data || {};
    if (data && Object.prototype.hasOwnProperty.call(data, 'error')) {
        return { result: false, msg: data.msg || '发布XML异常' };
    }
    const status = Number(data.status);
    const msg = data.msg || '';
    if (status !== 1) {
        return { result: false, msg: msg || '发布XML异常' };
    }

    const workNo = String(ctx.session?.smcicc_sys_work_no || '');
    const workName = String(ctx.session?.smcicc_sys_work_name || workNo || 'system');
    const user = workNo ? await CcsDao.findSysUserByWorkNo(workNo) : null;
    const userId = Number(user?.id || 0);
    const updated = await Dao.updateXMLDeployer({ pid, userId, workName });
    if (Number(updated || 0) <= 0) {
        return { result: false, msg: '发布XML异常' };
    }
    return { result: true, msg };
};

module.exports = Svc;
