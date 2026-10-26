<template>
  <div class="compare-chart">
    <ve-line v-if="chartReady" v-bind="chartOptions"></ve-line>
    <a href="javascript:" class="compare-chart-zoom-in" @click="enlarge = true">
      <icon name="zoom-in" />
    </a>
    <el-dialog :visible.sync="enlarge" @close="enlarge = false" width="80%">
      <ve-line v-if="enlarge && chartReady" v-bind="largeChartOptions"></ve-line>
      <template slot="footer"></template>
    </el-dialog>
  </div>
</template>

<script>
import '@/plugins/charts';
import '@/assets/icon/zoom-in.svg';

export default {
  props: {
    title: String,
    timeColumn: String,
    dataColumns: Array,
    data: Array,
  },

  data() {
    return {
      enlarge: false,
    };
  },

  computed: {
    chartReady() {
      const cols = this.dataColumns || [];
      const data = this.data;
      return cols.length > 0 && Array.isArray(data) && this.timeColumn;
    },
    chartOptions() {
      const labelMap = {};
      const dataColumns = this.dataColumns || [];
      const columns = this.timeColumn ? [this.timeColumn] : [];

      dataColumns.forEach(({ name, label }) => {
        labelMap[name] = label;
        columns.push(name);
      });

      return {
        title: {
          show: true,
          text: this.title,
        },
        grid: {
          bottom: 40,
          top: 50,
        },
        legend: {
          top: 5,
        },
        colors: ['#f56c77', '#6accab'],
        settings: {
          labelMap,
          scale: [true, false],
          lineStyle: {
            width: 1,
          },
        },
        dataZoom:[
          {
            type:'inside',//slider表示有滑动块的，inside 表示内置的
            show:true,
            xAxisIndex:[0],
            zoomOnMouseWheel:true, //鼠标滚轮直接操作
            start:0,
            end:100
          }
        ],
        data: {
          columns,
          rows: Array.isArray(this.data) ? this.data : [],
        },
      };
    },
    largeChartOptions() {
      const labelMap = {};
      const dataColumns = this.dataColumns || [];
      const columns = this.timeColumn ? [this.timeColumn] : [];

      dataColumns.forEach(({ name, label }) => {
        labelMap[name] = label;
        columns.push(name);
      });

      return {
        title: {
          show: true,
          text: this.title,
          left: 'center',
          top: 'bottom',
        },
        grid: {
          bottom: 40,
          top: 50,
        },
        legend: {
          top: 5,
        },
        colors: ['#f56c77', '#6accab'],
        settings: {
          labelMap,
          scale: [true, false],
          lineStyle: {
            width: 1,
          },
        },
        data: {
          columns,
          rows: Array.isArray(this.data) ? this.data : [],
        },
        dataZoom: [
          { type: 'inside', minValueSpan: 12, zoomOnMouseWheel: 'alt' },
          { minValueSpan: 12 },
        ],
      };
    },
  },
};
</script>

<style>
.compare-chart {
  position: relative;

  &-zoom-in {
    color: inherit;
    cursor: pointer;
    font-size: 16px;
    position: absolute;
    right: 35px;
    top: 5px;
  }

  .el-dialog__dialog {
    max-width: 1200px;
  }
}
</style>
