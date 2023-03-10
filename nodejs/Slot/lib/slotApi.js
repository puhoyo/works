const lzutf8 = require('lzutf8');
const errorHandler = require('./errorHandler');
const serverUtil = require('./serverUtil');
const md5 = require('md5');

exports.slotApi = async (req, res, next) => {
    const pid = req.body.pid;
    const data = req.body.data;
    const user_id = req.user;
    
    try {
        const serviceFunction = slotApis[pid];
        if(typeof serviceFunction !== 'function') {
            throw 404;
        }
        else {
            const user = {
                user_id,
            };
            const resData = await serviceFunction(req, user, data);
            if(!resData.success) throw resData.data;
            req.data = resData;
            next();
        }
    }
    catch(error) {
        console.log('error');
        console.log(error);
        const code = error;
        req.data = errorHandler.getPacketError(code, pid);
        next();
    }
};
exports.send = async(req, res, next) => {
    const data = process.env.NODE_ENV !== 'local' ? lzutf8.compress(JSON.stringify(req.data), {outputEncoding: 'BinaryString'}) : req.data;
    res.send(data);
};
exports.simul = async (req, res, next) => {
    const userHandler = req.app.get('userHandler');
    const gameManager = req.app.get('gameManager');
    const data = JSON.parse(req.body.data);
    if(!data.lineBet) {
        const betOptions = gameManager.getGameBetOptions(data.gameId);
        data.lineBet = betOptions[0];
    }
    const iteration = parseInt(req.body.iteration);
    const user_id = req.user;

    console.log('slot test simulation start...')
    try {
        // let startTime = new Date().to
        for(let i = 0; i < iteration; i++) {
            const user = await userHandler.getUser(user_id);
            user.testSimul = true;
            const resData = await slotApis.spin(req, user, data);
            if(!resData.success) throw resData.data;
        }
        req.data = 'ok';
        next();
    }
    catch(error) {
        console.log('error');
        console.log(error);
        const code = parseInt(error.message);
        const message = req.app.get('errorMessages')[code];
        req.data = {
            success: false,
            pid: 'error',
            data: {
                currentPid: pid,
                code,
                title: 'error',
                message,
            },
        }
        next();
    }
}

