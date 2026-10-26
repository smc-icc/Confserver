<template>
  <div class="app_index__header">
    <!-- 单行深蓝顶栏：左贴边 Logo | 中间主导航 | 右扩展/语言/用户 -->
    <div class="header-primary">
      <div class="header-bar-inner">
        <div class="header-col header-col-start">
          <div class="header-brand">
            <div class="header-brand-logos">
              <a
                v-if="enable === 'true' && show === 'true'"
                class="header-brand-logo-link"
                href="/tars.html"
                title="细语全媒体智能客服平台"
              >
                <img class="header-brand-logo-img" src="/static/img/tars-logo.png" alt="" />
              </a>
              <a v-if="k8s === 'true'" class="header-brand-logo-link" href="/k8s.html" title="K8S">
                <img class="header-brand-logo-img" src="/static/img/K8S.png" alt="" />
              </a>
            </div>
          </div>
        </div>

        <div class="header-col header-col-center">
          <div class="header-nav">
            <el-tabs
              class="tabs header-main-tabs"
              :value="$route.matched[0].path"
              @tab-click="(tab) => clickTab(tab.name)"
            >
              <el-tab-pane v-if="!managedVdnUser" name="/server">
                <span slot="label" class="header-tab-label"
                  ><i class="el-icon-s-grid"></i
                  ><span class="header-tab-text">{{ $t("header.tab.tab1") }}</span></span
                >
              </el-tab-pane>
              <el-tab-pane v-if="!managedVdnUser" name="/operation">
                <span slot="label" class="header-tab-label"
                  ><i class="el-icon-setting"></i
                  ><span class="header-tab-text">{{ $t("header.tab.tab2") }}</span></span
                >
              </el-tab-pane>
              <el-tab-pane name="/smcicc">
                <span slot="label" class="header-tab-label"
                  ><i class="el-icon-coin"></i
                  ><span class="header-tab-text">{{ $t('smcicc.tab') }}</span></span
                >
              </el-tab-pane>
              <!--
              <el-tab-pane name="/smcicc/callflow">
                <span slot="label" class="header-tab-label"
                  ><i class="el-icon-phone-outline"></i
                  ><span class="header-tab-text">呼叫流程</span></span
                >
              </el-tab-pane>
              -->
              <el-tab-pane v-if="marketEnabled" name="/market">
                <span slot="label" class="header-tab-label"
                  ><i class="el-icon-s-shop"></i
                  ><span class="header-tab-text">{{ $t("header.tab.tab9") }}</span></span
                >
              </el-tab-pane>
            </el-tabs>
          </div>
        </div>

        <div class="header-col header-col-end">
          <div class="header-primary-tools">
            <div v-if="!managedVdnUser" class="plugin-wrap header-tool-plugin">
              <extentionSelect></extentionSelect>
            </div>
            <span class="language-wrap header-tool-locale">
              <localeSelect></localeSelect>
            </span>
            <div class="user-wrap">
              <el-dropdown class="header-user-dropdown" @command="handleCommand">
                <span class="el-dropdown-link header-user-link">
                  {{ uid }}<i class="el-icon-arrow-down el-icon--right"></i>
                </span>
                <el-dropdown-menu slot="dropdown">
                  <el-dropdown-item command="center" v-show="enableLogin">{{
                    $t("header.userCenter")
                  }}</el-dropdown-item>
                  <el-dropdown-item command="modifyPass" v-if="!enableLdap">{{
                    $t("header.modifyPass")
                  }}</el-dropdown-item>
                  <el-dropdown-item command="quit" v-if="!enableLdap">{{
                    $t("header.logout")
                  }}</el-dropdown-item>
                </el-dropdown-menu>
              </el-dropdown>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import serverIcon from "@/assets/img/server-icon.png";
import opaIcon from "@/assets/img/opa-icon.png";
import cacheIcon from "@/assets/img/cache-l.png";
import packageIcon from "@/assets/img/package-l.png";
import localeSelect from "@/components/locale-select";
import extentionSelect from "@/components/extention-select";

