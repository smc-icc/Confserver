const crypto = require('crypto');
const Identity = require('../integration/OnboardIdentity');
const Core = require('./workno-alloc-core');

function mapRange(range) {
  return {
    id: Number(range.id), vdnId: range.vdnId == null ? null : Number(range.vdnId),
    startNo: Number(range.startNo), endNo: Number(range.endNo), kind: range.kind, state: range.state,
    requestId: range.requestId || null,
  };
}

function occupied(active, pending) {
  return [
    ...active.map(mapRange),
    ...pending.map(row => ({ startNo: Number(row.startNo), endNo: Number(row.endNo), kind: 'pending', id: row.id })),
  ];
}

function createService(repository, identity = Identity) {
  let ready;
  const schema = () => {
    if (!ready) ready = repository.ensureSchema();
    return ready;
  };
  async function systemActor(ctx) {
    const actor = await identity.context(ctx);
    if (actor.role !== 'system') Identity.deny('仅超级管理员可以管理工号号段');
    return actor;
  }
  async function vdnActor(ctx, vdnId) {
    ctx.paramsObj = { ...(ctx.paramsObj || {}), vdnId };
    return identity.selected(ctx);
  }
  function view(vdnId, active) {
    const ranges = active.map(mapRange);
    const grants = Core.ownGrants(ranges, vdnId);
    return {
      vdnId: Number(vdnId),
      mode: Core.allocationMode(ranges, vdnId),
      ranges: grants.map(range => ({ id: range.id, startNo: range.startNo, endNo: range.endNo })),
    };
  }
  async function locked(fn) {
    await schema();
    return repository.transaction(async transaction => {
      await repository.lock(transaction);
      return fn(transaction);
    });
  }
  async function assertFree(candidate, transaction, ignoreRequestId) {
    const active = (await repository.activeRanges(transaction)).map(mapRange);
    const pending = (await repository.pendingRequests(transaction))
      .filter(row => row.id !== ignoreRequestId);
    const hit = Core.findOverlap(candidate, occupied(active, pending));
    if (hit) throw Core.fail(hit.kind === 'pending' ? '号段与待审核申请重叠' : '号段与已有有效区间重叠', 409);
    return active;
  }

  return {
    async policy(ctx, body) {
      const vdnId = body.vdnId;
      const actor = await vdnActor(ctx, vdnId);
      await schema();
      const active = (await repository.activeRanges()).map(mapRange);
      const summary = view(vdnId, active);
      const used = await repository.usedNumbers(vdnId);
      summary.preview = summary.mode === 'auto' ? Core.nextWorkNo(used, Core.blockedForAuto(active)) : null;
      summary.requests = (await repository.listRequests({ vdnId, limit: 20 }))
        .filter(row => actor.role === 'system' || row.uid === actor.uid);
      return summary;
    },
    async ready() { await schema(); },
    async claim({ vdnId, requested, transaction }) {
      await repository.lock(transaction);
      const active = (await repository.activeRanges(transaction)).map(mapRange);
      const grants = Core.ownGrants(active, vdnId);
      const used = await repository.usedNumbers(vdnId, transaction);
      if (!grants.length) {
        const number = Core.nextWorkNo(used, Core.blockedForAuto(active));
        return String(number);
      }
      const number = Core.parseWorkNo(requested);
      if (!number || !Core.rangeContains(grants, number)) throw Core.fail('工号不在当前 VDN 的手动号段内', 422);
      if (await repository.existsWorkNo(vdnId, String(number), transaction)) throw Core.fail('工号不能重复', 409);
      return String(number);
    },
    async apply(ctx, body) {
      const actor = await vdnActor(ctx, body.vdnId);
      const range = Core.parseRange(body.startNo, body.endNo);
      const reason = String(body.reason || '').trim();
      if (reason.length < 2 || reason.length > 2000) throw Core.fail('请填写申请理由');
      const id = crypto.randomUUID();
      await locked(async transaction => {
        await assertFree(range, transaction);
        await repository.insertRequest({
          id, uid: actor.uid, vdnId: Number(body.vdnId), startNo: range.startNo, endNo: range.endNo, reason,
        }, transaction);
        await repository.audit({ actor: actor.uid, action: 'apply', vdnId: body.vdnId, requestId: id, outcome: 'success', detail: `${range.startNo}-${range.endNo}` }, transaction);
      });
      return { id, status: 'pending' };
    },
    async withdraw(ctx, body) {
      await schema();
      const request = await repository.findRequest(body.id);
      if (!request || request.status !== 'pending') throw Core.fail('只能撤回待审核申请', 409);
      const actor = await vdnActor(ctx, request.vdnId);
      if (actor.role !== 'system' && request.uid !== actor.uid) Identity.deny('只能撤回自己的申请');
      await locked(async transaction => {
        const current = await repository.findRequest(body.id, transaction);
        if (!current || current.status !== 'pending') throw Core.fail('只能撤回待审核申请', 409);
        await repository.updateRequest(body.id, { status: 'withdrawn', reviewer: actor.uid, reviewNote: '' }, transaction);
        await repository.audit({ actor: actor.uid, action: 'withdraw', vdnId: current.vdnId, requestId: body.id, outcome: 'success' }, transaction);
      });
      return { id: body.id, status: 'withdrawn' };
    },
    async adminList(ctx) {
      await systemActor(ctx);
      await schema();
      const [requests, ranges] = await Promise.all([
        repository.listRequests({ status: 'pending', limit: 100 }),
        repository.activeRanges(),
      ]);
      return { requests, ranges: ranges.map(mapRange) };
    },
    async review(ctx, body) {
      const actor = await systemActor(ctx);
      const decision = body.decision === 'approve' ? 'approved' : body.decision === 'reject' ? 'rejected' : '';
      if (!decision) throw Core.fail('请选择通过或拒绝');
      const note = String(body.note || '').trim().slice(0, 1000);
      if (decision === 'rejected' && !note) throw Core.fail('拒绝时请填写说明');
      await locked(async transaction => {
        const request = await repository.findRequest(body.id, transaction);
        if (!request || request.status !== 'pending') throw Core.fail('申请已处理', 409);
        if (decision === 'approved') {
          const range = { startNo: Number(request.startNo), endNo: Number(request.endNo) };
          await assertFree(range, transaction, request.id);
          await repository.insertRange({
            vdnId: request.vdnId, ...range, kind: 'grant', reviewer: actor.uid, requestId: request.id,
          }, transaction);
        }
        await repository.updateRequest(body.id, { status: decision, reviewer: actor.uid, reviewNote: note }, transaction);
        await repository.audit({
          actor: actor.uid, action: decision, vdnId: request.vdnId, requestId: request.id, outcome: 'success',
          detail: `${request.startNo}-${request.endNo}`,
        }, transaction);
      });
      return { id: body.id, status: decision };
    },
    async grant(ctx, body) {
      const actor = await systemActor(ctx);
      await vdnActor(ctx, body.vdnId);
      const range = Core.parseRange(body.startNo, body.endNo);
      await locked(async transaction => {
        await assertFree(range, transaction);
        await repository.insertRange({ vdnId: Number(body.vdnId), ...range, kind: 'grant', reviewer: actor.uid }, transaction);
        await repository.audit({ actor: actor.uid, action: 'grant', vdnId: body.vdnId, outcome: 'success', detail: `${range.startNo}-${range.endNo}` }, transaction);
      });
      return { status: 'active' };
    },
    async shield(ctx, body) {
      const actor = await systemActor(ctx);
      const range = Core.parseRange(body.startNo, body.endNo);
      await locked(async transaction => {
        await assertFree(range, transaction);
        await repository.insertRange({ vdnId: null, ...range, kind: 'shield', reviewer: actor.uid }, transaction);
        await repository.audit({ actor: actor.uid, action: 'shield', outcome: 'success', detail: `${range.startNo}-${range.endNo}` }, transaction);
      });
      return { status: 'active' };
    },
    async revoke(ctx, body) {
      const actor = await systemActor(ctx);
      await locked(async transaction => {
        const range = await repository.findRange(body.id, transaction);
        if (!range || range.state !== 'active') throw Core.fail('号段不存在或已撤回', 409);
        await repository.revokeRange(body.id, actor.uid, transaction);
        await repository.audit({
          actor: actor.uid, action: 'revoke', vdnId: range.vdnId, requestId: range.requestId, outcome: 'success',
          detail: `${range.startNo}-${range.endNo}`,
        }, transaction);
      });
      return { id: Number(body.id), status: 'revoked' };
    },
  };
}

let singleton;
function getService() {
  if (!singleton) singleton = createService(require('../../dao/WorkNoAllocDao').repo());
  return singleton;
}

module.exports = { createService, getService };
