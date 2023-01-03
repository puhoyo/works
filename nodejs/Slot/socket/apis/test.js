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
        };
    }

    async service(socket, user, data) {
        const response = {
            success: false,
            data: {},
        };
        try {
            response.success = true;
        }
        catch(error) {
            console.error(error);
            response.data = error;
        }
        
        return response;
    }
};