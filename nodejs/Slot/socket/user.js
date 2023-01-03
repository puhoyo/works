const jwt = require('jsonwebtoken');
const Sequelize = require('sequelize');
const _ = require('lodash');

module.exports = class User {
    constructor(socket, token) {
        this.socket = socket;
        this.app = socket.request.app;

        try {
            if(token) {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                this.userId = decoded.i;
            }
            else {
                this.app.get('logger').error('token is not defined');
            }
        }
        catch(error) {
            throw error;
        }
    }

    destroy() {
        if(this.socket) {
            this.socket = null;
        }
    }
    getRedisKeyName() {
        return `session:${this.userId}`;
    }
    deleteSession() {
        const redisClient = this.app.get('redisClient');
        redisClient.DEL(this.getRedisKeyName());
    }

    getSocket() {
        return this.socket;
    }
    getUserId() {
        return this.userId;
    }

    send(data) {
        if(this.socket) {
            this.socket.send(data);
            return true;
        }
        else return false;
    }
}