/* eslint-disable */
"use strict";

var TarsStream = require("@tars/stream");
var TarsError = require("@tars/rpc").error;

var _makeError = function (data, message, type) {
    var error = new Error(message || "");
    error.request = data.request;
    error.response = {
        costtime: data.request.costtime,
    };
    if (type === TarsError.CLIENT.DECODE_ERROR) {
        error.name = "DECODE_ERROR";
        error.response.error = { code: type, message: message };
    } else {
        error.name = "RPC_ERROR";
        error.response.error = data.error;
    }
    return error;
};

var smc_icc = smc_icc || {};
module.exports.smc_icc = smc_icc;

smc_icc.stCommRsp_t = function () {
    this.err = 0;
    this.errMsg = "";
    this._classname = "smc_icc.stCommRsp_t";
};
smc_icc.stCommRsp_t._classname = "smc_icc.stCommRsp_t";
smc_icc.stCommRsp_t._write = function (os, tag, value) { os.writeStruct(tag, value); };
smc_icc.stCommRsp_t._read = function (is, tag, def) { return is.readStruct(tag, true, def); };
smc_icc.stCommRsp_t.prototype.writeTo = function (os) {
    os.writeInt32(0, this.err);
    os.writeString(1, this.errMsg);
};
smc_icc.stCommRsp_t.prototype.readFrom = function (is) {
    this.err = is.readInt32(0, true, this.err);
    this.errMsg = is.readString(1, true, this.errMsg);
};
smc_icc.stCommRsp_t.prototype._clone = function () { return new smc_icc.stCommRsp_t(); };
smc_icc.stCommRsp_t.prototype._is = function (proto) { return proto === this._classname; };
smc_icc.stCommRsp_t.prototype.readFromObject = function (json) {
    json = json || {};
    if (json.err != null) this.err = Number(json.err);
    if (json.errMsg != null) this.errMsg = String(json.errMsg);
    return this;
};
smc_icc.stCommRsp_t.prototype.toObject = function () {
    return { err: this.err, errMsg: this.errMsg };
};

smc_icc.stReloadVdnConfigReq_t = function () {
    this.scope = 0;
    this.vdnId = 0;
    this.reason = "";
    this._classname = "smc_icc.stReloadVdnConfigReq_t";
};
smc_icc.stReloadVdnConfigReq_t._classname = "smc_icc.stReloadVdnConfigReq_t";
smc_icc.stReloadVdnConfigReq_t._write = function (os, tag, value) { os.writeStruct(tag, value); };
smc_icc.stReloadVdnConfigReq_t._read = function (is, tag, def) { return is.readStruct(tag, true, def); };
smc_icc.stReloadVdnConfigReq_t.prototype.writeTo = function (os) {
    os.writeInt32(0, this.scope);
    os.writeInt32(1, this.vdnId);
    os.writeString(2, this.reason);
};
smc_icc.stReloadVdnConfigReq_t.prototype.readFrom = function (is) {
    this.scope = is.readInt32(0, false, this.scope);
    this.vdnId = is.readInt32(1, false, this.vdnId);
    this.reason = is.readString(2, false, this.reason);
};
smc_icc.stReloadVdnConfigReq_t.prototype._clone = function () { return new smc_icc.stReloadVdnConfigReq_t(); };
smc_icc.stReloadVdnConfigReq_t.prototype._is = function (proto) { return proto === this._classname; };
smc_icc.stReloadVdnConfigReq_t.prototype.readFromObject = function (json) {
    json = json || {};
    if (json.scope != null) this.scope = Number(json.scope);
    if (json.vdnId != null) this.vdnId = Number(json.vdnId);
    if (json.reason != null) this.reason = String(json.reason);
    return this;
};
smc_icc.stReloadVdnConfigReq_t.prototype.toObject = function () {
    return { scope: this.scope, vdnId: this.vdnId, reason: this.reason };
};

smc_icc.ccsProxy = function () {
    this._name = undefined;
    this._worker = undefined;
};
smc_icc.ccsProxy.prototype.setTimeout = function (iTimeout) { this._worker.timeout = iTimeout; };
smc_icc.ccsProxy.prototype.getTimeout = function () { return this._worker.timeout; };
smc_icc.ccsProxy.prototype.setVersion = function (iVersion) { this._worker.version = iVersion; };
smc_icc.ccsProxy.prototype.getVersion = function () { return this._worker.version; };

var __smc_icc_ccs$DoReloadVdnConfig$IF = {
    name: "DoReloadVdnConfig",
    return: "int32",
    arguments: [{
        name: "req",
        class: "smc_icc.stReloadVdnConfigReq_t",
        direction: "in",
    }, {
        name: "rsp",
        class: "smc_icc.stCommRsp_t",
        direction: "out",
    }],
};

var __smc_icc_ccs$DoReloadVdnConfig$IE = function (req) {
    var os = new TarsStream.TarsOutputStream();
    os.writeStruct(1, req);
    return os.getBinBuffer();
};

var __smc_icc_ccs$DoReloadVdnConfig$ID = function (data) {
    try {
        var is = new TarsStream.TarsInputStream(data.response.sBuffer);
        return {
            request: data.request,
            response: {
                costtime: data.request.costtime,
                return: is.readInt32(0, true, 0),
                arguments: {
                    rsp: is.readStruct(2, false, smc_icc.stCommRsp_t),
                },
            },
        };
    } catch (e) {
        throw _makeError(data, e.message, TarsError.CLIENT.DECODE_ERROR);
    }
};

var __smc_icc_ccs$DoReloadVdnConfig$ER = function (data) {
    throw _makeError(data, "Call ccs::DoReloadVdnConfig failed");
};

smc_icc.ccsProxy.prototype.DoReloadVdnConfig = function (req) {
    return this._worker.tars_invoke(
        "DoReloadVdnConfig",
        __smc_icc_ccs$DoReloadVdnConfig$IE(req),
        arguments[arguments.length - 1],
        __smc_icc_ccs$DoReloadVdnConfig$IF,
    ).then(__smc_icc_ccs$DoReloadVdnConfig$ID, __smc_icc_ccs$DoReloadVdnConfig$ER);
};
smc_icc.ccsProxy.DoReloadVdnConfig = __smc_icc_ccs$DoReloadVdnConfig$IF;
