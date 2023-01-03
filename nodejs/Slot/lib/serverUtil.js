const randy = require('randy');
const moment = require('moment');
const { random } = require('randy');
/**
 * @desc [min, max] 범위 랜덤 정수를 가져옴
 * @param max (필수)
 * @param min (undefined일 경우 [0, max)범위에서 랜덤 정수 가져옴. Math.random(max)과 동일)
 */
exports.getRandomNumberByRange = (max, min) => {
    let randomNumber = randy.random();
    if(min > 0 && max > min) {
        randomNumber *= (max - min + 1);
        randomNumber += min;
    }
    else {
        randomNumber *= max;
    }

    randomNumber = Math.floor(randomNumber);
    return randomNumber;
};

/**
 * @desc [min, max] 범위 랜덤 수를 가져옴
 * @param max (필수)
 * @param min (undefined일 경우 [0, max)범위에서 랜덤 수 가져옴.)
 */
exports.getRandomNumberByRangeFloat = (max, min) => {
    let randomNumber = randy.random();
    if(min > 0 && max > min) {
        randomNumber *= (max - min + 1);
        randomNumber += min;
    }
    else {
        randomNumber *= max;
    }

    return randomNumber;
};

exports.getRandomArrayByArray = (array, count) => {
    return randy.sample(array, count);
};

exports.getRandomElementByArray = (array) => {
    return randy.sample(array, 1).pop();
};

exports.getKeyFromProb = (prob) => {
    if(Array.isArray(prob)) return this.getKeyFromProbArray(prob);
    else return this.getKeyFromProbObject(prob);
};
/**
 * prob에서 key 추출(prob 객체의 값들이 모두 0일 경우 에러)
 * @param prob: key-value 객체, value는 소수점 두자리 까지 적용
 * @return {string}
 */
exports.getKeyFromProbObject = (prob) => {
    function getProbability(data) {
        const prob = {};
        const multiple = 100;

        let cumulative = 0;
        for(let key in data) {
            cumulative += Math.round(data[key] * multiple);
            prob[key] = cumulative;
        }

        prob.probLength = cumulative;

        return prob;
    }

    const probability = getProbability(prob);

    const randomNumber = this.getRandomNumberByRange(probability.probLength);
    for(let key in probability) {
        if(randomNumber < probability[key]) {
            return key;
        }
    }
};

/**
 * prob에서 key 추출(prob 객체의 값들이 모두 0일 경우 에러)
 * @param prob: key-value 객체들을 담은 배열, value는 소수점 두자리 까지 적용
 * @return {string}
 */
 exports.getKeyFromProbArray = (prob) => {
    function getProbability(data) {
        const prob = [];
        const multiple = 100;

        let cumulative = 0;
        for(let i = 0; i < data.length; i++) {
            const probData = {};
            for(let key in data[i]) {
                cumulative += Math.round(data[i][key] * multiple);
                probData[key] = cumulative;
            }
            prob.push(probData);
        }

        return prob;
    }

    const probability = getProbability(prob);

    const randomNumber = this.getRandomNumberByRange(probability[probability.length - 1]);
    for(let i = 0; i < probability.length; i++) {
        for(let key in probability[i]) {
            if(randomNumber < probability[i][key]) {
                return key;
            }
        }
    }
};

exports.getKeysFromProbUntilMatched = (prob, matchKey) => {
    function getProbability(data) {
        const prob = [];
        const multiple = 100;

        let cumulative = 0;
        for(let i = 0; i < data.length; i++) {
            const probData = {};
            for(let key in data[i]) {
                cumulative += Math.round(data[i][key] * multiple);
                probData[key] = cumulative;
            }
            prob.push(probData);
        }

        return prob;
    }
    
    
    const ret = [];
    let matched = false;

    while(matched === false && prob.length > 0) {
        const probability = getProbability(prob);
        let randomNumber;
        for(let key in probability[probability.length - 1]) {
            randomNumber = this.getRandomNumberByRange(probability[probability.length - 1][key]);
        }

        for(let i = 0; i < probability.length; i++) {
            let probIsTaken = false;

            for(let key in probability[i]) {
                if(randomNumber < probability[i][key]) {
                    ret.push(key);
                    probIsTaken = true;
                    prob.splice(i, 1);
                    if(key === matchKey) matched = true; 
                }
            }

            if(probIsTaken) {
                break;
            }
        }
    }
    return ret;
};

exports.getCurrentDatetime = () => {
    const now = moment().utc();
    return now.format('YYYY-MM-DD HH:mm:ss');
};

exports.cloneObject = object => {
    const ret = {};
    for(let key in object) {
        ret[key] = object[key];
    }

    return ret;
}

/**
 * @desc 받은 배열의 원소들을 무작위 순서로 섞는 함수
 * @param array
 */
exports.shuffle = (array) => {
    if(Array.isArray(array)) {
        for (let index = array.length - 1; index > 0; index--) {
            const randomPos = this.getRandomNumberByRange(index + 1);

            const tem = array[index];
            array[index] = array[randomPos];
            array[randomPos] = tem;
        }
    }
}

/**
 * @desc 레벨 보너스 확률에서 픽
 * @param prob: 1 ~ 6레벨을 key로 갖고 getKeyFromProb에서 사용할 수 있는 확률 객체를 value로 갖는 Map
 */
exports.getLevelBonusPayout = (prob) => {
    let bonusLevel = 1;
    let bonus = [];
    while(bonusLevel > 0 && bonusLevel <= 6) {
        const key = this.getKeyFromProb(prob.get(bonusLevel));

        bonus.push(key);

        if(key === '0') {
            bonusLevel = 0;
        }
        else bonusLevel++;
    }

    return bonus;
}