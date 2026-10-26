<template>
  <div style="margin: 20px auto;overflow:auto;">
    <el-form inline itemWidth="200px" @submit.native.prevent="search">
      <div style="float:center">
        <el-button size="small" type="primary" @click="addItem">{{
          $t("auth.addPrivilege")
        }}</el-button>
        &nbsp;&nbsp; &nbsp;&nbsp;
        <el-button
          v-if="!enableLdap"
          size="small"
          type="primary"
          @click="addUser"
          >{{ $t("auth.addUser") }}</el-button
        >
        &nbsp;&nbsp; &nbsp;&nbsp;
        <el-button size="small" type="danger" @click="delUser">{{
          $t("auth.delUser")
        }}</el-button>
        &nbsp;&nbsp; &nbsp;&nbsp;
        <i class="el-icon-refresh-right" @click="getUserList()"></i>
      </div>

      <el-form-item :label="$t('auth.uid')">
        <el-input size="middle" v-model="query.uid"></el-input>
      </el-form-item>
      <el-form-item>
        <el-button size="small" type="primary" native-type="submit">{{
          $t("ssoCommon.search")
        }}</el-button>
      </el-form-item>
    </el-form>

    <el-table
      :data="userListShow"
      stripe
      :empty-text="$t('ssoCommon.nodata')"
    >
      <el-table-column width="50" align="center">
        <template slot="header">
          <el-checkbox v-model="isCheckedAll"></el-checkbox>
        </template>
        <template slot-scope="scope">
          <el-checkbox
            v-model="scope.row.isChecked"
            :value="scope.row.uid"
          ></el-checkbox>
        </template>
      </el-table-column>
      <el-table-column
        :label="$t('auth.uid')"
        prop="uid"
        min-width="140"
        show-overflow-tooltip
      ></el-table-column>
      <el-table-column
        :label="$t('auth.userTime')"
        prop="update_time"
        width="180"
      ></el-table-column>
      <el-table-column :label="$t('auth.privileges')" min-width="260" show-overflow-tooltip>
        <template slot-scope="scope">
          <el-tag
            v-for="(auth, index) in scope.row.authorization"
            :key="index"
            closable
            @close="delItem(scope.row.uid, auth)"
            size="small"
          >{{ auth.flag + " : " + auth.role }}</el-tag>
        </template>
      </el-table-column>
    </el-table>
    <el-pagination
      v-if="pageCount > 0"
      align="right"
      style="margin-top: 12px"
      :prev-text="$t('ssoCommon.prevPage')"
      :next-text="$t('ssoCommon.nextPage')"
      :total="pageCount"
      :current-page="page"
      @current-change="changePage"
    >
    </el-pagination>

    <el-dialog
      :title="dialogTitle"
      :visible.sync="showDialog"
      width="600px"
      @close="onClose"
    >
      <div>
        <el-form itemWidth="100%" ref="editForm">
          <el-input type="hidden" v-model="dialog.id"></el-input>
          <el-form-item :label="$t('auth.uid')">
            <el-input
              size="small"
              v-model="dialog.uid"
              required
              :required-tip="$t('auth.uidTips')"
            ></el-input>
          </el-form-item>
          <el-form-item :label="$t('pass.password')" required>
            <el-input
              type="password"
              size="small"
              v-model="dialog.password"
              required
              :required-tip="$t('pass.passwordTips')"
            ></el-input>
          </el-form-item>
        </el-form>
      </div>
      <template slot="footer">
        <el-button @click="onClose">{{ $t('ssoCommon.cancel') || '取消' }}</el-button>
        <el-button type="primary" @click="onConfirm">{{ $t('ssoCommon.confirm') || '确定' }}</el-button>
      </template>
    </el-dialog>

    <el-dialog
      :title="dialogAuthTitle"
      :visible.sync="showAuthDialog"
      width="600px"
      @close="onClose"
    >
      <div>
        <el-form itemWidth="100%" ref="editAuthForm" labelWidth="100%">
          <el-input type="hidden" v-model="dialogAuth.id"></el-input>
          <el-form-item :label="$t('auth.role')" required>
            <el-select v-model="dialogAuth.role">
              <el-option value="admin">admin</el-option>
              <el-option value="operator">operator</el-option>
              <el-option value="developer">developer</el-option>
            </el-select>
          </el-form-item>
          <el-form-item :label="$t('auth.uid')" required>
            <el-select v-model="dialogAuth.uid" filterable>
              <el-option
                v-for="id in userList"
                :value="id.uid"
                :key="id.uid"
                >{{ id.name || id.uid }}</el-option
              >
            </el-select>
          </el-form-item>
          <el-form-item :label="$t('auth.flag')" required>
            <el-input
              size="middle"
              v-model="dialogAuth.flag"
              required
              :required-tip="$t('auth.flagTips')"
            ></el-input>
          </el-form-item>
        </el-form>
      </div>
      <template slot="footer">
        <el-button @click="onClose">{{ $t('ssoCommon.cancel') || '取消' }}</el-button>
        <el-button type="primary" @click="onAuthConfirm">{{ $t('ssoCommon.confirm') || '确定' }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import sha1 from "sha1";
import moment from "moment";

export default {
  name: "userPage",
  data() {
    return {
      uid: "",
      query: {
        uid: "",
      },
      isCheckedAll: false,
      userList: [],
      userListShow: [],
      totalCount: 0,
      page: 1,
      eachPageCount: 20,
      password: "",
      //弹出框相关数据
      dialogTitle: "",
      showDialog: false,
      dialog: {
        id: "",
        uid: "",
        password: "",
      },
      //弹出框相关数据
      dialogAuthTitle: "",
      showAuthDialog: false,
      dialogAuth: {
        id: "",
        flag: "",
        role: "",
        uid: "",
      },
      enableLdap: false,
    };
  },
  computed: {
    pageCount() {
      return Math.ceil(this.totalCount / this.eachPageCount);
    },
  },

  methods: {
    // 获取是否启用LDAP用户库
    getEnableLdap() {
      this.$ajax
        .getJSON("/server/api/isEnableLdap")
        .then((data) => {
          if (data) {
            this.enableLdap = data.enableLdap;
          }
        })
        .catch((err) => {
          console.log(`get enableLdap:`, err);
        });
    },
    search() {
      this.page = 1;
      this.uid = this.query.uid;
      var userList = [];
      if (this.uid) {
        userList = this.userList.filter((id) => {
          return id.uid.indexOf(this.query.uid) != -1;
        });
      } else {
        userList = this.userList.slice(
          (this.page - 1) * this.eachPageCount,
          this.page * this.eachPageCount
        );
      }

      this.isCheckedAll = false;
      userList.forEach((auth) => {
        auth.isChecked = false;
        auth.update_time = moment(auth.update_time).format(
          "YYYY-MM-DD HH:mm:ss"
        );
      });
      this.userListShow = userList;
    },
    getUserList() {
      const loading = this.$Loading.show();

      this.$ajax
        .getJSON("/server/api/auth/page/getUserIdList")
        .then((data) => {
          loading.hide();

          data.forEach((user) => {
            user.isChecked = false;
            user.role = JSON.stringify(user.authorization);
          });
          this.userList = data;
          this.totalCount = data.length;
          this.search();
        })
        .catch((err) => {
          loading.hide();

          this.$tip.error(
            `${this.$t("auth.loadUserIdError")}: ${err.err_msg || err.message}`
          );
        });
    },
    changePage(val) {
      this.page = val;
    },
    addItem() {
      this.dialogAuthTitle = this.$t("auth.addPrivilege");
      this.showAuthDialog = true;
      this.dialogAuth.id = "";
      this.dialogAuth.flag = "";
      this.dialogAuth.role = "";
      this.dialogAuth.uid = "";
    },
    delItem(uid, authorization) {
      this.$confirm(
        this.$t("auth.confirmDelete"),
        this.$t("ssoCommon.confirmTitle")
      ).then(() => {
        const loading = this.$Loading.show();
        this.$ajax
          .postJSON("/server/api/auth/page/pageDeleteAuth", {
            uid: uid,
            role: authorization.role,
            flag: authorization.flag,
          })
          .then((data) => {
            loading.hide();
            this.$tip.success(this.$t("auth.delSucc"));
            this.getUserList();
            // this.search();
          })
          .catch((err) => {
            loading.hide();
            this.$tip.error(
              `${this.$t("auth.delError")}: ${err.err_msg || err.message}`
            );
          });
      });
    },
    onAuthConfirm() {
      if (!this.$refs.editAuthForm.validate()) {
        return;
      }
      var uids = this.dialogAuth.uid ? this.dialogAuth.uid.split(/;|,/g) : [];
      var params = [];
      uids.forEach((uid) => {
        if (uid) {
          params.push({
            flag: this.dialogAuth.flag,
            role: this.dialogAuth.role,
            uid: uid,
          });
        }
      });
      const loading = this.$Loading.show();
      var url = "/server/api/auth/page/addAuth";
      this.$ajax
        .postJSON(url, { auth: params })
        .then((data) => {
          loading.hide();
          this.showDialog = false;
          this.$tip.success(this.dialogTitle + this.$t("ssoCommon.success"));
          this.getUserList();
          // this.search();
        })
        .catch((err) => {
          loading.hide();
          this.$tip.error(
            `${this.dialogTitle}${this.$t("ssoCommon.failed")}: ${err.err_msg ||
              err.message}`
          );
        });
    },
    addUser() {
      this.dialogTitle = this.$t("auth.addUser");
      this.showDialog = true;
      this.dialog.id = "";
      this.dialog.uid = "";
      this.dialog.password = "";
    },
    onConfirm() {
      if (!this.$refs.editForm.validate()) {
        return;
      }
      var uids = this.dialog.uid ? this.dialog.uid.split(/;|,/g) : [];
      var params = [];
      uids.forEach((uid) => {
        if (uid) {
          params.push({
            uid: uid,
            password: sha1(this.dialog.password),
          });
        }
      });
      const loading = this.$Loading.show();
      var url = "/server/api/auth/page/addUser";
      this.$ajax
        .postJSON(url, { user: params })
        .then((data) => {
          loading.hide();
          this.showDialog = false;
          this.$tip.success(this.dialogTitle + this.$t("ssoCommon.success"));
          this.getUserList();
        })
        .catch((err) => {
          loading.hide();
          this.$tip.error(
            `${this.dialogTitle}${this.$t("ssoCommon.failed")}: ${err.err_msg ||
              err.message}`
          );
        });
    },
    onClose() {},
    delUser() {
      this.$confirm(
        this.$t("auth.confirmDelete"),
        this.$t("ssoCommon.confirmTitle")
      ).then(() => {
        var ids = [];
        this.userListShow.forEach((auth) => {
          if (auth.isChecked === true) {
            if (auth.uid == "admin") {
              this.$tip.error(this.$t("auth.adminDelError"));
              return;
            }
            ids.push(auth.uid);
          }
        });
        if (!ids.length) {
          this.$tips.error(this.$t("auth.selectRecord"));
          return;
        }
        const loading = this.$Loading.show();
        this.$ajax
          .postJSON("/server/api/auth/page/pageDeleteUser", { uids: ids })
          .then((data) => {
            loading.hide();
            this.$tip.success(this.$t("auth.delSucc"));
            this.getUserList();
          })
          .catch((err) => {
            loading.hide();
            this.$tip.error(
              `${this.$t("auth.delError")}: ${err.err_msg || err.message}`
            );
          });
      });
    },
  },
  mounted() {
    this.getEnableLdap();
    this.getUserList();
  },
  watch: {
    isCheckedAll() {
      const isCheckedAll = this.isCheckedAll;
      this.userListShow.forEach((item) => {
        item.isChecked = isCheckedAll;
      });
    },
    // 如果路由有变化，会再次执行该方法
    $route: function(to, end) {
      this.getUserList();
    },
  },
};
</script>
<style>
.top-title {
  margin: 16px 0;
  line-height: 2.5;
  font-size: 18px;
  border-bottom: 1px solid #c5d9e8;
}
</style>
