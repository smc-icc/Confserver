<template>
  <div style="margin: 20px auto;overflow:auto;">
    <div style="float:center">
      <el-button size="small" type="primary"  @click="addItem">{{$t('auth.addPrivilege')}}</el-button>
      &nbsp;&nbsp;
      <el-button size="small" type="danger"  @click="delItem">{{$t('auth.delPrivilege')}}</el-button>
    </div>
    <el-form inline itemWidth="200px" @submit.native.prevent="search">

      <el-form-item :label="$t('auth.role')">
        <el-select v-model="query.role">
          <el-option value="">{{$t('auth.role')}}</el-option>
          <el-option value="admin">admin</el-option>
          <el-option value="operator">operator</el-option>
          <el-option value="developer">developer</el-option>
        </el-select>
      </el-form-item>
      <el-form-item :label="$t('auth.uid')">
        <el-select v-model="query.uid" filterable>
          <!-- <el-option value="">{{$t('auth.uid')}}</el-option> -->
          <el-option v-for="(id, index) in userIds" :value="id.uid" :key="index">{{id.name || id.uid}}</el-option>
        </el-select>
      </el-form-item>
      <el-form-item :label="$t('auth.flag')">
        <el-input size="middle" v-model="query.flag"></el-input>
      </el-form-item>
      <el-form-item>
        <el-button size="small" type="primary" native-type="submit">{{$t('ssoCommon.search')}}</el-button>
      </el-form-item>
    </el-form>
    <el-table :data="authListShow" stripe :empty-text="$t('ssoCommon.nodata')" style="width: 100%">
      <el-table-column width="50" align="center" fixed="left">
        <template slot="header">
          <el-checkbox v-model="isCheckedAll"></el-checkbox>
        </template>
        <template slot-scope="scope">
          <el-checkbox v-model="scope.row.isChecked" :value="scope.row.id"></el-checkbox>
        </template>
      </el-table-column>
      <el-table-column :label="$t('auth.role')" prop="role" width="140" show-overflow-tooltip></el-table-column>
      <el-table-column :label="$t('auth.uid')" prop="uid" width="180" show-overflow-tooltip></el-table-column>
      <el-table-column :label="$t('auth.flag')" prop="flag" width="200" show-overflow-tooltip></el-table-column>
    </el-table>
    <el-pagination
      v-if="pageCount > 0"
      align="right"
      style="margin-top: 12px"
      :prev-text="$t('ssoCommon.prevPage')"
      :next-text="$t('ssoCommon.nextPage')"
      :total="pageCount"
      :current-page="page"
      @current-change="changePage"
    >
    </el-pagination>


    <el-dialog :title="dialogTitle" :visible.sync="showDialog" width="600px" @close="onClose">
      <div>
        <el-form itemWidth="100%" ref="editForm" labelWidth="100%">
          <el-input type="hidden" v-model="dialog.id"></el-input>
          <el-form-item :label="$t('auth.role')" required>
            <el-select v-model="dialog.role">
              <el-option value="admin">admin</el-option>
              <el-option value="operator">operator</el-option>
              <el-option value="developer">developer</el-option>
            </el-select>
          </el-form-item>
          <el-form-item :label="$t('auth.uid')" required>
            <el-select v-model="dialog.uid" filterable>
              <el-option v-for="(id, index) in userIds" :value="id.uid" :key="index">{{id.name || id.uid}}</el-option>
            </el-select>
          </el-form-item>
          <el-form-item :label="$t('auth.flag')" required>
            <el-input size="middle"
               v-model="dialog.flag"
               required
               :required-tip="$t('auth.flagTips')"
            ></el-input>
          </el-form-item>
        </el-form>
      </div>
      <template slot="footer">
        <el-button @click="onClose">{{ $t('ssoCommon.cancel') || '取消' }}</el-button>
        <el-button type="primary" @click="onConfirm">{{ $t('ssoCommon.confirm') || '确定' }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script>

export default {
  name: 'authPage',
  data() {
    return {
      query:{
        flag: '',
        role: '',
        uid: '',
      },
      isCheckedAll: false,
      authList: [],
      spinning: false,
      sortField: 1,
      sortRule: 0,
      totalCount: 0,
      page: 1,
      eachPageCount: 20,
      userIds: [],

      //弹出框相关数据
      dialogTitle: '',
      showDialog: false,
      dialog:{
        id: '',
        flag: '',
        role: '',
        uid: '',
      }
    };
  },
  computed:{
    pageCount(){
      return Math.ceil(this.totalCount / this.eachPageCount);
    },
    authListShow(){
      var authList = this.authList.slice((this.page-1) * this.eachPageCount, this.page * this.eachPageCount);
      this.isCheckedAll = false;
      authList.forEach((auth)=>{
        auth.isChecked = false;
      });
      return authList;
    }
  },
  activated() {
    this.getIdList();
  },
  methods: {
    search(){
      this.getAuthList(this.query.flag, this.query.role, this.query.uid);
    },
    getAuthList(flag, role, uid){
      const loading = this.$Loading.show();
      this.$ajax.getJSON('/server/api/auth/page/getAuthList', {flag: flag||'', role:role||'', uid: uid||''}).then((data)=>{
        loading.hide();
        data.forEach((auth)=>{
          auth.isChecked = false;
        })
        this.authList = data;
      this.totalCount = data.length;
    }).catch((err) => {
        loading.hide();
        this.$tip.error(`${this.$t('auth.loadListError')}: ${err.err_msg || err.message}`);
      })
    },
    getIdList() {
      this.userIds = [];
      this.$ajax.getJSON('/server/api/auth/page/getUserIdList').then((data)=>{
        this.userIds = data;
        // data.forEach((user)=>{
        //   this.userIds.push(user.uid);
        // })
    }).catch((err) => {
        this.$tip.error(`${this.$t('auth.loadUserIdError')}: ${err.err_msg || err.message}`);
      })
    },
    changePage(val){
      this.page = val
    },
    addItem(){
      this.dialogTitle = this.$t('auth.addPrivilege');
      this.showDialog = true;
      this.dialog.id = '';
      this.dialog.flag = '';
      this.dialog.role = '';
      this.dialog.uid = '';
    },
    onConfirm(){
      if(!this.$refs.editForm.validate()){
        return;
      }
      var uids = this.dialog.uid?this.dialog.uid.split(/;|,/g) : [];
      var params = [];
      uids.forEach((uid)=>{
        if(uid){
          params.push({
            flag: this.dialog.flag,
            role: this.dialog.role,
            uid: uid
          })
        }
      });
      const loading = this.$Loading.show();
      var url = '/server/api/auth/page/addAuth';
      this.$ajax.postJSON(url, {auth: params}).then((data)=>{
          loading.hide();
          this.showDialog=false;
         this.$tip.success(this.dialogTitle + this.$t('ssoCommon.success'));
          this.search();
       }).catch((err)=>{
        loading.hide();
        this.$tip.error(`${this.dialogTitle}${this.$t('ssoCommon.failed')}: ${err.err_msg || err.message}`);
      })
    },
    onClose(){},
    delItem(){
      this.$confirm(this.$t('auth.confirmDelete'), this.$t('ssoCommon.confirmTitle')).then(()=>{
        var ids = [];
        this.authListShow.forEach((auth)=>{
            if(auth.isChecked === true){
              ids.push(auth.id);
            }
        });
        if(!ids.length){
          this.$tips.error(this.$t('auth.selectRecord'));
          return;
        }
        const loading = this.$Loading.show();
        this.$ajax.postJSON('/server/api/auth/page/pageDeleteAuth', {id: ids}).then((data)=>{
            loading.hide();
            this.$tip.success(this.$t('auth.delSucc'));
            this.search();
        }).catch((err)=>{
            loading.hide();
            this.$tip.error(`${this.$t('auth.delError')}: ${err.err_msg || err.message}`);
        })
      })
    }
  },
  mounted(){
    // this.getIdList();
    this.getAuthList();
  },
  watch:{
    isCheckedAll() {
      const isCheckedAll = this.isCheckedAll;
      this.authListShow.forEach((item) => {
          item.isChecked = isCheckedAll;
      });
    },
  }
};
</script>
<style>
  .top-title{
    margin: 16px 0;
    line-height: 2.5;
    font-size: 18px;
    border-bottom: 1px solid #c5d9e8;
  }
</style>
