const SocketIO = require('socket.io');
const User = require('./user');
const {socketApi} = require('./socketApi');

module.exports = (server, app) => {
    const io = SocketIO(server, {path: '/socket.io', cors: {origin: '*'}});
    app.set('io', io);

    //socket middleware
    io.use((socket, next) => {
        socket.request.app = app;
        next();
    });

    io.on('connection', async socket => {
        try {
            const {token} = socket.handshake.auth;
            if(token) {
                const user = new User(socket, token);
                socket.user = user;
                socket.on('disconnect', reason => {
                    const socketHandler = app.get('socketHandler');
                    if (user) {
                        socketHandler.delete(user.getUserId());
                        console.log(`disconnection reason user ${user.getUserId()} : ${reason}`);
                        if (reason !== 'server namespace disconnect') {
                            user.deleteSession();
                        }
                        user.destroy();
                        socket.user = null;
                    }
                });
                socket.on('message', async data => {
                    let packet = await socketApi(socket, data);
                    if (packet) {
                        socket.send(packet);
                    }
                });
            }
            else {
                socket.send(new Error('token is not defined'));
                socket.disconnect();
            }
        }
        catch(e) {
            app.get('logger').error(e);
            socket.send(e);
            socket.disconnect();
        }
    });

    console.log('end socket');
};