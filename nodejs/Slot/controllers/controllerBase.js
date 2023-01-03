module.exports = class controllerBase {
    constructor() {
        this.app = require('../app');
        this.db = this.app.get('db');
        this.redisClient = this.app.get('redisClient');
        this.sequelize = this.db.sequelize;
        this.logger = this.app.get('logger');
    }
}