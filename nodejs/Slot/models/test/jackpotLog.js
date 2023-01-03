const Sequelize = require('sequelize');

module.exports = class JackpotLog extends Sequelize.Model {
    static init(sequelize) {
        return super.init({
            user_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
            },
            gameId: {
                type: Sequelize.INTEGER,
                allowNull: false,
            },
            betLevel: {
                type: Sequelize.TINYINT,
                allowNull: false,
            },
            jackpotName: {
                type: Sequelize.STRING(10),
                allowNull: false,
            },
            jackpotAmount: {
                type: Sequelize.BIGINT,
                allowNull: false,
            },
        }, {
            sequelize,
            createdAt: true,
            updatedAt: false,
            underscored: false,
            modelName: 'JackpotLog',
            tableName: 'user_jackpotLog',
            paranoid: false,
            charset: 'utf8',
            collate: 'utf8_general_ci',
        });
    }

    static associate(db) {
        db.JackpotLog.belongsTo(db.User, {foreignKey: 'user_id', targetKey: 'user_id'});
    }
};