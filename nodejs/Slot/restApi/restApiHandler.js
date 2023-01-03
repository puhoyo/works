const util = require('util');
const fs = require('fs');
const readdir = util.promisify(fs.readdir);
const logger = require('../logger');

module.exports = class RestApiHandler {
    constructor() {
        this.apis = new Map();

        this.init();
    }

    async init() {
        try {
            const apisDir = __dirname + '/apis';
            const files = await readdir(apisDir);
            for(let i in files) {
                const modelName = files[i].split('.')[0];
                if (!(modelName === 'apiBase')) {
                    const apiModel = require(`./apis/${files[i]}`);
                    const api = new apiModel();
                    const apiName = api.getApiName();
                    this.apis.set(apiName, api);
                }
            }
        }
        catch(error) {
            console.log(error);
            logger.error(`apiHandler init error: ${error}`);
        }
    }

    getApi(apiName) {
        return this.apis.get(apiName);
    }
}
