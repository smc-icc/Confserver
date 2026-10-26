'use strict';
const {randomBytes, createHash, timingSafeEqual} = require('node:crypto');
const {QueryTypes} = require('sequelize');
const fs = require('node:fs');
const path = require('node:path');
const DDL = fs.readFileSync(path.join(__dirname, '../../../sql/conf_captcha_challenges.sql'), 'utf8').replace(/^--.*$/gm, '').trim();
const TTL_MS = 5 * 60 * 1000;
const validId = id => typeof id === 'string' && /^[a-f0-9]{64}$/.test(id);
function answerValue(answer) {
  if (typeof answer !== 'string' && typeof answer !== 'number') return null;
  const text = String(answer).toLowerCase();
  return text.length > 0 && text.length <= 20 ? text : null;
}
const digest = (id, answer) => createHash('sha256').update(id + '\0' + answer).digest('hex');

/** MySQL is the shared source of truth, including TTL and single-use consumption. */
function createStore({sequelize, ttlMs = TTL_MS} = {}) {
  if (!sequelize || !Number.isSafeInteger(ttlMs) || ttlMs <= 0 || ttlMs > 600000) throw new TypeError('Captcha database and bounded TTL required');
  const query = (sql, replacements = {}, transaction, type) => sequelize.query(sql, {replacements, transaction, ...(type ? {type} : {}), logging:false});
  let schemaReady;
  function ensureSchema() {
    if (!schemaReady) schemaReady = (async () => {
      const engineSql = "SELECT ENGINE FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 't_conf_captcha_challenges'";
      let engines = await query(engineSql, {}, undefined, QueryTypes.SELECT);
      if (!engines.length) {
        await query(DDL);
        engines = await query(engineSql, {}, undefined, QueryTypes.SELECT);
      }
      if (engines.length !== 1 || String(engines[0].ENGINE).toLowerCase() !== 'innodb') throw Error('Captcha storage requires InnoDB');
    })().catch(error => {schemaReady = undefined; throw error;});
    return schemaReady;
  }
  return {
    ensureSchema,
    async issue(answer, previousId) {
      const normalized = answerValue(answer);
      if (normalized === null) throw new TypeError('Invalid captcha answer');
      await ensureSchema();
      if (validId(previousId)) await query('DELETE FROM t_conf_captcha_challenges WHERE ChallengeID = :id', {id:previousId});
      // Bound cleanup work on the expiry index; no per-replica timers or table scans.
      await query('DELETE FROM t_conf_captcha_challenges WHERE ExpiresAt <= UTC_TIMESTAMP(3) ORDER BY ExpiresAt LIMIT 100');
      const id = randomBytes(32).toString('hex');
      await query('INSERT INTO t_conf_captcha_challenges (ChallengeID, AnswerHash, ExpiresAt) VALUES (:id, :answerHash, TIMESTAMPADD(MICROSECOND, :ttlMicros, UTC_TIMESTAMP(3)))', {id, answerHash:digest(id, normalized), ttlMicros:ttlMs * 1000});
      return id;
    },
    async consume(id, answer) {
      if (!validId(id)) return false;
      await ensureSchema();
      return sequelize.transaction({logging:false}, async transaction => {
        const rows = await query('SELECT AnswerHash AS answer_hash FROM t_conf_captcha_challenges WHERE ChallengeID = :id FOR UPDATE', {id}, transaction, QueryTypes.SELECT);
        if (!rows.length) return false;
        const row = rows[0];
        // Delete even for a wrong, missing or expired answer. The lock and receipt
        // deletion commit before a caller can authenticate or issue a ticket.
        const [, receipt] = await query('DELETE FROM t_conf_captcha_challenges WHERE ChallengeID = :id AND AnswerHash = :answerHash AND ExpiresAt > UTC_TIMESTAMP(3)', {id, answerHash:row.answer_hash}, transaction);
        if (Number(receipt.affectedRows) !== 1) {
          await query('DELETE FROM t_conf_captcha_challenges WHERE ChallengeID = :id', {id}, transaction);
          return false;
        }
        const normalized = answerValue(answer);
        return normalized !== null &&
          /^[a-f0-9]{64}$/.test(row.answer_hash) && timingSafeEqual(Buffer.from(row.answer_hash, 'hex'), Buffer.from(digest(id, normalized), 'hex'));
      });
    }
  };
}

let singleton;
function getStore() {
  if (!singleton) singleton = createStore({sequelize:require('../../dao/db').db_smcicc.sequelize});
  return singleton;
}
async function consumeSession(ctx, answer, store = module.exports) {
  const id = ctx.session && ctx.session.captchaId;
  if (ctx.session) {
    delete ctx.session.captchaId;
    delete ctx.session.captcha; // Retire old signed cookies that contained answers.
  }
  if (!validId(id)) return false;
  return store.consume(id, answer);
}
module.exports = {createStore, consumeSession, TTL_MS, issue:(...args) => getStore().issue(...args), consume:(...args) => getStore().consume(...args), ensureSchema:() => getStore().ensureSchema()};
