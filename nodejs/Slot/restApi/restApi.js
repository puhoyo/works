const logger = require('../logger');
const serverUtil = require('../lib/serverUtil');

exports.restApi = async (req, res, next) => {
    const pid = req.body.pid;
    let data = req.body.data;
    const userId = req.user;
    
    try {
        const apiHandler = req.app.get('restApiHandler');
        const api = apiHandler.getApi(pid);
        if(typeof api === 'undefined') {
            console.log('pid: ', pid);
            return res.send(new Error('not found api'));
        }
        else {
            const apiRequestFormat = api.getApiRequestFormat();
            if(typeof data === 'string') {
                data = JSON.parse(data);
            }

            if(!serverUtil.isValidPacket(apiRequestFormat, data)) return res.send(new Error('invalid request format'));

            for(let i in data) { //parse numbers
                data[i] = isNaN(data[i]) ? data[i] : parseInt(data[i]);
            }

            const user = {
                userId,
            };
            const resData = await api.service(req, user, data);

            if(resData) {
                const apiResponseFormat = api.getApiResponseFormat();
                if(!serverUtil.isValidPacket(apiResponseFormat, resData)) return res.send(new Error('invalid response format'));
                res.resData = resData;
                return next();
            }
            else {
                return res.send(new Error('api request failed'));
            }
        }
    }
    catch(error) {
        logger.error(error);
        return res.send(error);
    }
};