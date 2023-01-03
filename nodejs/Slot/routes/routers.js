const fs = require('fs');

exports.routerInit = () => {
    return new Promise(resolve => {
        fs.readdir(__dirname, (err, files) => {
            const routerNames = [];
            for (let i in files) {
                const routerName = files[i].split('.')[0];
                if (!(routerName === 'routers' || routerName === 'middlewares')) {
                    routerNames.push(routerName);
                }
            }

            const routers = {};
            routerNames.forEach(routerName => {
                const url = `/${routerName}`;
                const router = require(__dirname + `/${routerName}`);

                routers[url === '/index' ? '/' : url] = router;
            });

            resolve(routers);
        });
    });
}