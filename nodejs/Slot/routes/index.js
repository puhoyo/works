const express = require('express');
const { verifyToken } = require('./middlewares');

const router = express.Router();

const array = [];
router.get('/', (req, res, next) => {
    res.send('ok');
});

router.post('/test', (req, res, next) => {
    res.json({
        success: true,
        data: {
            someData1: Math.random(),
            someData2: [1, 2, 3],
        }
    });
});

router.get('/ELB', (req, res, next) => {
    res.sendStatus(200);
});

module.exports = router;