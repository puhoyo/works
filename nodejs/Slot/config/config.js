require('dotenv').config();

module.exports = {
    database: {
        test: {
            local: {
                username: process.env.SEQUELIZE_USERNAME,
                password: process.env.SEQUELIZE_PASSWORD,
                host: '127.0.0.1',
                dialect: 'mysql',
                // logging: false,
            },
            development: {
                username: process.env.SEQUELIZE_USERNAME,
                password: process.env.SEQUELIZE_PASSWORD,
                host: process.env.SEQUELIZE_HOST,
                dialect: 'mysql',
            },
            production: {
                username: process.env.SEQUELIZE_USERNAME,
                password: process.env.SEQUELIZE_PASSWORD,
                host: process.env.SEQUELIZE_HOST,
                dialect: 'mysql',
                logging: false,
            },
        }
    },
    useSocket: false,
    data: {
        local: {
            broadcastAddr: 'http://localhost:8300/broadcast',
            development: 1,
            production: 2,
        },
        development: {
            broadcastAddr: 'https://10.0.0.169:8300/broadcast',
            development: 1,
            production: 2,
            cors: [],
        },
        production: {
            broadcastAddr: 'https://10.0.1.90:8300/broadcast',
            development: 1,
            production: 2,
            cors: [],
        },
    },
}