const app = require('./app');
console.log('end app');
const webSocket = require('./socket/socket');

let server;
if(process.env.PFX_FILENAME && process.env.PASSPHRASE) {
    // HTTPS use
    const https = require('https');
    app.set('https', https);
    const fs = require('fs');
    const sslOptions = {
        pfx: fs.readFileSync(process.env.PFX_FILENAME),
        passphrase: process.env.PASSPHRASE,
    };
    server = https.createServer(sslOptions, app).listen(app.get('port'), () => {
        console.log(`port ${app.get('port')} is listening...`)
    });
}
else {
    // HTTP use
    const http = require('http');
    server = http.createServer(app).listen(app.get('port'), () => {
        console.log(`port ${app.get('port')} is listening...`)
    });
}

if(app.get('useSocket')) {
    function socketInit() {
        if (app.get('ready')) {
            webSocket(server, app);
        } else {
            setTimeout(socketInit, 10);
        }
    }

    socketInit();
}