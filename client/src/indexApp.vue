<template>
  <div id="app">
    <app-header> </app-header>

    <!-- 切换 tab 缓存接口（主要为左侧目录树） -->
    <div v-if="!market" class="main-router-wrap">
      <keep-alive>
        <router-view id="m1" class="main-width"></router-view>
      </keep-alive>
    </div>
    <div v-if="market" class="main-router-wrap">
      <router-view id="m2" class="main-width" name="market"></router-view>
    </div>

    <!-- <app-footer class="app_index__footer"></app-footer> -->
  </div>
</template>

<script>
import AppHeader from "./components/app/header";
import AppFooter from "./components/app/footer";

export default {
  name: "App",
  components: {
    AppHeader,
    AppFooter,
  },
  watch: {
    $route(to) {
      this.syncMarketRoute(to.path);
    },
  },
  data() {
    return { market: false };
  },
  mounted() {
    this.syncMarketRoute(this.$route.path);
    if (/^conf-(?:vdn|account):/.test(String(this.$cookie.get('uid') || ''))) {
      if (/^\/(?:server|operation|market)(?:\/|$)/.test(this.$route.path)) this.$router.replace('/smcicc/vdnadmin/workspace');
      return;
    }
    fetch("/web/market")
      .then((r) => r.json())
      .then((cfg) => {
        if (this.$route.path === "/market" && (cfg.disabled || !cfg.url)) {
          this.$router.replace("/server");
        }
      })
      .catch(() => {});
  },
  methods: {
    syncMarketRoute(path) {
      const managedVdnUser = /^conf-(?:vdn|account):/.test(String(this.$cookie.get('uid') || ''));
      this.market = path === "/market" && !managedVdnUser;
      if (path === "/market" && managedVdnUser) {
        this.$router.replace('/smcicc/vdnadmin/workspace');
      }
    },
  },
};
</script>

<style lang="postcss">
@import "./assets/font/lato/Lato.css";
@import "./assets/css/reset.css";
@import "./assets/css/variable.css";
  html, body {
    height: 100%;
    overflow: hidden;
  }
#web_version {
  position: absolute;
  top: 10px;
  right: 10px;
  color: #888;
  font-size: 12px;
}
.clearfix {
  *zoom: 1;

  & :after,
  & :before {
    display: table;
    content: " ";
  }

  & :after {
    clear: both;
  }
}
.toe {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  word-break: break-all;
}

.disabled {
  opacity: 0.65;
  pointer-events: none;
}

.hidden {
  display: none;
}

.main-router-wrap {
  flex: 1;
  overflow: hidden;
  min-height: 0;
  display: flex;
  flex-flow: column;
}

/* keep-alive 只作高度容器，勿设 flex 列布局（会把缓存的各路由页叠成竖排） */
.main-router-wrap > * {
  flex: 1 1 auto;
  min-height: 0;
  min-width: 0;
  width: 100%;
  height: 100%;
  display: block;
  overflow: hidden;
}

.main-width {
  margin: 0;
  /* max-width: var(--main-width); */
  padding: 0 var(--gap-small);
  min-height: 0;
  min-width: 0;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  display: block;
}

/* 各模块根布局在路由容器内拉满高度（不依赖 class 是否合并到同一节点） */
.main-router-wrap .page_server {
  display: flex;
  flex-flow: row;
  flex: 1;
  height: 100%;
  min-height: 0;
  min-width: 0;
}
.main-router-wrap .page_operation,
.main-router-wrap .smcicc-shell {
  display: flex;
  height: 100%;
  min-height: 0;
  min-width: 0;
}

#app {
  display: flex;
  flex-flow: column;
  overflow: hidden;
  position: relative;
  height: 100%;
  font-size: 14px;
}

.app_index__footer {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
}

/* 调换弹窗确定取消左右顺序 */
.let-dialog .let-dialog__foot .let-align__inner {
  display: flex;
  flex-direction: row-reverse;
  justify-content: center;

  .el-button:first-child {
    margin-right: 0;
    margin-left: 16px;
  }
}

/* .icon.iconfont {
  font-size: 10px;
  cursor: pointer;
  vertical-align: 0em;
} */
</style>
