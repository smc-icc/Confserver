<template>
  <div class="page_operation">
    <div class="operation-sidebar">
      <el-menu
        :default-active="$route.path"
        class="operation-menu"
        @select="onMenuSelect"
      >
        <el-menu-item index="/operation/deploy">
          <i class="el-icon-upload"></i>
          <span>{{ $t("deployService.title.deploy") }}</span>
        </el-menu-item>
        <el-menu-item index="/operation/expand">
          <i class="el-icon-plus"></i>
          <span>{{ $t("deployService.title.expand") }}</span>
        </el-menu-item>
        <el-menu-item index="/operation/templates">
          <i class="el-icon-document"></i>
          <span>{{ $t("deployService.title.template") }}</span>
        </el-menu-item>
        <el-menu-item index="/operation/nodes">
          <i class="el-icon-monitor"></i>
          <span>{{ $t("deployService.title.nodes") }}</span>
        </el-menu-item>
        <el-menu-item index="/operation/check">
          <i class="el-icon-check"></i>
          <span>{{ $t("deployService.title.check") }}</span>
        </el-menu-item>
        <el-menu-item index="/operation/application">
          <i class="el-icon-s-grid"></i>
          <span>{{ $t("deployService.title.application") }}</span>
        </el-menu-item>
        <el-menu-item index="/operation/business">
          <i class="el-icon-s-marketing"></i>
          <span>{{ $t("deployService.title.business") }}</span>
        </el-menu-item>
        <el-menu-item index="/operation/businessRelation">
          <i class="el-icon-connection"></i>
          <span>{{ $t("deployService.title.businessRelation") }}</span>
        </el-menu-item>
        <el-menu-item index="/operation/idc">
          <i class="el-icon-location"></i>
          <span>{{ $t("deployService.title.idcManage") }}</span>
        </el-menu-item>
        <el-menu-item index="/operation/image">
          <i class="el-icon-picture"></i>
          <span>{{ $t("deployService.title.image") }}</span>
        </el-menu-item>
        <el-menu-item
          v-for="plugin in plugins"
          v-bind:key="plugin.f_id"
          :index="'/operation/plugins' + plugin.f_path"
        >
          <i class="el-icon-more"></i>
          <span>{{ plugin.f_name }}</span>
        </el-menu-item>
      </el-menu>
    </div>

    <div class="operation-content">
      <router-view :path="name"></router-view>
    </div>
  </div>
</template>

<script>
import plugins from "@/common/operationPlugins";

let oldPath = "/operation/deploy";

export default {
  name: "Operation",
  components: {
    plugins: plugins,
  },
  data() {
    return {
      name: "",
      plugins: [],
    };
  },
  beforeRouteEnter(to, from, next) {
    if (to.path.indexOf("/operation") != -1 && to.path != oldPath) {
      next(oldPath);
    } else {
      next();
    }
  },

  beforeRouteLeave(to, from, next) {
    oldPath = from.path;
    next();
  },
  mounted() {
    this.getPlugins();
  },
  methods: {
    onMenuSelect(index) {
      this.name = index;
      this.$router.replace(index);
    },
    getPlugins() {
      this.$ajax
        .getJSON("/plugin/api/list", { k8s: true, type: 3 })
        .then((data) => {
          this.plugins = data;

          this.plugins.forEach((plugin) => {
            if (this.$cookie.get("locale") == "en") {
              plugin.f_name = plugin.f_name_en;
            }
          });
        })
        .catch((err) => {
          this.$tip.error(
            `${this.$t("common.error")}: ${err.err_msg || err.message}`
          );
        });
    },
  },
};
</script>

<style>
.page_operation {
  display: flex;
  flex: 1;
  flex-flow: row;
  overflow: hidden;
  padding-top: 10px;
  padding-bottom: 20px;
  width: 100%;
  background: #f4f7fb;
  color: #565b66;
}

.operation-sidebar {
  flex-shrink: 0;
  width: 200px;
  overflow-y: auto;
  overflow-x: hidden;
  border-right: 1px solid #e4e7ed;
  background: #f8fafc;
  padding: 0 8px 0 0;
  box-sizing: border-box;
}

.operation-menu {
  border-right: none;
  background: transparent;
}

.operation-menu .el-menu-item,
.operation-menu .el-submenu__title {
  height: 40px;
  line-height: 40px;
  color: #565b66;
  border-radius: 4px;
}

.operation-menu .el-menu-item:hover,
.operation-menu .el-submenu__title:hover {
  background: #eef4ff;
  color: #457ff5;
}

.operation-menu .el-menu-item.is-active {
  color: #457ff5;
  background: #eaf2ff;
  box-shadow: inset 3px 0 0 #457ff5;
}

.operation-content {
  display: flex;
  flex: 1;
  flex-flow: column;
  overflow: auto;
  padding: 0 20px;
  background: transparent;
}
</style>
