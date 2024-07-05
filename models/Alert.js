const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const User = require('./User');

const Alert = sequelize.define('Alert', {
  tokenSymbol: DataTypes.STRING,
  priceThreshold: DataTypes.FLOAT,
  condition: DataTypes.STRING,
});

Alert.belongsTo(User, { foreignKey: 'userId' });

module.exports = Alert;