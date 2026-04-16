// Load environment variables from .env file
require("dotenv").config();

// Import Express framework
const express = require("express");
const path = require("path");

// Import cors to allow requests from the frontend (different origin)
const cors = require("cors");

// Import the database connection pool
const pool = require("./db");

// Create the Express application instance
const app = express();

// Enable CORS for all routes
app.use(cors());

// Parse incoming JSON request bodies
app.use(express.json());

// Serve the team's original frontend folder.
app.use(express.static(path.join(__dirname, "frontend")));

// Serve uploaded images
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Import auth routes (register, login)
const authRoutes = require("./routes/auth");
app.use("/api/auth", authRoutes);

// Import photo routes (upload, search, download, list)
const photoRoutes = require("./routes/photos");
app.use("/api/photos", photoRoutes);

// Use PORT from .env or default to 3000
const PORT = process.env.PORT || 3000;

// test db connection
app.get("/test-db", (req, res) => {
  pool.query("SELECT 1 AS test", (err, results) => {
    if (err) {
      console.error("DB ERROR:", err);
      return res.status(500).json({ error: err.message });
    }
    res.json(results);
  });
});

// Start the server and listen for incoming requests
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
