const fs = require('fs');
const path = require('path');
const { QueryTypes } = require('sequelize');
const Db = require('./db');

const RANGE = `ID AS id, VDNID AS vdnId, StartNo AS startNo, EndNo AS endNo, Kind AS kind, State AS state,
  Reviewer AS reviewer, RequestID AS requestId`;
const REQUEST = `ID AS id, UID AS uid, VDNID AS vdnId, StartNo AS startNo, EndNo AS endNo, Reason AS reason,
  Status AS status, Reviewer AS reviewer, ReviewNote AS reviewNote, CreatedAt AS createdAt`;

function createRepository(sequelize) {
  const query = (sql, replacements, transaction, type) => sequelize.query(sql, {
    replacements, transaction, type, logging: false,
  });
  const select = (sql, replacements, transaction) => query(sql, replacements, transaction, QueryTypes.SELECT);
  const exec = (sql, replacements, transaction) => query(sql, replacements, transaction);
  return {
    transaction: fn => sequelize.transaction({ logging: false }, fn),
    lock: transaction => exec('SELECT ID FROM t_conf_workno_lock WHERE ID = 1 FOR UPDATE', {}, transaction),
    activeRanges: transaction => select(`SELECT ${RANGE} FROM t_conf_workno_ranges WHERE State = 'active' ORDER BY StartNo, ID`, {}, transaction),
    pendingRequests: transaction => select(`SELECT ${REQUEST} FROM t_conf_workno_requests WHERE Status = 'pending' ORDER BY CreatedAt, ID`, {}, transaction),
    usedNumbers: (vdnId, transaction) => select(
      'SELECT WorkNO AS workNo FROM t_user_users WHERE VDNID = :vdnId',
      { vdnId: Number(vdnId) }, transaction,
    ).then(rows => rows.map(row => row.workNo)),
    existsWorkNo: (vdnId, workNo, transaction) => select(
      'SELECT ID AS id FROM t_user_users WHERE VDNID = :vdnId AND WorkNO = :workNo LIMIT 1',
      { vdnId: Number(vdnId), workNo: String(workNo) }, transaction,
    ).then(rows => rows.length > 0),
    insertRange: (row, transaction) => exec(
      `INSERT INTO t_conf_workno_ranges (VDNID, StartNo, EndNo, Kind, State, Reviewer, RequestID)
       VALUES (:vdnId, :startNo, :endNo, :kind, 'active', :reviewer, :requestId)`,
      { vdnId: row.vdnId == null ? null : Number(row.vdnId), startNo: row.startNo, endNo: row.endNo,
        kind: row.kind, reviewer: row.reviewer || null, requestId: row.requestId || null },
      transaction,
    ),
    revokeRange: (id, reviewer, transaction) => exec(
      `UPDATE t_conf_workno_ranges SET State = 'revoked', Reviewer = :reviewer WHERE ID = :id AND State = 'active'`,
      { id: Number(id), reviewer }, transaction,
    ),
    findRange: (id, transaction) => select(`SELECT ${RANGE} FROM t_conf_workno_ranges WHERE ID = :id`, { id: Number(id) }, transaction)
      .then(rows => rows[0] || null),
    insertRequest: (row, transaction) => exec(
      `INSERT INTO t_conf_workno_requests (ID, UID, VDNID, StartNo, EndNo, Reason, Status)
       VALUES (:id, :uid, :vdnId, :startNo, :endNo, :reason, 'pending')`,
      row, transaction,
    ),
    updateRequest: (id, patch, transaction) => exec(
      `UPDATE t_conf_workno_requests SET Status = :status, Reviewer = :reviewer, ReviewNote = :reviewNote WHERE ID = :id`,
      { id, status: patch.status, reviewer: patch.reviewer || null, reviewNote: patch.reviewNote || '' }, transaction,
    ),
    findRequest: (id, transaction) => select(`SELECT ${REQUEST} FROM t_conf_workno_requests WHERE ID = :id`, { id }, transaction)
      .then(rows => rows[0] || null),
    listRequests: ({ vdnId, status, limit }, transaction) => {
      const where = [];
      const repl = {};
      const size = Math.min(200, Math.max(1, Number(limit) || 50));
      if (vdnId) { where.push('VDNID = :vdnId'); repl.vdnId = Number(vdnId); }
      if (status) { where.push('Status = :status'); repl.status = status; }
      return select(
        `SELECT ${REQUEST} FROM t_conf_workno_requests ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
         ORDER BY CreatedAt DESC, ID DESC LIMIT ${size}`,
        repl, transaction,
      );
    },
    audit: (row, transaction) => exec(
      `INSERT INTO t_conf_workno_audit (Actor, Action, VDNID, RequestID, Outcome, Detail)
       VALUES (:actor, :action, :vdnId, :requestId, :outcome, :detail)`,
      { actor: row.actor, action: row.action, vdnId: row.vdnId == null ? null : Number(row.vdnId),
        requestId: row.requestId || null, outcome: row.outcome, detail: String(row.detail || '').slice(0, 200) },
      transaction,
    ),
    ensureSchema: async () => {
      const sql = fs.readFileSync(path.join(__dirname, '../../sql/conf_workno_alloc.sql'), 'utf8');
      const statements = sql.replace(/^\s*--.*$/gm, '').split(';').map(item => item.trim()).filter(Boolean);
      for (const statement of statements) await sequelize.query(statement, { logging: false });
    },
  };
}

let singleton;
function runtime() {
  if (!singleton) singleton = createRepository(Db.db_smcicc.sequelize);
  return singleton;
}

module.exports = {
  createRepository,
  transaction: fn => runtime().transaction(fn),
  ensureSchema: () => runtime().ensureSchema(),
  repo: () => runtime(),
};
