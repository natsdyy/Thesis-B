const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { formatPhilippineTime } = require("../utils/timezoneUtils");

const router = express.Router();

// Storage: /backend/uploads/proofs/YYYY/MM
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const now = new Date();
    const [yyyy, mm] = formatPhilippineTime(now, "date").split("-");
    const dir = path.join(__dirname, "..", "uploads", "proofs", yyyy, mm);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const timestamp = new Date().getTime();
    const ext = path.extname(file.originalname).toLowerCase();
    const base = path
      .basename(file.originalname, ext)
      .replace(/[^a-z0-9_-]/gi, "_");
    cb(null, `${base}_${timestamp}${ext}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowed = ["image/png", "image/jpeg", "image/jpg"];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error("Only PNG and JPG images are allowed"));
    }
    cb(null, true);
  },
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

// TinyMCE-compatible response: { location: "/uploads/proofs/YYYY/MM/filename" }
router.post("/proofs", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res
      .status(400)
      .json({ success: false, message: "No file uploaded" });
  }
  // Build public URL path served by server.js at /uploads
  const relPath = req.file.path
    .split(path.join(__dirname, ".."))[1]
    .replace(/\\/g, "/");
  const publicPath = `/uploads${relPath}`;
  return res.status(201).json({ location: publicPath });
});

module.exports = router;
