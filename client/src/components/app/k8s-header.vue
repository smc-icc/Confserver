<template>
  <div class="app_index__header">
    <div class="main-width">
      <el-row :gutter="24">
        <el-col :span="6">
          <div class="logo-wrap">
            <a v-if="enable === 'true' && show === 'true'" href="/tars.html"
              ><img class="logo" src="/static/img/tars-logo.png"
            /></a>
            <a v-if="k8s === 'true'" :class="{ active: true }" href="/k8s.html"
              ><img class="logo" src="/static/img/K8S.png"
            /></a>
          </div>
        </el-col>

        <el-col :span="9" class="header-tabs-col">
          <el-tabs
            class="tabs header-main-tabs"
            :value="$route.matched[0].path"
            @tab-click="(tab) => clickTab(tab.name)"
          >
            <el-tab-pane name="/server">
              <span slot="label" class="header-tab-label"
                ><i class="el-icon-s-grid"></i>{{ $t("header.tab.tab1") }}</span
              >
            </el-tab-pane>
            <el-tab-pane name="/operation">
              <span slot="label" class="header-tab-label"
                ><i class="el-icon-setting"></i>{{ $t("header.tab.tab2") }}</span
              >
            </el-tab-pane>
            <el-tab-pane name="/smcicc">
              <span slot="label" class="header-tab-label"
                ><i class="el-icon-connection"></i>ICC配置</span
              >
            </el-tab-pane>
            <el-tab-pane name="/smcicc/system/vdn?tab=ivr">
              <span slot="label" class="header-tab-label"
                ><i class="el-icon-phone-outline"></i>呼叫流程</span
              >
            </el-tab-pane>
            <el-tab-pane name="/market">
              <span slot="label" class="header-tab-label"
                ><i class="el-icon-s-shop"></i>{{ $t("header.tab.tab9") }}</span
              >
            </el-tab-pane>
          </el-tabs>
        </el-col>
        <el-col :span="3">
          <div class="plugin-wrap">
            <extentionSelect></extentionSelect>
          </div>
        </el-col>
        <el-col :span="4">
          <div class="language-wrap">
            <localeSelect></localeSelect>
          </div>
          <div class="version-wrap">
            <div>web:{{ web_version }}</div>
            <el-link
              style="font-size: 9px"
              href="https://doc.tarsyun.com"
              target="_blank"
              >{{ locale == "cn" ? "在线文档" : "Online Manual" }}</el-link
            >
          </div>
        </el-col>
        <el-col :span="2">
          <div class="user-wrap">
            <el-dropdown
              @command="handleCommand"
              style="display: block !important"
            >
              <span class="el-dropdown-link">
                {{ uid
                }}<i
                  class="el-icon-arrow-down el-icon--right"
                  v-show="enableLogin"
                ></i>
              </span>
              <el-dropdown-menu slot="dropdown">
                <el-dropdown-item command="center" v-show="enableLogin">{{
                  $t("header.userCenter")
                }}</el-dropdown-item>
                <el-dropdown-item command="modifyPass">{{
                  $t("header.modifyPass")
                }}</el-dropdown-item>
                <el-dropdown-item command="quit">{{
                  $t("header.logout")
                }}</el-dropdown-item>
              </el-dropdown-menu>
            </el-dropdown>
          </div>
        </el-col>
      </el-row>
    </div>
  </div>
</template>

