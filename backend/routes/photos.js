// Import Express, multer for file uploads, and the database pool
const express = require('express');
const multer = require('multer');
const path = require('path');
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
  const { user_id, photo_name, description } = req.body;
  const file_path = 'uploads/' + req.file.filename;

  const sql = 'INSERT INTO photos (user_id, photo_name, file_path, description) VALUES (?, ?, ?, ?)';

  pool.query(sql, [user_id, photo_name, file_path, description], (err, result) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    res.status(201).json({
      message: 'Photo uploaded successfully',
      photoId: result.insertId,
      file_path
    });
  });
});

// Get all photos for a specific user
router.get('/my/:user_id', (req, res) => {
  const { user_id } = req.params;
  const sql = 'SELECT * FROM photos WHERE user_id = ?';

  pool.query(sql, [user_id], (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.status(200).json(results);
  });
});

// Search photos by keyword in name or description
router.get('/search', (req, res) => {
  const { keyword } = req.query;
  const search = '%' + keyword + '%';
  const sql = 'SELECT * FROM photos WHERE photo_name LIKE ? OR description LIKE ?';

  pool.query(sql, [search, search], (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.status(200).json(results);
  });
});

// Download a photo by its ID
router.get('/download/:photo_id', (req, res) => {
  const { photo_id } = req.params;
  const sql = 'SELECT photo_name, file_path FROM photos WHERE photo_id = ?';

  pool.query(sql, [photo_id], (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: 'Photo not found' });
    }

    const { photo_name, file_path } = results[0];
    const ext = path.extname(file_path);
    const downloadName = `${photo_name}${ext}`;

    res.download(file_path, downloadName, (err) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to download file' });
      }
    });
  });
});

module.exports = router;