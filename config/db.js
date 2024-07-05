const { Pool } = require("pg");
const { Sequelize } = require("sequelize");
require("dotenv").config();

var sequelize = new Sequelize(
  process.env.DB_DATABASE,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    dialect: process.env.DB_DIALECT,
  }
);

var pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

const connectSQL = async () => {
  try {
    const client = await pool.connect();
    return client;
  } catch (error) {
    console.error(`Error connecting to the database: ${error.message}`);
    throw error;
  }
};

module.exports = { sequelize, connectSQL, pool };