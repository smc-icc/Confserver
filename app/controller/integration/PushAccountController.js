const { getService } = require("../../service/integration/PushAccountService");
function createController(service) {
  const methods = {
      platforms: "platforms",
      list: "list",
      save: "save",
      remove: "remove",
      sync: "synchronize",
      test: "test",
    },
    controller = {};
  for (const [name, method] of Object.entries(methods))
    controller[name] = async (ctx) => {
      if (ctx.uid !== "admin") {
        ctx.status = 403;
        ctx.body = { ret_code: 403, err_msg: "仅系统超级用户可管理推送帐号" };
        return;
      }
      try {
        const instance = service || getService();
        const result = await instance[method](ctx.request.body || {});
        ctx.body = { ret_code: 200, data: result };
      } catch (error) {
        const status = error.status || 502;
        ctx.status = status;
        ctx.body = {
          ret_code: status,
          err_msg: error.status
            ? error.message
            : "推送操作失败，请检查同步服务",
        };
      }
    };
  return controller;
}
module.exports = { ...createController(), createController };

// Resume durable pending snapshots even when no administrator has opened this page.
getService();
