'use strict';
const { QueryTypes } = require('sequelize');
const fs = require('node:fs');
const path = require('node:path');
const PROFILE = 'UID AS uid, Name AS name, Email AS email, Enabled AS enabled, VerificationStatus AS verification_status';
const REQUEST = 'ID AS id, UID AS uid, Kind AS kind, TargetVDN AS vdn_id, ProposedName AS vdn_name, Organization AS organization, Reason AS reason, Status AS status, Reviewer AS reviewer, ReviewNote AS review_note, ResultVDN AS result_vdn_id, ProjectionPending AS projection_pending, CreatedAt AS created_at';
const GRANT = 'g.UID AS uid, g.VDNID AS vdn_id, v.Name AS vdn_name, g.State AS state, g.Source AS source, g.GrantedBy AS granted_by, g.IdentityVerified AS identity_verified';
const LEGACY_JOINS = `JOIN t_icc_vdn v ON v.ID = u.VDNID AND v.ID > 0
 JOIN t_user_grantpower g ON g.VDNID = v.ID AND g.PowerId = 10000 AND g.IsOwn = 1`;
const LEGACY_OWNERS = `((g.OwnerType = 3 AND g.OwnerId = u.ID)
 OR (g.OwnerType = 1 AND EXISTS (SELECT 1 FROM t_user_usertorole r WHERE r.VDNID = v.ID AND r.UserID = u.ID AND r.RoleID = g.OwnerId))
 OR (g.OwnerType = 2 AND EXISTS (SELECT 1 FROM t_user_usertodepart d WHERE d.VDNID = v.ID AND d.UserID = u.ID AND d.departid = g.OwnerId)))`;
function identity(uid) {
  const m=/^conf-vdn:([1-9]\d*):([1-9]\d*):(.+)$/.exec(uid||'');if(!m)return null;
  try {const vdnId=Number(m[1]),sourceId=Number(m[2]);return Number.isSafeInteger(vdnId)&&Number.isSafeInteger(sourceId)?{vdnId,sourceId,workNo:decodeURIComponent(m[3])}:null;}catch{return null;}
}
function sqlIdentifier(value) {if(!/^[A-Za-z0-9_]+$/.test(value))throw new Error('Invalid SQL identifier');return '`'+value+'`';}
/**
 * sequelize: authoritative ICC connection. ssoSequelize: read-only SSO directory
 * connection (may be the same). ssoTable is a trusted deployment/test identifier.
 * Authentication/SSO writes deliberately are not part of this repository.
 */
