const express = require('express');
const morgan = require('morgan');
const path = require('path');
const dotenv = require('dotenv');
const helmet = require('helmet');
const hpp = require('hpp');
const axios = require('axios');
const cors = require('cors');

dotenv.config();
const {dbSync} = require('./models');
const redisClient = require('./models/redis');
const {routerInit} = require('./routes/routers');

const logger = require('./logger');

const app = express();

const config = require('./config/config').data[process.env.NODE_ENV];
const data = new Map();
for(let key in config) {
    data.set(key, config[key]);
}
app.set('data', data);
// passportConfig();
app.set('port', process.env.PORT || 443);
app.set('redisClient', redisClient);
app.set('view engine', 'html');
app.set('axios', axios);

// 슬롯 게임이 모두 초기화 되기 전까지 상태값 false로 설정
app.set('state', false);

dbSync()
    .then(async db => {
        app.set('db', db);
        for(let database in db) {
            await db[database].sequelize.sync({force: false});
        }
        console.log('database connected');
        return redisClient.connect();
    })
    .then(async () => {
        console.log('redisClient connected');
        let gameManager = require('./lib/gameManager');
        gameManager = new gameManager(app);
        app.set('gameManager', gameManager);
        return gameManager.init(app);
    })
    .then(() => {
        let userHandler = require('./lib/userHandler');
        userHandler = new userHandler();
        app.set('userHandler', userHandler);

        return routerInit();
    })
    .then(routers => {
        app.use(cors({
            origin: app.get('data').get('cors') ? app.get('data').get('cors') : [],
        }));

        for(let url in routers) {
            app.use(url, routers[url]);
        }

        app.use((req, res, next) => {
            const error = new Error(`${req.method} ${req.url} router is not defined.`);
            error.status = 404;
            logger.error(new Date());
            logger.error(error.message);
            next(error);
        });
        app.use((err, req, res, next) => {
            res.locals.message = err.message;
            res.locals.error = process.env.NODE_ENV !== 'production' ? err : {};
            res.status(err.status || 500);
            res.send('error');
        });

        app.set('ready', true);
    })
    .catch(err => {
        console.error(err);
    });

if(process.env.NODE_ENV === 'production') {
    app.use(morgan('combined'));
    app.use(helmet({contentSecurityPolicy: false}));
    app.use(hpp());
}
else {
    app.use(morgan('dev'));
}
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({extended: true}));

module.exports = app;