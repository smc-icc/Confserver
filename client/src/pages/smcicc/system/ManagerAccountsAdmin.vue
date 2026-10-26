<template>
 <section class="manager-accounts" v-loading="loading">
  <header><div><h1>注册账号审核</h1><p>审核通过后开通 VDN 管理员资格，VDN 由管理员自行创建。</p></div><el-button :disabled="busy" @click="load">刷新</el-button></header>
  <el-alert v-if="!loading && !deliveryReady" title="注册短信或邮箱发送服务尚未就绪，请先配置发送服务。" type="warning" :closable="false" show-icon />
  <p v-if="!loading && !deliveryReady && !forbidden"><router-link to="/smcicc/system/registration-notifications">前往注册通知配置</router-link></p>
  <el-alert v-if="error" :title="error" type="error" :closable="false" show-icon />
  <el-alert v-if="notice" :title="notice" type="success" :closable="false" show-icon />
  <template v-if="!forbidden">
   <el-select v-model="status" :disabled="busy || loading" @change="load"><el-option label="全部" value=""/><el-option v-for="s in statuses" :key="s.value" :label="s.label" :value="s.value"/></el-select>
   <el-table :data="items" empty-text="暂无注册申请" class="account-table">
    <el-table-column label="申请人" min-width="180"><template slot-scope="s"><strong>{{ s.row.name }}</strong><div>{{ s.row.company }}</div></template></el-table-column>
    <el-table-column label="联系方式" min-width="230"><template slot-scope="s"><div>{{ s.row.phone || '未提供手机号' }}</div><div>{{ s.row.email }}</div><el-tag size="small" :type="s.row.phone_verified && s.row.email_verified ? 'success':'warning'">{{ s.row.phone_verified && s.row.email_verified ? '手机、邮箱已验证' : '旧版账号，需核验身份' }}</el-tag></template></el-table-column>
    <el-table-column label="状态" min-width="130"><template slot-scope="s"><span>{{ label(s.row.status) }}</span><div v-if="overdue(s.row)" class="overdue">已超过三天待审核</div></template></el-table-column>
    <el-table-column label="操作" min-width="220"><template slot-scope="s"><el-button v-if="s.row.status==='pending'" type="text" :disabled="busy" @click="open(s.row)">审核</el-button><el-button v-if="['approved','disabled'].includes(s.row.status)" type="text" :disabled="busy" @click="setEnabled(s.row)">{{ s.row.status==='approved'?'停用':'重新启用' }}</el-button><el-button v-if="hasFailed(s.row.uid)" type="text" :disabled="busy" @click="retryNotifications(s.row)">重试通知</el-button></template></el-table-column>
   </el-table>
   <p class="hint">列表最多显示100条，可按状态筛选；待审核申请按提交先后处理。通知发送失败时可重试。</p>
  </template>
  <el-dialog title="审核注册账号" :visible.sync="reviewing" width="min(560px,94vw)" :close-on-click-modal="false" :show-close="!busy">
   <template v-if="selected"><p>{{ selected.name }} · {{ selected.company }}</p><p>{{ selected.phone }} · {{ selected.email }}</p><p class="hint">通过审核仅开通账号资格，不创建或分配 VDN。</p><el-checkbox v-if="selected.legacy" v-model="legacyVerified" :disabled="busy">我已线下核验此旧版账号身份</el-checkbox><el-input v-model.trim="note" type="textarea" :rows="3" maxlength="1000" :disabled="busy" placeholder="审核说明（拒绝时必填）" /></template>
   <span slot="footer"><el-button :disabled="busy" @click="reviewing=false">取消</el-button><el-button type="danger" :disabled="busy || !note" @click="decide('reject')">拒绝注册</el-button><el-button type="primary" :disabled="busy || (selected && selected.legacy && !legacyVerified)" @click="decide('approve')">同意注册</el-button></span>
  </el-dialog>
 </section>
</template>
<script>
const API='/server/api/smcicc/manager';
export default {
 name:'ManagerAccountsAdmin',data:()=>({items:[],notifications:[],deliveryReady:true,status:'pending',statuses:[{value:'pending',label:'待审核'},{value:'approved',label:'已通过'},{value:'rejected',label:'未通过'},{value:'disabled',label:'已停用'}],loading:false,busy:false,forbidden:false,error:'',notice:'',reviewing:false,selected:null,note:'',legacyVerified:false}),created(){this.load();},
 methods:{label(status){return (this.statuses.find(x=>x.value===status)||{}).label||'未知';},overdue(a){return a.status==='pending'&&a.review_due_at&&new Date(a.review_due_at).getTime()<Date.now();},hasFailed(uid){return this.notifications.some(x=>x.uid===uid&&x.state==='failed');},failure(e){this.error='操作未完成，请刷新或联系管理员。';if(!Number(e&&e.ret_code)||[401,403].includes(Number(e&&e.ret_code))||['Forbidden','Unauthorized'].includes(e&&e.message)){this.forbidden=true;this.items=[];this.reviewing=false;}},
  async load(){if(this.loading)return;this.loading=true;this.error='';try{const r=await this.$ajax.getJSON(API+'/accounts',{status:this.status,limit:100});this.items=Array.isArray(r.items)?r.items:[];this.notifications=Array.isArray(r.notifications)?r.notifications:[];this.forbidden=false;try{const readiness=await this.$ajax.getJSON('/server/api/vdn-access/readiness');this.deliveryReady=readiness.ready===true;}catch{this.deliveryReady=false;}}catch(e){this.failure(e);}finally{this.loading=false;}},
  open(row){if(this.busy)return;this.selected=row;this.note='';this.legacyVerified=false;this.error='';this.reviewing=true;},
  async decide(decision){if(this.busy||!this.selected||this.selected.status!=='pending'||(decision==='reject'&&!this.note)||(decision==='approve'&&this.selected.legacy&&!this.legacyVerified))return;this.busy=true;this.error='';try{await this.$ajax.postJSON(API+'/review',{uid:this.selected.uid,decision,note:this.note,...(this.selected.legacy?{legacy_identity_verified:this.legacyVerified}:{})});this.reviewing=false;this.notice='审核结果已保存，短信和邮件通知将自动发送。';await this.load();}catch(e){this.failure(e);}finally{this.busy=false;}},
  async setEnabled(row){if(this.busy)return;try{const {value}=await this.$prompt('请填写操作原因',row.status==='approved'?'停用账号':'重新启用账号',{inputValidator:v=>Boolean(v&&v.trim()&&v.length<=1000)||'请填写原因'});this.busy=true;await this.$ajax.postJSON(API+'/enabled',{uid:row.uid,enabled:row.status!=='approved',note:value.trim()});await this.load();}catch(e){if(e!=='cancel'&&e!=='close')this.failure(e);}finally{this.busy=false;}},
  async retryNotifications(row){if(this.busy)return;this.busy=true;try{await this.$ajax.postJSON(API+'/retry-notifications',{uid:row.uid});await this.load();}catch(e){this.failure(e);}finally{this.busy=false;}}
 }
};
</script>
<style scoped>
.manager-accounts{padding:28px;max-width:1300px;color:#24334b}.manager-accounts header{display:flex;justify-content:space-between;align-items:center;gap:20px;flex-wrap:wrap}.manager-accounts h1{font-size:25px;margin:0 0 8px}.manager-accounts p,.hint{color:#6b778a}.el-alert{margin:18px 0}.account-table{margin-top:20px}.overdue{color:#c27722;font-size:12px}.el-textarea{margin-top:20px}.hint{font-size:13px}@media(max-width:700px){.manager-accounts{padding:18px}}
</style>
