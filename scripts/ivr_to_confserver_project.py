# -*- coding: utf-8 -*-
"""
Convert legacy FlowDesignWeb *.ivr (XML Project) to ConfServer call-flow project JSON.

Usage:
  python ivr_to_confserver_project.py path/to/flow_25.ivr
  python ivr_to_confserver_project.py --batch E:/sm-cloud/smc-icc/FlowDesignWeb/data
"""

from __future__ import annotations

import argparse
import html
import json
import os
import re
import sys
from datetime import datetime, timezone
from xml.etree import ElementTree as ET

# smc_* type <-> XML tag (keep in sync with callFlowExport.js / ivrNodeRegistry.js)
XML_TO_SMC = {
    'Start': 'smc_flow_start',
    'End': 'smc_flow_end',
    'AnswerCall': 'smc_answer_call',
    'ClearCall': 'smc_hang_up',
    'ClearConnection': 'smc_clear_connection',
    'AcceptCall': 'smc_phone_ring',
    'PlayFile': 'smc_play_file',
    'PlayFileList': 'smc_play_file_list',
    'StopPlayFile': 'smc_stop_play_file',
    'StartRecordFile': 'smc_start_recording',
    'StopRecordFile': 'smc_stop_recording',
    'EvtWait': 'smc_event_wait',
    'TTSPlay': 'smc_tts_play',
    'BeginReceiveDTMF': 'smc_start_receive_dtmf',
    'EndReceiveDTMF': 'smc_stop_receive_dtmf',
    'MySqlDBExecuteNode': 'smc_execute_sql',
    'ScriptExeNode': 'smc_execute_script',
    'IfBranchNode': 'smc_condition',
    'SwitchNode': 'smc_multi_branch',
    'CheckWorkTime': 'smc_check_work_hours',
    'CallFlow': 'smc_call_subflow',
    'GOTO': 'smc_jump_goto',
    'ConnectCall': 'smc_connect_call',
    'HeldCall': 'smc_hold_call',
    'MakeOnePartCall': 'smc_call_out_one',
    'TransCallToAnotherAppWithData': 'smc_trans_call',
    'CheckCallParty': 'smc_check_party_count',
    'StartSendFax': 'smc_start_send_fax',
    'StopSendFax': 'smc_stop_send_fax',
    'StartReceiveFax': 'smc_start_recv_fax',
    'StopReceiveFax': 'smc_stop_recv_fax',
    'CreateConferenceCall': 'smc_create_conference',
    'JoinConferenceCall': 'smc_join_conference',
    'DeflectCall': 'smc_forward_call',
    'MsSqlDBExecuteNode': 'smc_execute_mssql',
    'OracleDBExecuteNode': 'smc_execute_oracle',
    'MySqlDBCursorNode': 'smc_mysql_cursor',
    'NotifyAgentEvt': 'smc_notify_agent_evt',
    'CallBindAgent': 'smc_call_bind_agent',
    'RequestGroupIdleAgents': 'smc_request_group_idle_agents',
    'RequestCallOutRouteIdleChCount': 'smc_request_callout_idle_ch',
    'AgentLogin': 'smc_agent_login',
    'AgentLogOut': 'smc_agent_logout',
    'AgentHoldCall': 'smc_agent_hold_call',
    'AgentRetrieveHold': 'smc_agent_retrieve_hold',
    'AgentConnectHold': 'smc_agent_connect_hold',
    'AgentForceInsert': 'smc_agent_force_insert',
    'AgentMonitor': 'smc_agent_monitor',
    'AgentForceRelease': 'smc_agent_force_release',
    'AgentCallOut': 'smc_agent_call_out',
    'AgentTransferOut': 'smc_agent_transfer_out',
    'AgentTransferAgentGroup': 'smc_agent_transfer_group',
    'AgentTransferAgent': 'smc_agent_transfer_agent',
    'AgentSnatchCall': 'smc_agent_snatch_call',
    'AgentPlayFile': 'smc_agent_play_file',
    'AgentReceiveDTMF': 'smc_agent_receive_dtmf',
    'AgentAnswerCall': 'smc_agent_answer_call',
    'AgentReleaseCall': 'smc_agent_release_call',
}

