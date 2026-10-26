'use strict';
// Only the release manifest selects Winston 3. Developer manifests retain
// Winston 2: return its original constructors/options without translation.
const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');
const moment = require('moment');

if (typeof winston.createLogger !== 'function') {
    module.exports = winston;
} else {
    // Do not recursively log transport failures, or print Error.message/paths
    // which can contain configuration secrets. A fixed stderr diagnostic is
    // deliberately visible even when the log directory becomes unwritable.
    function transportFailure() {
        process.stderr.write('[ConfServer logger] log transport failure\n');
    }

    function Console(options) {
        const transport = new winston.transports.Console({
            ...options, format: winston.format.simple()
        });
        transport.on('error', transportFailure);
        return transport;
    }

    function Rotate(options) {
        const { timestamp, prepend, localTime, datePattern, name, ...rest } = options;
        // Both existing callers use date-prefix files. Preserve the filenames
        // consumed by their existing retention jobs; v5 ignores prepend and
        // uses Moment tokens rather than the legacy strftime-like pattern.
        const transport = new DailyRotateFile({
            ...rest,
            filename: prepend
                ? path.join(path.dirname(rest.filename), '%DATE%.' + path.basename(rest.filename))
                : rest.filename,
            datePattern: datePattern === 'yyyyMMdd.' ? 'YYYYMMDD' : datePattern,
            utc: localTime === false,
            // Legacy DailyRotateFile defaults to JSON, not a text prefix.
            // Preserve level/message/timestamp fields for log consumers.
            format: winston.format.combine(
                winston.format(info => {
                    if (typeof timestamp === 'function') info.timestamp = timestamp();
                    return info;
                })(),
                winston.format.json()
            )
        });
        transport.on('error', transportFailure);
        // v5 does not forward its underlying file-stream error. Without this
        // listener an EACCES/EISDIR can become an uncaught process exception.
        transport.logStream.on('error', error => transport.emit('error', error));
        return transport;
    }

    function Logger(options) {
        // Winston's ExceptionStream calls transport.log directly, bypassing
        // the per-transport format. Format the exception before dispatch too,
        // otherwise exception JSON loses the existing timestamp field.
        const logger = winston.createLogger({
            format: winston.format.combine(
                winston.format.timestamp({ format: () => moment().format('YYYY-MM-DD HH:mm:ss.SSS') }),
                winston.format.json()
            ),
            ...options
        });
        logger.on('error', transportFailure);
        return logger;
    }
    module.exports = { Logger, transports: { Console, DailyRotateFile: Rotate } };
}
