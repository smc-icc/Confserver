<template>
  <el-form-item class="tars-form-item">
    <span slot="label" class="clickable" @click="$emit('onLabelClick')">{{ label }}</span>
    <slot></slot>
  </el-form-item>
</template>

<script>
  export default {
    name: 'TarsFormItem',
    props: {
      label: String,
    },
  };
</script>

<style>
  .tars-form-item {

  .clickable {
    color: #3f5ae0;
  }

  }
</style>
