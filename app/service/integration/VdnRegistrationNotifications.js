'use strict';
const {randomUUID}=require('node:crypto');
function createDispatcher({repository,delivery}){
 let running=false,timer;
 const service={
  async runBatch(){if(running)return;running=true;try{for(let i=0;i<5;i++){const row=await repository.transaction(db=>db.claimNotification(randomUUID()));if(!row)break;let ok=false;try{await delivery.send({purpose:row.purpose,channel:row.channel,to:row.recipient});ok=true;}catch{}await repository.transaction(db=>db.finishNotification(row,ok));}}finally{running=false;}},
  start(){if(timer)return;timer=setInterval(()=>service.runBatch().catch(()=>{}),5000);timer.unref();},
  stop(){if(timer)clearInterval(timer);timer=undefined;}
 };return service;
}
let singleton;function start(){if(!singleton)singleton=createDispatcher({repository:require('../../dao/VdnManagerDao'),delivery:require('./VdnRegistrationDelivery')});singleton.start();}
module.exports={createDispatcher,start};
