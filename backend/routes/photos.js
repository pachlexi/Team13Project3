// Import Express, multer for file uploads, and the database pool
const express = require('express');
const multer = require('multer');
const pool = require('../db');

// Configure where and how uploaded files are stored on disk
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  // Prepend timestamp to filename to avoid name collisions
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

// Create the multer upload middleware using the storage config
const upload = multer({ storage });

const router = express.Router();

// Upload a photo and save its metadata to the database
router.post('/upload', upload.single('photo'), (req, res) => {
  // Extract metadata from the request body
  const { user_id, photo_name, description } = req.body;

  // Build the file path from the saved file's name
  const file_path = 'uploads/' + req.file.filename;

  const sql = 'INSERT INTO photos (user_id, photo_name, file_path, description) VALUES (?, ?, ?, ?)';

  pool.query(sql, [user_id, photo_name, file_path, description], (err, result) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    // Return success with the new photo's ID and path
    res.status(201).json({
      message: 'Photo uploaded successfully',
      photoId: result.insertId,
      file_path
    });
  });
});

// Get all photos for a specific user
router.get('/my/:user_id', (req, res) => {
  // Get user_id from the URL (e.g. /my/5)
  const { user_id } = req.params;
  const sql = 'SELECT * FROM photos WHERE user_id = ?';

  pool.query(sql, [user_id], (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    // Return all photos belonging to this user
    res.status(200).json(results);
  });
});

// Search photos by keyword in name or description
router.get('/search', (req, res) => {
  // Get the keyword from the query string (e.g. /search?keyword=coach)
  const { keyword } = req.query;

  // Wrap keyword in % wildcards for partial matching
  const search = '%' + keyword + '%';
  const sql = 'SELECT * FROM photos WHERE photo_name LIKE ? OR description LIKE ?';

  pool.query(sql, [search, search], (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    // Return all matching photos
    res.status(200).json(results);
  });
});

module.exports = router;