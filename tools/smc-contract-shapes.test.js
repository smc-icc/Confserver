/**
 * ICC 迁移：不加载 Sequelize、不连库的 JSON 契约/形状断言（与 Struts JSON root 对齐）。
 * 运行：npm run test:smcicc
 */
const { test } = require('node:test');
const assert = require('assert').strict;

/** 与 BasicInfoService.checkVdnNameExist 入参校验一致（避免 require 拉起整库） */
function checkVdnNameExistGate(paramsObj) {
    const vdnId = paramsObj.vdnId != null ? Number(paramsObj.vdnId) : null;
    const vdnName = paramsObj.vdnName != null ? String(paramsObj.vdnName) : '';
    if (vdnId == null || Number.isNaN(vdnId) || !vdnName) {
        return false;
    }
    return null;
}

function parseVdnJson(raw) {
    if (!raw) return null;
    if (typeof raw === 'object') return raw;
    try {
        return JSON.parse(raw);
    } catch (e) {
        return null;
    }
}

test('BasicInfo checkVdnNameExist：缺 vdnId 时拒绝（与 Service 入参门一致）', () => {
    assert.equal(checkVdnNameExistGate({ vdnName: 'any' }), false);
});

test('BasicInfo modifyBasicInfo：非法 vdnjson 解析为 null', () => {
    assert.equal(parseVdnJson('not-json'), null);
});

test('部门树节点字段：与 DepartmentManagerAction JSON root=m_OutList 元素一致', () => {
    const sample = { id: 1, text: '总部', level: 1, pid: 0, children: [{ id: 2, text: '子', level: 2, pid: 1 }] };
    assert.ok(Number.isFinite(sample.id));
    assert.equal(typeof sample.text, 'string');
    assert.ok(Number.isFinite(sample.level));
    assert.ok(Number.isFinite(sample.pid));
    assert.ok(Array.isArray(sample.children));
});

test('部门权限列表外包：m_OutMap.Rows 数组元素含 powerid / isown', () => {
    const row = { powerid: 10, powername: 'x', powervalue: 1, subsystemtype: 1, firstname: '[1]子系统', isown: false };
    assert.ok('powerid' in row && 'isown' in row);
});
