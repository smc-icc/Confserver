<template>
  <div>
    <div class="btn_group">
      <el-button type="primary" size="small" @click="addEvent">{{$t('operate.add')}}</el-button>
      <el-button type="danger" size="small" @click="delEvent">{{$t('operate.delete')}}</el-button>
    </div>
    <el-table :data="tableData" :empty-text="$t('common.nodata')" ref="pageTable">
      <el-table-column>
        <template slot="head" slot-scope="props">
          <el-checkbox v-model="isCheckedAll"></el-checkbox>
        </template>
        <template slot-scope="scope">
          <el-checkbox v-model="scope.row.isChecked" :value="scope.row.id"></el-checkbox>
        </template>
      </el-table-column>
      <el-table-column :label="$t('routerManage.moduleName')" prop="module_name"></el-table-column>
      <el-table-column :label="$t('routerManage.fromPageNo')" prop="from_page_no"></el-table-column>
      <el-table-column :label="$t('routerManage.toPageNo')" prop="to_page_no"></el-table-column>
      <el-table-column :label="$t('routerManage.groupName')" prop="group_name"></el-table-column>
      <el-table-column :label="$t('operate.operates')" width="60px">
        <template slot-scope="scope">
          <el-button size="mini" type="text" @click="editEvent(scope.row.id)">{{$t('operate.update')}}</el-button>
        </template>
      </el-table-column>
    </el-table>

    <div style="overflow:hidden;">
      <el-pagination align="right" style="float:right;"
        :current-page="pagination.page" @current-change="gotoPage"
        :total="pagination.total">
      </el-pagination>
    </div>

    <!-- 编辑服务弹窗 -->
    <el-dialog
      :visible.sync="dialogModal.show"
      :label="dialogModal.isNew ? $t('operate.add') : $t('operate.modify')"
      width="800px"
      @on-confirm="saveDialog"
      @close="closeDialog"
      @on-cancel="closeDialog">
      <el-form
        v-if="dialogModal.model"
        ref="dialogForm" itemWidth="100%">
        <el-form-item :label="$t('routerManage.moduleName')" required>
          <el-input
            size="small"
            required
            :required-tip="$t('common.notEmpty')"
            v-model="dialogModal.model.module_name"
          ></el-input>
        </el-form-item>
        <el-form-item :label="$t('routerManage.fromPageNo')" required>
          <el-input
            size="small"
            required
            :required-tip="$t('common.notEmpty')"
            v-model="dialogModal.model.from_page_no"
          ></el-input>
        </el-form-item>
        <el-form-item :label="$t('routerManage.toPageNo')" required>
          <el-input
            size="small"
            required
            :required-tip="$t('common.notEmpty')"
            v-model="dialogModal.model.to_page_no"
          ></el-input>
        </el-form-item>
        <el-form-item :label="$t('routerManage.groupName')" required>
          <el-input
            size="small"
            required
            :required-tip="$t('common.notEmpty')"
            v-model="dialogModal.model.group_name"
          ></el-input>
        </el-form-item>
      </el-form>
    </el-dialog>

  </div>
</template>

<script>
import {
  routerRecordCreate,
  routerRecordDelete,
  routerRecordUpdate,
  routerRecordFindOne,
  routerRecordList,
} from '@/dcache/interface.js'

export default {
  data() {
    return {
      isCheckedAll: false,
      tableData: [],
      // 分页
      pagination: {
        page: 1,
        size: 10,
        total: 1,
      },
      // 弹框
      dialogModal: {
        show: false,
        model: {},
        isNew: false,
      }
    };
  },
  mounted() {
    this.loadData();
  },
  watch: {
    $route(to, from) {
      this.loadData();
    },
    isCheckedAll() {
      const isCheckedAll = this.isCheckedAll;
      this.tableData.forEach((item) => {
        item.isChecked = isCheckedAll;
      });
    },
  },
  methods: {
    getTreeId() {
      return this.$route.params.treeid
    },
    async loadData() {
      await this.listEvent()
    },
    async addEvent() {
      this.dialogModal = {
        show: true,
        model: {},
        isNew: true,
      }
    },
    async delEvent() {
      try {
        const { tableData } = this
        const ids = []
        tableData.forEach(item => {
          if(item.isChecked){
            ids.push(item.id)
          }
        })
        const result = await routerRecordDelete({
          data: {
            treeid: this.getTreeId(),
            id: ids,
          }
        })
        if(result){
          this.listEvent()
          this.$tip.success(this.$t('common.success'))
        }
      } catch (err) {
        this.$tip.error(err.message)
      }
    },
    async editEvent(id) {
      try {
        const result = await routerRecordFindOne({
          data: {
            treeid: this.getTreeId(),
            id,
          }
        })
        if(result) {
          this.dialogModal = {
            show: true,
            model: result,
            isNew: false,
          }
        }
      } catch (err) {
        this.$tip.error(err.message)
      }
    },
    async listEvent() {
      try {
        const result = await routerRecordList({
          data: {
            treeid: this.getTreeId(),
            page: this.pagination.page,
          }
        })
        result.rows.forEach((item) => {
          item.isChecked = false;
        });
        this.tableData = result.rows

        this.pagination = {
          page: result.page,
          size: result.size,
          total: Math.ceil(result.count/result.size),
        }
      } catch (err) {
        this.$tip.error(err.message)
      }
    },
    gotoPage(num) {
      this.pagination.page = num
      this.listEvent()
    },
    async saveDialog() {
      try {
        if(this.$refs.dialogForm.validate()) {
          const { isNew, model } = this.dialogModal
          model.treeid = this.getTreeId()
          let result = {}
          if(isNew){
            result = await routerRecordCreate({ data: model })
          }else{
            result = await routerRecordUpdate({ data: model })
          }
          if(result){
            this.listEvent()
            this.$tip.success(this.$t('common.success'))
          }
          this.closeDialog()
        }
      } catch (err) {
        this.$tip.error(err.message)
      }
    },
    closeDialog() {
      this.dialogModal.show = false
      this.dialogModal.model = null
    },
  },
};
</script>
<style lang="postcss">
  .btn_group{display:block;margin-bottom:20px;}
  .btn_group .el-button{margin-right:10px;}
</style>