const Sequelize = require('sequelize');

module.exports = class User extends Sequelize.Model {
    static init(sequelize) {
        return super.init({
            user_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                unique: true,
            },
            username: {
                type: Sequelize.STRING(45),
                allowNull: false,
            },
            balance: {
                type: Sequelize.BIGINT,
                allowNull: false,
            },
            level: {
                type: Sequelize.INTEGER,
                allowNull: false,
                defaultValue: 1,
            },
            exp: {
                type: Sequelize.BIGINT,
                allowNull: false,
                defaultValue: 0,
            },
            heart: {
                type: Sequelize.INTEGER,
                allowNull: true,
                defaultValue: 0,
            },
            ticket: {
                type: Sequelize.INTEGER,
                allowNull: true,
                defaultValue: 0,
            },
            photo: {
                type: Sequelize.STRING,
            },
        }, {
            sequelize,
            timestamps: false,
            underscored: false,
            modelName: 'User',
            tableName: 'user_info',
            paranoid: false,
            charset: 'utf8',
            collate: 'utf8_general_ci',
        });
    }

    static associate(db) {
    }
};