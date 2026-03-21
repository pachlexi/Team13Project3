// Load environment variables from .env file
require('dotenv').config();

// Import mysql2 to interact with the database
const mysql = require('mysql2');

// Create a pool of reusable connections to the database
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

// Export the pool so other files can use it to run queries
module.exports = pool;