ATTR_TO_PROP = {
    'Description': 'description',
    'NodeID': 'node_id',
    'Next': 'next_node',
    'Cause': 'reason',
    'FileName': 'file_path',
    'FileList': 'file_list',
    'Script': 'script',
    'Sql': 'sql',
    'DBLinkName': 'db_connection',
    'Txt': 'tts_text',
    'FirstTimer': 'first_timer',
    'InnerTimer': 'inner_timer',
    'CompletionTimer': 'completion_timer',
    'FirstInform': 'first_inform',
    'MaxDigits': 'max_digits',
    'MODE': 'mode',
    'ContinueFlag': 'continue_flag',
    'TerminateChar': 'terminate_char',
    'RecordTime': 'record_time',
    'StopRecvDTMF': 'stop_recv_dtmf',
    'FlowID': 'flow_id',
    'ElseBranch': 'else_branch',
    'OutTime': 'off_duty_node',
    'Fail': 'fail_node',
    'Caller': 'caller',
    'Called': 'callee',
    'NewCallFlowID': 'new_flow_id',
    'NewCallNode': 'new_call_node_id',
    'NewAppType': 'new_app_type',
    'NewAppID': 'new_app_id',
    'NewFlowID': 'new_flow_id_trans',
    'VDNID': 'vdn_id',
    'AgentGroupID': 'agent_group_id',
    'WorkNO': 'work_no',
    'SkillID': 'skill_id',
    'PrivateInfo': 'private_info',
    'VIPLEVEL': 'vip_level',
    'CallID2': 'call_id2',
    'RelMode': 'rel_mode',
    'Context': 'context',
}

SHAPE_TYPES = frozenset({
    'ShapeStart', 'ShapeEnd', 'ShapeAnswerCall', 'ShapeClearCall', 'ShapeClearConnection',
    'ShapePlayFile', 'ShapePlayFileList', 'ShapeEvtWait', 'ShapeIfBranchNode',
    'ShapeScriptExeNode', 'ShapeGoto', 'ShapeTransCallToAnotherAppWithData',
})


def _parse_int(val, default=-1):
    try:
        return int(str(val).strip())
    except (TypeError, ValueError):
        return default


def _unescape_script(text: str) -> str:
    if not text:
        return ''
    t = html.unescape(text)
    return t.replace('&#xA;', '\n').replace('&#xa;', '\n')


def _attr_map(comp: ET.Element) -> dict[str, str]:
    out = {}
    attrs_el = comp.find('attributes')
    if attrs_el is None:
        return out
    for a in attrs_el.findall('Attribute'):
        name = a.get('name', '')
        if name:
            out[name] = a.get('value', '') or ''
    return out


def _shape_center(comp: ET.Element) -> tuple[float, float]:
    w = float(comp.get('width') or 60)
    h = float(comp.get('height') or 56)
    x = float(comp.get('x') or 0)
    y = float(comp.get('y') or 0)
    return x + w / 2, y + h / 2


def _attrs_to_properties(tag: str, attrs: dict[str, str]) -> dict:
    props = {}
    for xml_name, prop_name in ATTR_TO_PROP.items():
        if xml_name in attrs:
            val = attrs[xml_name]
            if prop_name in ('node_id', 'next_node', 'else_branch', 'off_duty_node',
                             'fail_node', 'flow_id', 'new_flow_id', 'new_flow_id_trans',
                             'new_call_node_id', 'record_time', 'reason', 'mode',
                             'first_timer', 'inner_timer', 'completion_timer',
                             'first_inform', 'max_digits', 'continue_flag', 'rel_mode'):
                props[prop_name] = _parse_int(val, -1 if 'node' in prop_name or prop_name == 'next_node' else 0)
            elif prop_name == 'script':
                props[prop_name] = _unescape_script(val)
            else:
                props[prop_name] = val
    if tag == 'EvtWait':
        pairs = []
        idx = 1
        while f'NodeID_{idx}' in attrs or f'CompID_{idx}' in attrs:
            pairs.append({
                'component_id': attrs.get(f'CompID_{idx}', 'const.CCS_CT_Call'),
                'function_id': attrs.get(f'FunID_{idx}', ''),
                'target_node': _parse_int(attrs.get(f'NodeID_{idx}', '-1')),
            })
            idx += 1
        if pairs:
            props['event_pairs'] = pairs
            props['component_id'] = pairs[0]['component_id']
            props['function_id'] = pairs[0]['function_id']
            props['target_node'] = pairs[0]['target_node']
    if tag == 'IfBranchNode':
        branches = []
        idx = 1
        while f'Expr_{idx}' in attrs or f'NodeID_{idx}' in attrs:
            branches.append({
                'expression': attrs.get(f'Expr_{idx}', ''),
                'target_node_id': _parse_int(attrs.get(f'NodeID_{idx}', '-1')),
            })
            idx += 1
        if branches:
            props['condition_branches'] = branches
    if tag == 'SwitchNode':
        branches = []
        idx = 1
        while f'Expr_{idx}' in attrs or f'NodeID_{idx}' in attrs:
            branches.append({
                'expression': attrs.get(f'Expr_{idx}', ''),
                'target_node_id': _parse_int(attrs.get(f'NodeID_{idx}', '-1')),
            })
            idx += 1
        if branches:
            props['branches'] = branches
        if len(branches) > 0:
            props['case_key_1'] = branches[0].get('expression', '')
            props['case_target_1'] = branches[0].get('target_node_id', -1)
        if len(branches) > 1:
            props['case_key_2'] = branches[1].get('expression', '')
            props['case_target_2'] = branches[1].get('target_node_id', -1)
    return props


