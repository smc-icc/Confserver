function escAttr(s) {
    return String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function nz(v, def = '0') {
    if (v === null || v === undefined) return def;
    return String(v);
}

function enFlag(v) {
    return v != null && Number(v) !== 0 ? 'Enable' : 'Disable';
}

/**
 * 与 Java TasCreator.assembleContent 结构一致，输出 tas_config.xml 文本。
 * @param {object} d — 扁平字段 + 嵌套：focuComm, ccsEty1, ccsEty2, mc4Xml, hmp, prd, mc100, tas4Isxes[], tas4CallOuts[], ...
 */
function buildTasXml(d) {
    if (!d || !d.prd) {
        throw new Error('生成tas_config.xml配置文件内容时出错，PRD数据为空');
    }

    const ipPort = d.mc4Xml?.ipAddressPort != null ? String(d.mc4Xml.ipAddressPort) : '';
    const colon = ipPort.indexOf(':');
    if (colon < 0) {
        throw new Error(`生成tas_config.xml配置文件内容时，遇到错误的IP地址:端口串:${ipPort}`);
    }
    const mcIp = ipPort.slice(0, colon);
    const mcPort = ipPort.slice(colon + 1);

    const fc = d.focuComm || {};
    const c1 = d.ccsEty1 || {};
    const c2 = d.ccsEty2 || {};
    const mc = d.mc4Xml || {};
    const hmp = d.hmp || {};
    const prd = d.prd || {};
    const m100 = d.mc100 || {};

    const parts = [];
    parts.push('<?xml version="1.0" encoding="UTF-8"?>');
    parts.push('<configuration>');
    parts.push('<NetBusCfg>');
    parts.push(
        `<NetBus IP="${escAttr(fc.ipAddress)}" Port="${escAttr(fc.port)}" MyID="${escAttr(d.myId)}" MyName="${escAttr(d.myName)}"/>`
    );
    parts.push(`<CCS1 MyID="${escAttr(c1.myId)}"/>`);
    parts.push(`<CCS2 MyID="${escAttr(c2.myId)}"/>`);
    parts.push(`<Monitor MyID="${escAttr(d.monitorMyId)}"/>`);
    parts.push('</NetBusCfg>');

    parts.push(
        `<MC IP="${escAttr(mcIp)}" Port="${escAttr(mcPort)}" IsxLogPath="${escAttr(mc.savePath)}" KeepAlive="${escAttr(mc.beatCycle)}">`
    );
    parts.push(
        `<SetSysParam ParamID="SYS_PARMID_SYNCFUNC_TIMEOUT" ParamValue="${escAttr(mc.invokeSyncFun)}" Flag="${mc.isInvokeSyncFun == 1 ? 'Enable' : 'Disable'}"/>`
    );
    parts.push(
        `<SetSysParam ParamID="SYS_PARMID_DAYNUM_FOR_AUTO_DELETE_LOG" ParamValue="${escAttr(mc.autoDeleteLogFile)}" Flag="${mc.isAutoDeleteLogFile == 1 ? 'Enable' : 'Disable'}"/>`
    );
    parts.push(
        `<SetSysParam ParamID="SYS_PARMID_VOX_BUSYDETECT_NUM" ParamValue="${escAttr(mc.checkTone)}" Flag="${mc.isCheckTone == 1 ? 'Enable' : 'Disable'}"/>`
    );
    parts.push('</MC>');

    parts.push('<NodeCfg>');
    const isxes = Array.isArray(d.tas4Isxes) ? d.tas4Isxes : [];
    for (const isx of isxes) {
        const cfgIsxPid = isx.cfgIsxPid;
        parts.push(`<Node ID="${escAttr(cfgIsxPid)}">`);
        for (const ag of isx.agBoards || []) {
            parts.push(
                `<AG BRD="${escAttr(ag.oamBoardId)}" Span="${escAttr(ag.ctiLogicSpanId)}" Flag="${ag.isEnable == 0 ? 'Disable' : 'Enable'}"/>`
            );
        }
        for (const dt of isx.dtiBoards || []) {
            parts.push(
                `<DTI BRD="${escAttr(dt.oamBoardId)}" Span="${escAttr(dt.ctiLogicSpanId)}" Flag="${dt.isEnable == 0 ? 'Disable' : 'Enable'}"/>`
            );
        }
        for (const sip of isx.sipBoards || []) {
            parts.push(
                `<SIP BRD="${escAttr(sip.oamBoardId)}" BeginSIPCh="${escAttr(sip.sipChannelBeginId)}" ChCount="${escAttr(sip.sipChannelCount)}" Port="5060" Flag="${sip.isEnable == 0 ? 'Disable' : 'Enable'}"/>`
            );
        }
        parts.push('</Node>');
    }
    parts.push('</NodeCfg>');

    parts.push('<SIPGW>');
    for (const tco of d.tas4CallOuts || []) {
        parts.push(
            `<SIPOutbound Type="${escAttr(tco.type)}" BeginSpan="${escAttr(tco.beginSpan)}" EndSpan="${escAttr(tco.endSpan)}" IP="${escAttr(tco.ip)}" Port="${escAttr(tco.port)}" UserName="${escAttr(tco.userName)}" PassWord="${escAttr(tco.passWord)}" NodeID="${escAttr(tco.nodeId)}" VoiceCodes="${escAttr(tco.voiceCodes)}" Flag="${escAttr(tco.flag)}"/>`
        );
    }
    for (const tci of d.tas4CallIns || []) {
        parts.push(
            `<SIPInBound BeginSpan="${escAttr(tci.beginSpan)}" EndSpan="${escAttr(tci.endSpan)}" FromAddr="0.0.0.0" Mask="0.0.0.0" Port="65535" Alias="" VoiceCodes="${escAttr(tci.voiceCodes)}" Flag="${escAttr(tci.flag)}"/>`
        );
    }
    parts.push('</SIPGW>');

    parts.push('<VoiceList>');
    for (const tsv of d.tas4SysVoices || []) {
        parts.push(
            `<VoiceFile ID="${escAttr(tsv.id)}" Description="${escAttr(tsv.description)}" FileName="${escAttr(tsv.fileName)}"/>`
        );
    }
    parts.push('</VoiceList>');

    parts.push('<AGToneCfg>');
    parts.push(
        `<Tone ID="0" Description="忙音" FreFlag="${enFlag(d.freFlag0)}" Fq1="${nz(d.tone0Fq1)}" Dv1="${nz(d.tone0Dv1)}" Fq2="${nz(d.tone0Fq2)}" Dv2="${nz(d.tone0Dv2)}" TimeFlag="${enFlag(d.timeFlag0)}" On="${nz(d.tone0On)}" Ondv="${nz(d.tone0OnDv)}" Off="${nz(d.tone0Off)}" Offdv="${nz(d.tone0OffDv)}"/>`
    );
    parts.push(
        `<Tone ID="1" Description="拨号音" FreFlag="${enFlag(d.freFlag1)}" Fq1="${nz(d.tone1Fq1)}" Dv1="${nz(d.tone1Dv1)}" Fq2="${nz(d.tone1Fq2)}" Dv2="${nz(d.tone1Dv2)}" TimeFlag="${enFlag(d.timeFlag1)}" On="${nz(d.tone1On)}" Ondv="${nz(d.tone1OnDv)}" Off="${nz(d.tone1Off)}" Offdv="${nz(d.tone1OffDv)}"/>`
    );
    parts.push(
        `<Tone ID="2" Description="回铃音" FreFlag="${enFlag(d.freFlag2)}" Fq1="${nz(d.tone2Fq1)}" Dv1="${nz(d.tone2Dv1)}" Fq2="${nz(d.tone2Fq2)}" Dv2="${nz(d.tone2Dv2)}" TimeFlag="${enFlag(d.timeFlag2)}" On="${nz(d.tone2On)}" Ondv="${nz(d.tone2OnDv)}" Off="${nz(d.tone2Off)}" Offdv="${nz(d.tone2OffDv)}"/>`
    );
    parts.push(
        `<Tone ID="3" Description="催挂音" FreFlag="${enFlag(d.freFlag3)}" Fq1="${nz(d.tone3Fq1)}" Dv1="${nz(d.tone3Dv1)}" Fq2="${nz(d.tone3Fq2)}" Dv2="${nz(d.tone3Dv2)}" TimeFlag="${enFlag(d.timeFlag3)}" On="${nz(d.tone3On)}" Ondv="${nz(d.tone3OnDv)}" Off="${nz(d.tone3Off)}" Offdv="${nz(d.tone3OffDv)}"/>`
    );
    parts.push('</AGToneCfg>');

    parts.push('<ChannelSignal>');
    for (const tcs of d.tas4Chses || []) {
        parts.push(
            `<Signal Type="${escAttr(tcs.type)}" BeginSpan="${escAttr(tcs.beginSpan)}" BeginChannel="${escAttr(tcs.beginChannel)}" EndSpan="${escAttr(tcs.endSpan)}" EndChannel="${escAttr(tcs.endChannel)}" Flag="${escAttr(tcs.flag)}"/>`
        );
    }
    parts.push('</ChannelSignal>');

    parts.push(
        '<FXSCollectCalled Mode="4" MaxDigits="12" TermChar="#" FirstDigitTimer="10" InterDigitTimer="5" CompletionTimer="30"/>'
    );
    parts.push(`<FXSParam RingTimes="${escAttr(d.fxsParamRingTimes)}"/>`);
    parts.push(`<FXOParam IncomeingRingTimes="${escAttr(d.fxoParamIncomingRingTimes)}"/>`);
    parts.push('<FXOCalledNoTable>');
    for (const fx of d.tas4Fxos || []) {
        parts.push(`<CalledNO AGCh="${escAttr(fx.agCh)}" No="${escAttr(fx.no)}" Flag="${escAttr(fx.flag)}"/>`);
    }
    parts.push('</FXOCalledNoTable>');

    parts.push('<DTINOTable>');
    for (const di of d.tas4Dtis || []) {
        parts.push(`<DTINO Span="${escAttr(di.span)}" No="${escAttr(di.no)}" Flag="${escAttr(di.flag)}"/>`);
    }
    parts.push('</DTINOTable>');

    parts.push('<SipRegisterList ReregisterInterval="600" FailRegisterInterval="5">');
    for (const tr of d.tas4Regs || []) {
        parts.push(
            `<SipAccount ID="${escAttr(tr.id)}" NodeID="${escAttr(tr.nodeId)}" BRD="${escAttr(tr.brd)}" Domain="${escAttr(tr.domain)}" Port="${escAttr(tr.port)}" UserName="${escAttr(tr.userName)}" PassWord="${escAttr(tr.passWord)}" Expires="${escAttr(tr.expires)}" Nat="${escAttr(tr.nat)}" Flag="${escAttr(tr.flag)}"/>`
        );
    }
    parts.push('</SipRegisterList>');

    parts.push(
        `<Fax FaxServerType="MYHMP" Mode="${escAttr(hmp.mode)}" FaxServerIp="${escAttr(hmp.localIp)}" FaxServerPort="${escAttr(hmp.rtpPort)}" MyID="${escAttr(hmp.myId)}" ChannelCount="${escAttr(hmp.channelCount)}" Flag="Enable"/>`
    );
    parts.push(
        `<Log Style="${escAttr(d.logStyle)}" Level="DEBUG" Cache="${escAttr(d.logCache)}" BackupCount="${escAttr(d.logBackupCount)}"/>`
    );
    parts.push(
        `<RecordType Type="${escAttr(d.recordTypeType)}" ThreadNum="${escAttr(d.recordTypeThreadNum)}" BUFSIZE="${escAttr(d.recordTypeBufSize)}" FilePath="${escAttr(d.recordTypeFilePath)}"/>`
    );
    parts.push('<PRDServer>');
    parts.push(
        `<PRD NUM="${escAttr(prd.pid)}" NodeNum="${escAttr(prd.isxPid)}"/>`
    );
    parts.push('</PRDServer>');

    parts.push(`<SipServer Flag="${escAttr(d.sipServerFlag)}">`);
    for (const ter of d.tas4EhRegs || []) {
        parts.push(
            `<Account UserId="${escAttr(ter.userId)}" UserName="${escAttr(ter.userName)}" Passwd="${escAttr(ter.passwd)}" Flag="${escAttr(ter.flag)}"/>`
        );
    }
    parts.push('</SipServer>');

    parts.push(
        `<Nated Flag="${escAttr(d.natedFlag)}" AutoSwitchRemoteRtpIpAndPort="${escAttr(d.autoSwitchRemoteRtpIpAndPort)}">`
    );
    for (const tns of d.tas4NatSips || []) {
        parts.push(
            `<SipBrd NodeId="${escAttr(tns.nodeId)}" PublicIp="${escAttr(tns.publicIp)}" PublicPort="${escAttr(tns.publicPort)}" Flag="${escAttr(tns.flag)}"/>`
        );
    }
    for (const tnx of d.tas4NatXiops || []) {
        parts.push(
            `<Xoip NodeId="${escAttr(tnx.nodeId)}" PublicIp="${escAttr(tnx.publicIp)}" PrivateIp="${escAttr(tnx.privateIp)}" Flag="${escAttr(tnx.flag)}"/>`
        );
    }
    parts.push('</Nated>');

    parts.push(
        `<Linux_HA Flag="${d.isActiveStandby == null || Number(d.isActiveStandby) === 0 ? 'Disable' : 'Enable'}" NodeID="${escAttr(d.runMode)}" Level="${escAttr(d.linuxHaLevel)}" IP="${escAttr(m100.ip)}" Port="${escAttr(m100.port)}" CheckBrdWorkTimeOut="${escAttr(d.checkBrdWorkTimeOut)}"/>`
    );

    parts.push('</configuration>');
    return parts.join('');
}

module.exports = { buildTasXml, escAttr };
