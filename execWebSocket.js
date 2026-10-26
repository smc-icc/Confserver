const logger = require("./logger");
const _ = require('lodash');

function originIsAllowed(origin) {
    // put logic here to detect whether the specified origin is allowed.
    return true;
}

// process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';

const ExecOperator = function () {
    this.registers = {};

    this.start = () => {

        let that = this;

        global.wsServer.on('request', function (request) {

            try {
                let protocol = request.requestedProtocols && request.requestedProtocols[0];

                let func = that.registers[protocol];

                if (func) {
                    func(request);
                }
            } catch (e) {
                logger.warn('[ExecOperator]', e.message || e);
            }
        });
    };

    this.register = (protocol, func) => {
        this.registers[protocol] = func;
    };
}

module.exports = new ExecOperator();