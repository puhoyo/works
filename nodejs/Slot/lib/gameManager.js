const util = require('util');
const fs = require('fs');
const readdir = util.promisify(fs.readdir);
const jsonfile = require('jsonfile');
const logger = require('../logger');

module.exports = class GameManager {
    constructor(app) {
        this.games = {};
        this.app = app;
    }

    async init(app) {
        try {
            const reelDataDir = __dirname + '/data/reelData';
            const files = await readdir(reelDataDir);
            for(let i in files) {
                const gameName = files[i].split('.')[0];
                const game = require(__dirname + `/games/${gameName}`);
                const gameData = await this.createGameData(gameName);
                if(!gameData) {
                    console.log(`access denied for game ${gameName}. initializing is failed.`);
                }
                else {
                    const gameId = gameData.gameId;
                    this.games[gameId] = new game(gameData);
                    console.log(`game${gameId}: ${gameName} is initialized`);
                }
            }

            for(let i in this.games) {
                //게임 초기화(잭팟 세팅)
                await this.games[i].init();
            }
            app.set('state', true);
        }
        catch(error) {
            console.log(error);
            logger.error(`gameManager init error: ${error}`);
        }
    }

    async accumulateJackpots(gameId, user) {
        const game = this.games[gameId];
        try {
            const jackpotInfo = await game.accumulateJackpots(user);
            for(let jackpotName in jackpotInfo) {
                jackpotInfo[jackpotName] = Math.floor(jackpotInfo[jackpotName]);
            }
            user.jackpotInfo = jackpotInfo;
        }
        catch(error) {
            console.log(error);
            logger.error(`gameManager accumulateJackpots error: ${error}`);
        }
    }

    async getGameJackpotAtBetLevel(gameId, betLevel) {
        const game = this.games[gameId];
        try {
            if(!game) return null;
            return await game.getJackpotAtBetLevel(betLevel);
        }
        catch(error) {
            console.log(error);
            logger.error(`gameManager getGameJackpotAtBetLevel error: ${error}`);
        }
    }

    getGameBetOptions(gameId) {
        const game = this.games[gameId];
        if(!game) return null;
        const betOptions = game.getBetOptions();
        return betOptions;
    }

    getGameLineCount(gameId) {
        const game = this.games[gameId];
        if(!game) return null;
        const lineCount = game.getLineCount();
        return lineCount;
    }

    getGameReelType(gameId, user) {
        const game = this.games[gameId];
        if(!game) return null;
        const reelType = game.getReelType(user);
        return reelType;
    }

    getClientGameId(gameId) {
        const game = this.games[gameId];
        if(!game) return null;

        return game.getClientGameId();
    }

    getAllGames() {
        return this.games;
    }

    getWinType(user, totalPayout) {
        const game = this.games[user.gameId];
        if(!game) throw 500;

        return game.getWinType(user, totalPayout);
    }

    getConvertedExtendData(gameId, extendData) {
        const game = this.games[gameId];
        if(!game) throw 500;
        return game.getConvertedExtendData(extendData);
    }
    initUserExtendData(gameId, extendData) {
        const game = this.games[gameId];
        if(!game) throw 500;
        return game.initUserExtendData(extendData);
    }
    setPickFreespinUserGameData(gameId, eventType, userGameData) {
        const game = this.games[gameId];
        if(!game) throw 500;
        game.setPickFreespinUserGameData(eventType, userGameData);
    }

    checkGameState(gameId) {
        const game = this.games[gameId];
        if(!game) return 991;
        
        const gameState = game.getState();
        if(gameState === 2) {
            return true;
        }
        else if(gameState === 1) {
            if(process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'local') {
                return true;
            }
            else {
                return false;
            }
        }
        else {
            return false;
        }
    }

    async spinInit(user, gameId, lineBet, userGameData) {
        try {

            // console.log('jackpot: ', user.jackpotInfo);

            return true;
        }
        catch(error) {
            if(error.message === 'out of chips') {
                error.code = 995;
            }
            else {
                error.code = 400;
            }
            console.log(error);
            logger.error('gameManager spin init error: ', error);

            return error.code;
        }
    }

    async spin(gameId, user) {
        const game = this.games[gameId];
        if(!game) return null;

        try {
            //step 0: init
            game.spinInit(user);

            //step 1: get random index number
            let indexes = game.getRandomIndexes(user.reelType);
            // console.log('step1: ', indexes);

            //디버그 체크
            if(user.debugLine) {
                indexes = user.debugLine;
            }

            user.indexes = indexes;
            //step 1.5: change index numbers if needed
            if(typeof game.changeIndexes !== 'undefined') {
                indexes = game.changeIndexes(indexes);
                console.log('step1.5: ', indexes);
            }

            //step 2: create real reel from indexes
            const reel = game.createReel(indexes, user.reelType);
            // console.log('step2: ', reel);

            //step 2.5: change reel if needed
            if(typeof game.changeReel !== 'undefined') {
                game.changeReel(reel, user);
                // console.log('step2.5: ', reel);
            }


            //step 3: create win info
            const winInfo = game.createWinInfo(reel);
            // console.log('step3: ', winInfo);

            //step 4: proceed additional bonus
            await game.additionalBonus(reel, winInfo, user);
            // console.log('winInfo: ', winInfo);
            // console.log('step4: ', winInfo);

            await game.createSpinResData(user);

            // console.log('reel: ', reel);
            const screen = game.getScreen(reel, user);

            if(game.getState() !== this.app.get('data').get('production') && !user.testSimul) game.displayByScreen(screen);

            const spinInfo = {
                indexes,
                screen,
                winInfo,
            };
            
            return spinInfo;
        }
        catch(error) {
            console.log(error);
            logger.error(`gameManager spin error: ${error}`);
            return error;
        }
    }

    async convertToClientData(user, spinInfo) {

        const game = this.games[user.gameId];

        try {
            const sp = []; //spin data
            sp.push(user.lineBet); //lineBet
            sp.push(spinInfo.totalPayout) //totalCoin
            sp.push(user.playState - 1); //reelType
            sp.push(user.winType); //winType

            let rw = ''; //reel window
            const clientSymbolName = game.getClientSymbolName(user); //reelWindow (screen)
            const {screen} = spinInfo;
            for(let i = 0; i < screen.length; i++) {
                rw += clientSymbolName[screen[i]] + ',';
            }
            rw = rw.substring(0, rw.length - 1);

            const ri = spinInfo.indexes; //reel index

            const {winInfo} = spinInfo;
            const lp = [];
            winInfo.forEach(win => { //line payout [lineNum, matchCount, payOut, symbolName, winType]
                if(!win.deleted) {
                    const linePayout = [];
                    linePayout.push(parseInt(win.lineNum) - 1);
                    linePayout.push(win.winCount);
                    linePayout.push(win.payout);
                    linePayout.push(game.getClientWinName(win));
                    linePayout.push(game.getWinType(user, win.payout));
                    linePayout.push(win.bonusMultiplier ? win.bonusMultiplier : 1);

                    return lp.push(linePayout);
                }
            });

            const bp = []; //bonus payout
            if(user.collectPayout) {
                for(let i = 0; i < user.collectPayout.length; i++) {
                    const bonusPayout = [];
                    for(let key in user.collectPayout[i]) {
                        bonusPayout.push(user.collectPayout[i][key]);
                    }
                    bp.push(bonusPayout);
                }
            }

            const fs = []; //freespin info [freespinStart, freespinCount, freespinRemain, freespinTotalWin, freespinWinType]

            if(user.playState === 1 && user.freespinStart) {
                //일반 스핀 프리스핀 당첨
                fs.push(1);
                fs.push(user.freespinCount);
                fs.push(user.freespinCount);
                fs.push(0);
                fs.push('');
            }
            else if(user.playState === 2) {
                //프리스핀
                fs.push(0);
                fs.push(user.freespinCount ? user.freespinCount : 0);
                fs.push(user.freespinRemain);
                fs.push(user.freespinTotalWin);
                fs.push(game.getWinType(user, user.freespinTotalWin));
            }
            else {
                fs.push(0);
                fs.push(0);
                fs.push(0);
                fs.push(0);
                fs.push('');
            }

            //TODO 나중에 extend reel 추가 시 작업
            const er = ''; //extend reel

            const {levelUpData} = user; 
            let lv = [  //level up info [level, chip, diamond, crown, etc]
                user.level, 
                0, 
                0,
                0,
                '',
            ];
            if(levelUpData) {
                lv = [
                    levelUpData.level,
                    levelUpData.levelUpChip,
                    levelUpData.levelUpDia,
                    levelUpData.levelUpCrown,
                    levelUpData.levelUpCard ? levelUpData.levelUpCard : '',
                ];
            }

            const ep = user.expPercent;

            const bl = levelUpData ? user.balance - levelUpData.levelUpChip : user.balance; //user balance

            const bt = user.bockTotal; //user bockTotal data

            let jp = []; //jackpot pool
            const {jackpotInfo} = user;
            for(let jackpotName in jackpotInfo) {
                jp.push(jackpotInfo[jackpotName]);
            }
            jp = jp.reverse();

            let np = []; //next jackpot pool
            if(user.jackpot) {
                const nextJackpotInfo = await game.getJackpotAtBetLevel(user.betLevel);
                for(let jackpotName in nextJackpotInfo) {
                    np.push(Math.floor(nextJackpotInfo[jackpotName]));
                }
            }
            np = np.reverse();

            const dc = user.dice; //user dice data

            //TODO 나중에 리스핀 추가 시 작업
            const rs = [user.extendData['respin'] ? user.extendData['respin'] : 0, 0]; //respin info

            const lk = user.lockedPosition; //user lockedPosition data

            //TODO 나중에 필요 시 작업
            const bc = 0; //user bonus coin

            //TODO 나중에 필요 시 작업
            const cw = 0; //user combo total win data

            //TODO 나중에 필요 시 작업
            const ct = 0; //user combo win type data

            const data = {
                sp, //spin data => linebet, totalCoin, reelType, winType
                rw, //reelWindow
                ri, //reelIndex
                lp, //linePayout => [[lineNum, matchCount, payOut, symbolName, winType], ... ]
                bp, //bonusPayout
                fs, //freespins => [freespinStart, freespinCount, freespinRemain, freespinTotalWin, freespinWinType]
                er, //extendReel
                lv, //level => [level, levelUpCoin, levelUpHeart]
                ep, //expPercent
                bl, //balance
                bt, //bockTotal
                jp, //jackpotPool => [jackpotAmount, ... ]
                np, //nextJackpotPool => [nextJackpotAmount, ...]
                dc, //dice
                rs, //respin => [respin, respinIndex]
                lk, //lockedPosition
                bc, //bonusCoin
                cw, //comboTotalWin
                ct, //comboWinType
            };

            return data;
        }
        catch(error) {
            console.log(error);
            logger.error(`convertToClientData error: ${error}`);
            return error;
        }
    }

    async createGameData(gameName) {
        console.log(`${gameName} initializing...`);

        try {
            if(gameName) {
                const reelData = await jsonfile.readFile(__dirname + `/data/reelData/${gameName}.json`);

                const {reels, freeReels, extendReelData, symbol_list, playRowStatus, betOptions, gameType} = reelData;


                const symbolData = await jsonfile.readFile(__dirname + `/data/symbols/${gameName}Symbols.json`);

                const {symbolMapping, paymentInfo, lineScatters, scatters, wildAlias, clientSymbolName, clientWinName, divideOption, stack, stacks, clientGameId} = symbolData;
                
                let {state} = symbolData;
                switch(state) {
                    case 'production':
                        state = 2;
                        break;
                    case 'development':
                        state = 1;
                        break;
                    default:
                        throw new Error('game state is not defined or invalid');
                }

                if(process.env.NODE_ENV === 'production' && state !== 2) return false;

                const getSymbolId = (name) => {
                    for(let i in symbol_list) {
                        if(symbol_list[i].symbol === name) {
                            return symbol_list[i].id;
                        }
                    }
                };

                let wildInfo = [];
                for(let wildName in wildAlias) {
                    wildInfo.push(getSymbolId(wildName));
                }

                const realSymbolInfo = {};
                let i = 1;
                for(let name in paymentInfo) {
                    realSymbolInfo[i++] = {
                        name,
                        multiplier: paymentInfo[name],
                    };
                }


                const getRealSymbolId = (name) => {
                    for(let id in realSymbolInfo) {
                        if(realSymbolInfo[id].name === name) {
                            return parseInt(id);
                        }
                    }
                };
                const symbolInfo = {};
                for(let i in symbol_list) {
                    const element = symbol_list[i];
                    if(typeof symbolMapping[element.symbol] !== 'undefined') {
                        symbolInfo[element.id] = {
                            name: element.symbol,
                            realSymbols: symbolMapping[element.symbol].map(e => {
                                return getRealSymbolId(e);
                            }),
                        };
                        symbolInfo[element.symbol] = element.id;
                    }
                }

                const lineScatterInfo = {};
                for(let name in lineScatters) {
                    lineScatterInfo[getRealSymbolId(name)] = lineScatters[name];
                }

                const scatterInfo = {};
                for(let i in scatters) {
                    scatterInfo[scatters[i]] = getSymbolId(scatters[i]);
                }

                let stackSymbol = '';
                if(typeof stack !== 'undefined') {
                    for(let key in symbolInfo) {
                        if(key == stack) {
                            stackSymbol = symbolInfo[key];
                            break;
                        }
                    }
                }
                const stackSymbols = [];
                if(typeof stacks !== 'undefined') {
                    for(let key in symbolInfo) {
                        if(stacks.indexOf(key) > -1) {
                            stackSymbols.push(symbolInfo[key]);
                        }
                    }
                }


                const reelInfo = {};
                //base reel을 기준으로 게임의 reel count 결정
                let numOfReels = 0;
                //base reel set
                reels.forEach(element => {
                    numOfReels++;
                    if(typeof reelInfo['0'] === 'undefined') reelInfo['0'] = {};
                    reelInfo['0'][element.id] = element.symbols.map(e => {
                        return getSymbolId(e.symbol);
                    });
                });
                //free reel set
                freeReels.forEach(element => {
                    if(typeof reelInfo['1'] === 'undefined') reelInfo['1'] = {};
                    reelInfo['1'][element.id] = element.symbols.map(e => {
                        return getSymbolId(e.symbol);
                    });
                });

                //extend reel set
                for(let extendReelId in extendReelData) {
                    const extendReel = extendReelData[extendReelId];
                    extendReel.forEach(element => {
                        if(typeof reelInfo[extendReelId] === 'undefined') reelInfo[extendReelId] = {};
                        reelInfo[extendReelId][element.id] = element.symbols.map(e => {
                            return getSymbolId(e.symbol);
                        });
                    });
                }

                //reel id info set
                const reelIds = {};
                let reelNumber = 0;
                for(let reelId in reelInfo['0']) {
                    reelNumber++;
                    reelIds[reelNumber] = reelId;
                }

                const reelWeights = {};
                //base weight set
                reels.forEach(element => {
                    let cumulative = 0; 
                    if(typeof reelWeights['0'] === 'undefined') reelWeights['0'] = {};
                    if(typeof reelWeights['0'][element.id] === 'undefined') {
                        reelWeights['0'][element.id] = [];
                    }
                    element.symbols.forEach(data => {
                        cumulative += data.virtualReelCount;
                        reelWeights['0'][element.id].push(cumulative);
                    });
                });

                //freespin weight set
                freeReels.forEach(element => {
                    let cumulative = 0; 
                    if(typeof reelWeights['1'] === 'undefined') reelWeights['1'] = {};
                    if(typeof reelWeights['1'][element.id] === 'undefined') {
                        reelWeights['1'][element.id] = [];
                    }
                    element.symbols.forEach(data => {
                        cumulative += data.virtualReelCount;
                        reelWeights['1'][element.id].push(cumulative);
                    });
                });

                //extend reel weight set
                for(let extendReelId in extendReelData) {
                    const extendReel = extendReelData[extendReelId];
                    extendReel.forEach(element => {
                        let cumulative = 0; 
                        if(typeof reelWeights[extendReelId] === 'undefined') reelWeights[extendReelId] = {};
                        if(typeof reelWeights[extendReelId][element.id] === 'undefined') {
                            reelWeights[extendReelId][element.id] = [];
                        }
                        element.symbols.forEach(data => {
                            cumulative += data.virtualReelCount;
                            reelWeights[extendReelId][element.id].push(cumulative);
                        });
                    });
                }


                const lineInfo = {};
                playRowStatus.forEach(e => {
                    const lineNumber = e.orderNumber + 1;
                    lineInfo[lineNumber] = [];
                    let rowStatus = e.rowStatus;
                    rowStatus = rowStatus.replace('[', '');
                    rowStatus = rowStatus.replace(']', '');
                    rowStatus = rowStatus.split(',');
                    rowStatus.forEach(e => {
                        lineInfo[lineNumber].push(parseInt(e));
                    });
                });

                const betInfo = [];
                betOptions.forEach(betOption => {
                    betInfo.push(betOption.amount / divideOption);
                });

                const lineCount = playRowStatus.length;

                const wildRealSymbols = [];
                for(let wildName in wildAlias) {
                    for(let realSymbol in realSymbolInfo) {
                        if(realSymbolInfo[realSymbol].name === wildAlias[wildName]) {
                            const parsed = parseInt(realSymbol);
                            if(wildRealSymbols.indexOf(parsed) === -1) wildRealSymbols.push(parsed);
                            break;
                        }
                    }
                }

                const gameData = {
                    state,
                    gameId: reelData.id,
                    clientGameId: reelData.slot_name ? reelData.slot_name : clientGameId,
                    gameType,
                    numOfRows: reelData.playLine.data.rowCount,
                    numOfReels,
                    reelWeights,
                    symbolInfo,
                    lineScatterInfo,
                    scatterInfo,
                    wildInfo,
                    realSymbolInfo,
                    reelInfo,
                    reelIds,
                    lineInfo,
                    betInfo,
                    lineCount,
                    clientSymbolName,
                    clientWinName,
                    stackSymbol,
                    stackSymbols,
                    wildRealSymbols,
                };
                return gameData;
            }
            else {
                throw new Error('invalid gameName');
            }
        }
        catch(error) {
            console.log(error);
            logger.error(`create game error: ${error.message}`);
            return null;
        }
    }

    simul(gameId, iteration, user) {
        if(!gameId) return res.sendStatus(404).send('invalid gameId');
        iteration = parseInt(iteration);
        if(!iteration) return res.status(404).send('invalid iteration');

        const additionalBonusSimulGames = [22, 26, 48, 98, 107, 108];
        const game = this.games[gameId];
        if(!game) return res.sendStatus(404).send('invalid gameId');
        // const additionalBonusFunction = additionalBonusSimulGames.indexOf(parseInt(gameId)) === -1 ? game.additionalBonus : game.additionalBonusSimul;
        let totalMultiplier = 0;
        let jackpotCount = 0;

        let freespinMultiplier = 0;

        game.initSimul(user);
        user.simul = true;
        user.lineBet = 10;

        const wins = {};
        let totalSimulSpinCount = 0;
        for(let i = 0; i < iteration; i++) {
            if(i % 10000 === 0) console.log(`iteration: ${i}`);
            user.tempData = {};
            // console.log('simul: ', i);
            if(user.freespinStart === 1) {
                // console.log('freespin start!');
                user.playState = 2;
                user.freespinStart = 0;
                // user.debugCount = 20;
            }
            if(user.respinStart === 1) {
                user.respinState = 1;
                user.respinStart = 0;
            }
            user.reelType = this.getGameReelType(gameId, user);
            if(user.debugCount > 0) {
                console.log('user: ', user);
                user.debugCount--;
            }
    
            //step 1: get random index number
            const indexes = game.getRandomIndexes(user.reelType);
    
            //step 1.5: change index numbers if needed
            if(typeof game.changeIndexes !== 'undefined') {
                game.changeIndexes(indexes);
            }
            user.indexes = indexes;
    
            //step 2: create real reel from indexes
            const reel = game.createReel(indexes, user.reelType);
    
            //step 2.5: change reel if needed
            if(typeof game.changeReel !== 'undefined') {
                game.changeReel(reel, user);
            }
    
            //step 3: create win info
            const winInfo = game.createWinInfo(reel);
    
            //step 4: proceed additional bonus
            game.additionalBonus(reel, winInfo, user);

            if(user.tempData['test']) {
                game.display(reel);
                console.log('stack: ', user.tempData['currentStackSymbolList']);
                user.tempData['test'] = 0;
            }
            if(winInfo.length > 0) {
                // game.display(reel);
            }
            winInfo.forEach(win => {
                if(!win.deleted) {
                    // console.log('win: ', win);
                    if(win.jackpot) {
                        // console.log('jackpot win: ', win);
                        // game.display(reel);
                        jackpotCount++;
                    }
                    if(win.winAs) {
                        if(!wins[`${user.playState}_${win.winAs}_${win.winCount}_CNT`]) wins[`${user.playState}_${win.winAs}_${win.winCount}_CNT`] = 0;
                        wins[`${user.playState}_${win.winAs}_${win.winCount}_CNT`]++;
                        if(!wins[`${user.playState}_${win.winAs}_${win.winCount}_PAY`]) wins[`${user.playState}_${win.winAs}_${win.winCount}_PAY`] = 0;
                        wins[`${user.playState}_${win.winAs}_${win.winCount}_PAY`] += win.multiplier * user.lineBet;

                        // if(win.winAs === '$wild') {
                        //     console.log('multi: ', win.multiplier);
                        //     game.display(reel);
                        // }
                    }
                    totalMultiplier += win.multiplier;
                    if(user.playState === 2) freespinMultiplier += win.multiplier;
                }
            });

            if(user.playState === 2) {
                i--;
                if(user.respinState) {
                    // console.log('user.extendData[respin] FREE: ', user.extendData['respin']);
                    if(user.extendData['respin'] === 0) {
                        user.respinState = 0;
                    }
                }
                else {
                    user.freespinRemain--;
                }

                if(user.freespinRemain < 1) {
                    if(typeof user.extendData['respin'] === 'undefined') {
                        user.playState = 1;
                    }
                    else if(user.extendData['respin'] === 0) {
                        user.playState = 1;
                    }
                }
            }
            else {
                if(user.respinState) {
                    i--;
                    // console.log('user.extendData[respin] BASE: ', user.extendData['respin']);
                    if(user.extendData['respin'] === 0) {
                        user.respinState = 0;
                    }
                }
            }

            totalSimulSpinCount++;
        }
        const rtp = (totalMultiplier / game.getLineCount()) / iteration * 100;
        const freespinRTP = (freespinMultiplier / game.getLineCount()) / iteration * 100;
        const baseRTP = rtp - freespinRTP;

        const simulData = game.getSimulData();
        for(let key in simulData) {
            console.log(`${key}: ${simulData[key]}`);
        }
        for(let key in wins) {
            console.log(`${key}: ${wins[key]}`);
        }
        console.log('totalSimulSpinCount: ', totalSimulSpinCount);

        const userSimulData = user.simulData;
        
        return {totalMultiplier, rtp, baseRTP, freespinRTP, jackpotCount, userSimulData};
    }
}