import Axios from "axios";
export default {
  components: {
    localeSelect,
    extentionSelect,
  },
  data() {
    return {
      // 图标
      serverIcon,
      opaIcon,
      cacheIcon,
      packageIcon,
      locale: this.$cookie.get("locale") || "cn",
      uid: this.$cookie.get("uid") || "--",
      enableLogin: false,
      isAdmin: false,
      k8s: this.$cookie.get("k8s") || "false",
      enable: this.$cookie.get("enable") || "false",
      show: this.$cookie.get("show") || "false",
      enableLdap: false,
      marketEnabled: false,
    };
  },
  computed: {
    managedVdnUser() {
      // Presentation only; API authorization still uses the validated ticket.
      return /^conf-(?:vdn|account):/.test(String(this.uid));
    },
    marketUid() {
      return this.$store.state.marketUid;
    },
  },
  methods: {
    clickTab(tabkey) {
      const cur =
        this.$route.matched[0] && this.$route.matched[0].path;
      if (tabkey === cur) {
        if (tabkey === "/server") {
          this.$root.$emit("server-page-refresh");
        }
        return;
      }
      this.$router.replace(tabkey);
    },
    userCenter() {
      window.open("/pages/server/api/userCenter");
    },
    handleCommand(command) {
      if (command == "center") {
        location.href = "/auth.html";
      } else if (command == "modifyPass") {
        location.href = "/pass.html";
      }
      if (command == "quit") {
        location.href = "/pages/server/api/logout";
        //location.href = "/login.html";
        //console.log("logout==========");
      }
    },
    getLoginUid() {
      this.$ajax
        .getJSON("/server/api/get_login_uid")
        .then((data) => {
          if (data && data.uid) {
            this.uid = data.uid;
            window.localStorage.localUid = this.uid;
          } else {
            this.uid = "***";
            window.localStorage.localUid = this.uid;
          }
        })
        .catch((err) => {
          this.$tip.error(
            `get user login info error: ${err.err_msg || err.message}`
          );
        });
    },
    checkEnableLogin() {
      this.$ajax
        .getJSON("/server/api/is_enable_login")
        .then((data) => {
          this.enableLogin = data.enableLogin || false;
        })
        .catch((err) => {});
    },
    checkEnableLdap() {
      this.$ajax
        .getJSON("/server/api/isEnableLdap")
        .then((data) => {
          this.enableLdap = data.enableLdap || false;
        })
        .catch((err) => {});
    },
    loadMarketConfig() {
      fetch("/web/market")
        .then((r) => r.json())
        .then((data) => {
          this.marketEnabled = !!(data && !data.disabled && data.url);
        })
        .catch(() => {
          this.marketEnabled = false;
        });
    },
    checkAdmin() {
      this.isAdmin = false;
      this.$ajax
        .getJSON("/server/api/isAdmin")
        .then((data) => {
          this.isAdmin = data.admin;
        })
        .catch((err) => {});
    },
  },
  mounted() {
    this.getLoginUid();
    this.checkEnableLogin();
    this.checkAdmin();
    this.checkEnableLdap();
    if (this.managedVdnUser) {
      document.title = '海米云全媒体智能客服 · 配置管理';
      window.header = this;
      return;
    }
    this.loadMarketConfig();

    Axios.create({ baseURL: "/" })({
      method: "get",
      url: "/web/web_version",
    }).then((response) => {
      const webVersion = response.data.webVersion;
      const frameworkVersion = response.data.frameworkVersion;
      if (this.$store && typeof this.$store.commit === "function") {
        try {
          this.$store.commit({
            type: "version",
            version: webVersion,
            framework_version: frameworkVersion,
          });
        } catch (e) {
          /* ignore */
        }
      }
    }).catch(() => {});

    Axios.create({ baseURL: "/" })({
      method: "get",
      url: "/web/title",
    }).then((response) => {
      document.title = response.data.title || "";
    }).catch(() => {});

    window.header = this;
  },
};
</script>

<style lang="postcss">
@import "../../assets/css/variable.css";

/* 单行深蓝顶栏 */
.app_index__header {
  flex-shrink: 0;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
}

