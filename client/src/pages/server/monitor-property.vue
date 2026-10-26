<template>
  <div class="page_server_property_monitor">
    <!-- <el-radio v-model="query.userpc" :label="0">JSON查询</el-radio>
    <el-radio v-model="query.userpc" :label="1">RPC查询</el-radio> -->
    <el-form inline itemWidth="200px" @submit.native.prevent="search">
      <el-form-group>
        <el-form-item :label="$t('monitor.search.a')">
          <let-date-picker size="small" v-model="query.thedate" :formatter="formatter"></let-date-picker>
        </el-form-item>
        <el-form-item :label="$t('monitor.search.b')">
          <let-date-picker size="small" v-model="query.predate" :formatter="formatter"></let-date-picker>
        </el-form-item>
        <el-form-item :label="$t('monitor.search.start')">
          <el-input size="small" v-model="query.startshowtime"></el-input>
        </el-form-item>
        <el-form-item :label="$t('monitor.search.end')">
          <el-input size="small" v-model="query.endshowtime"></el-input>
        </el-form-item>
      </el-form-group>
      <el-form-group>
        <tars-form-item :label="$t('monitor.search.master')" @onLabelClick="groupBy('master_name')">
          <el-input size="small" v-model="query.master_name"></el-input>
        </tars-form-item>
        <tars-form-item :label="$t('monitor.search.masterIP')" @onLabelClick="groupBy('master_ip')">
          <el-input size="small" v-model="query.master_ip"></el-input>
        </tars-form-item>
        <tars-form-item :label="$t('monitor.select.property')" @onLabelClick="groupBy('property_name')">
          <el-input size="small" v-model="query.property_name"></el-input>
        </tars-form-item>
        <tars-form-item :label="$t('monitor.select.strategy')" @onLabelClick="groupBy('policy')">
          <el-input size="small" v-model="query.policy"></el-input>
        </tars-form-item>
        <el-form-item>
          <el-button size="small" type="primary" native-type="submit">{{$t('operate.search')}}</el-button>
        </el-form-item>
      </el-form-group>
    </el-form>

    <compare-chart ref="chart" class="chart" v-bind="chartOptions" v-if="showChart"></compare-chart>

    <hours-filter v-if="enableHourFilter" v-model="hour"></hours-filter>

    <el-table ref="table" :data="pagedItems" :empty-text="$t('common.nodata')">
      <el-table-column :label="$t('common.time')" width="90px">
        <template slot-scope="props">{{props.row.show_time || props.row.show_date}}</template>
      </el-table-column>
      <el-table-column :label="$t('monitor.search.master')">
        <template slot-scope="props">
          <span v-if="props.row.master_name != '%'">{{props.row.master_name}}</span>
          <span class="btn-link" v-if="props.row.master_name == '%'" @click="groupBy('master_name', props.row)" >{{props.row.master_name}}</span>
        </template>
      </el-table-column>
      <el-table-column :label="$t('monitor.search.masterIP')" width="150px">
        <template slot-scope="props">
          <span v-if="props.row.master_ip != '%'">{{props.row.master_ip}}</span>
          <span class="btn-link" v-if="props.row.master_ip == '%'" @click="groupBy('master_ip', props.row)" >{{props.row.master_ip}}</span>
        </template>
      </el-table-column>
      <el-table-column :label="$t('monitor.select.property')" width="150px">
         <template slot-scope="props">
          <span v-if="props.row.property_name != '%'">{{props.row.property_name}}</span>
          <span class="btn-link" v-if="props.row.property_name == '%'" @click="groupBy('property_name', props.row)" >{{props.row.property_name}}</span>
        </template>
      </el-table-column>
      <el-table-column :label="$t('monitor.select.strategy')" width="150px">
        <template slot-scope="props">
          <span v-if="props.row.policy != '%'">{{props.row.policy}}</span>
          <span class="btn-link" v-if="props.row.policy == '%'" @click="groupBy('policy', props.row)" >{{props.row.policy}}</span>
        </template>
      </el-table-column>
      <el-table-column :label="$t('monitor.property.property')" prop="the_value" align="right" width="200px"></el-table-column>
      <el-table-column :label="$t('monitor.property.propertyC')" prop="pre_value" align="right" width="230px"></el-table-column>

      <el-pagination
        slot="pagination"
        v-if="pageCount"
        :total="pageCount"
        :current-page="page"
        :sum="itemsCount"
        show-sums
        jump
        @current-change="changePage"
      ></el-pagination>
    </el-table>
  </div>
