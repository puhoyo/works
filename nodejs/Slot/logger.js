const {createLogger, format, transports} = require('winston');

const logger = createLogger({
    level: 'info',
    format: format.combine(format.timestamp({format: () => {
        return new Date().toString();
    }}), format.json()),
    transports: [
        new transports.File({filename: 'combined.log'}),
        new transports.File({filename: 'error.log', level: 'error'}),
    ],
});

if(process.env.NODE_ENV !== 'production') {
    logger.add(new transports.Console());
}

module.exports = logger;