<template>
  <section class="container">
    <div>
      <el-button type="primary" size="small" @click="uploadModal.show = !uploadModal.show">
        {{$t('releasePackage.uploadPackage')}}
      </el-button>
    </div>

    <!-- 服务列表 -->
    <el-table :data="packages.rows" :label="$t('serverList.title.serverList')" :empty-text="$t('common.nodata')">
      <el-table-column title="ID" prop="id">
        <template slot-scope="scope">
          <span :label="$t('releasePackage.default')" style="color: green; display: inline-block;">
            <i v-if="scope.row.default_version == 1" class="icon iconfont">&#xec46;</i>
          </span>
          {{scope.row.id}}
        </template>
      </el-table-column>
      <el-table-column :label="$t('releasePackage.moduleName')" prop="server"></el-table-column>
      <el-table-column :label="$t('releasePackage.cacheType')">
        <template slot-scope="scope">
          <span v-if="scope.row.package_type==1">KVCache</span>
          <span v-else-if="scope.row.package_type==2">MKVCache</span>
        </template>
      </el-table-column>
      <el-table-column :label="$t('serverList.servant.comment')" prop="comment"></el-table-column>
      <el-table-column :label="$t('releasePackage.uploadTime')" prop="posttime"></el-table-column>
      <el-table-column :label="$t('operate.operates')" width="260px">
        <template slot-scope="scope">
          <el-button size="mini" type="text" @click="setDefault(scope.row)">{{$t('operate.default')}}</el-button>
          <el-button size="mini" type="text" @click="deletePackage(scope.row.id)">{{$t('operate.delete')}}</el-button>
        </template>
      </el-table-column>
    </el-table>


    <!-- 上传发布包弹出框 -->
    <el-dialog
      :visible.sync="uploadModal.show"
      :label="$t('pub.dlg.upload')"
      width="880px"
      :footShow="false"
      @on-cancel="closeUploadModal">
      <el-form
        v-if="uploadModal.model"
        ref="uploadForm"
        itemWidth="100%"
        @submit.native.prevent="uploadPatchPackage">
        <el-form-item :label="$t('releasePackage.moduleName')">
          {{uploadModal.model.application}}.{{uploadModal.model.module_name}}
        </el-form-item>
        <el-form-item :label="$t('releasePackage.cacheType')">
          <el-select v-model="uploadModal.model.package_type" size="small">
            <el-option value="1">KVCache</el-option>
            <el-option value="2">MKVCache</el-option>
          </el-select>
        </el-form-item>
        <el-form-item :label="$t('pub.dlg.releasePkg')" itemWidth="400px">
          <let-uploader
            :placeholder="$t('pub.dlg.defaultValue')"
            @upload="uploadFile">{{$t('common.submit')}}
          </let-uploader>
          <span v-if="uploadModal.model.file">{{uploadModal.model.file.name}}</span>
        </el-form-item>
        <el-form-item :label="$t('serverList.servant.comment')">
          <el-input
            type="textarea"
            :rows="3"
            v-model="uploadModal.model.comment"
          >
          </el-input>
        </el-form-item>
        <el-button type="primary" native-type="submit">{{$t('serverList.servant.upload')}}</el-button>
      </el-form>
    </el-dialog>

  </section>
</template>

<script>
  import '@/assets/icon/default.svg';
  export default {
    data () {
      return {
        uploadModal: {
          show: false,
          model: {
            application: 'DCache',
            module_name: 'DCacheServerGroup',
            package_type: '1',
            file: {},
            comment: ''
          }
        },
        packages: {
          count: 0,
          rows: []
        }
      }
    },
    methods: {
      closeUploadModal() {
        this.uploadModal.show = false;
      },
      uploadFile(file) {
        this.uploadModal.model.file = file;
      },
      uploadPatchPackage() {
        // 上传发布包
        if (this.$refs.uploadForm.validate()) {
          const loading = this.$Loading.show();
          const formdata = new FormData();
          formdata.append('application', this.uploadModal.model.application);
          formdata.append('module_name', this.uploadModal.model.module_name);
          formdata.append('task_id', new Date().getTime());
          formdata.append('package_type', this.uploadModal.model.package_type);
          formdata.append('suse', this.uploadModal.model.file);
          formdata.append('comment', this.uploadModal.model.comment);
          this.$ajax.postForm('/server/api/upload_patch_package', formdata).then(() => {
            loading.hide();
            this.closeUploadModal();
            this.getPatchPackage();
          }).catch((err) => {
            loading.hide();
            this.$tip.error(`${this.$t('common.error')}: ${err.message || err.err_msg}`);
          });
        }
      },
      getPatchPackage() {
        this.$ajax.getJSON('/server/api/server_patch_list', {
          application: 'DCache',
          module_name: 'DCacheServerGroup'
        }).then((data) => {
          this.packages = data
        }).catch((err) => {
          this.$tip.error(`${this.$t('common.error')}: ${err.message || err.err_msg}`);
        });
      },
      deletePackage (id) {
        this.$confirm(this.$t('releasePackage.confirmDeleteTip'), this.$t('common.alert')).then(() => {
          this.$ajax.postJSON('/server/api/delete_patch_package', {id}).then((data) => {
            this.getPatchPackage();
          })
        }).catch((err) => {
          this.$tip.error(`${this.$t('common.error')}: ${err.message || err.err_msg}`);
        });
      },
      setDefault (row) {
        let {id, package_type} = row;
        this.$ajax.postJSON('/server/api/set_patch_package_default', {
          id,
          package_type,
          application: this.uploadModal.model.application,
          module_name: this.uploadModal.model.module_name,
        }).then((data) => {
          this.$tip.success(`${this.$t('common.success')}`);
          this.getPatchPackage();
        }).catch((err) => {
          this.$tip.error(`${this.$t('common.error')}: ${err.message || err.err_msg}`);
        })
      }
    },
    created() {
      this.getPatchPackage()
    }

  }
</script>

<style>

</style>
