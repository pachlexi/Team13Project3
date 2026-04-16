const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const pool = require("../db");
const { Storage } = require("@google-cloud/storage");

// Initialize Google Cloud Storage
// GAE automatically handles authentication, so no keyfile is needed
const storageClient = new Storage();
const bucketName = "team13project3-gallery-bucket";
const bucket = storageClient.bucket(bucketName);

// Use memoryStorage instead of diskStorage for serverless deployment
const multerStorage = multer.memoryStorage();
const upload = multer({ storage: multerStorage });

const router = express.Router();

function filePathIsUsable(filePath) {
  if (!filePath) return false;

  // Cloud storage URLs are the current source of truth for serverless uploads.
  if (filePath.startsWith("https://storage.googleapis.com/")) return true;

  // Legacy local uploads are only usable if the file still exists on disk.
  const normalized = filePath.replace(/^\//, "");
  const absolutePath = path.join(__dirname, "..", normalized);
  return fs.existsSync(absolutePath);
}

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
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        res.status(201).json({
          message: "Photo uploaded successfully",
          photoId: result.insertId,
          file_path: publicUrl,
        });
      },
    );
  });

  // Write the file buffer to the stream
  blobStream.end(req.file.buffer);
});

// Get all photos for a specific user
router.get("/my/:user_id", (req, res) => {
  const { user_id } = req.params;
  const sql = "SELECT * FROM photos WHERE user_id = ?";

  pool.query(sql, [user_id], (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    const filtered = results.filter((photo) => filePathIsUsable(photo.file_path));
    res.status(200).json(filtered);
  });
});

// Search photos by keyword in name or description
router.get("/search", (req, res) => {
  const { keyword } = req.query;
  const search = "%" + keyword + "%";
  const sql =
    "SELECT * FROM photos WHERE photo_name LIKE ? OR description LIKE ?";

  pool.query(sql, [search, search], (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    const filtered = results.filter((photo) => filePathIsUsable(photo.file_path));
    res.status(200).json(filtered);
  });
});

// Download a photo by its ID
router.get("/download/:photo_id", (req, res) => {
  const { photo_id } = req.params;
  const sql = "SELECT photo_name, file_path FROM photos WHERE photo_id = ?";

  pool.query(sql, [photo_id], (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: "Photo not found" });
    }

    const { file_path } = results[0];

    // Since file_path is now a public URL, redirect the browser to it natively
    res.redirect(file_path);
  });
});

module.exports = router;
