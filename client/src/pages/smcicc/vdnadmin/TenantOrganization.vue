<template>
  <div class="tenant-organization">
    <h2>VDN 成员与权限</h2>
    <p class="hint">管理当前 VDN 的角色、部门及 Omni 业务权限。撤销授权后，下次业务请求立即生效。</p>
    <el-select v-model="vdnId" placeholder="选择 VDN" :disabled="busy" @change="load">
      <el-option v-for="v in vdns" :key="v.id" :value="Number(v.id)" :label="`${v.name} · VDN ${v.id}`" />
    </el-select>
    <el-alert v-if="error" :title="error" type="error" show-icon :closable="false" class="notice" />
    <el-tabs :before-leave="canChangeTab" v-model="kind" @tab-click="load" class="notice">
      <el-tab-pane label="角色与授权" name="role" />
      <el-tab-pane label="部门与授权" name="department" />
    </el-tabs>
    <div v-loading="busy" class="organization-grid">
      <section>
        <div class="toolbar"><h3>{{ kind === 'role' ? '角色' : '部门' }}</h3><el-button size="small" :disabled="!vdnId || busy" @click="create">新建</el-button></div>
        <el-table :data="groups" highlight-current-row @current-change="selectGroup" empty-text="当前 VDN 暂无记录">
          <el-table-column prop="name" label="名称" />
          <el-table-column prop="id" label="编号" width="75" />
        </el-table>
      </section>
      <section v-if="selected" :key="`${kind}-${vdnId}-${selected.id}`">
        <h3>{{ selected.name }}</h3>
        <h4>成员</h4>
        <el-checkbox-group v-model="memberIds" class="member-list" :disabled="busy">
          <el-checkbox v-for="u in users" :key="u.id" :label="Number(u.id)">{{ u.name }}（{{ u.workno }}）</el-checkbox>
        </el-checkbox-group>
        <el-button type="primary" size="small" :disabled="busy || !detailsReady" @click="saveMembers">保存成员</el-button>
        <h4>Omni 业务权限</h4>
        <p v-if="!powers.length" class="hint">暂无可配置的 Omni 业务权限。</p>
        <el-checkbox-group v-model="powerIds" class="member-list" :disabled="busy">
          <el-checkbox v-for="p in powers" :key="p.powerid" :label="Number(p.powerid)">{{ p.powername }}</el-checkbox>
        </el-checkbox-group>
        <el-button type="primary" size="small" :disabled="busy || !detailsReady" @click="savePowers">保存权限</el-button>
      </section>
      <section v-else class="empty">选择一个角色或部门，查看并管理成员及授权。</section>
    </div>
  </div>
