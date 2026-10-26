<template>
  <div class="page_server_history cfg-page">
    <div class="config-section" v-if="serverListShow">
      <div class="config-section-header">
        <div class="config-section-heading">
          <h4 class="config-section-title">{{ $t('serverList.title.serverList') }}</h4>
          <p class="config-section-desc" v-if="historySearchKey">{{ historySearchKey }}</p>
        </div>
        <div class="config-section-actions">
          <el-button size="mini" icon="el-icon-back" @click="goback">{{ $t('operate.goback') }}</el-button>
        </div>
      </div>
      <el-table class="dcache cfg-table" :data="serverList" :empty-text="$t('common.nodata')" stripe ref="serverListLoading">
        <el-table-column :label="$t('deployService.form.app')" prop="application"></el-table-column>
        <el-table-column :label="$t('serverList.table.th.service')" prop="server_name">
          <template slot-scope="scope">
            <a :href="'/static/logview/logview.html?app=' + [scope.row.application] + '&server_name=' + [scope.row.server_name] + '&node_name='+ [scope.row.node_name]"
               :label="$t('serverList.link.remoteLog')" target="_blank" class="buttonText"> {{scope.row.server_name}} </a>
          </template>
        </el-table-column>
        <el-table-column :label="$t('serverList.table.th.ip')" prop="node_name" width="200px">
          <template slot-scope="scope">
          <span v-if="scope.row.is_node_ok">
            <a :href="'/static/logview/logview.html?app=' + [scope.row.application] + '&server_name=' + [scope.row.server_name] + '&node_name='+ [scope.row.node_name]"
               :label="$t('serverList.link.nodeLog')" target="_blank" class="buttonText"> {{scope.row.node_name}} </a>
          </span>
            <span v-else style="color: #FF0000">
            {{scope.row.node_name}}{{$t('serverList.link.invalidNode')}}
          </span>
          </template>
        </el-table-column>
        <el-table-column :label="$t('serverList.table.th.configStatus')">
          <template slot-scope="scope">
            <span v-if="scope.row.setting_state ==='Inactive'" style="color: #FF0000">{{scope.row.setting_state}}</span>
            <span v-else style="color: #49CC8F">{{scope.row.setting_state}}</span>
          </template>
        </el-table-column>
        <el-table-column :label="$t('serverList.table.th.currStatus')">
          <template slot-scope="scope">
            <span v-if="scope.row.query_ret_code !='0'" style="color: #FF0000">Inactive</span>
            <span v-else-if="scope.row.present_state_in_node==='Active'"
                  style="color: #49CC8F">{{ scope.row.present_state_in_node }}</span>
            <span v-else style="color: #FF0000">{{ scope.row.present_state_in_node }}</span>
          </template>
        </el-table-column>
        <el-table-column :label="$t('serverList.table.th.processID')" prop="process_id"></el-table-column>
        <el-table-column :label="$t('serverList.table.th.version')" prop="patch_version"></el-table-column>
        <el-table-column :label="$t('serverList.table.th.time')">
          <template slot-scope="scope">
            <span style="word-break: break-word">{{handleNoPublishedTime(scope.row.patch_time)}}</span>
          </template>
        </el-table-column>
        <el-table-column :label="$t('operate.operates')" width="300px">
          <template slot-scope="scope">
            <el-button size="mini" type="text" @click="historyLink(scope.row.id)">{{ $t('operate.goto') }}</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div class="config-section-foot">
        <el-pagination :current-page="pageNum" @current-change="gotoPage" :total="total"></el-pagination>
      </div>
    </div>

    <div class="config-section" v-else>
      <div class="config-section-header">
        <div class="config-section-heading">
          <h4 class="config-section-title">{{ $t('home.homeTab') }}</h4>
          <p class="config-section-desc">{{ $t('home.searchKey') }}</p>
        </div>
      </div>

      <div class="config-section-body">
        <label class="cfg-search">
          <i class="el-icon-search cfg-search-icon"></i>
          <input v-model="historySearchKey" class="cfg-search-input" type="text" @blur="historySearch" @keydown.enter="historySearch" :placeholder="$t('home.searchKey')" />
        </label>

        <div class="cfg-visited" v-if="historySearchList && historySearchList.length">
          <div class="cfg-visited-title">{{ $t('home.visited') }}</div>
          <div class="cfg-visited-tags">
            <el-tag
              v-for="item in historySearchList"
              :key="item"
              size="small"
              class="cfg-visited-tag"
              @click.native="historySearchLink(item)"
            >{{ item }}</el-tag>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: "ServerHistory",
  data() {
    return {
      historySearchKey: '',
      historySearchList: [],
      // 服务列表
      serverList: [],
      serverListShow: false,
      pageNum: 1,
      pageSize: 16,
      total:1,
    };
  },
  mounted() {
    this.updateHistorySearchKey()
  },
  methods: {
    // 切换服务实时状态页码
    gotoPage(num) {
      this.historySearch(num);
    },
    historySearch(curr_page) {
      if(!curr_page || typeof curr_page!="number") {
        curr_page = this.pageNum || 1
      }
      let { historySearchKey } = this

      if(!historySearchKey){
        return
      }

      this.updateHistorySearchKey()

      this.$ajax.getJSON('/server/api/server_search', {
        searchkey: historySearchKey,
        page_size: this.pageSize,
        curr_page,
      }).then((data) => {
        this.pageNum = curr_page
        this.total = Math.ceil(data.count/this.pageSize)
        data.rows.forEach(item => {
          item.present_state_in_node = ""
          item.is_node_ok = true;
          item.query_ret_code = 0;
          item.setting_state = item.setting_state.charAt(0).toUpperCase()+item.setting_state.slice(1);
        })
        this.serverList = data.rows
        this.updateServerState();
        this.serverListShow = true
      }).catch((err) => {
        this.$tip.error(`${this.$t('common.error')}: ${err.err_msg || err.message}`)
      })
    },
    //tarsadmin修改服务实时状态
    updateServerState() {
      if (this.serverList.length != 0) {
        let queryState = this.serverList.map((item) => {
          return {
            application: item.application,
            server_name: item.server_name,
            node_name: item.node_name
          }
        })
        this.$ajax.postJSON('/server/api/server_state', {
          queryState
        }).then((data) => {
          this.serverList.forEach((item) => {
            let serverState = data.filter(app => app.application == item.application && app.server_name == item.server_name && app.node_name == item.node_name);
            if (!serverState.length) return;
            item.present_state_in_node = serverState[0].present_state_in_node;
            item.is_node_ok = serverState[0].is_node_ok;
            item.query_ret_code = serverState[0].query_ret_code;
          })
        }).catch((err) => {
          console.warn('[server_state]', (err && (err.err_msg || err.message)) || err);
        })
      }
    },

    historySearchLink(key) {
      this.historySearchKey = key
      this.historySearch()
    },

    historyLink(key) {
      this.$nextTick(() => {
        this.$parent.selectTree(key)
        this.$parent.getTreeData()
      })
    },
    goback(){
      this.serverListShow = false;
      this.historySearchKey = "";
    },


    updateHistorySearchKey() {
      let { historySearchKey } = this
      let list = this.getLocalStorage('tars_history_key') || []

      if(historySearchKey){
        if(list && list.length > 0) {
          let arrIndex = -1
          list.forEach((item, index) => {
            if(item === historySearchKey) {
              arrIndex = index
            }
          })
          if(arrIndex !== -1){
            list.splice(arrIndex, 1)
          }
          list.unshift(historySearchKey)
        }else{
          list = [historySearchKey]
        }
        this.historySearchList = list.slice(0, 20)
        this.setLocalStorage('tars_history_key', JSON.stringify(list))
      }else{
        this.historySearchList = list
      }
    },

    // 处理未发布时间显示
    handleNoPublishedTime(timeStr, noPubTip = this.$t('pub.dlg.unpublished')) {
      if (timeStr === '0000:00:00 00:00:00') {
        return noPubTip;
      }
      return timeStr;
    },

    getLocalStorage(key) {
      let result = ''
      if(window.localStorage){
        result = JSON.parse(JSON.parse(localStorage.getItem(key)))
      }
      return result
    },

    setLocalStorage(key, val) {
      let result = ''
      if(window.localStorage){
        result = localStorage.setItem(key, JSON.stringify(val))
      }
      return result
    },
  },
};
</script>
<style lang="postcss">
/* 首页内容：分区卡片样式，页面底色保持原样 */
.page_server_history{
  display:flex;
  flex-flow:column;
  flex:1;
  min-height:0;
  overflow:auto;
  padding-right:20px;

  &::-webkit-scrollbar{border-radius:10px;}

  .config-section{flex:1 1 auto;min-height:0;}
  .config-section .el-pagination{padding:0;}
}
</style>