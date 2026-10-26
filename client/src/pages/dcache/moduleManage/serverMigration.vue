<template>
  <section class="container">
    <el-form inline ref="detailForm">
      <el-form-item required :label="$t('dcache.migrationMethod')">
        <el-radio-group v-model="transferData"
                         :data="migrationMethods">
        </el-radio-group>
      </el-form-item>
      <el-form-group inline label-position="top">
        <el-table ref="table" :data="servers" :empty-text="$t('common.nodata')">
          <el-table-column :label="$t('module.name')" prop="module_name">
            <template slot-scope="{row}">
              {{row.module_name}}
            </template>
          </el-table-column>
          <el-table-column :label="$t('module.serverGroup')" prop="group_name">
            <template slot-scope="{row}">
              {{row.group_name}}
            </template>
          </el-table-column>
          <el-table-column :label="$t('service.serverName')" prop="server_name">
            <template slot-scope="{row}">
              {{row.server_name}}
            </template>
          </el-table-column>
          <el-table-column :label="$t('service.serverIp')" prop="server_ip">
            <template slot-scope="scope">
              <el-select v-model="scope.row.server_ip" size="small" filterable required>
                <el-option v-for="d in nodeList" :key="d" :value="d">
                  {{d}}
                </el-option>
              </el-select>
            </template>
          </el-table-column>
          <el-table-column :label="$t('module.deployArea')" prop="area">
            <template slot-scope="{row}">
              {{row.area}}
            </template>
          </el-table-column>
          <el-table-column :label="$t('deployService.form.serviceType')" width="80px">
            <template slot-scope="{row:{server_type}}">
              <span v-if="server_type === 'M' ">{{$t('cache.mainEngine')}}</span>
              <span v-else-if="server_type === 'S' ">{{$t('cache.standByEngine')}}</span>
              <span v-else-if="server_type=== 'I' ">{{$t('cache.mirror')}}</span>
            </template>
          </el-table-column>
          <el-table-column :label="$t('module.memorySize')" prop="memory">
            <template slot-scope="{row}">
              <!--{{row.memory}} -->
              <el-input
                size="small"
                v-model="row.memory"
                :placeholder="$t('module.shmKeyRule')"
              />
            </template>
          </el-table-column>
          <el-table-column :label="$t('module.shmKey')" prop="shmKey">
            <template slot-scope="scope">
              <el-input
                size="small"
                v-model="scope.row.shmKey"
                :placeholder="$t('module.shmKeyRule')"
                
              />
            </template>
          </el-table-column>
        </el-table>
      </el-form-group>
      <div>
        <el-button size="small" type="primary" @click="submitServerConfig">{{$t('common.submit')}}</el-button>
      </div>
    </el-form>
  </section>
</template>

<script>
  import { transferDCache } from '@/dcache/interface.js'
  import Mixin from './mixin.js'

  export default {
    mixins: [Mixin],
    props: {
      checkSrcGroupName: {
        required: true,
        type: String,
      }
    },
    data() {
      return {
        nodeList:[],
      }
    },
    methods: {
      async submitServerConfig() {
        if (this.$refs.detailForm.validate()) {
          let { servers, appName, moduleName, cache_version, dstGroupName, transferData, checkSrcGroupName } = this;
          try {

            await transferDCache({ servers, appName, moduleName, cache_version, srcGroupName: checkSrcGroupName, dstGroupName, transferData });

            this.$tip.success(this.$t('dcache.operationManage.hasServerMigration'));
            this.$emit('close');

          } catch (err) {

            this.$tip.error(err.message)
          }
        }
      },
    },
    mounted() {
      this.$ajax.getJSON('/server/api/node_list').then((data) => {
        this.nodeList = data;
      }).catch((err) => {
        this.$tip.error(`${this.$t('common.error')}: ${err.message || err.err_msg}`);
      });
    },
    created() {
      this.getServers();
    }
  }
</script>

<style>

</style>
