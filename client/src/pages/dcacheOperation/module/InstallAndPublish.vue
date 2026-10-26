<template>
  <section class="page_operation_install_and_publish">
    <el-form label-position="top" ref="detailForm">
      <el-form-group :label="$t('common.baseInfo')" inline label-position="top">
        <el-form-item :label="$t('module.moduleId')" itemWidth="240px" required>
          {{moduleInfo.module_id}}
        </el-form-item>
        <el-form-item :label="$t('module.name')" itemWidth="240px" required>
          {{moduleInfo.module_name}}
        </el-form-item>
        <el-form-item :label="$t('module.cacheType')" itemWidth="240px" required>
          {{mapCacheType(moduleInfo)}}
        </el-form-item>
<!--
        <el-form-item :label="$t('module.follower')" itemWidth="240px">
          {{moduleInfo.ModuleBase && moduleInfo.ModuleBase.follower}}
        </el-form-item>
-->
      </el-form-group>

      <el-form-group :label="$t('module.moduleInfo')" inline label-position="top">
        <el-form-item :label="$t('module.deployArea')" itemWidth="240px">
          {{moduleInfo.idc_area}}
        </el-form-item>
        <!-- <el-form-item :label="$t('module.keyType')" itemWidth="240px" required>
          {{moduleInfo.key_type}}
        </el-form-item> -->
        <el-form-item :label="$t('region.setArea')" itemWidth="240px">
          {{moduleInfo.set_area && moduleInfo.set_area.join(',')}}
        </el-form-item>
        <el-form-item :label="$t('module.scenario')" itemWidth="240px" required>
          {{mapModuleType(moduleInfo.cache_module_type)}}
        </el-form-item>
        <el-form-item :label="$t('cache.perRecordAvg')" itemWidth="240px" required>
          {{moduleInfo.per_record_avg}}
        </el-form-item>
<!--
        <el-form-item :label="$t('cache.maxReadFlow')" itemWidth="240px" required>
          {{moduleInfo.max_read_flow}}
        </el-form-item>
        <el-form-item :label="$t('cache.totalRecord')" itemWidth="240px" required>
          {{moduleInfo.total_record}}
        </el-form-item>
        <el-form-item :label="$t('cache.maxWriteFlow')" itemWidth="240px" required>
          {{moduleInfo.max_write_flow}}
        </el-form-item>
