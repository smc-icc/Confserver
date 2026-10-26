<template>
  <section class="">
    <el-form
      ref="editConfigForm"
      type="medium"
      :label="$t('cache.config.editConfig')"
      :columns="2"
    >
      <el-form-item :label="$t('cache.config.reload')" required>
        <el-input size="small" v-model="config.reload" required></el-input>
      </el-form-item>
      <el-form-item :label="$t('cache.config.period')" required>
        <el-input size="small" v-model="config.period" required></el-input>
      </el-form-item>
      <el-form-item :label="$t('cache.config.remark')" required>
        <el-input size="small" v-model="config.remark" required></el-input>
      </el-form-item>
      <br>
      <el-form-item label=" ">
        <el-button type="primary" @click="submit">{{$t('cache.modification')}}</el-button>
      </el-form-item>
    </el-form>
  </section>
</template>

<script>
export default {
    props: {
      id: {type: String, required: true},
      item: {type: String, required: true},
      path: {type: String, required: true},
      period: {type: String, required: true},
      reload: {type: String, required: true},
      remark: {type: String, required: true},
    },
  data () {
    return {
      config: {
        id: this.id,
        item: this.item,
        path: this.path,
        period: this.period,
        reload: this.reload,
        remark: this.remark,
      }
    }
  },
  methods: {
    async submit () {
      if (this.$refs.editConfigForm.validate()) {
        try {
          await this.$ajax.postJSON('/server/api/cache/editConfig', this.config);
          this.$tip.success(`${this.$t('cache.config.addSuccess')}`);
          this.$emit('call-back');
        } catch (err) {
          console.error(err)
          this.$tip.error(`${this.$t('common.error')}: ${err.message || err.err_msg}`);
        }
      }
    }
  }
}
</script>

<style>

</style>
