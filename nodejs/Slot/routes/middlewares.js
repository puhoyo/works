const jwt = require('jsonwebtoken');
const RateLimit = require('express-rate-limit');
const errorHandler = require('../lib/errorHandler');
const lzutf8 = require('lzutf8');

exports.verifyToken = (req, res, next) => {
    try {
        const {token, user_id} = req.body;
        if(!token) throw new Error('token is not defined');
        if(!user_id) throw new Error('user_id is not defined');
        if(jwt.verify(token, process.env.JWT_SECRET).i !== parseInt(user_id)) throw new Error('invalid user_id');
        req.user = user_id;
        return next();
    }
    catch(error) {
        if(error.name === 'TokenExpiredError') {
            const data = process.env.NODE_ENV !== 'local' ? 
                lzutf8.compress(JSON.stringify(errorHandler.getPacketError(980, req.body.pid)), {outputEncoding: 'BinaryString'}) : 
                errorHandler.getPacketError(980, req.body.pid);
            return res.send(data);
        }
        console.log('error: ', error.message);
        
        const data = process.env.NODE_ENV !== 'local' ? 
            lzutf8.compress(JSON.stringify(errorHandler.getPacketError(981, req.body.pid)), {outputEncoding: 'BinaryString'}) : 
            errorHandler.getPacketError(981, req.body.pid);
        return res.send(data);
    }
};

/**
 * @desc 현재 토큰이 최신 토큰인지 체크
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 */
exports.checkToken = async (req, res, next) => {
    try {
        const {user_id, token} = req.body;
        const redisClient = req.app.get('redisClient');
        const userToken = await redisClient.HGET(`user${user_id}`, 'token');
        if(token === userToken) next();
        else throw 3;
    }
    catch(error) {
        const data = process.env.NODE_ENV !== 'local' ? 
            lzutf8.compress(JSON.stringify(errorHandler.getPacketError(error, req.body.pid)), {outputEncoding: 'BinaryString'}) : 
            errorHandler.getPacketError(error, req.body.pid);
        res.send(data);
    }
};

/**
 * @desc req에 pid가 있는지 체크하는 미들웨어
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 * @returns 
 */
exports.checkPacket = (req, res, next) => {
    try {
        const {pid} = req.body;
        if(!pid) throw 404;

        return next();
    }
    catch(error) {
        const data = process.env.NODE_ENV !== 'local' ? 
            lzutf8.compress(JSON.stringify(errorHandler.getPacketError(error, req.body.pid)), {outputEncoding: 'BinaryString'}) : 
            errorHandler.getPacketError(error, req.body.pid);
        res.send(data);
    }
};

exports.apiLimiter = new RateLimit({
    windowMs: 1000, // 1초
    max: 5,
    delayMs: 0,
    handler(req, res) {
        const data = process.env.NODE_ENV !== 'local' ? 
            lzutf8.compress(JSON.stringify(errorHandler.getPacketError(this.statusCode, req.body.pid)), {outputEncoding: 'BinaryString'}) : 
            errorHandler.getPacketError(this.statusCode, req.body.pid);
        res.send(data);
    }
});

exports.deprecated = (req, res) => {
    res.json({
        code: 410,
        message: '새로운 버전이 나왔습니다. 새로운 버전을 사용하세요.',
    });
};

exports.verifyLocal = (req, res, next) => {
    if(process.env.NODE_ENV === 'local') {
        return next();
    }
    else {
        return res.json({
            code: 403,
            message: 'cannot execute this api: service state is not local state',
        });
    }
};

exports.checkState = (req, res, next) => {
    try {
        if(req.app.get('state')) next();
        else throw 940;
    }
    catch(error) {
        const data = process.env.NODE_ENV !== 'local' ? 
            lzutf8.compress(JSON.stringify(errorHandler.getPacketError(error, req.body.pid)), {outputEncoding: 'BinaryString'}) : 
            errorHandler.getPacketError(error, req.body.pid);
        res.send(data);
    }
}