// Load environment variables from .env file
require('dotenv').config();

// Import mysql2 to interact with the database
const mysql = require('mysql2');

// Use Cloud SQL unix socket on App Engine, fallback to host for local development.
const connectionConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
};

if (process.env.INSTANCE_CONNECTION_NAME) {
  connectionConfig.socketPath = `/cloudsql/${process.env.INSTANCE_CONNECTION_NAME}`;
} else {
  connectionConfig.host = process.env.DB_HOST || '127.0.0.1';
}

// Create a pool of reusable connections to the database
const pool = mysql.createPool(connectionConfig);

// Export the pool so other files can use it to run queries
module.exports = pool;