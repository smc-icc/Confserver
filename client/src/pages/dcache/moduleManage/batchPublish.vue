<template>
  <section style="display: inline" class="batch-publish">
    <el-button type="primary" :disabled="disabled" @click="init">{{$t('dcache.batchPublish')}}</el-button>
    <el-dialog
      :visible.sync="show"
      :footShow="false"
      :closeOnClickBackdrop="true"
      :width="'1000px'"
      :label="$t('dcache.batchPublish')"
    >
      <el-form>
        <el-form-item :label="$t('service.serverName')">
          <p v-for="server in checkedServers">{{ server.server_name }}</p>
        </el-form-item>
      </el-form>
      <el-table :data="versionList" :empty-text="$t('common.nodata')">
        <el-table-column>
          <template slot-scope="scope">
            <el-radio v-model="publishId" :label="scope.row.id">&nbsp;</el-radio>
          </template>
        </el-table-column>
        <el-table-column title="ID" prop="id">
          <template slot-scope="scope">
            {{scope.row.id}}
            <span :label="$t('releasePackage.default')"
                  style="color: green; display: inline-block;width:1em;height:1em;">
                        <icon v-if="scope.row.default_version == 1" name="default"/>
                      </span>
          </template>
        </el-table-column>
        <el-table-column :label="$t('releasePackage.moduleName')" prop="server"></el-table-column>
        <el-table-column :label="$t('releasePackage.cacheType')">
          <template slot-scope="scope">
            <span>{{scope.row.package_type === 1 ? "KVcache" : "MKVcache"}}</span>
          </template>
        </el-table-column>
        <el-table-column :label="$t('serverList.servant.comment')" prop="comment"></el-table-column>
        <el-table-column :label="$t('releasePackage.uploadTime')" prop="posttime"></el-table-column>
        <el-pagination slot="pagination" align="right"
                        :total="publishModal.totalPatchPage" :current-page="publishModal.currPage"
                        @change="patchChangePage">
          abc
        </el-pagination>
        <template slot="operations">
          <el-button :disabled="!publishId" type="primary" @click="publish">{{$t('apply.publish')}}</el-button>
        </template>
      </el-table>
    </el-dialog>
    <el-dialog
      :visible.sync="releaseIng"
      :footShow="false"
      :closeOnClickBackdrop="true"
      :width="'1000px'"
      :label="$t('dcache.batchPublish')"
    >
      <tars-release-progress v-if="!!releaseId && releaseIng" :release-id="releaseId" @close-fn="this.getServerList"></tars-release-progress>
    </el-dialog>
  </section>
</template>
<script>
  import { serverPatchList, addTask } from '@/dcache/interface.js'
  import tarsReleaseProgress from './../components/tarsReleaseProgress.vue'
  import Mixin from './mixin.js'

  export default {
    components: { tarsReleaseProgress },
    mixins: [Mixin],
    props: {
      disabled: Boolean,
      expandServers: {
        required: false,
        type: Array
      },
      checkedServers: {
        required: false,
        type: Array
      },
    },
    computed: {
      cacheVersion() {
        return this.checkedServers.length ? this.checkedServers[0].cache_version : 1;
      },
    },
    data() {
      return {
        versionList: [],
        releaseId: null,
        show: false,
        publishId: null, //发布包id
        publishModal: {
          moduleName: 'DCacheServerGroup',
          application: 'DCache',
          totalPatchPage: 0,
          pageSize: 5,
          currPage: 1,
        },
        releaseIng: false,
      }
    },
    methods: {
      init() {
        this.show = true;
        this.releaseId = null;
        this.releaseIng = false;
        this.publishId = null;
        this.getVersionList();
      },
      patchChangePage(page) {
        this.publishModal.currPage = page;
        this.getVersionList();
      },
      async getVersionList() {
        const { cacheVersion, publishModal } = this;
        const { moduleName, application, currPage, pageSize } = publishModal;
        let { count, rows } = await serverPatchList({ moduleName, application, currPage, pageSize, cacheVersion });
        this.publishModal.totalPatchPage = Math.ceil(count / pageSize);
        this.versionList = rows;
      },
      async publish() {
        const items = [];
        const { publishId, checkedServers } = this;
        checkedServers.forEach((item) => {
          items.push({
            server_id: item.id.toString(),
            command: 'patch_tars',
            parameters: {
              patch_id: publishId,
              bak_flag: item.bak_flag,
              update_text: 'batch publish cache servers',
              group_name: 'DCacheServerGroup',
            },
          });
        });
        // console.log(items);

        const releaseId = await addTask({ items });
        this.releaseIng = true;
        this.releaseId = releaseId;
      },
      getServerList () {
        this.show = false;
        this.$emit('success-fn');
      }
    }
  }
</script>
<style lang="postcss">
  .el-table .el-form {
    background-color: white;
  }
</style>
