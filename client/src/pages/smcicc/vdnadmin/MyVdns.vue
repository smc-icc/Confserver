<template>
  <section class="manager-workspace" v-loading="loading">
    <header class="workspace-header"><div><h1>我的 VDN</h1><p>创建并维护您有管理权限的业务空间。</p></div><div><el-button :disabled="busy || loading" @click="load">刷新</el-button><el-button type="primary" :disabled="busy || loading || forbidden" @click="openCreate">创建 VDN</el-button></div></header>
    <el-alert v-if="error" :title="error" type="error" show-icon :closable="false" />
    <el-alert v-if="notice" :title="notice" type="success" show-icon :closable="false" />
    <el-empty v-if="!loading && !forbidden && !items.length" description="暂未创建 VDN"><el-button type="primary" :disabled="busy" @click="openCreate">创建 VDN</el-button></el-empty>
    <el-table v-if="items.length && !forbidden" :data="items" class="workspace-table">
      <el-table-column prop="id" label="VDN 编号" width="120" /><el-table-column prop="name" label="名称" min-width="180" />
      <el-table-column label="状态" min-width="120"><template slot-scope="scope"><el-tag :type="scope.row.projection_pending ? 'warning' : 'success'">{{ scope.row.projection_pending ? '待同步' : '已就绪' }}</el-tag></template></el-table-column>
      <el-table-column label="操作" min-width="350"><template slot-scope="scope"><el-button type="text" :disabled="busy" @click="configure(scope.row)">业务配置</el-button><el-button type="text" :disabled="busy" @click="openManagers(scope.row)">VDN 管理员</el-button><el-button type="text" :disabled="busy" @click="members(scope.row)">业务成员</el-button><el-button type="text" :disabled="busy" @click="rename(scope.row)">修改名称</el-button><el-button v-if="scope.row.projection_pending" type="text" :disabled="busy" @click="retry(scope.row)">重试同步</el-button></template></el-table-column>
    </el-table>
    <el-dialog title="创建 VDN" :visible.sync="creating" width="min(480px, 94vw)" :close-on-click-modal="false" :show-close="!busy">
      <el-form label-position="top" @submit.native.prevent="create"><el-form-item label="VDN 名称" required><el-input v-model.trim="newName" maxlength="40" :disabled="busy" @input="requestId = ''" placeholder="例如：客户服务中心" /></el-form-item><p class="hint">创建后您自动获得此 VDN 的管理权限。</p></el-form>
      <span slot="footer"><el-button :disabled="busy" @click="creating=false">取消</el-button><el-button type="primary" :loading="busy" :disabled="newName.length < 2" @click="create">创建</el-button></span>
    </el-dialog>
    <el-dialog title="VDN 管理员" :visible.sync="managersVisible" width="min(660px,94vw)" :close-on-click-modal="false">
      <p v-if="selectedVdn">{{ selectedVdn.name }}</p><p class="hint">仅可添加已通过注册审核的管理员；此操作不会开通账号资格。</p>
      <el-form inline @submit.native.prevent="invite"><el-form-item label="管理员邮箱"><el-input v-model.trim="inviteEmail" type="email" :disabled="busy" /></el-form-item><el-form-item><el-button type="primary" native-type="submit" :disabled="busy || !inviteEmail">添加管理员</el-button></el-form-item></el-form>
      <el-table :data="managerRows" size="small"><el-table-column label="账号" min-width="170"><template slot-scope="s">{{ s.row.name || s.row.uid }}<span v-if="s.row.uid === selfUid">（本人）</span></template></el-table-column><el-table-column prop="email" label="邮箱" min-width="190"/><el-table-column label="操作" width="90"><template slot-scope="s"><el-button type="text" :disabled="busy || s.row.uid === selfUid" @click="removeManager(s.row)">移除</el-button></template></el-table-column></el-table>
    </el-dialog>
  </section>
