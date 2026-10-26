'use strict';
function createGuard({select,enabled=()=>process.env.CONF_TENANCY_ENABLED==='1'}){
 return async(id,transaction)=>{
  if(!enabled())return;
  const rows=await select("SELECT :id AS id FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='t_icc_vdn' AND :id<COALESCE(AUTO_INCREMENT,1) UNION ALL SELECT VDNID AS id FROM t_conf_manager_vdn_creations WHERE VDNID=:id UNION ALL SELECT VDNID AS id FROM t_conf_vdn_admin_grants WHERE VDNID=:id LIMIT 1",{id},transaction);
  if(rows.length)throw Object.assign(new Error('VDN 编号有历史管理关系，不可重新使用，请使用新的编号'),{status:409});
 };
}
const assertUnused=(id,transaction)=>createGuard({select:(...args)=>require('../../dao/OnboardDao').select(...args)})(id,transaction);
module.exports={createGuard,assertUnused};
