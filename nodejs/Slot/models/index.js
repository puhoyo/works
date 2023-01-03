const Sequelize = require('sequelize');
const env = process.env.NODE_ENV || 'local';
const config = require('../config/config')['database'];

const fs = require('fs');

const db = {};
for(let database in config) {
    const configInfo = config[database][env];
    if(configInfo) {
        db[database] = {};
        if (config.hasOwnProperty(database)) {
            db[database].sequelize = new Sequelize(
                database, configInfo.username, configInfo.password, configInfo,
            );
        }
    }
}

exports.dbSync = () => {
    return new Promise((resolve, reject) => {
        for(let database in config) {
            if (config.hasOwnProperty(database)) {
                const modelNames = [];

                const files = fs.readdirSync(__dirname + `/${database}`);
                for (let i in files) {
                    let modelName = files[i].split('.')[0];
                    modelName = modelName.charAt(0).toUpperCase() + modelName.slice(1);
                    modelNames.push(modelName);
                    const model = require(__dirname + `/${database}/${files[i]}`);
                    db[database][modelName] = model;
                }

                if(modelNames.length > 0) {
                    for (let key in db[database]) {
                        if (modelNames.indexOf(key) > -1) {
                            db[database][key].init(db[database].sequelize);
                        }
                    }
                    for (let key in db[database]) {
                        if (modelNames.indexOf(key) > -1) {
                            db[database][key].associate(db[database]);
                        }
                    }
                }
            }
        }

        resolve(db);
    });
}