</template>

<script>
import { formatDate, ONE_DAY } from '@/lib/date';
import HoursFilter from '@/components/hours-filter';
import CompareChart from '@/components/charts/compare-chart';

const pageSize = 20;
const formatter = 'YYYYMMDD';
const dataFormatter = (data) => {
  if (data && data.length > 0) {
    return data.map(item => {
      const result = { ...item };
      const keys = Object.keys(item);
      const preRegex = /^pre_.*/;
      const theRegex = /^the_.*/;
      keys.forEach(key => {
        if (preRegex.test(key) || theRegex.test(key)) {
          if (item[key] === "--") {
            result[key] = "0";
          }
        }
      });
      return result;
    });
  } else {
    return data;
  }
};


export default {
  name: 'ServerPropertyMonitor',

  components: {
    HoursFilter,
    CompareChart,
  },

  data() {
    const treeId = this.treeid;
    let _master_name_arr = treeId.split('.');
    let _master_name = '';
    if (_master_name_arr.length == 2){ //没有启用set的主调名
      _master_name = _master_name_arr[0].substring(1) + '.' +  _master_name_arr[1].substring(1);
    }else if(_master_name_arr.length == 5){ //启用set的主调名
      _master_name = _master_name_arr[0].substring(1) + '.' +  _master_name_arr[4].substring(1) + '.' +  _master_name_arr[1].substring(1) +  _master_name_arr[2].substring(1) +  _master_name_arr[3].substring(1);
    }
    return {
      query: {
        // userpc: 0,
        thedate: formatDate(new Date(), formatter),
        predate: formatDate(Date.now() - ONE_DAY, formatter),
        startshowtime: '0000',
        endshowtime: '2360',
        master_name: _master_name,
        master_ip: '',
        property_name: '',
        policy: '',
        group_by: '',
      },
      formatter,
      allItems: [],
      hour: -1,
      page: 1,
      showChart: true,
    };
  },
  props: ['treeid'],
  computed: {
    enableHourFilter(){
      return this.allItems.length && this.allItems[0].show_time
    },
    filteredItems() {
      const hour = this.hour;
      return (hour >= 0 && this.enableHourFilter)
        ? this.allItems.filter(d => +d.show_time.slice(0, 2) === hour)
        : this.allItems;
    },
    itemsCount() {
      return this.filteredItems.length;
    },
    pageCount() {
      return Math.ceil(this.filteredItems.length / pageSize);
    },
    pagedItems() {
      return this.filteredItems.slice(pageSize * (this.page - 1), pageSize * this.page);
    },
    chartOptions() {
      return {
        title: this.$t('monitor.table.total'),
        timeColumn: 'show_time',
        dataColumns: [
          { name: 'the_value', label: this.$t('monitor.property.property') },
          { name: 'pre_value', label: this.$t('monitor.property.propertyC') },
        ],
        data: this.allItems,
      };
    },
  },

  mounted() {
    this.fetchData();
  },

  methods: {
    fetchData() {
      const chartLoading = this.$refs.chart && this.$refs.chart.$loading.show();
      const tableLoading = this.$refs.table.$loading.show();
      return this.$ajax.getJSON('/server/api/tarsproperty_monitor_data', this.query).then((data) => {
        chartLoading && chartLoading.hide();
        tableLoading.hide();
        this.allItems = data;
      }).catch((err) => {
        chartLoading && chartLoading.hide();
        tableLoading.hide();
        this.$tip.error(`${this.$t('common.error')}: ${err.message || err.err_msg}`);
      });
    },

    groupBy(name, row) {
      this.query.group_by = name;
      this.showChart = false;
      if(row){
        if(row.show_time){
          this.query.startshowtime = row.show_time
          this.query.endshowtime = row.show_time
        }
        if(row.master_name && row.master_name!="%") this.query.master_name = row.master_name
        if(row.master_ip && row.master_ip!="%") this.query.master_ip = row.master_ip
        if(row.property_name && row.property_name!="%") this.query.property_name = row.property_name
        if(row.policy && row.policy!="%") this.query.policy = row.policy
      }
      this.fetchData();
    },

    search() {
      delete this.query.group_by;
      this.showChart = true;
      this.fetchData();
    },

    changePage(page) {
      this.page = page;
    },
  },
};
</script>

<style lang="postcss">
.page_server_property_monitor {
  padding-bottom: 20px;

  .chart {
    margin-top: 20px;
  }

  .hours-filter {
    margin-bottom: 16px;
  }
}
</style>