function createRepository({sequelize, ssoSequelize=sequelize, ssoTable='t_user_info', migrationSsoTable}={}) {
  if(!sequelize||!ssoSequelize)throw new TypeError('ICC and SSO Sequelize connections required');
  const ssoName=sqlIdentifier(ssoTable);
  const migrationDirectory=migrationSsoTable || (ssoSequelize.config?.database ? sqlIdentifier(ssoSequelize.config.database)+'.'+ssoName : ssoName);
  function methods(transaction) {
    const select=(sql,replacements={})=>sequelize.query(sql,{replacements,transaction,type:QueryTypes.SELECT,logging:false});
    const exec=(sql,replacements={})=>sequelize.query(sql,{replacements,transaction,logging:false});
    const ssoSelect=(sql,replacements={})=>ssoSequelize.query(sql,{replacements,...(ssoSequelize===sequelize?{transaction}:{}),type:QueryTypes.SELECT,logging:false});
    const locked=transaction?' FOR UPDATE':'';
    const api={
      findSso:async uid=>{
        const row=(await ssoSelect(`SELECT uid, email, (password IS NOT NULL AND password <> '') AS has_credential FROM ${ssoName} WHERE BINARY uid = BINARY :uid LIMIT 1`,{uid}))[0];
        return row?{uid:row.uid,email:row.email||'',has_credential:Boolean(Number(row.has_credential))}:null;
      },
      findManager:async uid=>(await select('SELECT Status AS status FROM t_conf_manager_accounts WHERE UID=:uid'+locked,{uid}))[0]||null,
      findProfile:async uid=>(await select(`SELECT ${PROFILE} FROM t_conf_access_profiles WHERE UID = :uid${locked}`,{uid}))[0]||null,
      findSource:async uid=>{
        const parsed=identity(uid);if(!parsed)return null;
        const row=(await select(`SELECT ID AS id, VDNID AS vdnId, WorkNO AS workNo, Name AS name, Email AS email, IsValid AS enabled
          FROM t_user_users WHERE ID = :sourceId AND VDNID = :vdnId${locked}`,parsed))[0];
        return row&&String(row.workNo)===parsed.workNo?row:null;
      },
      listLegacyVdns:async uid=>{
        const u=await api.findSource(uid);if(!u||Number(u.enabled)!==1)return [];
        return select(`SELECT DISTINCT v.ID AS id, v.Name AS name FROM t_user_users u ${LEGACY_JOINS}
          WHERE u.ID = :sourceId AND u.VDNID = :vdnId AND u.IsValid = 1 AND ${LEGACY_OWNERS}`,{sourceId:u.id,vdnId:u.vdnId});
      },
      listVdns:()=>select('SELECT ID AS id, Name AS name FROM t_icc_vdn WHERE ID > 0 ORDER BY ID'),
      findVdn:async id=>(await select(`SELECT ID AS id, Name AS name FROM t_icc_vdn WHERE ID = :id AND ID > 0${locked}`,{id}))[0]||null,
      findVdnByName:async name=>(await select(`SELECT ID AS id, Name AS name FROM t_icc_vdn WHERE Name = :name${locked}`,{name}))[0]||null,
      listGrants:uid=>select(`SELECT ${GRANT} FROM t_conf_vdn_admin_grants g LEFT JOIN t_icc_vdn v ON v.ID = g.VDNID ${uid?'WHERE g.UID = :uid':''} ORDER BY g.VDNID, g.UID${locked}`,{uid}),
      findEmailOwners:async email=>{
        const profiles=await select('SELECT UID AS uid FROM t_conf_access_profiles WHERE Email = :email',{email});
        const sso=await ssoSelect(`SELECT uid FROM ${ssoName} WHERE LOWER(TRIM(email)) = :email`,{email});
        const source=await select('SELECT ID AS id, VDNID AS vdnId, WorkNO AS workNo FROM t_user_users WHERE LOWER(TRIM(Email)) = :email',{email});
        return [...profiles,...sso,...source.map(u=>({uid:`conf-vdn:${u.vdnId}:${u.id}:${encodeURIComponent(u.workNo)}`}))];
      },
      insertProfile:p=>exec(`INSERT INTO t_conf_access_profiles (UID,Name,Email,Enabled,VerificationStatus)
        VALUES (:uid,:name,:email,:enabled,:verification_status)`,p),
      verifyProfile:uid=>exec("UPDATE t_conf_access_profiles SET VerificationStatus = 'admin_verified' WHERE UID = :uid",{uid}),
      findRequest:async id=>(await select(`SELECT ${REQUEST} FROM t_conf_vdn_access_requests WHERE ID = :id${locked}`,{id}))[0]||null,
      listRequests:filter=>{
        const where=[];if(filter.uid)where.push('UID = :uid');if(filter.status)where.push('Status = :status');
        return select(`SELECT ${REQUEST} FROM t_conf_vdn_access_requests ${where.length?'WHERE '+where.join(' AND '):''} ORDER BY CreatedAt DESC, ID DESC LIMIT :limit${locked}`,filter);
      },
      insertRequest:r=>exec(`INSERT INTO t_conf_vdn_access_requests (ID,UID,Kind,TargetVDN,ProposedName,Organization,Reason,Status)
        VALUES (:id,:uid,:kind,:vdn_id,:vdn_name,:organization,:reason,:status)`,r),
      updateRequest:(id,patch)=>{
        const columns={status:'Status',reviewer:'Reviewer',review_note:'ReviewNote',result_vdn_id:'ResultVDN',projection_pending:'ProjectionPending'};
        const keys=Object.keys(patch);if(!keys.length||keys.some(k=>!columns[k]))throw new Error('Invalid request patch');
        return exec(`UPDATE t_conf_vdn_access_requests SET ${keys.map(k=>columns[k]+' = :'+k).join(', ')} WHERE ID = :id`,{id,...patch});
      },
      saveGrant:g=>exec(`INSERT INTO t_conf_vdn_admin_grants (UID,VDNID,State,Source,GrantedBy,IdentityVerified)
        VALUES (:uid,:vdn_id,:state,:source,:granted_by,:identity_verified) ON DUPLICATE KEY UPDATE
        State = VALUES(State), Source = VALUES(Source), GrantedBy = VALUES(GrantedBy), IdentityVerified = VALUES(IdentityVerified)`,g),
      createVdn:async v=>{await require('../service/integration/VdnIdSafety').createGuard({select})(v.id);return exec(`INSERT INTO t_icc_vdn (ID,Name,StartRecord,RecordWorkNo,SipExtStatusSupport,Expires)
        VALUES (:id,:name,0,0,1,'9999-12-31 23:59:59')`,v);},
      audit:a=>exec(`INSERT INTO t_conf_vdn_access_audit (Actor,Action,TargetUID,VDNID,RequestID,Outcome,Method)
        VALUES (:actor,:action,:target_uid,:vdn_id,:request_id,:outcome,:method)`,{target_uid:null,vdn_id:null,request_id:null,method:null,...a}),
      findAccounts:async query=>{
        // UID/email exact search works regardless of length/collation; partial search
        // is bounded by the service's minimum term and a hard 50-row directory limit.
        // Include profile/source names without assuming a name column exists in SSO.
        const pattern='%'+query.replace(/[!%_]/g,c=>'!'+c)+'%';
        const directory=await ssoSelect(`SELECT uid, email FROM ${ssoName}
          ${query?"WHERE BINARY uid = BINARY :query OR LOWER(TRIM(email)) = LOWER(:query) OR uid LIKE :pattern ESCAPE '!' OR email LIKE :pattern ESCAPE '!'":''}
          ORDER BY CASE WHEN BINARY uid = BINARY :query THEN 0 WHEN LOWER(TRIM(email)) = LOWER(:query) THEN 1 ELSE 2 END, uid LIMIT 50`,{query,pattern});
        if(!query)return directory;
        const namedProfiles=await select("SELECT UID AS uid FROM t_conf_access_profiles WHERE Name LIKE :pattern ESCAPE '!' ORDER BY UID LIMIT 50",{pattern});
        const namedSources=await select("SELECT ID AS id, VDNID AS vdnId, WorkNO AS workNo FROM t_user_users WHERE Name LIKE :pattern ESCAPE '!' ORDER BY VDNID, ID LIMIT 50",{pattern});
        const candidates=[...namedProfiles.map(x=>x.uid),...namedSources.map(u=>`conf-vdn:${u.vdnId}:${u.id}:${encodeURIComponent(u.workNo)}`)];
        for(const uid of candidates){if(directory.length>=50)break;if(directory.some(x=>x.uid===uid))continue;const row=await api.findSso(uid);if(row)directory.push(row);}
        return directory;
      },
      listLegacyGrants:async()=>{
        const users=await select(`SELECT DISTINCT u.ID AS id, u.VDNID AS vdnId, u.WorkNO AS workNo, v.Name AS vdn_name
          FROM t_user_users u ${LEGACY_JOINS} WHERE u.IsValid = 1 AND ${LEGACY_OWNERS}`);
        const result=[];
        for(const u of users){const uid=`conf-vdn:${u.vdnId}:${u.id}:${encodeURIComponent(u.workNo)}`;if(await api.findSso(uid))result.push({uid,vdn_id:Number(u.vdnId),vdn_name:u.vdn_name});}
        return result;
      }
    };
    return api;
  }
  return {
    read:fn=>fn(methods()),
    transaction:fn=>sequelize.transaction({logging:false},async transaction=>{
      const options={transaction,logging:false};
      // Same global row and acquisition order as OnboardDao.lock(0,...).
      await sequelize.query("INSERT INTO t_conf_onboard_state (VDNID,StateJson) VALUES (0,'{}') ON DUPLICATE KEY UPDATE VDNID = VALUES(VDNID)",options);
      await sequelize.query('SELECT VDNID FROM t_conf_onboard_state WHERE VDNID = 0 FOR UPDATE',{...options,type:QueryTypes.SELECT});
      return fn(methods(transaction));
    }),
    ensureSchema:async()=>{
      if(!/^`[A-Za-z0-9_]+`(?:\.`[A-Za-z0-9_]+`)?$/.test(migrationDirectory))throw new Error('Invalid migration SSO table');
      const sql=fs.readFileSync(path.join(__dirname,'../../sql/conf_vdn_access.sql'),'utf8').replace(/`db_user_system`\.`t_user_info`/g,migrationDirectory);
      const statements=sql.replace(/^\s*--.*$/gm,'').split(';').map(x=>x.trim()).filter(Boolean);
      // All statements share one connection. Engine conversion is an explicit
      // operator migration with backup/SQL-mode review, never a service action.
      const connection=await sequelize.connectionManager.getConnection({type:'WRITE'});
      try {
        const engines=await new Promise((resolve,reject)=>connection.query("SELECT ENGINE FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 't_icc_vdn'",(error,rows)=>error?reject(error):resolve(rows)));
        if(engines.length!==1 || String(engines[0].ENGINE).toLowerCase()!=='innodb') {
          throw Object.assign(new Error('VDN access migration requires t_icc_vdn ENGINE=InnoDB. Back up and explicitly convert only that table before running ensureSchema; no schema changes were applied.'),{status:503});
        }
        for(const statement of statements)await new Promise((resolve,reject)=>connection.query(statement,(error,result)=>error?reject(error):resolve(result)));
      }catch(error){await new Promise(resolve=>connection.query('ROLLBACK',()=>resolve()));throw error;}
      finally {await new Promise(resolve=>connection.query('DROP TEMPORARY TABLE IF EXISTS conf_access_seed_candidates',()=>resolve()));await sequelize.connectionManager.releaseConnection(connection);}
    }
  };
}
let singleton;
function runtime() {
  if(!singleton)singleton=createRepository({sequelize:require('./db').db_smcicc.sequelize,ssoSequelize:require('../../sso/dao/db').db_user_system.sequelize});
  return singleton;
}
module.exports={createRepository,read:fn=>runtime().read(fn),transaction:fn=>runtime().transaction(fn),ensureSchema:()=>runtime().ensureSchema()};
