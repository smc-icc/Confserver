/** 与 client/src/plugins/ajax.js ResultHandler 及 CallFlowController.wrapOk 一致 */
function wrapOk(data) {
    return {
        ret_code: 200,
        data: data === undefined || data === null ? {} : data,
    };
}

function shouldWrapSMCIccCompatUrl(url) {
    return (
        typeof url === 'string' &&
        (url.indexOf('/smcicc/systemadmin/') === 0 || url.indexOf('/smcicc/vdnadmin/') === 0)
    );
}

function wrapSMCIccCompatBody(body) {
    if (body == null) {
        return wrapOk({});
    }
    if (typeof body === 'object' && body.ret_code !== undefined) {
        return body;
    }
    return wrapOk(body);
}

module.exports = { wrapOk, shouldWrapSMCIccCompatUrl, wrapSMCIccCompatBody };