</template>
<script>
import onboardApi from '../system/onboardApi';
export default {
  name: 'TenantOrganization',
  data: () => ({ vdns: [], vdnId: null, kind: 'role', groups: [], selected: null, users: [], powers: [], memberIds: [], powerIds: [], originalMembers: [], originalPowers: [], busy: false, error: '', detailsReady: false, generation: 0 }),
  async mounted() {
    try { const c = await onboardApi('get', 'context'); this.vdns = c.vdns || []; const requested = this.$route && this.$route.query.vdnId; if (requested && !this.vdns.some(v=>Number(v.id)===Number(requested))) throw new Error('没有此 VDN 的管理权限'); this.vdnId = requested ? Number(requested) : this.vdns.length ? Number(this.vdns[0].id) : null; if (this.vdnId) await this.load(); else this.error = '当前账号没有 VDN 管理权限'; }
    catch (e) { this.error = e.message; }
  },
  methods: {
    canChangeTab() { return !this.busy; },
    async api(action, args = {}, write = false) {
      const body = { ...args, vdnId: this.vdnId };
      const response = await fetch(`/pages/server/api/smcicc/vdnadmin/${action}${write ? '' : `?${new URLSearchParams(body)}`}`, { method: write ? 'POST' : 'GET', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, ...(write ? { body: JSON.stringify(body) } : {}) });
      let r; try { r = await response.json(); } catch (_) { throw new Error('登录已失效，请重新登录'); }
      if (!response.ok || (r.ret_code != null && ![0,200].includes(Number(r.ret_code)))) throw new Error(r.err_msg || '请求失败');
      const value = r.data != null ? r.data : r;
      if (write && ['addDepart','editDepart'].includes(action) && value === 2) throw new Error('部门名称已存在');
      if (write && (value === false || value === 0)) throw new Error('操作未完成，请刷新后检查实际结果');
      return value;
    },
    async load() {
      const gen = ++this.generation; this.selected = null; this.groups = []; this.detailsReady = false; this.error = ''; this.busy = true;
      try { const data = await this.api(this.kind === 'role' ? 'initRoleData' : 'getDepartTree'); if (gen !== this.generation) return;
        const flatten = (rows) => rows.flatMap(x => [{ id:x.id, name:x.text }, ...flatten(x.children || [])]);
        this.groups = this.kind === 'role' ? data.Rows || [] : flatten(Array.isArray(data) ? data : []);
      } catch (e) { if (gen === this.generation) this.error = e.message; } finally { if (gen === this.generation) this.busy = false; }
    },
    async selectGroup(group) {
      if (!group || this.busy) return;
      const gen=++this.generation; this.selected = group; this.detailsReady = false; this.busy = true; this.error = ''; this.users = []; this.powers = [];
      const role=this.kind==='role', args=role?{roleId:group.id}:{departId:group.id};
      try { const [selected,other,powers] = await Promise.all([this.api(role?'getRelateUsersByRole':'getRelateUsersByDepart',args),this.api(role?'getNotRelateUsersByRole':'getNotRelateUsersByDepart',args),this.api(role?'getPower':'getDepartPower',args)]);
        if(gen!==this.generation)return;
        this.users=[...(selected.Rows||[]),...(other.Rows||[])]; this.memberIds=(selected.Rows||[]).map(u=>Number(u.id)); this.originalMembers=[...this.memberIds];
        this.powers=(powers.Rows||[]).filter(p=>Number(p.subsystemtype)===90);this.powerIds=this.powers.filter(p=>p.isown).map(p=>Number(p.powerid));this.originalPowers=[...this.powerIds];this.detailsReady=true;
      } catch(e) { if(gen===this.generation)this.error=e.message; } finally { if(gen===this.generation)this.busy=false; }
    },
    async saveMembers() { await this.save(false); },
    async savePowers() { await this.save(true); },
    async save(power) {
      if(this.busy||!this.detailsReady)return;
      this.busy=true;this.error='';const role=this.kind==='role', group=this.selected, args=role?{roleId:group.id}:{departId:group.id};
      const before=power?this.originalPowers:this.originalMembers, after=power?this.powerIds:this.memberIds;
      const add=after.filter(id=>!before.includes(id)), remove=before.filter(id=>!after.includes(id));
      try {
        if(power) { for(const id of remove)await this.api(role?'deletePowerForRole':'deletePowerForDepart',{...args,powerId:id},true);for(const id of add)await this.api(role?'addPowerForRole':'addPowerForDepart',{...args,powerId:id},true); }
        else { if(remove.length)await this.api(role?'removeFromRole':'removeUserFromDepart',{...args,selIdStr:remove.join(',')},true);if(add.length)await this.api(role?'toRole':'toDepart',{...args,selIdStr:add.join(',')},true); }
        this.$message.success('已保存');
      } catch(e) {this.error=`部分操作可能已生效：${e.message}。请核对刷新后的结果。`;}
      finally { const failure=this.error;this.busy=false;await this.selectGroup(group);if(failure)this.error=failure; }
    },
    async create() {
      if(this.busy)return;
      const vdn=this.vdnId,kind=this.kind;
      try { const {value}=await this.$prompt(kind==='role'?'请输入角色名称':'请输入部门名称（创建为顶级部门）','新建',{inputValidator:v=>Boolean(v&&v.trim())||'请输入名称'});
        if(vdn!==this.vdnId||kind!==this.kind)return;this.busy=true;
        await this.api(kind==='role'?'addRole':'addDepart',kind==='role'?{roleName:value.trim()}:{jsonDepart:{departmentName:value.trim(),parentId:0}},true);this.busy=false;await this.load();
      } catch(e) {if(e!=='cancel'&&e!=='close')this.error=e.message||'操作失败';}finally{this.busy=false;}
    },
  },
};
</script>
<style scoped>
.tenant-organization{padding:24px;max-width:1180px}h2{font-size:24px;margin:0 0 12px}h3{font-size:17px;margin:0 0 18px}h4{margin:24px 0 12px}.hint,.empty{color:#687588;line-height:1.7}.notice{margin-top:20px}.organization-grid{display:grid;grid-template-columns:minmax(220px,1fr) minmax(360px,2fr);gap:28px}.organization-grid section{border:1px solid #e3e8ef;border-radius:8px;padding:20px;background:white}.toolbar{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}.toolbar h3{margin:0}.member-list{display:flex;flex-wrap:wrap;gap:12px;margin-bottom:18px}.empty{padding-top:48px!important}@media(max-width:900px){.organization-grid{grid-template-columns:1fr}}
</style>