<script>
import serverIcon from "@/assets/img/server-icon.png";
import opaIcon from "@/assets/img/opa-icon.png";
import releaseIcon from "@/assets/img/package-l.png";
import cacheIcon from "@/assets/img/cache-l.png";
import operatorIcon from "@/assets/img/operator-l.png";
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
      releaseIcon,
      cacheIcon,
      operatorIcon,
      packageIcon,
      locale: this.$cookie.get("locale") || "cn",
      uid: "--",
      enableLogin: false,
      isAdmin: false,
      k8s: this.$cookie.get("k8s") || "false",
      enable: this.$cookie.get("enable") || "false",
      show: this.$cookie.get("show") || "false",
      web_version: "loading··",
      enableLdap: false,
    };
  },
  computed: {
    marketUid() {
      return this.$store.state.marketUid;
    },
  },
  methods: {
    handleCommand(command) {
      if (command == "center") {
        location.href = "/auth.html";
      } else if (command == "modifyPass") {
        location.href = "/pass.html";
      }
      if (command == "quit") {
        location.href = "/pages/server/api/logout";
      }
    },
    clickTab(tabkey) {
      this.$router.replace(tabkey);
    },
    userCenter() {
      window.open("/pages/server/api/userCenter");
    },
    getLoginUid() {
      this.$ajax
        .getJSON("/server/api/get_login_uid")
        .then((data) => {
          if (data && data.uid) {
            this.uid = data.uid;
          } else {
            this.uid = "***";
          }
        })
        .catch((err) => {
          this.$tip.error(`获取用户登录信息: ${err.err_msg || err.message}`);
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

    Axios.create({ baseURL: "/" })({
      method: "get",
      url: "/web/k8s_version",
    }).then((response) => {
      this.web_version = response.data;
      this.$store.commit({
        type: "version",
        version: this.web_version,
      });
    });
    Axios.create({ baseURL: "/" })({
      method: "get",
      url: "/web/title",
    }).then((response) => {
      document.title = response.data.title || "";
    });

    window.header = this;
  },
};
</script>

<style lang="postcss">
@import "../../assets/css/variable.css";

.app_index__header {
  height: 80px;
  border-bottom: 1px solid var(--border-color);

  .main-width {
    position: relative;
  }

  .header-tabs-col {
    display: flex;
    align-items: stretch;
  }

  .header-main-tabs.el-tabs {
    width: 100%;
    height: 80px;
  }

  .header-main-tabs .el-tabs__header {
    border-bottom: none;
    margin: 0;
    height: 80px;
    display: flex;
    align-items: center;
  }

  .header-main-tabs .el-tabs__nav-wrap {
    height: 80px;
    display: flex;
    align-items: center;
  }

  .header-main-tabs .el-tabs__nav-scroll {
    height: 80px;
    display: flex;
    align-items: center;
  }

  .header-main-tabs .el-tabs__nav {
    display: flex;
    align-items: center;
    height: 80px;
  }

  .header-main-tabs .el-tabs__item {
    height: 56px;
    line-height: 56px;
    padding: 0 14px;
    font-size: 15px;
    font-weight: 500;
    box-sizing: border-box;
  }

  .header-main-tabs .el-tabs__active-bar {
    height: 3px;
    border-radius: 2px 2px 0 0;
  }

  .header-tab-label {
    display: inline-flex;
    align-items: center;
    white-space: nowrap;
  }

  .header-tab-label i {
    margin-right: 6px;
    font-size: 17px;
    vertical-align: middle;
  }

  .version-wrap {
    top: 0;
    font-size: 12px;
    height: 80px;
    padding: 15px var(--gap-small);
    display: inline-block;
  }

  .logo-wrap {
    left: 0;
    width: auto;
    z-index: 100;
    padding: 0px;

    a {
      display: inline-block;
      height: 80px;
      padding: 30px 20px 0;
      position: relative;
      &.active {
        &::after {
          content: "";
          display: inline-block;
          height: 3px;
          width: 100%;
          background: #457ff5;
          position: absolute;
          top: 76px;
          left: 0px;
        }
      }
      .logo {
        height: 25px;
      }
    }
    .logo {
      height: 28px;
    }
  }

  .plugin-wrap {
    height: 80px;
    padding-top: 20px;
    display: inline-block;
  }

  .language-wrap {
    height: 80px;
    padding-top: 20px;
    display: inline-block;
  }

  .user-wrap {
    height: 50px;
    text-align: right;
    margin-top: 30px;
  }
}
</style>