const slotApis = {
    /**
     * @desc ?????? ????????? ???????????? ??????
     * @param {*} user 
     * @param {*} data 
     */
    init: async (req, user, data) => {
        const resData = {
            success: false,
            data: {},
        };
        try {
            if(!data) throw 400;
            if(typeof data !== 'object') {
                if(typeof data === 'string') {
                    data = JSON.parse(data);
                }
                else {
                    throw 400;
                }
            }
            
            const gameId = parseInt(data.gameId);
            const gameManager = req.app.get('gameManager');
            const userHandler = req.app.get('userHandler');

            //?????? ?????? ??????
            const isValidGame = gameManager.checkGameState(gameId);
            if(isValidGame !== true) {
                if(isValidGame === 991) throw 991; //invalid gameId
                else throw 403; //forbidden game
            }
            //???????????? ?????????
            const betOptions = gameManager.getGameBetOptions(gameId);
            if(!betOptions) throw new Error('cannot get betoptions from gameManager');

            //????????? ????????? ?????? ?????????
            const userGameData = await userHandler.getUserGameData('user', user.user_id, gameId);
            if(!userGameData) throw new Error('userGameData error');
            const {lastBetLevel, freespinRemain, freespinReelWindow} = userGameData;

            const needToSave = gameManager.initUserExtendData(gameId, userGameData.extendData);
            if(needToSave) {
                await userHandler.setUserGameData('user', user.user_id, gameId, userGameData);
            }
            const extendData = gameManager.getConvertedExtendData(gameId, userGameData.extendData);

            //????????? ????????? ?????? ???????????? ?????? ?????????
            const jackpot = await gameManager.getGameJackpotAtBetLevel(gameId, lastBetLevel);
            
            const jackpotPool = []; //?????? ?????? ?????? ??????

            for(let jackpotName in jackpot) {
                jackpot[jackpotName] = Math.floor(jackpot[jackpotName]);
                jackpotPool.push(jackpot[jackpotName]); //?????? ?????? ?????? ??????
            }

            const freeSymbolType = extendData.freespinType ? extendData.freespinType : 0;

            resData.success = true;
            resData.data = {
                betOptions,
                lastBetLevel,
                jackpotPool: jackpotPool.reverse(),
                freeSpinRemain: freespinRemain,
                freeSpinReelWindow: freespinReelWindow,
                freeSymbolType,
                extendData,
            };
        }
        catch(error) {
            resData.data = error;
        }
        return resData;
    },

    spin: async (req, user, data) => {
        const resData = {
            success: false,
            data: {},
        };
        try {
            if(!data) throw new Error('data is not defined');
            if(typeof data !== 'object') {
                if(typeof data === 'string') {
                    data = JSON.parse(data);
                }
                else {
                    throw 400;
                }
            }
            const gameId = parseInt(data.gameId);
            const lineBet = parseInt(data.lineBet);
            // const {lineBet} = data; console.log('lineBet: ', typeof lineBet);
            const gameManager = req.app.get('gameManager');
            const userHandler = req.app.get('userHandler');

            //?????? ?????? ??????
            const isValidGame = gameManager.checkGameState(gameId);
            if(isValidGame !== true) {
                if(isValidGame === 991) throw 991; //invalid gameId
                else throw 403; //forbidden game
            }

            //?????? ?????? 
            //gameId, lineBet, betLevel, betLevelChanged, totalBet, jackpot
            
            //DB?????? ?????? ?????????
            const userData = await userHandler.getUser(user.user_id);
            for(let field in userData.dataValues) {
                user[field] = userData[field];
            }

            //????????? ?????? ????????? ?????? ????????? ????????? ?????????
            const userGameData = await userHandler.getUserGameData('user', user.user_id, gameId);
            user.jackpot = false;

            //??????????????? ??????
            if(!gameId) throw 400;
            user.gameId = gameId;

            //????????? ??????
            if(!lineBet) throw 400;
            user.lineBet = lineBet;
            const betOptions = gameManager.getGameBetOptions(gameId);
            if(!Array.isArray(betOptions)) throw new Error('cannot get betOptions');
            const betLevel = betOptions.indexOf(lineBet);
            if(betLevel === -1) throw 990;
            user.betLevel = betLevel;

            //?????? ?????? ??? ?????????
            const lineCount = gameManager.getGameLineCount(gameId);
            if(!lineCount) throw new Error('cannot get lineCount from gameManager');

            //????????? ?????? ?????????
            user.freespinStart = 0;
            user.playState = userGameData.playState;

            //????????? ?????? ?????? ?????????
            const lastBetLevel = userGameData.lastBetLevel;
            const betLevelChanged = lastBetLevel === betLevel ? false : true;
            user.betLevelChanged = betLevelChanged;
            
            //extend data ?????????
            user.extendData = userGameData.extendData;

            user.tempData = {};
            
            if(user.playState === 2) {
                //????????????
                if(user.extendData['respin']) {
                    user.freespinRemain = userGameData.freespinRemain;
                }
                else {
                    user.freespinRemain = userGameData.freespinRemain - 1;
                }
                user.freespinTotalWin = userGameData.freespinTotalWin;
                user.isFree = true;
            }
            else {
                if(user.extendData['respin']) {
                    user.isFree = true;
                }
            }

            //????????? ?????????
            user.reelType = gameManager.getGameReelType(gameId, user);

            //????????? ??????
            user.totalBet = lineBet * lineCount;

            //out of coin ??????
            if(!user.isFree && user.balance < user.totalBet) {
                //out of coin??????
                throw 995;
            }

            //?????? ??????
            await gameManager.accumulateJackpots(gameId, user);

            //??????????????? ??????
            if(process.env.NODE_ENV !== 'production') {
                const {line, key} = data;
                if(line) {
                    user.debugLine = line;
                }
                else if(key) {
                    user.debugKey = key;
                }
            }

            //??????
            const spinInfo = await gameManager.spin(gameId, user);
            
            //???????????? ?????? ??????
            const {winInfo} = spinInfo;
            let totalPayout = 0;
            winInfo.forEach(win => {
                if(!win.deleted) {
                    if(!win.payout) {
                        const payout = win.multiplier * lineBet;
                        win.payout = payout;
                    }
                    totalPayout += win.payout;
                }
            });
            spinInfo.totalPayout = totalPayout;
            if(user.playState === 2) {
                user.freespinTotalWin += totalPayout
            }

            //?????? ?????? ????????????(?????????, ????????? ...)
            const {user_id} = user;
            if(!user_id) throw new Error('spin error: user_id is not defined');

            user.updatingValues = {};

            let {balance} = user;

            const updatingValues = {};

            if(!user.isFree) {
                user.balance =  balance - user.totalBet + totalPayout;
                userHandler.addUserEXP(user);

                updatingValues.exp = user.exp;
                if(user.levelUpData) {
                    updatingValues.level = user.level;
                    updatingValues.heart = user.heart;
                    updatingValues.ticket = user.ticket;
                }
            }
            else {
                user.balance += totalPayout;
            }
            updatingValues.balance = user.balance;
            user.expPercent = userHandler.getUserEXPPercent(user.exp, user.level);
            

            await userHandler.updateUserInfo(user_id, updatingValues);

            user.winType = gameManager.getWinType(user, totalPayout);
            let broadcastType = 0;
            if(process.env.NODE_ENV !== 'local') {
                if (user.winType === 'Super Big Win') {
                    broadcastType = 2;
                } else if (user.winType === 'Jackpot') {
                    broadcastType = 1;
                }
            }

            if(broadcastType) {
                const axios = req.app.get('axios');
                const https = req.app.get('https');
                const broadcastAddr = req.app.get('data').get('broadcastAddr');
                const broadcastData = {
                    type: 1, //slot broadcast
                    userId: user.user_id,
                    rank: broadcastType,
                    username: user.username,
                    gameId: gameManager.getClientGameId(gameId),
                    photo: user.photo,
                };

                let sig = '';
                for(let key in broadcastData) {
                    sig += key;
                }
                sig += process.env.SERVER_SECRET;
                sig = md5(sig);
                broadcastData.signature = sig;

                axios.post(broadcastAddr, broadcastData, {httpsAgent: new https.Agent({rejectUnauthorized: false,})});
            }

            //?????? ??????
            if(user.jackpot) {
                await userHandler.addJackpotLog(user_id, gameId, user.betLevel, user.jackpot, user.jackpotAmount);
            }

            //??????????????? ???????????? ????????? ??????
            const clientData = await gameManager.convertToClientData(user, spinInfo);

            //?????? ?????? ????????? ????????????
            if(user.freespinStart === 1) {
                user.playState = 2;
                userGameData.freespinRemain = user.freespinRemain;
                userGameData.freespinReelWindow = clientData.rw;
                userGameData.freespinTotalWin = 0;
            }
            else if(user.playState === 2) {
                //????????????
                userGameData.freespinRemain = user.freespinRemain;
                userGameData.freespinTotalWin = user.freespinTotalWin;
                if(user.freespinRemain < 1 && !user.extendData['respin']) {
                    user.playState = 1;
                    userGameData.freespinReelWindow = '';
                }
            }
            userGameData.lastBetLevel = user.betLevel;
            userGameData.playState = user.playState;
            userGameData.extendData = user.extendData;
            await userHandler.setUserGameData('user', user_id, gameId, userGameData);
            
            //?????? ?????? ????????? ????????????
            const userSpinData = await userHandler.getUserGameData('spinData', user_id, gameId);
            userSpinData.totalBet = user.isFree ? userSpinData.totalBet : userSpinData.totalBet + user.totalBet;
            userSpinData.totalWin = userSpinData.totalWin + totalPayout;
            userSpinData.spinCount = userSpinData.spinCount + 1;
            await userHandler.setUserGameData('spinData', user_id, gameId, userSpinData);

            resData.success = true;
            resData.data = clientData;
        }
        catch(error) {
            resData.data = error;
        }

        return resData;
    },

    /**
     * @desc ?????? ?????? ????????? ???????????? ??????
     * @param {*} user 
     * @param {*} data 
     */
    lobby: async (req, user, data) => {
        const resData = {
            success: false,
            data: [],
        };
        try {
            const gameManager = req.app.get('gameManager');
            const games = gameManager.getAllGames();

            const MAX_BET_LEVEL = 19;
            for(let gameId in games) {
                const gameInfo = {};
                gameInfo.id = parseInt(gameId);
                gameInfo.gameId = games[gameId].getClientGameId();
                const jackpot = await gameManager.getGameJackpotAtBetLevel(gameId, MAX_BET_LEVEL);
                
                const jackpotPool = [];

                for(let jackpotName in jackpot) {
                    jackpot[jackpotName] = Math.floor(jackpot[jackpotName]);
                    jackpotPool.push(jackpot[jackpotName]);
                }

                gameInfo.jackpot_pool = jackpotPool.reverse();
                resData.data.push(gameInfo);
            }
            resData.success = true;
        }
        catch(error) {
            resData.data = error;
        }

        return resData;
    },

    collect: async (req, user, data) => {
        const resData = {
            success: false,
            data: {},
        };
        try {
            const userHandler = req.app.get('userHandler');
            const {user_id} = user;
            const collectPayout = await userHandler.getUserCollectData(user_id);
            if(collectPayout) {
                await userHandler.deleteUserCollectData(user_id); //??????????????? ????????? ????????? ??????

                const userData = await userHandler.getUser(user_id);
                const balance = userData.balance + collectPayout;
        
                await userHandler.updateUserInfo(user_id, {balance});

                resData.success = true;
                resData.data.balance = balance;
            }
            else {
                throw 970;
            }
        }
        catch(error) {
            resData.data = error;
        }

        return resData;
    },

    pickFreeSpin: async (req, user, data) => {
        const resData = {
            success: false,
            data: {},
        };

        try {
            if(!data) throw 400;
            if(typeof data !== 'object') {
                if(typeof data === 'string') {
                    data = JSON.parse(data);
                }
                else {
                    throw 400;
                }
            }
            const userHandler = req.app.get('userHandler');
            const gameManager = req.app.get('gameManager');
            console.log('user: ', user);
            const {user_id} = user;
            console.log('data: ', data);
            const {gameId, eventType} = data;

            if(typeof gameId === 'undefined' || typeof eventType === 'undefined') throw 400;

            const userGameData = await userHandler.getUserGameData('user', user_id, gameId);
            gameManager.setPickFreespinUserGameData(gameId, eventType, userGameData);
            await userHandler.setUserGameData('user', user_id, gameId, userGameData);

            resData.success = true;
        }
        catch(error) {
            resData.data = error;
        }

        return resData;
    },

    simul: async (req, user, data) => {

        const resData = {
            success: false,
            data: {},
        };
        if(process.env.NODE_ENV !== 'local') {
            resData.data = 'cannot execute this api: service state is not local state';
        }
        else {
            try {
                if(!data) throw new Error('data is not defined');
                if(typeof data !== 'object') {
                    if(typeof data === 'string') {
                        data = JSON.parse(data);
                    }
                    else {
                        throw new error('invalid type of data');
                    }
                }
                const {gameId, iteration} = data; console.log('gameId: ', gameId);
                if(!gameId) throw new Error('invalid gameId');
                if(!iteration) throw new Error('invalid iteration');
                
                const gameManager = req.app.get('gameManager');
                const simulData = gameManager.simul(gameId, iteration, user);
                
                resData.success = true;
                resData.data = simulData;
            }
            catch(error) {
                resData.data = error;
            }
        }
        return resData;
    },

    test: async (req, user, data) => {

        const resData = {
            success: false,
            data: {},
        };

        let count = 0;

        function test() {
            console.log('test called! ', count);
            return new Promise((resolve, reject) => {
                if(count > 10) {
                    console.log('1 resolved before');
                    resolve(1);
                    console.log('1 resolved after');
                }
                console.log('after if');

                setTimeout(() => {
                    count++;
                    console.log('2 resolved before');
                    resolve(test());
                    console.log('2 resolved after');
                }, 1000);
            });
        }

        try {
            test()
                .then(v => {
                    console.log('v: ', v);
                    resData.data = 1;
                    resData.success = true;
                    return resData;
                })
                .catch(err => {

                });
        }
        catch(error) {
            resData.data = error;
        }
    }
};