-->        
        <el-form-item :label="$t('cache.moduleRemark')" itemWidth="240px" required>
          {{moduleInfo.module_remark}}
        </el-form-item>
      </el-form-group>

      <el-form-group :label="$t('module.serverInfo')" inline label-position="top" v-if="serverConf.length > 0 && this.moduleInfo.ModuleBase.update != 1">
        <el-table ref="table" :data="serverConf" :empty-text="$t('common.nodata')">
          <el-table-column :label="$t('module.name')" prop="module_name" width="25%">
            <template slot-scope="scope">
              {{scope.row.module_name}}
            </template>
          </el-table-column>
          <el-table-column :label="$t('module.serverGroup')" prop="group_name" width="25%">
            <template slot-scope="scope">
              {{scope.row.group_name}}
            </template>
          </el-table-column>
          <el-table-column :label="$t('service.serverName')" prop="server_name">
            <template slot-scope="scope">
              {{scope.row.server_name}}
            </template>
          </el-table-column>
          <el-table-column :label="$t('service.serverIp')" prop="server_ip">
            <template slot-scope="scope">
              {{scope.row.server_ip}}
            </template>
          </el-table-column>
          <el-table-column :label="$t('module.deployArea')" prop="area">
            <template slot-scope="scope">
              {{scope.row.area}}
            </template>
          </el-table-column>
          <el-table-column :label="$t('deployService.form.serviceType')" prop="server_type">
            <template slot-scope="scope">
              {{mapServerType(scope.row.server_type)}}
            </template>
          </el-table-column>
          <el-table-column :label="$t('module.memorySize')" prop="memory">
            <template slot-scope="scope">
              {{scope.row.memory}}
            </template>
          </el-table-column>
          <el-table-column :label="$t('module.shmKey')" prop="shmKey">
            <template slot-scope="scope">
              {{scope.row.shmKey}}
            </template>
          </el-table-column>
        </el-table>
      </el-form-group>

      <el-form-group :label="$t('module.dbAccessInfo')" inline label-position="top" v-if="this.isDbAccess()">
        <el-form-item :label="$t('module.servant')" itemWidth="400px">
          {{dbAccess.servant}}
        </el-form-item>

        <el-form-item :label="$t('service.isSerializated')" itemWidth="350px">
          {{mapSerializeType(dbAccess.isSerializated)}}
        </el-form-item>

        <el-form-item :label="$t('module.dbAccessIp')" itemWidth="400px">
          {{dbAccess.dbaccess_ip}}
        </el-form-item>
        <br>
        <el-form-item :label="$t('cache.db.dbNum')" itemWidth="240px" required>
          {{dbAccess.db_num}}
        </el-form-item>
        <el-form-item :label="$t('cache.db.DBPrefix')" itemWidth="240px" required>
          {{dbAccess.db_prefix}}
        </el-form-item>
        <el-form-item :label="$t('cache.db.tableNum')" itemWidth="240px" required>
          {{dbAccess.table_num}}
        </el-form-item>
        <el-form-item :label="$t('cache.db.tablePrefix')" itemWidth="240px" required>
          {{dbAccess.table_prefix}}
        </el-form-item>
        <br>
        <el-form-item :label="$t('cache.db.dbHost')" itemWidth="240px" required>
          {{dbAccess.db_host}}
        </el-form-item>
        <el-form-item :label="$t('cache.db.dbPort')" itemWidth="240px" required>
          {{dbAccess.db_port}}
        </el-form-item>
        <el-form-item :label="$t('cache.db.dbUser')" itemWidth="240px" required>
          {{dbAccess.db_user}}
        </el-form-item>
        <el-form-item :label="$t('cache.db.tableCharset')" itemWidth="240px" required>
          {{dbAccess.db_charset}}
        </el-form-item>
      </el-form-group>

      <el-button size="small" type="primary" @click="installAndPublish">{{$t('apply.installAndPublish')}}
      </el-button>
    </el-form>
    <el-dialog :title="$t('publishLog.title')" :visible.sync="showModal" width="800px" @on-confirm="confirmPublish">
      <el-table ref="ProgressTable" :data="releaseProgress" :empty-text="$t('common.nodata')">
        <el-table-column :label="$t('service.serverName')" prop="serverName" width="30%"></el-table-column>
        <el-table-column :label="$t('service.serverIp')" prop="nodeName" width="30%"></el-table-column>
        <el-table-column :label="$t('publishLog.releaseId')" prop="releaseId" width="15%"></el-table-column>
        <el-table-column :label="$t('publishLog.releaseProgress')" prop="percent">
          <template slot-scope="scope">
            <span>{{scope.row.percent}}</span>
            <icon v-if="scope.row.percent != 100" name="spinner" class="spinner-icon" />
          </template>
        </el-table-column>
      </el-table>

    </el-dialog>
  </section>
</template>

