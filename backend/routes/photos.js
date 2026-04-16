const express = require("express");
const multer = require("multer");
const path = require("path");
const pool = require("../db");
const { Storage } = require("@google-cloud/storage");

// Initialize Google Cloud Storage
const storageClient = new Storage();
const bucketName = "team13project3-gallery-bucket";
const bucket = storageClient.bucket(bucketName);

// Use memoryStorage instead of diskStorage for the serverless deployment
const multerStorage = multer.memoryStorage();
const upload = multer({ storage: multerStorage });

const router = express.Router();

// Upload a photo and save its metadata to the database
router.post("/upload", upload.single("photo"), (req, res) => {
  const { user_id, photo_name, description } = req.body;

  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded." });
  }

  // Create a new blob in the bucket and upload the file data
  const originalName = req.file.originalname.replace(/[^a-zA-Z0-9.]/g, "_"); // Sanitize filename
  const blob = bucket.file(Date.now() + "-" + originalName);
  const blobStream = blob.createWriteStream({
    resumable: false,
    contentType: req.file.mimetype,
  });

  blobStream.on("error", (err) => {
    return res.status(500).json({ error: err.message });
  });

  blobStream.on("finish", () => {
    // Construct the public URL for the image
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;

    // Store the public URL in the database instead of a local file path
    const sql =
      "INSERT INTO photos (user_id, photo_name, file_path, description) VALUES (?, ?, ?, ?)";

    pool.query(
      sql,
      [user_id, photo_name, publicUrl, description],
      (err, result) => {
        if (err) return res.status(500).json({ error: err.message });

        res.status(201).json({
          message: "Photo uploaded successfully",
          photoId: result.insertId,
          file_path: publicUrl,
        });
      },
    );
  });

  blobStream.end(req.file.buffer);
});

// Get all photos for a specific user
router.get("/my/:user_id", (req, res) => {
  const { user_id } = req.params;
  const sql = "SELECT * FROM photos WHERE user_id = ?";

  pool.query(sql, [user_id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(200).json(results);
  });
});

// Search photos by keyword in title ONLY
router.get("/search", (req, res) => {
  const { keyword } = req.query;
  const search = "%" + keyword + "%";

  // Updated SQL to only search the photo_name column
  const sql = "SELECT * FROM photos WHERE photo_name LIKE ?";

  pool.query(sql, [search], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(200).json(results);
  });
});

// Download a photo by its ID
router.get("/download/:photo_id", (req, res) => {
  const { photo_id } = req.params;
  const sql = "SELECT photo_name, file_path FROM photos WHERE photo_id = ?";

  pool.query(sql, [photo_id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0)
      return res.status(404).json({ error: "Photo not found" });

    const { photo_name, file_path } = results[0];

    // Check if the file is a cloud URL or a legacy local file
    if (file_path.startsWith("http")) {
      // Native browser redirect to the Cloud Storage URL
      res.redirect(file_path);
    } else {
      // Fallback for the old local files just in case
      const ext = path.extname(file_path);
      const downloadName = `${photo_name}${ext}`;
      res.download(file_path, downloadName, (err) => {
        if (err)
          return res.status(500).json({ error: "Failed to download file" });
      });
    }
  });
});

module.exports = router;
