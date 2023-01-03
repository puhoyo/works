module.exports = class ApiBase {
    constructor() {

    }

    getApiName() {
        return this.apiName;
    }

    getApiRequestFormat() {
        return this.apiRequestFormat;
    }
    getApiResponseFormat() {
        return this.apiResponseFormat;
    }
}