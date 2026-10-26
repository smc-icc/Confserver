/** 与 smcicc CcsService / smciccCfgData 一致 */
export const VOICE_NUM_SUFFIXES = [
  '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
  '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20',
  '30', '40', '50', '60', '70', '80', '90',
];

/** @param {Function} t vue-i18n $t */
export function assembleTabTitle(runMode, myId, t) {
  const sn = myId == null || myId === '' ? '' : String(myId);
  if (t) {
    if (runMode === 'Master') return t('smcicc.system.ccs.tabTitle.master', { id: sn });
    if (runMode === 'Slave') return t('smcicc.system.ccs.tabTitle.slave', { id: sn });
    return t('smcicc.system.ccs.tabTitle.other', { id: sn });
  }
  if (runMode === 'Master') return `CCS Module_Master_${sn}`;
  if (runMode === 'Slave') return `CCS Module_Slave_${sn}`;
  return `CCS Module__${sn}`;
}

export const RUN_MODE_OPTIONS = [
  { value: 'Master', labelKey: 'smcicc.system.ccs.runMode.master' },
  { value: 'Slave', labelKey: 'smcicc.system.ccs.runMode.slave' },
];

export const CONNECT_KEEP_ALIVE_OPTIONS = [
  { value: 1, labelKey: 'smcicc.system.ccs.connectKeepAlive.long' },
  { value: 0, labelKey: 'smcicc.system.ccs.connectKeepAlive.short' },
];

export const ENABLE_OPTIONS = [
  { value: 1, labelKey: 'smcicc.common.enabled' },
  { value: 0, labelKey: 'smcicc.common.disabled' },
];

export const RELOGIN_OPTIONS = [
  { value: 'REJECT', labelKey: 'smcicc.system.ccs.relogin.reject' },
  { value: 'REPLACE', labelKey: 'smcicc.system.ccs.relogin.replace' },
  { value: 'PRIORITY', labelKey: 'smcicc.system.ccs.relogin.priority' },
];

export const LOG_STYLE_OPTIONS = [
  { value: 'FILE', labelKey: 'smcicc.system.ccs.logStyle.file' },
  { value: 'CONSOLE', labelKey: 'smcicc.system.ccs.logStyle.console' },
  { value: 'BOTH', labelKey: 'smcicc.system.ccs.logStyle.both' },
];

export const CCS4_CH_VALUE_OPTIONS = [
  { value: 1, labelKey: 'smcicc.system.ccs.chStatus.unready' },
  { value: 2, labelKey: 'smcicc.system.ccs.chStatus.idle' },
  { value: 4, labelKey: 'smcicc.system.ccs.chStatus.initiated' },
  { value: 8, labelKey: 'smcicc.system.ccs.chStatus.alerting' },
  { value: 16, labelKey: 'smcicc.system.ccs.chStatus.connected' },
  { value: 32, labelKey: 'smcicc.system.ccs.chStatus.release' },
];

export const CCS4_AG_VALUE_OPTIONS = [
  { value: 1, labelKey: 'smcicc.system.ccs.agStatus.unknown' },
  { value: 2, labelKey: 'smcicc.system.ccs.agStatus.setBusy' },
  { value: 4, labelKey: 'smcicc.system.ccs.agStatus.aux' },
  { value: 8, labelKey: 'smcicc.system.ccs.agStatus.block' },
  { value: 16, labelKey: 'smcicc.system.ccs.agStatus.available' },
  { value: 32, labelKey: 'smcicc.system.ccs.agStatus.idle' },
  { value: 64, labelKey: 'smcicc.system.ccs.agStatus.ring' },
  { value: 128, labelKey: 'smcicc.system.ccs.agStatus.callOut' },
  { value: 256, labelKey: 'smcicc.system.ccs.agStatus.taking' },
  { value: 512, labelKey: 'smcicc.system.ccs.agStatus.hold' },
  { value: 1024, labelKey: 'smcicc.system.ccs.agStatus.afterCallWork' },
  { value: 2048, labelKey: 'smcicc.system.ccs.agStatus.inspect' },
  { value: 4096, labelKey: 'smcicc.system.ccs.agStatus.offLine' },
  { value: 8192, labelKey: 'smcicc.system.ccs.agStatus.playWorkNo' },
  { value: 16384, labelKey: 'smcicc.system.ccs.agStatus.playOnHookVoc' },
  { value: 32768, labelKey: 'smcicc.system.ccs.agStatus.playRecord' },
];

export const RECORD_PATH_VARS = [
  { id: 'VDN', labelKey: 'smcicc.system.ccs.recordVar.vdn' },
  { id: 'WorkNO', labelKey: 'smcicc.system.ccs.recordVar.workNo' },
  { id: 'Extension', labelKey: 'smcicc.system.ccs.recordVar.extension' },
  { id: 'Caller', labelKey: 'smcicc.system.ccs.recordVar.caller' },
  { id: 'Called', labelKey: 'smcicc.system.ccs.recordVar.called' },
  { id: 'Date', labelKey: 'smcicc.system.ccs.recordVar.date' },
];

export const RECORD_NAME_VARS = [
  { id: 'VDN', labelKey: 'smcicc.system.ccs.recordVar.vdn' },
  { id: 'WorkNO', labelKey: 'smcicc.system.ccs.recordVar.workNo' },
  { id: 'Extension', labelKey: 'smcicc.system.ccs.recordVar.extension' },
  { id: 'LogicNO', labelKey: 'smcicc.system.ccs.recordVar.logicNo' },
  { id: 'Caller', labelKey: 'smcicc.system.ccs.recordVar.caller' },
  { id: 'Called', labelKey: 'smcicc.system.ccs.recordVar.called' },
  { id: 'ConSN', labelKey: 'smcicc.system.ccs.recordVar.conSn' },
  { id: 'CallSN', labelKey: 'smcicc.system.ccs.recordVar.callSn' },
];

/** Map option defs with labelKey to { value, label } using vue-i18n t */
export function mapOptionLabels(options, t) {
  if (!t) {
    return options.map((o) => ({ value: o.value, label: o.labelKey || String(o.value) }));
  }
  return options.map((o) => ({
    value: o.value,
    label: o.labelKey ? t(o.labelKey) : o.text != null ? t(o.text) : String(o.value),
  }));
}

/** Map record var defs to { id, text } for templates */
export function mapRecordVars(vars, t) {
  if (!t) {
    return vars.map((o) => ({ id: o.id, text: o.labelKey || o.id }));
  }
  return vars.map((o) => ({ id: o.id, text: t(o.labelKey) }));
}
