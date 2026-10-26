<template>

  <div style="margin: 20px auto;overflow:auto;">

    <el-table :data="setListShow" stripe :empty-text="$t('ssoCommon.nodata')">
      <el-table-column :label="$t('auth.setTitle')" prop="title" min-width="160" show-overflow-tooltip></el-table-column>
      <el-table-column :label="$t('auth.valid')" prop="valid" width="140" align="center">
        <template slot-scope="scope">
          <el-switch
            v-model="scope.row.valid"
            active-text="Open"
            inactive-text="Close"
            @change="onSetValid(scope.row)"
          ></el-switch>
        </template>
      </el-table-column>
      <el-table-column :label="$t('auth.about')" prop="about_cn" min-width="260" show-overflow-tooltip>
        <template slot-scope="scope">
          <span>{{scope.row.about_cn}}</span><br>
          <span>{{scope.row.about_en}}</span>
        </template>
      </el-table-column>
      <el-table-column :label="$t('auth.operator')" width="160" fixed="right">
        <template slot-scope="scope">
          <el-button size="mini" type="text" @click="editSet(scope.row)">{{$t('operate.update')}}</el-button>
          <el-button size="mini" type="text" @click="viewSet(scope.row)">{{$t('operate.view')}}</el-button>
        </template>
      </el-table-column>
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
        <el-form itemWidth="100%" ref="editForm">
          <el-form-item :label="$t('auth.setTitle')" required>
            <el-input v-model="dialog.title" disabled required :required-tip="$t('ssoCommon.notEmpty')"></el-input>
          </el-form-item>
          <el-form-item :label="$t('auth.setInfo')" required>
            <el-input v-model="dialog.info" type="textarea" :rows="10" required :required-tip="$t('ssoCommon.notEmpty')" placeholder="{ title: 'abcd' }"></el-input>
          </el-form-item>
        </el-form>
      </div>
      <template slot="footer">
        <el-button @click="onClose">{{ $t('ssoCommon.cancel') || '取消' }}</el-button>
        <el-button type="primary" @click="onConfirm">{{ $t('ssoCommon.confirm') || '确定' }}</el-button>
      </template>
    </el-dialog>

    <el-dialog :visible.sync="viewModal.show" :title="$t('cfg.msg.viewContent')" width="800px">
      <div class="pre_con">
        <pre v-if="viewModal.model">{{viewModal.model.info}}</pre>
      </div>
      <template slot="footer"></template>
    </el-dialog>

  </div>
</template>

<script>

import moment from 'moment';

export default {
  name: 'setPage',
  data() {
    return {
      setList: [],
      totalCount: 0,
      page: 1,
      eachPageCount: 30,
      set: '',
      expireTime: '',
      //弹出框相关数据
      dialogTitle: '',
      showDialog: false,
      dialog:{
        title: '',
        info: '',
      },
      viewModal: {
        show: false,
        model: null,
      },
    };
  },
  computed:{
    pageCount(){
      return Math.ceil(this.totalCount / this.eachPageCount);
    },
    setListShow(){
      var userList = this.setList.slice((this.page-1) * this.eachPageCount, this.page * this.eachPageCount);
      userList.forEach((auth)=>{
        auth.update_time = moment(auth.update_time).format("YYYY-MM-DD HH:mm:ss");
      });
      return userList;
    }
  },

  methods: {
    getSetList() {
      const loading = this.$Loading.show();

      this.$ajax.getJSON('/server/api/auth/page/getSetList').then((data)=>{
        
        loading.hide();

        this.setList =  data;
        this.totalCount = data.length;
      }).catch((err) => {
          loading.hide();

          this.$tip.error(`${this.$t('auth.loadSetError')}: ${err.err_msg || err.message}`);
        })
    },
    onSetValid(set) {
      this.$confirm(this.$t('auth.setSetValid')).then(() => {

        const loading = this.$Loading.show();

        this.$ajax.postJSON('/server/api/auth/page/setSetValid', {title: set.title, valid: 1 - (set.valid ? 0 : 1 ) }).then((data)=>{
          
          loading.hide();

          this.getSetList();

          this.$tip.success(`${this.$t('auth.setSetSucc')}`);

        }).catch((err) => {
            loading.hide();

            this.$tip.error(`${this.$t('auth.setSetError')}: ${err.err_msg || err.message}`);
          })   
        }).catch(()=>{
          set.valid = 1-set.valid;
        })
    },
    isSetValid(valid) {
      return valid == 1? this.$t("auth.notValid"): this.$t("auth.valid");
    },
    changePage(val){
      this.page = val
    },
    viewSet(d) {
      this.viewModal.model = d;
      this.viewModal.show = true;
    },
    editSet(d) {
      this.dialogTitle = this.$t('auth.editSet')
      this.dialog = d
      this.showDialog = true
    },
    onConfirm(){
      if(!this.$refs.editForm.validate()){
        return;
      }

      try {
        JSON.parse(this.dialog.info) 
      }
      catch(e) {
        this.$tip.error("config content must be json!" + e);
        return;
      }

      const loading = this.$Loading.show();
      var url = '/server/api/auth/page/updateSet';
      this.$ajax.postJSON(url, this.dialog).then((data)=>{
          loading.hide();
          this.showDialog=false;
          this.$tip.success(this.dialogTitle + this.$t('ssoCommon.success'));
          this.getSetList();
       }).catch((err)=>{
        loading.hide();
        this.$tip.error(`${this.dialogTitle}${this.$t('ssoCommon.failed')}: ${err.err_msg || err.message}`);
      })
    },
    onClose(){},
  },
  mounted(){
    this.getSetList();
  },
};
</script>
<style>
  .top-title{
    margin: 16px 0;
    line-height: 2.5;
    font-size: 18px;
    border-bottom: 1px solid #c5d9e8;
  }
  .pre_con{display: block;margin-top:20px;word-break: break-all;}
  .pre_con pre{display: block;white-space: pre-wrap;}

</style>
