'use strict';
const fs=require('node:fs'),path=require('node:path');const {QueryTypes}=require('sequelize');
const ACCOUNT='UID AS uid, Name AS name, Company AS company, Phone AS phone, Email AS email, Status AS status, PhoneVerified AS phone_verified, EmailVerified AS email_verified, Legacy AS legacy, ReviewVersion AS review_version, ReviewNote AS review_note, ReviewDueAt AS review_due_at, CreatedAt AS created_at';
function createRepository({sequelize,ssoSchema='db_user_system'}){
 if(!/^[A-Za-z0-9_]+$/.test(ssoSchema))throw Error('Invalid SSO schema');
 function methods(transaction){
  const select=(sql,replacements={})=>sequelize.query(sql,{replacements,transaction,type:QueryTypes.SELECT,logging:false});
  const exec=(sql,replacements={})=>sequelize.query(sql,{replacements,transaction,logging:false});const lock=transaction?' FOR UPDATE':'';
  return {
   assertEngines:async()=>{const rows=await select("SELECT ENGINE FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME IN ('t_conf_manager_accounts','t_conf_registration_verifications','t_conf_registration_outbox','t_conf_registration_rate','t_conf_manager_vdn_creations','t_conf_manager_vdn_projects')");if(rows.length!==6||rows.some(r=>String(r.ENGINE).toLowerCase()!=='innodb'))throw Error('Registration requires InnoDB');},
   getAccountByPhone:async phone=>(await select('SELECT '+ACCOUNT+' FROM t_conf_manager_accounts WHERE Phone=:phone',{phone}))[0]||null,
   getAccount:async uid=>(await select('SELECT '+ACCOUNT+' FROM t_conf_manager_accounts WHERE UID=:uid'+lock,{uid}))[0]||null,
   listAccounts:f=>select('SELECT '+ACCOUNT+' FROM t_conf_manager_accounts '+(f.status?'WHERE Status=:status ':'')+(f.status==='pending'?'ORDER BY ReviewDueAt,UID LIMIT :limit':'ORDER BY CreatedAt DESC,UID LIMIT :limit'),f),
   setAccount:(uid,patch)=>{const cols={status:'Status',review_version:'ReviewVersion',reviewer:'Reviewer',review_note:'ReviewNote'};const keys=Object.keys(patch);if(keys.some(k=>!cols[k]))throw Error('Invalid manager update');return exec('UPDATE t_conf_manager_accounts SET '+keys.map(k=>cols[k]+'=:'+k).join(',')+' WHERE UID=:uid',{uid,...patch});},
   insertAccount:a=>exec(`INSERT INTO t_conf_manager_accounts (UID,Name,Company,Phone,Email,Status,PhoneVerified,EmailVerified,ReviewDueAt)
    VALUES (:uid,:name,:company,:phone,:email,'pending',1,1,DATE_ADD(UTC_TIMESTAMP(),INTERVAL 3 DAY))`,a),
   findPhone:async phone=>(await select('SELECT UID AS uid FROM t_conf_manager_accounts WHERE Phone=:phone LIMIT 1'+lock,{phone}))[0]||null,
   getVdn:async id=>(await select('SELECT ID AS id,Name AS name FROM t_icc_vdn WHERE ID=:id AND ID>0'+lock,{id}))[0]||null,
   findVdnByName:async name=>(await select('SELECT ID AS id,Name AS name FROM t_icc_vdn WHERE Name=:name'+lock,{name}))[0]||null,
   nextVdnId:async()=>Number((await select(`SELECT GREATEST(COALESCE(MAX(ID),0)+1,
    COALESCE((SELECT AUTO_INCREMENT FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='t_icc_vdn'),1),
    COALESCE((SELECT MAX(VDNID)+1 FROM t_conf_manager_vdn_creations),1),
    COALESCE((SELECT MAX(VDNID)+1 FROM t_conf_vdn_admin_grants),1)) AS id FROM t_icc_vdn WHERE ID>0`))[0].id),
   insertVdn:v=>exec("INSERT INTO t_icc_vdn (ID,Name,StartRecord,RecordWorkNo,SipExtStatusSupport,Expires) VALUES (:id,:name,0,0,1,'9999-12-31 23:59:59')",v),
   updateVdn:(id,name)=>exec('UPDATE t_icc_vdn SET Name=:name WHERE ID=:id',{id,name}),
   approvedByEmail:email=>select("SELECT UID AS uid FROM t_conf_manager_accounts WHERE Email=:email AND Status='approved' LIMIT 2"+lock,{email}),
   listVdnManagers:id=>select("SELECT g.UID AS uid,a.Name AS name,a.Email AS email,a.Status AS account_status FROM t_conf_vdn_admin_grants g LEFT JOIN t_conf_manager_accounts a ON BINARY a.UID=BINARY g.UID WHERE g.VDNID=:id AND g.State='active' ORDER BY g.UID"+lock,{id}),
   activateGrant:g=>exec("INSERT INTO t_conf_vdn_admin_grants (UID,VDNID,State,Source,GrantedBy,IdentityVerified) VALUES (:uid,:vdn_id,'active','direct',:granted_by,1) ON DUPLICATE KEY UPDATE State='active',Source='direct',GrantedBy=VALUES(GrantedBy),IdentityVerified=1",g),
   revokeGrant:(uid,id)=>exec("UPDATE t_conf_vdn_admin_grants SET State='revoked' WHERE UID=:uid AND VDNID=:id",{uid,id}),
   getGrant:async(uid,id)=>(await select('SELECT State AS state FROM t_conf_vdn_admin_grants WHERE UID=:uid AND VDNID=:id'+lock,{uid,id}))[0]||null,
   saveGrant:g=>exec('INSERT INTO t_conf_vdn_admin_grants (UID,VDNID,State,Source,GrantedBy,IdentityVerified) VALUES (:uid,:vdn_id,:state,:source,:granted_by,:identity_verified)',g),
   getCreation:async(uid,rid)=>(await select('SELECT VDNID AS vdn_id,RequestedName AS requested_name FROM t_conf_manager_vdn_creations WHERE UID=:uid AND RequestID=:rid'+lock,{uid,rid}))[0]||null,
   insertCreation:r=>exec('INSERT INTO t_conf_manager_vdn_creations (UID,RequestID,VDNID,RequestedName) VALUES (:uid,:request_id,:vdn_id,:requested_name)',r),
   getProject:async id=>(await select('SELECT Revision AS revision,Pending AS pending FROM t_conf_manager_vdn_projects WHERE VDNID=:id'+lock,{id}))[0]||null,
   touchProject:async id=>{await exec('INSERT INTO t_conf_manager_vdn_projects (VDNID,Revision,Pending) VALUES (:id,1,1) ON DUPLICATE KEY UPDATE Revision=Revision+1,Pending=1',{id});return Number((await select('SELECT Revision AS revision FROM t_conf_manager_vdn_projects WHERE VDNID=:id',{id}))[0].revision);},
   markProject:(id,revision)=>exec('UPDATE t_conf_manager_vdn_projects SET Pending=0 WHERE VDNID=:id AND Revision=:revision',{id,revision}),
   appendOutbox:r=>exec('INSERT IGNORE INTO t_conf_registration_outbox (ID,EventKey,UID,Purpose,Channel,Recipient,AvailableAt) VALUES (:id,:event_key,:uid,:purpose,:channel,:recipient,UTC_TIMESTAMP(3))',r),
   audit:a=>exec('INSERT INTO t_conf_vdn_access_audit (Actor,Action,TargetUID,VDNID,Outcome,Method) VALUES (:actor,:action,:target_uid,:vdn_id,\'success\',:method)',{target_uid:null,vdn_id:null,method:null,...a}),
   outboxSummary:()=>select("SELECT UID AS uid,State AS state,COUNT(*) AS count FROM t_conf_registration_outbox WHERE State<>'sent' GROUP BY UID,State"),
   retryOutbox:uid=>exec("UPDATE t_conf_registration_outbox SET State='pending',AvailableAt=UTC_TIMESTAMP(3),Attempts=0,LeaseToken=NULL,LeaseUntil=NULL,LastError='' WHERE UID=:uid AND State='failed'",{uid}),
   cleanupVerification:async()=>{await exec('DELETE FROM t_conf_registration_verifications WHERE ExpiresAt<DATE_SUB(UTC_TIMESTAMP(3),INTERVAL 1 DAY) LIMIT 100');await exec('DELETE FROM t_conf_registration_rate WHERE WindowStart<DATE_SUB(UTC_TIMESTAMP(3),INTERVAL 2 DAY) LIMIT 100');},
   getVerification:async id=>(await select('SELECT ID AS id,Phone AS phone,Email AS email,SmsHash AS sms_hash,EmailHash AS email_hash,State AS state,Attempts AS attempts,ExpiresAt AS expires_at,(ExpiresAt>UTC_TIMESTAMP(3)) AS valid FROM t_conf_registration_verifications WHERE ID=:id'+lock,{id}))[0]||null,
   insertVerification:r=>exec('INSERT INTO t_conf_registration_verifications (ID,Phone,Email,SmsHash,EmailHash,State,ExpiresAt) VALUES (:id,:phone,:email,:sms_hash,:email_hash,\'sending\',TIMESTAMPADD(SECOND,:ttl,UTC_TIMESTAMP(3)))',r),
   setVerification:(id,state)=>exec('UPDATE t_conf_registration_verifications SET State=:state WHERE ID=:id AND State IN (\'sending\',\'ready\')',{id,state}),
   failVerification:id=>exec('UPDATE t_conf_registration_verifications SET Attempts=Attempts+1 WHERE ID=:id',{id}),
   rate:async(bucket,windowSeconds,max)=>{
    await exec('INSERT INTO t_conf_registration_rate (Bucket,Count,WindowStart) VALUES (:bucket,0,UTC_TIMESTAMP(3)) ON DUPLICATE KEY UPDATE Bucket=VALUES(Bucket)',{bucket});
    const row=(await select('SELECT Count AS count,(TIMESTAMPDIFF(SECOND,WindowStart,UTC_TIMESTAMP(3))>=:windowSeconds) AS reset FROM t_conf_registration_rate WHERE Bucket=:bucket FOR UPDATE',{bucket,windowSeconds}))[0];
    if(Number(row.reset)){await exec('UPDATE t_conf_registration_rate SET Count=1,WindowStart=UTC_TIMESTAMP(3) WHERE Bucket=:bucket',{bucket});return true;}
    if(Number(row.count)>=max)return false;await exec('UPDATE t_conf_registration_rate SET Count=Count+1 WHERE Bucket=:bucket',{bucket});return true;
   },
   claimNotification:async token=>{
    const rows=await select("SELECT ID AS id,UID AS uid,Purpose AS purpose,Channel AS channel,Recipient AS recipient,Attempts AS attempts FROM t_conf_registration_outbox WHERE (State='pending' AND AvailableAt<=UTC_TIMESTAMP(3)) OR (State='sending' AND LeaseUntil<UTC_TIMESTAMP(3)) ORDER BY AvailableAt LIMIT 1 FOR UPDATE");
    if(!rows.length)return null;const row=rows[0];await exec("UPDATE t_conf_registration_outbox SET State='sending',LeaseToken=:token,LeaseUntil=DATE_ADD(UTC_TIMESTAMP(3),INTERVAL 60 SECOND),Attempts=Attempts+1 WHERE ID=:id",{token,id:row.id});return {...row,lease_token:token,attempts:Number(row.attempts)+1};
   },
   finishNotification:(row,ok)=>exec("UPDATE t_conf_registration_outbox SET State=:state,AvailableAt=TIMESTAMPADD(SECOND,:delay,UTC_TIMESTAMP(3)),LeaseToken=NULL,LeaseUntil=NULL,LastError=:error,SentAt=CASE WHEN :ok=1 THEN UTC_TIMESTAMP(3) ELSE SentAt END WHERE ID=:id AND LeaseToken=:token AND State='sending'",{id:row.id,token:row.lease_token,state:ok?'sent':row.attempts>=5?'failed':'pending',delay:Math.min(3600,30*2**row.attempts),error:ok?'':'delivery_failed',ok:ok?1:0}),
  };
 }
 return {
  read:fn=>fn(methods()),
  transaction:fn=>sequelize.transaction({logging:false},async transaction=>{await sequelize.query("INSERT INTO t_conf_onboard_state (VDNID,StateJson) VALUES (0,'{}') ON DUPLICATE KEY UPDATE VDNID=VALUES(VDNID)",{transaction,logging:false});await sequelize.query('SELECT VDNID FROM t_conf_onboard_state WHERE VDNID=0 FOR UPDATE',{transaction,type:QueryTypes.SELECT,logging:false});return fn(methods(transaction));}),
  methods,
  ensureSchema:async()=>{
   const rows=await sequelize.query("SELECT TABLE_NAME,ENGINE FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME IN ('t_icc_vdn','t_conf_onboard_state','t_conf_vdn_access_audit','t_conf_vdn_admin_grants')",{type:QueryTypes.SELECT,logging:false});
   if(rows.length!==4||rows.some(r=>String(r.ENGINE).toLowerCase()!=='innodb'))throw Error('Manager registration requires all mutation tables to be InnoDB');
   const sql=fs.readFileSync(path.join(__dirname,'../../sql/conf_manager_accounts.sql'),'utf8').replace(/`db_user_system`/g,'`'+ssoSchema+'`');
   const statements=sql.replace(/^\s*--.*$/gm,'').split(';').map(s=>s.trim()).filter(Boolean);
   for(const statement of statements.filter(s=>/^CREATE TABLE/i.test(s)))await sequelize.query(statement,{logging:false});
   const engines=await sequelize.query("SELECT ENGINE FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME IN ('t_conf_manager_accounts','t_conf_registration_verifications','t_conf_registration_rate','t_conf_registration_outbox','t_conf_manager_vdn_creations','t_conf_manager_vdn_projects','t_conf_manager_schema')",{type:QueryTypes.SELECT,logging:false});
   if(engines.length!==7||engines.some(r=>String(r.ENGINE).toLowerCase()!=='innodb'))throw Error('Manager tables must all be InnoDB');
   await sequelize.transaction({logging:false},async transaction=>{for(const statement of statements.filter(s=>!/^CREATE TABLE|^START TRANSACTION$|^COMMIT$/i.test(s)))await sequelize.query(statement,{transaction,logging:false});});
  }
 };
}
let singleton;
function runtime(){if(!singleton)singleton=createRepository({sequelize:require('./db').db_smcicc.sequelize,ssoSchema:require('../../sso/dao/db').db_user_system.sequelize.config.database});return singleton;}
module.exports={createRepository,read:fn=>runtime().read(fn),transaction:fn=>runtime().transaction(fn),methods:t=>runtime().methods(t),ensureSchema:()=>runtime().ensureSchema()};
