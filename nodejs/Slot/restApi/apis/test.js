const ApiBase = require('./apiBase');
/**
 * @desc
 */
module.exports = class Test extends ApiBase {
    constructor() {
        super();

        this.apiName = 'test';
        this.apiRequestFormat = {
        };
        this.apiResponseFormat = {
            data: 0,
        };
    }

    async service(req, user, data) {
        const response = {
            success: false,
            data: {},
        };
        try {
            response.data.data = 1;
            response.success = true;
        }
        catch(error) {
            console.error(error);
            response.data = error;
        }
        
        return response;
    }
};