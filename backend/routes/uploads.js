const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { formatPhilippineTime } = require("../utils/timezoneUtils");
const { authenticateToken } = require("../middleware/rbac");

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
router.post("/proofs", authenticateToken, upload.single("file"), (req, res) => {
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

// =============================================================================
// ANNOUNCEMENT IMAGES AND VIDEOS UPLOAD
// =============================================================================
const announcementsDir = path.join(__dirname, "..", "uploads", "announcements");
if (!fs.existsSync(announcementsDir)) {
  fs.mkdirSync(announcementsDir, { recursive: true });
}

const announcementStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const now = new Date();
    const [yyyy, mm] = formatPhilippineTime(now, "date").split("-");
    const dir = path.join(announcementsDir, yyyy, mm);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const timestamp = new Date().getTime();
    const ext = path.extname(file.originalname).toLowerCase();
    const base = path
      .basename(file.originalname, ext)
      .replace(/[^a-z0-9_-]/gi, "_");
    cb(null, `announcement_${base}_${timestamp}${ext}`);
  },
});

const announcementImageUpload = multer({
  storage: announcementStorage,
  fileFilter: (req, file, cb) => {
    const allowed = ["image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp"];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error("Only image files (PNG, JPG, GIF, WEBP) are allowed"));
    }
    cb(null, true);
  },
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB for images
});

const announcementVideoUpload = multer({
  storage: announcementStorage,
  fileFilter: (req, file, cb) => {
    const allowed = ["video/mp4", "video/webm", "video/ogg", "video/quicktime"];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error("Only video files (MP4, WEBM, OGG, MOV) are allowed"));
    }
    cb(null, true);
  },
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB for videos
});

// Upload announcement image
router.post("/announcements/image", authenticateToken, announcementImageUpload.single("image"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No image file uploaded" });
    }
    const relPath = req.file.path
      .split(path.join(__dirname, ".."))[1]
      .replace(/\\/g, "/");
    const publicPath = `/uploads${relPath}`;
    return res.status(201).json({ success: true, url: publicPath, location: publicPath });
  } catch (error) {
    console.error("Error uploading announcement image:", error);
    return res.status(500).json({ success: false, message: error.message || "Upload failed" });
  }
});

// Upload announcement video
router.post("/announcements/video", authenticateToken, announcementVideoUpload.single("video"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No video file uploaded" });
    }
    const relPath = req.file.path
      .split(path.join(__dirname, ".."))[1]
      .replace(/\\/g, "/");
    const publicPath = `/uploads${relPath}`;
    return res.status(201).json({ success: true, url: publicPath, location: publicPath });
  } catch (error) {
    console.error("Error uploading announcement video:", error);
    return res.status(500).json({ success: false, message: error.message || "Upload failed" });
  }
});

module.exports = router;