def _parse_page(page: ET.Element, flow_meta: dict) -> dict:
    flow_id = page.get('id', '100')
    shapes = {}
    for comp in page.findall('.//Component'):
        ctype = comp.get('type', '')
        if ctype in ('StraightLine', 'VerticalLine') or not ctype.startswith('Shape'):
            continue
        tag = comp.get('elementTagName') or ctype.replace('Shape', '')
        if not tag or tag == 'null':
            continue
        attrs = _attr_map(comp)
        node_id = _parse_int(attrs.get('NodeID', '-1'), -1)
        if node_id < 0:
            continue
        cx, cy = _shape_center(comp)
        shapes[node_id] = {
            'tag': tag,
            'attrs': attrs,
            'x': cx,
            'y': cy,
            'label': comp.get('htmlText') or tag,
            'shape_name': comp.get('name', ''),
        }

    nodes = []
    by_nid = {}
    for nid, sh in sorted(shapes.items()):
        smc_type = XML_TO_SMC.get(sh['tag'])
        if not smc_type:
            print(f"  [warn] flow {flow_id}: unknown tag {sh['tag']} NodeID={nid}", file=sys.stderr)
            continue
        props = _attrs_to_properties(sh['tag'], sh['attrs'])
        if 'description' not in props:
            props['description'] = sh['label']
        if 'node_id' not in props:
            props['node_id'] = nid
        if 'next_node' not in props:
            props['next_node'] = -1
        lf_id = f"cf_{smc_type}_{nid}"
        node = {
            'id': lf_id,
            'type': smc_type,
            'x': sh['x'],
            'y': sh['y'],
            'text': sh['label'],
            'properties': props,
        }
        nodes.append(node)
        by_nid[nid] = node

    edges = []
    edge_seq = 0

    def add_edge(src_nid, tgt_nid, source_anchor='out', target_anchor='in'):
        nonlocal edge_seq
        if src_nid not in by_nid or tgt_nid not in by_nid:
            return
        edge_seq += 1
        edges.append({
            'id': f'cf_edge_{edge_seq}',
            'type': 'polyline',
            'sourceNodeId': by_nid[src_nid]['id'],
            'targetNodeId': by_nid[tgt_nid]['id'],
            'sourceAnchorId': source_anchor,
            'targetAnchorId': target_anchor,
        })

    for nid, node in by_nid.items():
        props = node['properties']
        smc = node['type']
        if smc == 'smc_condition':
            branches = props.get('condition_branches') or []
            for i, br in enumerate(branches):
                t = br.get('target_node_id', -1)
                if t >= 0:
                    add_edge(nid, t, f'out_{i}', 'in')
            eb = props.get('else_branch', -1)
            if isinstance(eb, int) and eb >= 0:
                add_edge(nid, eb, f'out_{len(branches)}', 'in')
        elif smc == 'smc_multi_branch':
            t1 = props.get('case_target_1', -1)
            t2 = props.get('case_target_2', -1)
            if t1 >= 0:
                add_edge(nid, t1, 'out_1', 'in')
            if t2 >= 0:
                add_edge(nid, t2, 'out_2', 'in')
            eb = props.get('else_branch', -1)
            if isinstance(eb, int) and eb >= 0:
                add_edge(nid, eb, 'out_else', 'in')
        elif smc == 'smc_check_work_hours':
            nxt = props.get('next_node', -1)
            if nxt >= 0:
                add_edge(nid, nxt, 'out_on', 'in')
            off = props.get('off_duty_node', -1)
            if off >= 0:
                add_edge(nid, off, 'out_off', 'in')
            fail = props.get('fail_node', -1)
            if fail >= 0:
                add_edge(nid, fail, 'out_fail', 'in')
        elif smc == 'smc_event_wait':
            for pair in props.get('event_pairs') or []:
                t = pair.get('target_node', -1)
                if t >= 0:
                    add_edge(nid, t, 'out', 'in')
        else:
            nxt = props.get('next_node', -1)
            if nxt >= 0:
                add_edge(nid, nxt, 'out', 'in')

    fname = flow_meta.get('name') or f'流程{flow_id}'
    return {
        'id': f'flow_{flow_id}',
        'name': fname,
        'description': flow_meta.get('desc', ''),
        'flowTreeId': _parse_int(flow_id, 100),
        'graph': {'nodes': nodes, 'edges': edges},
    }


