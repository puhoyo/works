const GameBase = require("../gameBase");
const logger = require('../../logger');
const serverUtil = require('../serverUtil');

module.exports = class Game extends GameBase {
    constructor(gameInfo) {
        // console.log('gameInfo: ', gameInfo);

        const jackpotInfo = {
            count: 1,
            multiplier: {
                'Grand': 3000,
            },
            cumulativeRate: 2,
            grandJackpotName: 'Grand',
        };

        gameInfo.jackpotInfo = jackpotInfo;

        const stackInfo = {
            'Stack1': {
                'A': 50,
                'Wild': 50,
            },
        };
        gameInfo.stackInfo = stackInfo;

        super(gameInfo);

        this.FREESPIN_COUNT = [10, 15, 20];
        this.STACKED_TARGET_BASE = ['A', 'Wild'];

        this.BONUS_DIVIDE = 5;
        this.BONUS_CARDS = [2, 3, 4, 5, 7, 2, 3, 4, 5, 7, 2, 3, 4, 5, 99]; //99 = jackpot mode
        this.BONUS_LIMIT = 143;
        this.BONUS_PAY_TABLE = {
            '2000': 2.25,
            '120': 7.25,
            '150': 7.25,
            '500': 7.25,
            '90': 7.25,
            '300': 7.25,
            '80': 7.25,
            '1000': 2.25,
            '180': 7.25,
            '130': 7.25,
            '800': 2.25,
            '60': 7.25,
            '100': 7.25,
            '160': 7.25,
            '360': 7.25,
            '110': 6.25,
            'jackpot': 0.02,
        };
    }

    spinInit(user) {
        if(user.betLevelChanged) {
            user.extendData['stackedReels'] = [];
        }
    }

    initUserExtendData(extendData) {
        const {topGauge, bonus, stackedReels} = extendData;
        let needToSave = false;
        if(typeof topGauge === 'undefined') {
            needToSave = true;
            extendData.topGauge = 0;
        }
        if(typeof bonus === 'undefined') {
            needToSave = true;
            extendData.bonus = 0;
        }
        if(typeof stackedReels === 'undefined') {
            needToSave = true;
            extendData.stackedReels = [];
        }
        return needToSave;
    }

    changeReel(reel, user) {
        //STACK
        for(let pos in reel) {
            if(this.isStack(reel[pos])) reel[pos] = this.getSymbolFromStackV2(user, pos, this.getSymbolNameById(reel[pos]));
        }

        const stackedReels = user.extendData['stackedReels'];
        if(Array.isArray(stackedReels)) {
            for(let i = 0; i < stackedReels.length; i++) {
                const reelNum = stackedReels[i];
                for(let pos = (reelNum - 1) * this.getRowCount(); pos < reelNum * this.getRowCount(); pos++) {
                    reel[pos] = this.getSymbolIdBySymbolName('Wild');
                }
            }
        }
    }

    async additionalBonus(reel, winInfo, user) {
        const bonusCount = this.getScatterCount(reel, 'Bonus');
        try {
            //getting full stacked reels
            const changedReels = user.extendData['stackedReels'] ? user.extendData['stackedReels'] : [];
            const stackedReels = [];
            if((user.playState !== 2 || user.freespinRemain > 1) && bonusCount < 3) {
                for (let reelNum = 1; reelNum <= this.getReelCount(); reelNum++) {
                    if (changedReels.indexOf(reelNum) === -1) {
                        let isStackedReel = true;
                        let symbol = 0;
                        for (let pos = this.getRowCount() * (reelNum - 1); pos < this.getRowCount() * reelNum; pos++) {
                            if (symbol === 0) {
                                if (user.playState === 2) {
                                    symbol = reel[pos];
                                } else {
                                    if (this.STACKED_TARGET_BASE.indexOf(this.getSymbolNameById(reel[pos])) > -1) symbol = reel[pos];
                                    else {
                                        isStackedReel = false;
                                        break;
                                    }
                                }
                            } else if (symbol !== reel[pos]) {
                                isStackedReel = false;
                                break;
                            }
                        }

                        if (isStackedReel) stackedReels.push(reelNum);
                    }
                }
            }
            user.extendData['stackedReels'] = stackedReels;

            let screenRabbitCount = 0;
            let topGauge = user.extendData['topGauge'];
            let bonus = user.extendData['bonus'];

            for (let pos in reel) {
                if (this.getSymbolNameById(reel[pos]) === 'Bonus') {
                    screenRabbitCount++;
                }
            }

            if(screenRabbitCount > 0) {
                topGauge += screenRabbitCount;
                bonus += screenRabbitCount * user.lineBet / this.BONUS_DIVIDE;

                if(topGauge > this.BONUS_LIMIT) {
                    let picked = [];
                    const cards = [];
                    for(let i = 0; i < this.BONUS_CARDS.length; i++) {
                        cards.push(this.BONUS_CARDS[i]);
                    }
                    serverUtil.shuffle(cards);

                    do {
                        const card = cards.pop();
                        picked.push(card);
                        if(picked.length === 2) {
                            cards.splice(0, 0, 0, 0, 0);
                            serverUtil.shuffle(cards);
                        } //2개 고른 후에 꽝 3개 추가
                    }
                    while(picked[picked.length - 1] !== 0);

                    user.tempData['cards'] = picked;

                    let totalPayout = 0;
                    for(let i = 0; i < picked.length; i++) {
                        if(picked[i] === 99) {
                            //jackpot mode
                            let wheelKey = serverUtil.getKeyFromProb(this.BONUS_PAY_TABLE);

                            if(wheelKey === 'jackpot') {
                                //jackpot
                                if(user.simul) {

                                }
                                else {
                                    const bonusModeJackpot = 'Grand';

                                    const jackpotList = await this.getJackpotAtBetLevel(user.betLevel);
                                    const jackpotAmount = Math.floor(jackpotList[bonusModeJackpot]);
                                    totalPayout += jackpotAmount;
                                }
                            }
                            else {
                                totalPayout += parseInt(wheelKey) * user.lineBet;
                            }
                            user.tempData['bonusWheel'] = wheelKey;
                        }
                        else {
                            totalPayout += picked[i] * bonus;
                        }
                    }

                    if(user.simul) {
                        if (user.tempData['bonusWheel'] === 'jackpot') {
                            const jackpotMultiplier = this.getJackpotInfo().multiplier['Grand'] * this.getLineCount();
                            this.addJackpotSimul(winInfo, 'Grand', jackpotMultiplier);
                        }
                        this.createPayout(winInfo, -3, totalPayout / user.lineBet, 'Bonus', 1);
                    }
                    else {
                        if (user.tempData['bonusWheel'] === 'jackpot') {
                            await this.createJackpotCollectPayout(-2, 1, totalPayout, 'Grand', 'Jackpot', user);
                        } else {
                            await this.createCollectPayout(-1, 1, totalPayout, 'Bonus', this.getWinType(user, totalPayout), user);
                        }
                    }
                    if(user.simul) {
                        topGauge = 0;
                        bonus = 0;
                    }
                }
                user.extendData['topGauge'] = topGauge;
                user.extendData['bonus'] = bonus;
            }

            // //프리스핀 당첨 처리
            if(bonusCount > 2) {
                this.createFreespin(user, this.FREESPIN_COUNT[bonusCount - 3]);
            }
        }
        catch(e) {
            console.error(e);
            logger.error(e);
        }
    }

    createSpinResData(user) {

    }

    initSimul(user) {
        super.initSimul(user);
        user.extendData['topGauge'] = 0;
        user.extendData['bonus'] = 0;
        user.extendData['stackedReels'] = [];
    }
}