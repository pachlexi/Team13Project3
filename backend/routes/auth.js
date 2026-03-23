// Import Express, bcrypt for password hashing, and the database pool
const express = require('express');
const bcrypt = require('bcrypt');
const pool = require('../db');

// Create a router to group auth-related routes
const router = express.Router();

// Register a new user
router.post('/register', async (req, res) => {
  // Extract fields from the request body
  const { username, email, password } = req.body;
  // Log the registration request body
  console.log('Register request:', req.body);

  // Hash the password before storing it (10 = salt rounds)
  const hashedPassword = await bcrypt.hash(password, 10);

  const sql = 'INSERT INTO users (username, email, password) VALUES (?, ?, ?)';

  // Run the insert query with the hashed password
  pool.query(sql, [username, email, hashedPassword], (err, result) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    // Return success with the new user's ID
    res.status(201).json({ message: 'User registered successfully', userId: result.insertId });
  });
});

// Login an existing user
router.post('/login', async (req, res) => {
  // Extract email and password from the request body
  const { email, password } = req.body;
  // Log the login request body
  console.log('Login request:', req.body);

  // Look up the user by email
  const sql = 'SELECT user_id, username, email, password FROM users WHERE email = ?';

  pool.query(sql, [email], async (err, results) => {
    if (err) {
      console.error('Login DB error:', err);
      return res.status(500).json({ error: err.message });
    }
    // No user found with that email
    if (results.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    const user = results[0];

    // Compare submitted password against the stored hash
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Return user info (never return the password)
    res.status(200).json({
      message: 'Login successful',
      userId: user.user_id,
      username: user.username,
      email: user.email
    });
  });
});





// Export the router so it can be used in the main server file
module.exports = router;