def convert_ivr(path: str) -> dict:
    tree = ET.parse(path)
    root = tree.getroot()
    if root.tag != 'Project':
        raise ValueError(f'expected <Project>, got <{root.tag}>')

    vdn_id = _parse_int(root.get('id', '0'), 0)
    proj_name = root.get('name') or root.get('en') or f'IVR-{vdn_id}'
    flows_meta = {}
    for flow in root.findall('.//Flow'):
        fid = flow.get('id', '')
        if fid != '':
            flows_meta[fid] = {
                'name': flow.get('name') or flow.get('en') or fid,
                'desc': flow.get('desc', ''),
            }

    mysql = []
    for db in root.findall('.//arrDatabase/DataBase'):
        mysql.append({
            'linkName': db.get('DBLinkName', 'MySql'),
            'host': db.get('HostIp', ''),
            'account': db.get('Account', ''),
            'password': db.get('PWD', ''),
            'database': db.get('DBName', ''),
        })

    flows = []
    pages = root.findall('.//pages/Page')
    if not pages:
        raise ValueError('no <Page> in .ivr')
    for page in pages:
        fid = page.get('id', '100')
        meta = flows_meta.get(fid, {'name': f'流程{fid}', 'desc': ''})
        flows.append(_parse_page(page, meta))

    if not flows:
        raise ValueError('no flows parsed')

    # 主流程排第一（id=100 或第一个）
    flows.sort(key=lambda f: (0 if str(f.get('flowTreeId')) == '100' else 1, f.get('flowTreeId', 0)))

    return {
        'id': f'proj_flow_{vdn_id}',
        'name': proj_name,
        'description': root.get('desc', '') or '',
        'properties': {
            'general': {
                'projectId': vdn_id,
                'name': proj_name,
                'ip': root.get('ipAddress', '127.0.0.1'),
                'port': _parse_int(root.get('port', '6789'), 6789),
                'threadPool': _parse_int(root.get('threadPoolCount', '10'), 10),
                'appType': _parse_int(root.get('appType', '1'), 1),
                'appStrategy': _parse_int(root.get('appTypePolicy', '0'), 0),
                'ccsid': _parse_int(root.get('ccsId', '1'), 1),
            },
            'mysql': mysql,
            'mssql': [],
            'distribution': [],
            'files': [],
        },
        'flows': flows,
        'updatedAt': datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z'),
    }


def main():
    ap = argparse.ArgumentParser(description='Convert FlowDesign .ivr to ConfServer project JSON')
    ap.add_argument('inputs', nargs='*', help='.ivr file(s) or directories')
    ap.add_argument('--batch', help='Convert all *.ivr under directory (recursive)')
    ap.add_argument('-o', '--output-dir',
                    default=os.environ.get('IVR_PROJECTS_DIR') or os.path.normpath(os.path.join(
                        os.path.dirname(__file__), '..', 'data', 'ivr_projects')),
                    help='Output directory for proj_*.json (env: IVR_PROJECTS_DIR)')
    args = ap.parse_args()

    paths = list(args.inputs or [])
    if args.batch:
        for dirpath, _, files in os.walk(args.batch):
            for f in files:
                if f.lower().endswith('.ivr'):
                    paths.append(os.path.join(dirpath, f))

    if not paths:
        ap.print_help()
        sys.exit(1)

    os.makedirs(args.output_dir, exist_ok=True)
    ok = 0
    for p in sorted(set(paths)):
        try:
            doc = convert_ivr(p)
            proj_dir = os.path.join(args.output_dir, doc['id'])
            os.makedirs(proj_dir, exist_ok=True)
            out = os.path.join(proj_dir, f"{doc['id']}.json")
            with open(out, 'w', encoding='utf-8') as f:
                json.dump(doc, f, indent=2, ensure_ascii=False)
            print(f'OK {p} -> {out} ({len(doc["flows"])} flows, '
                  f'{sum(len(fl["graph"]["nodes"]) for fl in doc["flows"])} nodes)')
            ok += 1
        except Exception as exc:
            print(f'FAIL {p}: {exc}', file=sys.stderr)

    print(f'Done: {ok}/{len(paths)} converted -> {args.output_dir}')


if __name__ == '__main__':
    main()