<script>
  import '@/assets/icon/spinner.svg';

  export default {
    data () {
      let {moduleId} = this.$route.params;
      return {
        moduleId,
        moduleInfo: {},
        serverConf: [],
        dbAccess: {servant: ''},
        releaseProgress: [],
        showModal: false,
        timerId: null
      }
    },
    methods: {
      isDbAccess() {
        return this.dbAccess.servant != '' && (this.moduleInfo.ModuleBase.update == 0 || this.moduleInfo.ModuleBase.update == 1);
      },
      getModuleFullInfo () {
        let {moduleId} = this;
        this.$ajax.getJSON('/server/api/get_module_full_info', {moduleId}).then((data) => {
          // console.log(data);
          this.moduleInfo = data.item || {};
          this.serverConf = data.serverConf || [];
          this.dbAccess = data.dbAccess || {servant:''};
          this.dbAccess.servant = this.dbAccess.servant || '';
        }).catch((err) => {
          this.$tip.error(`${this.$t('common.error')}: ${err.message || err.err_msg}`);
        });
      },
      installAndPublish () {
        const loading = this.$loading.show();
        let {moduleId} = this;
        let mkCache = sessionStorage.getItem('mkCache');
        this.$ajax.getJSON('/server/api/module_install_and_publish', {moduleId, mkCache}).then(response => {

          loading.hide();

          let releaseId = response.releaseRsp.releaseId;
          this.getTaskRepeat({releaseId});
          this.$tip.success(response.releaseRsp.errMsg)
        }).catch(err => {
          loading.hide();
          
          this.$tip.error(`${this.$t('common.error')}: ${err.message || err.err_msg}`);
        });
      },
      getTaskRepeat({releaseId}) {
        clearTimeout(this.timerId);
        this.showModal = true;
        const getTask = () => {
          this.$ajax.getJSON('/server/api/get_module_release_progress', {releaseId}).then((data) => {

            let done = true;
            data.progress.forEach((item) => {
              if (parseInt(item.percent, 10) !== 100) {
                done = false;
              }
            });
            if (done) {
              clearTimeout(this.timerId);
            } else {
              this.timerId = setTimeout(getTask, 1000);
            }
            this.releaseProgress = data.progress;
          }).catch((err) => {
            clearTimeout(this.timerId);
            this.$tip.error(`${this.$t('common.error')}: ${err.message || err.err_msg}`);
          });
        };
        getTask();
      },
      getReleaseProgress (releaseId) {
        this.$ajax.getJSON('/server/api/get_module_release_progress', {releaseId}).then(data => {
          // console.log(data);
          this.showModal = true;
          this.releaseProgress = data.progress;
        }).catch(err => {
          this.$tip.error(`${this.$t('common.error')}: ${err.message || err.err_msg}`);
        });
      },
      mapSerializeType(isSerializated) {
        if(!isSerializated) return this.$t('cache.sTypeTip1');
        else return this.$t('cache.sTypeTip2');
      },
      mapServerType (key) {
        if (key === 0) return this.$t('module.mainServer');
        else if (key === 1) return this.$t('module.backServer');
        else return this.$t('module.mirror');
      },
      mapModuleType (key) {
        return key === 1 ? this.$t('cache.title') : this.$t('cache.cachePersistent');
      },
      mapCacheType (base) {
        if (!base) {
          return null;
        } else if (base.cache_version === 1) {
          return 'key-value(KVCache)';
        } else {
          switch (base.mkcache_struct) {
            case 1:
              return 'k-k-row(MKVCache)';
              break;
            case 2:
              return 'Set(MKVCache)';
              break;
            case 3:
              return 'List(MKVCache)';
              break;
            case 4:
              return 'Zset(MKVCache)';
              break;
            default:
              return null;
              break;
          }
        }
      },
      confirmPublish () {
        this.showModal = false;
        document.body.classList.remove('has-modal-open')
        this.$router.push('/server');
        if (window.dcacheIndex && window.dcacheIndex.getTreeData) {
          window.dcacheIndex.getTreeData()
        }
      }
    },
    beforeRouteLeave (to, from, next) {
      // 导航离开该组件的对应路由时调用
      // 可以访问组件实例 `this`
      clearTimeout(this.timerId);
      next()
    },
    created () {
      this.getModuleFullInfo()
    }
  }
</script>

<style lang="postcss">
  .spinner-icon {
    color: #fff;
    height: 17px;
    width: 17px;
    margin-left: 20px;
  }
</style>
