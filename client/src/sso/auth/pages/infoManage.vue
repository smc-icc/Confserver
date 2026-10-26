<template>

  <div style="margin: 20px auto; overflow: auto; min-width: 400px;">
    <el-table :data="authListShow" stripe :empty-text="empty_msg" style="width: 100%;">
      <el-table-column :label="$t('auth.role')" prop="role" min-width="180" show-overflow-tooltip></el-table-column>
      <el-table-column :label="$t('auth.flag')" prop="flag" min-width="220" show-overflow-tooltip></el-table-column>
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
  </div>
</template>

<script>
export default {
  name: 'infoPage',
  data() {
    return {
      authList: [],
      isAdmin: false,
      totalCount: 0,
      page: 1,
      eachPageCount: 20,
      empty_msg: ''
    };
  },
  computed:{
    pageCount(){
      return Math.ceil(this.totalCount / this.eachPageCount);
    },
    authListShow(){
      return this.authList.slice((this.page-1) * this.eachPageCount, this.page * this.eachPageCount);
    }
  },
  methods: {
    getAuthList(){
      const loading = this.$Loading.show();
      this.$ajax.getJSON('/server/api/getMyAuthList').then((data)=>{
        loading.hide();
        this.authList = data;
        this.totalCount = data.length;
    }).catch((err) => {
        loading.hide();
        this.$tip.error(`${this.$t('auth.loadListError')}: ${err.err_msg || err.message}`);
      })
    },
    changePage(val){
      this.page = val
    },
    checkAdmin(){
      this.isAdmin = false; 
      this.$ajax.getJSON('/server/api/isAdmin').then((data) => {
        this.isAdmin = data.admin;
        if(this.isAdmin) {
          this.empty_msg = this.$t('ssoCommon.admin');
        } else {
          this.empty_msg = this.$t('ssoCommon.nodata');
        }
      }).catch((err) => {
      });
    },    
  },
  mounted(){
    this.checkAdmin();
    this.getAuthList();
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
