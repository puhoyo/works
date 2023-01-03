const express = require('express');
const {verifyToken, apiLimiter, checkToken, checkPacket, verifyLocal, checkState} = require('./middlewares');
const {slotApi, send, simul} = require('../lib/slotApi');

const router = express.Router();

router.post('/', checkPacket, verifyToken, checkToken, apiLimiter, checkPacket, checkState, slotApi, send);

router.post('/simul', verifyLocal, verifyToken, simul, send);


router.get('/', (req, res, next) => {
    res.json({
        data: [],
    });
});

module.exports = router;