const fs = require('fs');

exports.controllerInit = () => {
    return new Promise(resolve => {
        fs.readdir(__dirname, async (err, files) => {
            const controllerNames = [];
            for (let i in files) {
                const controllerName = files[i].split('.')[0];
                if (!(controllerName === 'index' || controllerName === 'controllerBase')) {
                    controllerNames.push(controllerName);
                }
            }

            const controllers = {};
            controllerNames.forEach(controllerName => {
                const controller = require(__dirname + `/${controllerName}`);
                controllers[controllerName] = new controller;
            });
            for(let i in controllers) {
                // async init이 핋요할 경우 컨트롤러에 async init 함수 구현
                if(typeof controllers[i].init === 'function') await controllers[i].init();
            }

            resolve(controllers);
        });
    });
}