const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const User = sequelize.define('User', {
  userId: {
    type: DataTypes.STRING,
    primaryKey: true,
  },
  username: DataTypes.STRING,
});

module.exports = User;
