exports.getErrorMessage = code => {
    const errorMessages = {
        3: 'Invalid UserToken',
        400: 'syntax error',
        403: 'forbidden access',
        404: 'not found pid',
        429: 'too many request',
        500: 'server error',
        800: 'server redis error',
        900: 'not found user',
        940: 'game is updating... please try again!',
        950: 'server error: not matched response format',
        960: 'invalid packet format',
        970: 'not exist collect data',
        980: 'expired token',
        981: 'invalid token',
        990: 'invalid lineBet',
        991: 'invalid gameId',
        995: 'out of chips',
    }
    const errorMessage = errorMessages[code];
    if(errorMessage) return errorMessage;
    else return 'unknown server error';
};
exports.getPacketError = (code, pid) => {
    const message = this.getErrorMessage(code);

    const error = {
        success: false,
        pid: 'error',
        data: {
            currentPid: pid,
            code,
            title: 'error',
            message,
        },
    };

    return error;
};