</template>
<script>
const API='/server/api/smcicc/manager';
function uuid(){const bytes=new Uint8Array(16);window.crypto.getRandomValues(bytes);bytes[6]=(bytes[6]&15)|64;bytes[8]=(bytes[8]&63)|128;const h=Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');return h.slice(0,8)+'-'+h.slice(8,12)+'-'+h.slice(12,16)+'-'+h.slice(16,20)+'-'+h.slice(20);}
export default {
 name:'MyVdns',data:()=>({items:[],loading:false,busy:false,forbidden:false,error:'',notice:'',creating:false,newName:'',requestId:'',managersVisible:false,selectedVdn:null,managerRows:[],selfUid:'',inviteEmail:''}),created(){this.load();},
 methods:{
  failure(e){const status=Number(e&&e.ret_code||e&&e.status);if(!status||status===401||status===403||['Forbidden','Unauthorized'].includes(e&&e.message)){this.items=[];this.forbidden=true;this.creating=false;this.managersVisible=false;}this.error=status===409?'VDN 名称已存在或操作状态已变更，请刷新后确认。':'操作未完成，请刷新确认或联系管理员。';},
  async load(){if(this.loading)return;this.loading=true;this.error='';try{const r=await this.$ajax.getJSON(API+'/vdns');this.items=Array.isArray(r.items)?r.items:[];this.forbidden=false;}catch(e){this.failure(e);}finally{this.loading=false;}},
  openCreate(){if(this.busy||this.forbidden)return;this.newName='';this.requestId='';this.error='';this.notice='';this.creating=true;},
  async create(){if(this.busy||this.forbidden||this.newName.length<2||this.newName.length>40)return;this.busy=true;this.error='';try{if(!this.requestId)this.requestId=uuid();const r=await this.$ajax.postJSON(API+'/vdns/create',{name:this.newName,request_id:this.requestId});this.creating=false;this.notice=r.projection_pending?'VDN 已创建，运行配置正在同步，可稍后重试。':'VDN 已创建。';await this.load();this.$root.$emit('smcicc-vdn-menu-refresh');}catch(e){this.failure(e);}finally{this.busy=false;}},
  async rename(row){if(this.busy||this.forbidden)return;try{const {value}=await this.$prompt('请输入 VDN 名称','修改名称',{inputValue:row.name,inputValidator:v=>Boolean(v&&v.trim().length>=2&&v.trim().length<=40)||'名称需为2至40个字符'});this.busy=true;await this.$ajax.postJSON(API+'/vdns/update',{id:Number(row.id),name:value.trim()});await this.load();this.$root.$emit('smcicc-vdn-menu-refresh');}catch(e){if(e!=='cancel'&&e!=='close')this.failure(e);}finally{this.busy=false;}},
  async retry(row){if(this.busy||this.forbidden)return;this.busy=true;try{await this.$ajax.postJSON(API+'/vdns/retry',{id:Number(row.id)});await this.load();}catch(e){this.failure(e);}finally{this.busy=false;}},
  async openManagers(row){if(this.busy||this.forbidden)return;this.selectedVdn=row;this.inviteEmail='';this.error='';this.busy=true;try{const r=await this.$ajax.getJSON(API+'/vdns/managers',{id:Number(row.id)});this.managerRows=r.items||[];this.selfUid=r.self_uid;this.managersVisible=true;}catch(e){this.failure(e);}finally{this.busy=false;}},
  async invite(){if(this.busy||!this.selectedVdn||!this.inviteEmail)return;this.busy=true;try{await this.$ajax.postJSON(API+'/vdns/invite',{id:Number(this.selectedVdn.id),email:this.inviteEmail});this.busy=false;await this.openManagers(this.selectedVdn);}catch(e){if(Number(e&&e.ret_code)===409)this.error='仅可添加已审核且可登录的管理员，请确认邮箱和账号状态。';else this.failure(e);}finally{this.busy=false;}},
  async removeManager(row){if(this.busy||row.uid===this.selfUid||!this.selectedVdn)return;try{await this.$confirm('确定移除此账号对当前 VDN 的管理权限？','移除管理员',{type:'warning'});this.busy=true;await this.$ajax.postJSON(API+'/vdns/remove-manager',{id:Number(this.selectedVdn.id),uid:row.uid});this.busy=false;await this.openManagers(this.selectedVdn);}catch(e){if(e!=='cancel'&&e!=='close')this.failure(e);}finally{this.busy=false;}},
  configure(row){this.$router.push({path:'/smcicc/system/onboard',query:{vdnId:String(row.id)}});},
  members(row){this.$router.push({path:'/smcicc/vdnadmin/organization',query:{vdnId:String(row.id)}});}
 }
};
</script>
<style scoped>
.manager-workspace{padding:28px;color:#24334b;max-width:1200px}.workspace-header{display:flex;justify-content:space-between;align-items:center;gap:20px;flex-wrap:wrap}.workspace-header h1{font-size:26px;margin:0 0 8px}.workspace-header p,.hint{color:#6b778a}.el-alert{margin:18px 0}.workspace-table{margin-top:24px}.hint{font-size:13px}@media(max-width:700px){.manager-workspace{padding:18px}.workspace-header h1{font-size:23px}}
</style>
