const serverUtil = require('./serverUtil');
const logger = require('../logger');
module.exports = class GameBase {
    constructor(gameInfo) {
        this.JACKPOT_LINE_NUMBER = -2;

        //게임에 잭팟이 정의되어 있지 않으면 에러
        if(!gameInfo.jackpotInfo) throw new Error(`error: Game ${gameInfo.gameId} jackpotInfo is not defined`);
        const jackpotInfo = gameInfo.jackpotInfo;
        //타입 체크
        if(!jackpotInfo.count || !jackpotInfo.multiplier || !jackpotInfo.cumulativeRate) throw new error(`error: invalid jackpotInfo type Game ${gameInfo.gameId}`);
        //잭팟 누적 비율 세팅
        const jackpotAddingRatio = {};
        
        const jackpotMultiplier = jackpotInfo.multiplier;
        //잭팟 multiplier 합계 구함
        let totalJackpotMultiplier = 0;
        for(let jackpotName in jackpotMultiplier) {
            totalJackpotMultiplier += jackpotMultiplier[jackpotName];
        }
        //누적 비율 구함
        for(let jackpotName in jackpotMultiplier) {
            jackpotAddingRatio[jackpotName] = jackpotInfo.cumulativeRate * jackpotMultiplier[jackpotName] / totalJackpotMultiplier / 100;
        }

        jackpotInfo.addingRatio = jackpotAddingRatio;

        //스택 관련 처리
        if(gameInfo.stackInfo) {
            const {stackInfo} = gameInfo;
            const __stackInfo = {};
            for(let namespace in stackInfo) {
                const stackProb = {};
                for(let key in stackInfo[namespace]) {
                    stackProb[gameInfo.symbolInfo[key]] = stackInfo[namespace][key];
                }
                __stackInfo[namespace] = stackProb;
            }
            gameInfo.stackInfo = __stackInfo;
        }

        this.gameInfo = gameInfo;
        this.app = require('../app');
        this.redisClient = this.app.get('redisClient');
    }

    async init() {
        try {
            const gameId = this.getGameId();
            const betOptions = this.getBetOptions();
            const jackpotCount = this.getJackpotInfo().count;
            let jackpotIsStable = this.getJackpotInitState();
            if(jackpotIsStable) {
                for (let betLevel in betOptions) {
                    const jackpot = await this.redisClient.HGETALL(`jackpot${gameId}_${betLevel}`);
                    if (!jackpot) {
                        jackpotIsStable = false;
                        break;
                    } else {
                        let checkCount = 0;
                        for (let jackpotName in jackpot) {
                            checkCount++;
                        }
                        if (checkCount !== jackpotCount) {
                            jackpotIsStable = false;
                            break;
                        }
                    }
                }
            }
            console.log(`game${gameId} jackpot is ${jackpotIsStable ? 'stable' : 'not stable => init jackpot...'}`);
            if(!jackpotIsStable) {
                await this.initJackpot();
            }
        }
        catch(error) {
            console.log(error);
            logger.error(`gameBase init error: ${error}`);
        }
    }

    async initJackpot() {
        try {
            const gameId = this.getGameId();
            const jackpotMultiplier = this.getJackpotInfo().multiplier;
            const betOptions = this.getBetOptions();
            const lineCount = this.getLineCount();

            for(let betLevel in betOptions) {
                const jackpotKey = `jackpot${gameId}_${betLevel}`;
                await this.redisClient.DEL(jackpotKey);
                const totalBet = betOptions[betLevel] * lineCount;
                for(let jackpotName in jackpotMultiplier) {
                    const jackpotValue = jackpotMultiplier[jackpotName] * totalBet;
                    await this.redisClient.HSET(jackpotKey, jackpotName, jackpotValue);
                }
            }
        }
        catch(error) {
            console.log(error);
            logger.error(`gameManager initJackpot error: ${error}`);
        }
    }

    getGameId() {
        return this.gameInfo.gameId;
    }
    getClientGameId() {
        return this.gameInfo.clientGameId;
    }
    getBetOptions() {
        return this.gameInfo.betInfo;
    }
    getLineCount() {
        return this.gameInfo.lineCount;
    }
    getReelCount() {
        return this.gameInfo.numOfReels;
    }
    getRowCount() {
        return this.gameInfo.numOfRows;
    }
    getJackpotInfo() {
        return this.gameInfo.jackpotInfo;
    }
    getClientSymbolName() {
        return this.gameInfo.clientSymbolName;
    }
    getClientWinName(win) {
        return this.gameInfo.clientWinName[win.winAs] ? this.gameInfo.clientWinName[win.winAs] : win.winAs;
    }
    getGameType() {
        //game type 3: one line game
        return this.gameInfo.gameType;
    }
    getState() {
        return this.gameInfo.state;
    }
    getLineInfo() {
        return this.gameInfo.lineInfo;
    }
    getWildRealSymbols() {
        return this.gameInfo.wildRealSymbols;
    }
    getGrandJackpotName() {
        return this.getJackpotInfo().grandJackpotName ? this.getJackpotInfo().grandJackpotName : 'Grand';
    }
    getStackInfo(namespace) {
        return namespace ? this.gameInfo.stackInfo[namespace] : this.gameInfo.stackInfo;
    }
    getKeepStackProb() {
        return this.gameInfo.keepStackProb > 0 ? this.gameInfo.keepStackProb : 0;
    }

    getJackpotInitState() {
        return this.jackpotInit ? !this.jackpotInit : true;
    }

    /**
     * @desc symbol(심볼ID)로부터 해당 심볼의 이름을 가져온다.
     * @param {*} symbol Number
     * @returns {*} String
     */
    getSymbolNameById(symbol) {
        const {symbolInfo} = this.gameInfo;
        return symbolInfo[symbol].name;
    }
    getSymbolIdBySymbolName(symbolName) {
        const {symbolInfo} = this.gameInfo;
        const symbolId = symbolInfo[symbolName];
        if(!symbolId) return 0;
        else return symbolId;
    }

    getReelId(reelNumber) {
        const reelId = this.gameInfo.reelIds[reelNumber];
        if(typeof reelId === 'undefined') console.error(new Error('invalid reelNumber'));
        return reelId;
    }
    getReelLength(reelType, reelNumber) {
        const reelId = this.getReelId(reelNumber);
        return this.gameInfo.reelInfo[reelType][reelId].length;
    }

    /**
     * @desc realSymbol(실제 페이 계산에 사용하는 심볼의 ID)로부터 해당 심볼의 이름을 가져온다.
     * @param {*} realSymbol Number
     * @returns String
     */
    getRealSymbolNameById(realSymbol) {
        const {realSymbolInfo} = this.gameInfo;
        return realSymbolInfo[realSymbol].name;
    }

    isScatter(symbol) {
        const {scatterInfo} = this.gameInfo;

        for(let name in scatterInfo) {
            if(symbol === scatterInfo[name]) return true;
        }
        return false;
    }
    isWild(symbol) {
        const {wildInfo} = this.gameInfo;

        return wildInfo.indexOf(symbol) !== -1;
    }
    isGrandJackpot(jackpot) {
        return jackpot === this.getGrandJackpotName();
    }
    isStack(symbol) {
        if(Array.isArray(this.gameInfo.stackSymbols) && this.gameInfo.stackSymbols.length > 0) {
            return this.gameInfo.stackSymbols.indexOf(symbol) > -1;
        }
        else {
            return symbol === this.gameInfo.stackSymbol;
        }
    }

    getScatterPositions(reel) {
        const {scatterInfo} = this.gameInfo;
        const scatterPositions = [];

        for(let pos in reel) {
            if(this.isScatter(reel[pos])) {
                const scatter = {};
                scatter.pos = pos;
                scatter.name = this.getSymbolNameById(reel[pos]);
                scatterPositions.push(scatter);
            }
        }

        return scatterPositions;
    }

    getScatterCount(reel, scatterSymbol) {
        let scatterCount = 0;
        reel.forEach(symbol => {
            if(symbol === this.getSymbolIdBySymbolName(scatterSymbol)) {
                if(this.isScatter(symbol)) {
                    scatterCount++;
                }
            }
        });

        return scatterCount;
    }
    getWildCount(reel) {
        let wildCount = 0;
        reel.forEach(symbol => {
            if(this.isWild(symbol)) {
                wildCount++;
            }
        });

        return wildCount;
    }

    /**
     * @desc 현재 스핀에서 나온 모든 스캐터들의 정보를 얻음
     * @param {*} reel 
     * @returns 
     */
    getAllScattersInfo(reel) {
        const scattersInfo = {};
        reel.forEach(symbol => {
            if(this.isScatter(symbol)) {
                const scatterName = this.getSymbolNameById(symbol);
                if(typeof scattersInfo[scatterName] === 'undefined') scattersInfo[scatterName] = 0;
                scattersInfo[scatterName]++;
            }
        });

        return scattersInfo;
    }

    getScreenSymbolCount(reel, symbolName) {
        const {symbolInfo} = this.gameInfo;

        let symbolCount = 0;
        for(let pos in reel) {
            if(symbolInfo[reel[pos]].name === symbolName) symbolCount++;
        }

        return symbolCount;
    }

    getClientPos(pos) {
        const row = this.getRowNumberByPos(pos);
        const column = this.getReelNumberByPos(pos);

        return (row - 1) * this.getReelCount() + column;
    }

    /**
     * @desc user extend data 초기화 함수 interface (게임별로 필요 시 구현)
     * @param {*} extendData
     * @returns
     */
    initUserExtendData(extendData) {
        return false;
    }
    /**
     * @desc user extend data 가공 함수 interface (게임별로 필요 시 구현)
     * @param {*} extendData 
     * @returns 
     */
    getConvertedExtendData(extendData) {
        return extendData;
    }
    setPickFreespinUserGameData(eventType, userGameData) {

    }

    /**
     * @desc stack에서 pos위치에 적합한 보통 심볼 하나를 가져온다.
     * @param {*} pos 현재 심볼의 위치
     * @return symbol
     */
    getSymbolFromStack(user, pos, namespace) {
        let currentStackSymbolList = user.tempData['currentStackSymbolList'];
        if(currentStackSymbolList) {
            const reelPosition = this.getReelNumberByPos(pos);
            if(currentStackSymbolList[reelPosition]) {
                return parseInt(currentStackSymbolList[reelPosition]);
            }
            else {
                if(serverUtil.getRandomNumberByRange(100) < this.getKeepStackProb()) {
                    currentStackSymbolList[reelPosition] = user.tempData['firstStackPicked'];
                }
                else {
                    currentStackSymbolList[reelPosition] = serverUtil.getKeyFromProb(this.getStackInfo(namespace));
                }
                return this.getSymbolFromStack(user, pos, namespace);
            }
        }
        else {
            currentStackSymbolList = {};
            user.tempData['firstStackPicked'] = serverUtil.getKeyFromProb(this.getStackInfo(namespace));
            user.tempData['currentStackSymbolList'] = currentStackSymbolList;
            return this.getSymbolFromStack(user, pos, namespace);
        }
    }
    /**
     * @desc stack에서 pos위치에 적합한 보통 심볼 하나를 가져온다.
     * @param {*} pos 현재 심볼의 위치
     * @return symbolId
     */
    getSymbolFromStackV2(user, pos, namespace) {
        let currentStackSymbolList = user.tempData['currentStackSymbolList'];
        if (currentStackSymbolList) {
            if (currentStackSymbolList[namespace]) {
                return parseInt(currentStackSymbolList[namespace]);
            } else {
                currentStackSymbolList[namespace] = serverUtil.getKeyFromProb(this.getStackInfo(namespace));
                user.tempData['currentStackSymbolList'] = currentStackSymbolList;
                return this.getSymbolFromStackV2(user, pos, namespace);
            }
        } else {
            currentStackSymbolList = {};
            user.tempData['currentStackSymbolList'] = currentStackSymbolList;
            return this.getSymbolFromStackV2(user, pos, namespace);
        }
    }

    /**
     * @desc 게임의 reelWeights(가중치) 데이터로부터 index를 추출한다.
     * @param {*} reelType Number 베이스 릴 타입, 프리 릴 타입, 익스텐드 릴 타입...
     * @returns Array(Number)
     */
    getRandomIndexes(reelType) {
        const reelWeights = this.gameInfo.reelWeights[reelType];
        const indexes = [];
        for(let reelId in reelWeights) {
            const weight = reelWeights[reelId];
            const key = serverUtil.getRandomNumberByRange(weight[weight.length - 1]);
            const index = reelWeights[reelId].findIndex(e => {
                return key < e;
            });
            indexes.push(index);
        }

        return indexes;
    }



    /**
     * @desc 보너스 페이, 잭팟 페이 등에 사용하기 위한, 페이아웃을 인위적으로 만드는 함수
     * @param {*} lineNum Number
     * @param {*} multiplier Number
     * @param {*} winAs String
     * @param {*} winCount Number
     * @returns win Object
     */
    createPayout(winInfo, lineNum, multiplier, winAs, winCount) {
        const win = {
            lineNum: lineNum + 1, // heart casino와 맞추기 위해서 1을 더함
            multiplier,
            winAs,
            winCount,
        };
        winInfo.push(win);
    }
    deleteAllWins(winInfo) {
        winInfo.splice(0, winInfo.length);
    }
    multipleAllWins(winInfo) {
        
    }
    multipleWin(win, multiplier) {
        win.multiplier *= multiplier;
        win.bonusMultiplier = multiplier;
    }
    async createJackpotCollectPayout(lineNum, winCount, payout, jackpotName, winType, user) {
        const collectPayout = {
            lineNum,
            winCount,
            payout,
            winName: jackpotName,
            winType,
        };
        
        user.jackpot = jackpotName;
        user.jackpotAmount = payout;
        await this.initJackpotFieldAtBetLevel(user.betLevel, jackpotName);
        await this.redisClient.SET(`userCollect${user.user_id}`, payout);
        if(typeof user.collectPayout === 'undefined') user.collectPayout = [];
        user.collectPayout.push(collectPayout);

        return collectPayout;
    }
    async createCollectPayout(lineNum, winCount, payout, winName, winType, user) {
        const collectPayout = {
            lineNum,
            winCount,
            payout,
            winName,
            winType,
        };

        await this.redisClient.SET(`userCollect${user.user_id}`, payout);
        if(typeof user.collectPayout === 'undefined') user.collectPayout = [];
        user.collectPayout.push(collectPayout);

        return collectPayout;
    }

    createRespin(user, respinCount) {
        user.extendData['respin'] = respinCount;
        if(user.simul) user.respinStart = 1;
    }

    /**
     * @desc 프리스핀을 만든다.(parameter로 받은 user에 프리스핀 정보 추가)
     * @param {*} user user
     * @param {*} freespinCount Number
     */
    createFreespin(user, freespinCount) {
        user.freespinStart = 1;
        user.freespinCount = freespinCount;
        user.freespinRemain = freespinCount;
    }
    /**
     * @desc 리트리거를 만든다.(parameter로 받은 user에 프리스핀 정보 업데이트)
     * @param {*} user user
     * @param {*} freespinCount Number
     */
    createRetrigger(user, freespinCount) {
        user.freespinCount = freespinCount;
        user.freespinRemain += freespinCount;
    }

    /**
     * @desc betLevel에 해당하는 잭팟을 가져온다.
     * @param {*} betLevel 
     * @returns 
     */
    async getJackpotAtBetLevel(betLevel) {
        const jackpot = await this.redisClient.HGETALL(`jackpot${this.getGameId()}_${betLevel}`);
        for(let jackpotName in jackpot) {
            jackpot[jackpotName] = parseFloat(jackpot[jackpotName]);
        }
        return jackpot;
    }

    /**
     * @desc 토탈벳의 일정 비율만큼을 레디스 잭팟에 누적하는 함수
     * @param {*} user (betLevel, totalBet 필요)
     * @returns 
     */
    async accumulateJackpots(user) {
        const {betLevel, totalBet} = user;
        if(typeof betLevel === 'undefined' || !totalBet) throw new Error('gameBase-accumulateJackpots error: invalid parameters');

        const jackpot = await this.getJackpotAtBetLevel(betLevel);
        for(let jackpotName in jackpot) {
            const jackpotAddingRatio= this.getJackpotInfo().addingRatio;
            const jackpotAddingAmount = jackpotAddingRatio[jackpotName] * totalBet;
            jackpot[jackpotName] += jackpotAddingAmount;
            await this.redisClient.HSET(`jackpot${this.getGameId()}_${betLevel}`, jackpotName, jackpot[jackpotName]);
        }

        return jackpot;
    }
    async initJackpotFieldAtBetLevel(betLevel, jackpotName) {
        const jackpotInfo = this.getJackpotInfo();
        const jackpotMultiplier = jackpotInfo.multiplier[jackpotName];
        const currentTotalBet = this.getBetOptions()[betLevel] * this.getLineCount();
        await this.redisClient.HSET(`jackpot${this.getGameId()}_${betLevel}`, jackpotName, jackpotMultiplier * currentTotalBet);
    }
    async addJackpot(user, winInfo, jackpotName, winAs, jackpotLineNumber, options) {
        const {betLevel, totalBet, lineBet} = user;
        let {multiplier, winCount} = options ? options : {multiplier: 1, winCount: 1};
        if(typeof multiplier !== 'number') multiplier = 1;
        if(typeof winCount !== 'number') winCount = 1;

        const jackpot = await this.getJackpotAtBetLevel(betLevel);
        const jackpotAmount = jackpot[jackpotName];
        this.createPayout(winInfo, jackpotLineNumber? (jackpotLineNumber - 1) : this.JACKPOT_LINE_NUMBER, Math.floor(jackpotAmount / lineBet), winAs, winCount);
        winInfo[winInfo.length - 1].payout = Math.floor(jackpotAmount);
        user.jackpot = jackpotName;
        user.jackpotAmount = Math.floor(jackpotAmount) * multiplier;
        
        //잭팟 초기화
        await this.initJackpotFieldAtBetLevel(user.betLevel, jackpotName);
    }
    addJackpotSimul(winInfo, jackpotName, multiplier) {
        if(typeof multiplier === 'undefined') {
            winInfo.push({multiplier: this.getJackpotInfo().multiplier[jackpotName] * this.getLineCount(), jackpot: true});
        }
        else {
            winInfo.push({multiplier, jackpot: true});
        }
    }
    
    /**
     * @desc 라인 번호들의 배열을 받아서 당첨라인들 중 해당 번호에 해당하는 라인이 있으면 삭제하는 함수
     * @param {*} lineNumsToRemove : 문자형 숫자 배열
     */
    removeWinsByLineNums(winInfo, lineNumsToRemove) {
        for(let i in lineNumsToRemove) {
            for(let k in winInfo) {
                if(winInfo[k].lineNum == lineNumsToRemove[i]) {
                    winInfo.splice(k, 1);
                    break;
                }
            }
        }
    }
    /**
     * @desc 모든 당첨을 삭제하는 함수
     */
     removeAllWins(winInfo) {
        winInfo.splice(0, winInfo.length);
    }

    getReelType(user) {
        return user.playState - 1;
    }

    /**
     * @desc 기본 윈타입 구하는 함수 (10배: 'big win', 20배: 'mega win', 50배: 'super win')
     * @param {*} totalBet 
     * @param {*} payout 
     */
    getWinType(user, payout) {
        const {totalBet, jackpot} = user;
        if(typeof totalBet !== 'number') throw new Error('getWinType type error');
        if(typeof payout !== 'number') throw new Error('getWinType type error');

        if(this.isGrandJackpot(jackpot)) return 'Jackpot';

        const ratio = payout / totalBet;
        if(ratio < 10) {
            return '';
        }
        else if(ratio < 20) {
            return 'Big Win';
        }
        else if(ratio < 50) {
            return 'Mega Big Win';
        }
        else {
            return 'Super Big Win';
        }
    }

    getClientReelWindow(screen) {
        return 'error: function getClientReelWindow is not defined';
    }
    getScreen(reel) {
        const screen = reel.map(symbol => {
            return this.getSymbolNameById(symbol);
        });

        return screen;
    }
    getReelNumberByPos(pos) {
        const row = this.getRowCount();
        return Math.floor(pos / row) + 1;
    }
    getRowNumberByPos(pos) {
        const reel = this.getReelNumberByPos(pos);
        return pos - (reel - 1) * this.getRowCount() + 1;
    }

    initSimul(user) {
        this.simulData = {};
        user.playState = 1;
        user.extendData = {};
    }
    
    display(reel) {
        console.log('===========================');
        const rowCount = this.getRowCount();
        const reelCount = this.getReelCount();
        for(let i = 0; i < rowCount; i++) {
            let displayString = '';
            for(let k = i; k < i + rowCount * (reelCount - 1) + 1; k = k + rowCount) {
                displayString += this.getSymbolNameById(reel[k]);
                if(k !== i + 2 * reelCount) displayString += ' / ';
            }
            console.log(displayString);
        }
        console.log('===========================');
    }
    displayByScreen(screen) {
        console.log('===========================');
        for(let i = 0; i < this.getRowCount(); i++) {
            let displayString = '';
            for(let k = i; k < i + this.getRowCount() * (this.getReelCount() - 1) + 1; k = k + this.getRowCount()) {
                displayString += screen[k];
                if(k !== i + this.getRowCount() * this.getReelCount()) displayString += ' / ';
            }
            console.log(displayString);
        }
        console.log('===========================');
    }

    createReel(indexes, reelType) {
        const reelInfo = this.gameInfo.reelInfo[reelType];
        const numOfRows = this.gameInfo.numOfRows;
        
        const reel = [];
        let i = 0;
        for(let reelId in reelInfo) {
            let index = indexes[i];
            if(this.getGameType() === 3) { //one line 게임 설정되어 있을 경우, 한칸 위부터 시작
                index--;
                if(index < 0) {
                    index = reelInfo[reelId].length - 1;
                }
            }
            for(let row = 0; row < numOfRows; row++) {
                if(index === reelInfo[reelId].length) {
                    index = 0;
                }
                reel.push(reelInfo[reelId][index]);
                index++;
            }
            i++;
        }

        return reel;
    }

    createWinInfo(reel) {
        try {
            const {lineInfo, symbolInfo, realSymbolInfo, lineScatterInfo} = this.gameInfo;
            const winInfo = [];
            for(let lineNum in lineInfo) {
                /**
                 * @desc : 현재 win과 매개변수로 받은 multiplier, symbolCount를 비교해서 win을 업데이트하는 함수
                 * @param {Object} win : 윈 정보 (currentMultiplier, currentWinAs, currentWinCnt) 으로 구성
                 * @param {number} multiplier : 배수
                 * @param {string} winAs : 어떤 심볼로서 맞았는지 정보
                 * @param {number} symbolCount : 맞은 심볼 개수
                 */
                const updateWin = (win, multiplier, winAs, symbolCount) => {
                    if(multiplier > 0) {
                        if(multiplier > win.currentMultiplier) { //현재 multiplier보다 큰 값이면 win을 업데이트
                            win.currentMultiplier = multiplier;
                            win.currentWinAs = winAs;
                            win.currentWinCnt = symbolCount;
                        }
                        else if(multiplier === win.currentMultiplier) { //현재 multiplier와 같은 값이면 심볼 카운트가 더 많은 경우에만 win을 업데이트
                            if(symbolCount > win.currentWinCnt) {
                                win.currentMultiplier = multiplier;
                                win.currentWinAs = winAs;
                                win.currentWinCnt = symbolCount;
                            }
                        }
                    }
                };
        
                /**
                 * @desc : 현재 검사중인 라인의 라인스캐터가 몇개있는지 정보를 구하는 함수
                 * @param {Array} symbolCheckingList : 검사중인 현재 라인의 심볼 리스트 정보
                 */
                const getLineScattersOfCurrentLine = (symbolCheckingList) => {
                    const isLineScatter = realSymbol => {
                        for(let id in lineScatterInfo) {
                            if(realSymbol == id) {
                                return true;
                            }
                        }
                        return false;
                    };
                    const currentLineScatters = {};
                    symbolCheckingList.forEach(symbol => {
                        symbolInfo[symbol].realSymbols.forEach(realSymbol => {
                            if(isLineScatter(realSymbol)) {
                                //스캐터면 currentLineScatters에 추가
                                if(typeof currentLineScatters[realSymbol] === 'undefined') {
                                    currentLineScatters[realSymbol] = 0;
                                }
                                currentLineScatters[realSymbol]++;
                            }
                        });
                    });
                    return currentLineScatters;
                };
        
                //체크할 심볼 리스트 작성
                const originalSymbols = [];
                const symbolCheckingList = lineInfo[lineNum].map(pos => {
                    originalSymbols.push(this.getSymbolNameById(reel[pos]));
                    return reel[pos];
                });
                //현재 검사중인 라인의 win 정보
                const win = {
                    currentMultiplier: 0, //멀티플라이어 (항상 최대값으로 갱신)
                    currentWinAs: '', //multiplier가 최대값일 때 어떤 realSymbol로 당첨되었는지 표시
                    currentWinCnt: 0, //multiplier가 최대값일 때 몇개 맞았는지 표시
                    currentOriginalSymbols: originalSymbols,
                };
        
                //step 1: 스캐터 정보 구함
                const currentLineScatters = getLineScattersOfCurrentLine(symbolCheckingList, symbolInfo);
        
                //step 2: 스캐터 정보로부터 현재 라인의 win 업데이트
                for(let realSymbol in currentLineScatters) {
                    const multiplier = lineScatterInfo[realSymbol][currentLineScatters[realSymbol] - 1];
                    const symbolCount = currentLineScatters[realSymbol];
                    updateWin(win, multiplier, this.getRealSymbolNameById(realSymbol), symbolCount);
                }    
        
                const getWinLine = (symbolCheckingList) => {
                    
                }
        
                //symbolCheckingList의 첫번째 심볼을 기준으로 체크할 realSymbol 리스트를 만듦
                let realSymbolCheckingList;

                // realSymbolCheckingList가 WILD로부터 파생된 리스트일 경우 처리가 필요함
                // 1. wild로써 체크하는 경우 -> 문제 없음
                // 2. wild가 아닌 심볼로써 체크하는 경우 -> 와일드 묶음과 인접한 심볼들 중에 와일드가 아닌 심볼이 있어야 인정됨
                // 따라서 WILD일 경우 2번에 해당하는 체크를 해서 realSymbolCheckingList를 재구성해야됨

                if(this.isWild(symbolCheckingList[0])) {
                    realSymbolCheckingList = this.getWildRealSymbols().map(e => e);
                    for(let i = 1; i < symbolCheckingList.length; i++) {
                        if(!this.isWild(symbolCheckingList[i])) {
                            symbolInfo[symbolCheckingList[i]].realSymbols.forEach(e => { realSymbolCheckingList.push(e); });
                            break;
                        }
                    }
                }
                else realSymbolCheckingList = symbolInfo[symbolCheckingList[0]].realSymbols;

                //기준이 된 심볼의 realSymbol 리스트들을 순회하면서 어떤 심볼이 가장 배당이 높은지 체크
                realSymbolCheckingList.forEach(realSymbol => {
                    let symbolCount = 0;
                    for(let i in symbolCheckingList) {
                        const symbol = symbolCheckingList[i];
                        if(symbolInfo[symbol].realSymbols.indexOf(realSymbol) === -1) {
                            break;
                        }
                        else {
                            symbolCount++;
                        }
                    }
                    if(symbolCount > 0) {
                        const multiplier = realSymbolInfo[realSymbol].multiplier[symbolCount - 1];
                        updateWin(win, multiplier, this.getRealSymbolNameById(realSymbol), symbolCount);
                    }
                });
        
                if(win.currentMultiplier > 0) {
                    //win!

                    const winLine = {
                        lineNum,
                        multiplier: win.currentMultiplier,
                        winAs: win.currentWinAs,
                        winCount: win.currentWinCnt,
                        originalSymbols: win.currentOriginalSymbols,
                    };
                    winInfo.push(winLine);
                }
            }

            return winInfo;
        }
        catch(error) {
            console.error(error);
            return null;
        }
    }

    additionalBonus() {
        return;
    }

    getSimulData() {
        return this.simulData;
    }
    
    addSimulData(key, value) {
        if(typeof this.simulData[key] === 'undefined') {
            this.simulData[key] = 0;
        }
        this.simulData[key] += value;
    }
}