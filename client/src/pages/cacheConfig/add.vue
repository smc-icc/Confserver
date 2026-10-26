<template>
  <section>
    <el-form
      ref="addConfigForm"
      type="medium"
      :label="$t('cache.config.addConfig')"
      :columns="2"
    >
      <el-form-item :label="$t('cache.config.item')" required>
        <el-input size="small" v-model="config.item" required></el-input>
      </el-form-item>
      <el-form-item :label="$t('cache.config.path')" required>
        <el-input size="small" v-model="config.path" required></el-input>
      </el-form-item>
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
        <el-button type="primary" @click="submit">{{$t('cache.add')}}</el-button>
      </el-form-item>
    </el-form>
  </section>
</template>

<script>
  export default {
    data () {
      return {
        config: {
          "item": "",
          "path": "",
          "period": "",
          "reload": "",
          "remark": ""
        }
      }
    },
    methods: {
      async submit () {
        if (this.$refs.addConfigForm.validate()) {
          try {
            await this.$ajax.postJSON('/server/api/cache/addConfig', this.config);
            this.$tip.success(`${this.$t('cache.config.addSuccess')}`);
            Object.assign(this.config, {"item": ""});
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
