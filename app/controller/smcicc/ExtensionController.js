'use strict';
const logger = require('../../../logger');
const Service = require('../../service/smcicc/ExtensionService');
const Controller = {};
// Never log ctx/raw SQL errors: forms can carry reservation or credential data.
for (const action of ['loadExtensionList','addExtension','editExtension','deleteExtension','copyExtension','batchExtension','setExtensionValid','getchGroupList','getNumList','acquireExtension','releaseExtension','checkExtensionNumber']) {
    Controller[action] = async ctx => {
        try { ctx.body = await Service[action](ctx); }
        catch (e) {
            const status = e.status || 500;
            if ([401,403,405,503].includes(status)) ctx.status = status;
            logger.warn('[smcicc][extension] action=' + action + ' status=' + status);
            ctx.body = { result: status === 409 && /已存在|已被预留/.test(e.message) ? -2 : 0,
                msg: e.status ? e.message : '分机操作失败，请检查服务状态' };
        }
    };
}
module.exports = Controller;
