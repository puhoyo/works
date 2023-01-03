const logger = require('../logger');
const serverUtil = require('../lib/serverUtil');

exports.socketApi = async (socket, packet) => {
    console.log('packet: ', packet);
    const pid = packet.pid;
    let data = packet.data;
    
    try {
        const apiHandler = socket.request.app.get('socketApiHandler');
        const api = apiHandler.getApi(pid);
        if(typeof api === 'undefined') {
            console.log('pid: ', pid);
            return new Error('not found api');
        }
        else {
            const apiRequestFormat = api.getApiRequestFormat();
            if(!serverUtil.isValidPacket(apiRequestFormat, data)) return new Error('invalid request format');

            for(let i in data) { //parse numbers
                data[i] = isNaN(data[i]) ? data[i] : parseInt(data[i]);
            }

            const resData = await api.service(socket, socket.user, data);

            if(resData) {
                const apiResponseFormat = api.getApiResponseFormat();
                if (!serverUtil.isValidPacket(apiResponseFormat, resData)) return new Error('invalid response format');
                return resData;
            }
        }
    }
    catch(error) {
        logger.error(error);
        return error;
    }
};