const { QueryTypes } = require('sequelize');
const Db = require('./db');
const db = () => Db.db_smcicc.sequelize;
const select = (sql, replacements = {}, transaction) => db().query(sql, { replacements, transaction, type: QueryTypes.SELECT });
const exec = (sql, replacements = {}, transaction) => db().query(sql, { replacements, transaction });
const Dao = { select, exec, transaction: fn => db().transaction(fn) };
Dao.read = async vdnId => {
  const rows = await select('SELECT StateJson AS value FROM t_conf_onboard_state WHERE VDNID = :vdnId', { vdnId });
  return rows.length ? JSON.parse(rows[0].value) : {};
};
// Row locks survive multiple Node workers. Never store credentials in state/audit.
Dao.lock = async (vdnId, actor, action, fn) => db().transaction(async transaction => {
  // Upsert obtains an exclusive lock immediately; INSERT IGNORE can deadlock on S-to-X upgrade.
  await exec("INSERT INTO t_conf_onboard_state (VDNID, StateJson) VALUES (:vdnId, '{}') ON DUPLICATE KEY UPDATE VDNID = VALUES(VDNID)", { vdnId }, transaction);
  const rows = await select('SELECT StateJson AS value FROM t_conf_onboard_state WHERE VDNID = :vdnId FOR UPDATE', { vdnId }, transaction);
  const state = JSON.parse(rows[0].value);
  let result, failure;
  try { result = await fn(state, transaction); } catch (e) { failure = e; }
  await exec('UPDATE t_conf_onboard_state SET StateJson = :value WHERE VDNID = :vdnId',
    { vdnId, value: JSON.stringify(state) }, transaction);
  await exec('INSERT INTO t_conf_onboard_audit (VDNID, Actor, Action, Outcome) VALUES (:vdnId, :actor, :action, :outcome)',
    { vdnId, actor, action, outcome: failure ? 'failed' : result && result.sync_pending ? 'pending' : 'success' }, transaction);
  // Commit retry receipts even after external projection failures.
  return { result, failure };
}).then(({ result, failure }) => { if (failure) throw failure; return result; });
Dao.user = async (vdnId, sourceId, transaction) => (await select(`SELECT ID AS id, WorkNO AS workNo, Name AS name,
  Email AS email, IsValid AS enabled, PassWord AS password, VDNID AS vdnId FROM t_user_users
  WHERE ID = :sourceId AND VDNID = :vdnId`, { vdnId, sourceId }, transaction))[0];
Dao.adminVdns = async (sourceId, transaction) => select(`SELECT DISTINCT v.ID AS id, v.Name AS name FROM t_icc_vdn v
 JOIN t_user_users u ON u.VDNID = v.ID AND u.ID = :sourceId AND u.IsValid = 1
 JOIN t_user_grantpower g ON g.VDNID = v.ID AND g.PowerId = 10000 AND g.IsOwn = 1
 WHERE (g.OwnerType = 3 AND g.OwnerId = u.ID)
 OR (g.OwnerType = 1 AND EXISTS (SELECT 1 FROM t_user_usertorole r WHERE r.VDNID = v.ID AND r.UserID = u.ID AND r.RoleID = g.OwnerId))
 OR (g.OwnerType = 2 AND EXISTS (SELECT 1 FROM t_user_usertodepart d WHERE d.VDNID = v.ID AND d.UserID = u.ID AND d.departid = g.OwnerId))`, { sourceId }, transaction);
module.exports = Dao;
