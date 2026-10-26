<template>
  <div class="page_operation_templates"  style="text-align: center;" >
    <el-form inline itemWidth="200px">
      <div style="float: right">
        <el-button size="small" type="primary" @click="checkFramework">{{$t('nodes.btn.check')}}</el-button>
        &nbsp;&nbsp;&nbsp;
        <el-button size="small" type="info" @click="openShowProblem">{{$t('nodes.btn.question')}}</el-button>
      </div>
    </el-form>

    <br />

    <el-table ref="checkLoading" :data="servers" stripe :row-class-name="tableRowClassName" :empty-text="$t('common.nodata')">
      <el-table-column :label="$t('checkTable.table.th.server_name')" prop="serverName" min-width="140" show-overflow-tooltip></el-table-column>
      <el-table-column :label="$t('checkTable.table.th.node_name')" prop="nodeName" min-width="140" show-overflow-tooltip></el-table-column>
      <el-table-column :label="$t('checkTable.table.th.obj_name')" prop="objName" min-width="200" show-overflow-tooltip></el-table-column>
      <el-table-column :label="$t('checkTable.table.th.status')" width="120">
        <template slot-scope="scope">
          <span class="status">{{scope.row.status}}</span>
        </template>
      </el-table-column>
    </el-table>
    <el-dialog :title="$t('checkTable.problemDialog.title')" :visible.sync="showProblem"  width="600px">
      <div>
        <br>
        <p>{{$t('checkTable.problemDialog.info')}}</p>
        <br>
        <p>{{$t('checkTable.problemDialog.restartFramework')}}</p>
        <p>{{$t('checkTable.problemDialog.stopFramework')}}</p>
        <p>{{$t('checkTable.problemDialog.restartServer')}}</p>
      </div>
    </el-dialog>
  </div>

</template>

<script>

export default {
  name: 'OperationCheck',

  data() {
    return {
      showProblem: false,
      servers: []
    };
  },

  mounted() {
  },

  methods: {
    openShowProblem() {
      this.showProblem = true;
    },
    tableRowClassName({row, rowIndex}) {
      if (row.check === 1) {
        return '';
      } else if (row.check === 2) {
        return "checking-row";
      } else if (row.check === 0) {
        return 'success-row';
      } else if (row.check === -1) {
        return 'warning-row';
      }
      return '';
    },
    checkFramework() {
      const loading = this.$loading.show();
      this.$ajax.getJSON('/server/api/get_framework_list').then((data) => {

        loading.hide();
        for(var i = 0; i < data.servers.length; i++)
        {
          data.servers[i].check  = 1;
          data.servers[i].status = "waiting";
        }

        this.servers = data.servers;

        var that = this;
        for(var i = 0; i < that.servers.length; i++)
        {
          (function(i) {
            setTimeout(function(){
              that.checkServer(i)
            }, i*100);
          })(i);
        }
      }).catch((err) => {
        loading.hide();

        this.$notify({
          title: this.$t('checkTable.adminRegistryFailed'),
          message: this.$t('checkTable.restartAdminRegistry'),
          type: 'error',
          duration: 0
        });
      });
    },
    checkServer(index) {
      var server = this.servers[index];

      server.check  = 2;
      server.status = "checking"; 

      this.$ajax.postJSON('/server/api/check_framework_server', {server:server}).then((data) => {
        server.check  = 0;
        server.status = "succ";

      }).catch((err) => {
        server.check  = -1;
        server.status = this.$t('checkTable.failed');
      });
    }
  },
};
</script>

<style scoped lang="postcss">
.page_operation_templates {
  pre {
    color: #909FA3;
    margin-top: 32px;
  }
}

.el-table tr.checking-row td {
  background: burlywood !important;
  color: #FFF;
}
.el-table tr.warning-row td {
  background: #F56C77 !important;
  color: #FFF;
}
.el-table tr.success-row td {
  background: #6ACCAB !important;
  color: #FFF;
}
.el-table tr.checking-row td .table-operation {
  color: #FFF;
}
.el-table tr.warning-row td .table-operation {
  color: #FFF;
}
.el-table tr.success-row td .table-operation {
  color: #FFF;
}
.checking-row .status, .success-row .status, .warning-row .status{
  &:before{
    content: ' ';
    display: inline-block;
    width: 7px;
    height: 7px;
    border-radius: 100%;
    margin-right: 5px;
  }
}
.success-row .status{
  color:green;
  &:before{
    background: green;
  }
}
.warning-row .status{
  color:red;
  &:before{
    background: red;
  }
}
.checking-row .status{
  color:orange;
  &:before{
    background: orange;
  }
}
</style>