/* ---------- 主顶栏（蓝底、白字导航、底部浅蓝激活条）---------- */
.app_index__header .header-primary {
  background: linear-gradient(180deg, #3556d6 0%, #2d5cf6 100%);
  box-shadow: 0 1px 0 rgba(0, 0, 0, 0.06);
}

/* 全宽顶栏：Logo 贴左、导航几何居中、工具靠右（不再使用 main-width 居中造成左侧大空白） */
.app_index__header .header-bar-inner {
  position: relative;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 12px 16px;
  width: 100%;
  max-width: none;
  margin: 0;
  box-sizing: border-box;
  min-height: 64px;
  padding: 8px 12px 4px;
}

.app_index__header .header-col-start {
  justify-self: start;
  min-width: 0;
}

.app_index__header .header-col-center {
  justify-self: center;
  min-width: 0;
  max-width: 100%;
}

.app_index__header .header-col-end {
  justify-self: end;
  min-width: 0;
}

.app_index__header .header-primary-tools {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: nowrap;
  gap: 10px 12px;
  flex-shrink: 0;
  min-width: 0;
}

.app_index__header .header-brand {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.app_index__header .header-brand-logos {
  display: flex;
  align-items: center;
  gap: 8px;
}

.app_index__header .header-brand-logo-link {
  display: flex;
  align-items: center;
  opacity: 0.95;
}

.app_index__header .header-brand-logo-link:hover {
  opacity: 1;
}

.app_index__header .header-brand-logo-img {
  height: 36px;
  width: auto;
  display: block;
}

.app_index__header .header-nav {
  display: flex;
  justify-content: center;
  min-width: 0;
  max-width: 100%;
}

.app_index__header .header-main-tabs.el-tabs {
  width: auto;
  max-width: 100%;
  min-width: 0;
}

.app_index__header .header-main-tabs .el-tabs__header {
  border-bottom: none;
  margin: 0;
  background: transparent;
}

.app_index__header .header-main-tabs .el-tabs__nav-wrap::after {
  display: none;
}

.app_index__header .header-main-tabs .el-tabs__nav-wrap {
  display: flex;
  justify-content: center;
}

.app_index__header .header-main-tabs .el-tabs__nav-scroll {
  overflow: visible;
}

.app_index__header .header-main-tabs .el-tabs__nav {
  display: flex;
  align-items: stretch;
  border: none;
  float: none;
}

.app_index__header .header-main-tabs .el-tabs__item {
  height: 52px;
  min-height: 52px;
  line-height: 52px;
  padding: 0 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.88) !important;
  border: none;
  box-sizing: border-box;
}

.app_index__header .header-main-tabs .el-tabs__item:hover {
  color: #fff !important;
}

.app_index__header .header-main-tabs .el-tabs__item.is-active {
  color: #fff !important;
}

.app_index__header .header-main-tabs .el-tabs__active-bar {
  height: 3px;
  background: #9ecbff;
  border-radius: 2px 2px 0 0;
  bottom: 0;
}

/* 图标 + 文字横排 */
.app_index__header .header-tab-label {
  display: inline-flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 6px;
  white-space: nowrap;
}

.app_index__header .header-tab-label i {
  font-size: 17px;
  color: rgba(255, 255, 255, 0.95);
  margin: 0;
  line-height: 1;
}

.app_index__header .header-tab-text {
  font-size: 13px;
  line-height: 1.2;
}

/* ---------- 顶栏右侧：扩展、语言、用户（浅底控件适配蓝条）---------- */
.app_index__header .plugin-wrap {
  display: inline-flex;
  align-items: center;
  padding: 0;
  vertical-align: middle;
}

.app_index__header .header-tool-plugin {
  flex: 0 1 220px;
  min-width: 100px;
  max-width: 240px;
}

.app_index__header .header-tool-plugin .el-select {
  width: 100%;
}

.app_index__header .header-tool-plugin > div {
  display: flex !important;
  align-items: center;
  flex-wrap: nowrap;
  width: 100%;
}

.app_index__header .header-tool-plugin > div > div:first-child {
  flex: 1;
  min-width: 0;
  width: auto !important;
}

.app_index__header .header-tool-plugin > div > div:last-child {
  flex-shrink: 0;
  width: auto !important;
  margin-left: 8px !important;
}

.app_index__header .header-primary-tools .el-input__inner {
  background-color: rgba(255, 255, 255, 0.14);
  border-color: rgba(255, 255, 255, 0.45);
  color: #fff;
}

.app_index__header .header-primary-tools .el-input__inner::placeholder {
  color: rgba(255, 255, 255, 0.55);
}

.app_index__header .header-primary-tools .el-input__inner:hover {
  border-color: rgba(255, 255, 255, 0.65);
}

.app_index__header .header-primary-tools .el-select .el-input .el-select__caret {
  color: rgba(255, 255, 255, 0.85);
}

.app_index__header .header-primary-tools .el-icon-refresh-right {
  color: rgba(255, 255, 255, 0.92);
  font-size: 18px;
  cursor: pointer;
  vertical-align: middle;
}

.app_index__header .header-primary-tools .el-icon-refresh-right:hover {
  color: #fff;
}

.app_index__header .language-wrap {
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
}

.app_index__header .header-tool-locale .el-select {
  width: 100px;
}

.app_index__header .user-wrap {
  flex-shrink: 0;
  flex-grow: 0;
  text-align: right;
  white-space: nowrap;
}

.app_index__header .header-user-dropdown {
  display: inline-block;
  vertical-align: middle;
}

.app_index__header .header-user-link {
  color: rgba(255, 255, 255, 0.95);
  font-size: 13px;
  cursor: pointer;
}

.app_index__header .header-user-link:hover {
  color: #fff;
}
</style>
