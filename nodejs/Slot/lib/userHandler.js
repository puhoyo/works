const util = require('util');
const fs = require('fs');
const readdir = util.promisify(fs.readdir);
const jsonfile = require('jsonfile');
const logger = require('../logger');
const User = require('../models/test/user');
const JackpotLog = require('../models/test/jackpotLog');
const expData = require('./data/levelData/expData.json');
const levelUpReward = require('./data/levelData/levelUpReward.json');

module.exports = class UserHandler {
    constructor() {
        this.redisClient = require('../app').get('redisClient');
    }

    async initUserGameData(key, userId, gameId) {
        try {
            if(key === 'user') {
                const userGameData = {
                    lastBetLevel: 0,
                    playState: 1,
                    freespinRemain: 0,
                    freespinReelWindow: '',
                    freespinTotalWin: 0,
                    extendData: {},
                };

                await this.setUserGameData(key, userId, gameId, userGameData);
                return userGameData;
            }
            else if(key === 'spinData') {
                const spinData = {
                    totalBet: 0,
                    totalWin: 0,
                    spinCount: 0,
                }

                await this.setUserGameData(key, userId, gameId, spinData);
                return spinData;
            }
            else {
                throw 500;
            }
        }
        catch(error) {
            console.log(error);
            logger.error(error);
            return null;
        }
    }

    async getUserGameData(key, userId, gameId) {
        try {
            if(!userId) throw 400;
            let userGameData = await this.redisClient.HGET(`${key}${userId}`, `game${gameId}`);
            if(!userGameData) {
                userGameData = await this.initUserGameData(key, userId, gameId);
            }
            else {
                userGameData = JSON.parse(userGameData);
                userGameData = this.getDecompressedUserData(userGameData);
            }

            if(typeof userGameData === 'number') throw 500;
            const {extendData} = userGameData;
            //extendData 숫자형 문자일 경우 타입 숫자로 변환
            for(let key in extendData) {
                if(typeof extendData[key] === 'string' && !isNaN(extendData[key])) extendData[key] = parseInt(extendData[key]);
            }
            return userGameData;
        }
        catch(error) {
            console.log('error: ', error);
            const errorObj = {
                fileName: __filename,
                functionName: 'getUserGameData',
                message: error,
            };
            logger.error(errorObj);

            throw error;
        }
    }

    async setUserGameData(key, userId, gameId, gameData) {
        try {
            const data = this.getCompressedUserData(gameData);
            const stringData = JSON.stringify(data);
            await this.redisClient.HSET(`${key}${userId}`, `game${gameId}`, stringData);
        }
        catch(error) {
            console.log(error);
            logger.error(error);
            return null;
        }
    }

    async getUserCollectData(userId) {
        try {
            const payout = await this.redisClient.GET(`userCollect${userId}`);
            if(payout) {
                return parseInt(payout);
            }
            else {
                return 0;
            }
        }
        catch(error) {
            console.log(error);
            logger.error(error);
            throw 800;
        }
    }

    async deleteUserCollectData(userId) {
        try {
            await this.redisClient.DEL(`userCollect${userId}`);
        }
        catch(error) {
            console.log(error);
            logger.error(error);
            throw 800;
        }
    }

    getEXP(totalBet) {
        return Math.floor(totalBet / 10);
    }

    getRequiredEXP(level) {
        return expData[level].needToLevelup;
    }
    getLevelUpData() {
        return levelUpData;
    }
    getUserEXPPercent(exp, level) {
        return Math.floor(exp / this.getRequiredEXP(level) * 100);
    }

    /**
     * @desc 유저 밸런스, 경험치, 레벨 업데이트
     * @param {*} user_id : 업데이트할 유저 아이디(Integer)
     * @param {*} updatingValues : 업데이트할 값(Object: {balance?, exp?, level?})
     * @returns 
     */
    async updateUserInfo(user_id, updatingValues) {
        try {
            const {balance, level, exp, heart, ticket} = updatingValues;

            const data = {};
            if(typeof balance === 'number') data.balance = balance;
            if(typeof exp === 'number') data.exp = exp;
            if(typeof level === 'number') data.level = level;
            if(typeof heart === 'number') data.heart = heart;
            if(typeof ticket === 'number') data.ticket = ticket;

            const updated = await User.update(data, {where: {user_id}});
            return updated.pop();
        }
        catch(error) {
            console.log(error);
            logger.error(error);
            return null;
        }
    }


    addUserEXP(user) {
        
        //유저 경험치 업데이트
        const {user_id} = user;
        if(!user_id) throw new Error('spin error: user_id is not defined');
        let {exp, level} = user;

        exp += this.getEXP(user.totalBet);
        const needToLevelUpEXP = expData[level].needToLevelup;

        if(exp >= needToLevelUpEXP) { //레벨 업!
            exp = 0;
            level++;
            if(level > expData['max']) level = 500;

            const levelUpChip = levelUpReward[level].chip;
            const levelUpCrown = levelUpReward[level].crown;
            const levelUpDia = levelUpReward[level].dia;
            const levelUpCard = levelUpReward[level].coupon;

            user.levelUpData = {
                level,
                levelUpChip,
                levelUpCrown,
                levelUpDia,
                levelUpCard
            };

            user.level = level;
            user.balance += levelUpChip;
            user.heart += levelUpCrown;
            user.ticket += levelUpDia;
        }
        user.exp = exp;
    }

    async addJackpotLog(user_id, gameId, betLevel, jackpotName, jackpotAmount) {
        await JackpotLog.create({user_id, gameId, betLevel, jackpotName, jackpotAmount});
    }

    async addBroadcast(userId, broadcastType, username, gameId, photo) {
        const broadcastObject = {
            userId,
            type: broadcastType,
            username,
            gameId,
            photo,
        };
        
        await this.redisClient.SET(`broadcast${user_id}`, JSON.stringify(broadcastObject));
    }

    async getUser(user_id) {
        return await User.findOne({where: {user_id}});
    }

    getDecompressedName(dataName) {

        switch(dataName) {
            case 'l':
                return 'lastBetLevel';
            case 's':
                return 'playState';
            case 'r':
                return 'freespinRemain';
            case 'w':
                return 'freespinReelWindow';
            case 't':
                return 'freespinTotalWin';
            case 'e':
                return 'extendData';
            case 'tb':
                return 'totalBet';
            case 'tw':
                return 'totalWin';
            case 'sc':
                return 'spinCount';
            default:
                logger.error(`error: not exist mapping information => ${dataName}`);
                return dataName;
        }
    }
    getCompressedName(dataName) {

        switch(dataName) {
            case 'lastBetLevel':
                return 'l';
            case 'playState':
                return 's';
            case 'freespinRemain':
                return 'r';
            case 'freespinReelWindow':
                return 'w';
            case 'freespinTotalWin':
                return 't';
            case 'extendData':
                return 'e';
            case 'totalBet':
                return 'tb';
            case 'totalWin':
                return 'tw';
            case 'spinCount':
                return 'sc';
            default:
                logger.error(`error: not exist mapping information => ${dataName}`);
                return dataName;
        }
    }
    getDecompressedUserData(userData) {
        const data = {};

        for(let fieldName in userData) {
            const name = this.getDecompressedName(fieldName);
            data[name] = userData[fieldName];
        }

        return data;
    }
    getCompressedUserData(userData) {
        const data = {};

        for(let fieldName in userData) {
            const name = this.getCompressedName(fieldName);
            data[name] = userData[fieldName];
        }

        return data;
    }
}