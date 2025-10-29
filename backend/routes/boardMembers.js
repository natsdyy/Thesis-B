const express = require("express");
const router = express.Router();
const BoardMember = require("../models/BoardMember");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Helper: sanitize payload for create/update
function pickBoardFields(payload) {
  return {
    first_name: payload.first_name,
    middle_name: payload.middle_name || null,
    last_name: payload.last_name,
    email: payload.email,
    phone_number: payload.phone_number || null,
    position: payload.position,
    department: payload.department || "Administration",
    is_active:
      payload.is_active === undefined ? true : Boolean(payload.is_active),
  };
}

// List board members
router.get("/", async (req, res) => {
  try {
    const rows = await BoardMember.getAll(false);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error("Get board members error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to get board members" });
  }
});

// Create board member
router.post("/", async (req, res) => {
  try {
    const { password: providedPassword, ...rest } = req.body || {};
    if (!rest.first_name || !rest.last_name || !rest.email || !rest.position) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields" });
    }
    // Default password when not provided
    const password = providedPassword || "Board@123";
    if (password === providedPassword && String(password).length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters",
      });
    }
    const created = await BoardMember.create({
      ...pickBoardFields(rest),
      password,
    });
    res.json({ success: true, data: created });
  } catch (error) {
    console.error("Create board member error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to create board member" });
  }
});

// Update board member
router.put("/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const update = pickBoardFields(req.body || {});
    const updated = await BoardMember.update(id, update);
    if (!updated)
      return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, data: updated });
  } catch (error) {
    console.error("Update board member error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to update board member" });
  }
});

// Change board member password (admin)
router.put("/:id/change-password", async (req, res) => {
  try {
    const paramId = req.params.id;
    const parsedParam = Number(paramId);
    const id = Number.isFinite(parsedParam)
      ? parsedParam
      : Number(req.body?.id);
    if (!id) {
      return res
        .status(400)
        .json({ success: false, message: "Missing user id" });
    }
    const rawNew = req.body?.new_password ?? req.body?.password;
    const password = typeof rawNew === "string" ? rawNew.trim() : rawNew;
    if (!password || String(password).length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters",
      });
    }
    const updated = await BoardMember.update(id, { password });
    if (!updated)
      return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, message: "Password updated" });
  } catch (error) {
    console.error("Change board member password error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to change password" });
  }
});

// Soft delete
router.delete("/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const reason = req.body?.reason || req.query?.reason || null;
    const deleted = await BoardMember.delete(id, reason);
    if (!deleted)
      return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, data: deleted });
  } catch (error) {
    console.error("Delete board member error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to delete board member" });
  }
});

// Self-service: get my profile (board)
router.get("/me", async (req, res) => {
  try {
    const id = req.user?.id || Number(req.query.id);
    if (!id)
      return res
        .status(400)
        .json({ success: false, message: "Missing user id" });
    const me = await BoardMember.getById(id);
    if (!me)
      return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, data: me });
  } catch (error) {
    console.error("Get my board profile error:", error);
    res.status(500).json({ success: false, message: "Failed to get profile" });
  }
});

// Self-service: update my profile (email/phone)
router.put("/me", async (req, res) => {
  try {
    const id = req.user?.id || Number(req.body?.id);
    if (!id)
      return res
        .status(400)
        .json({ success: false, message: "Missing user id" });
    const update = {
      email: req.body?.email,
      phone_number: req.body?.phone_number,
      first_name: req.body?.first_name,
      last_name: req.body?.last_name,
    };
    const updated = await BoardMember.update(id, update);
    if (!updated)
      return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, data: updated });
  } catch (error) {
    console.error("Update my board profile error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to update profile" });
  }
});

// Self-service: change my password
router.put("/me/change-password", async (req, res) => {
  try {
    const id = req.user?.id || Number(req.body?.id);
    const { current_password } = req.body || {};
    const rawNew = req.body?.new_password ?? req.body?.password;
    const new_password = typeof rawNew === "string" ? rawNew.trim() : rawNew;
    if (!id)
      return res
        .status(400)
        .json({ success: false, message: "Missing user id" });
    if (!new_password || String(new_password).length < 8) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 8 characters",
      });
    }
    // Optionally verify current password
    if (current_password) {
      const me = await BoardMember.getById(id);
      const ok = await BoardMember.comparePassword(
        current_password,
        me.password
      );
      if (!ok)
        return res
          .status(400)
          .json({ success: false, message: "Current password is incorrect" });
    }
    await BoardMember.update(id, { password: new_password });
    res.json({ success: true, message: "Password changed successfully" });
  } catch (error) {
    console.error("Change my board password error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to change password" });
  }
});

module.exports = router;

// =================== PHOTO UPLOAD (mirrors employee upload) ===================
const bmUploadsDir = path.join(__dirname, "..", "uploads", "board-photos");
if (!fs.existsSync(bmUploadsDir)) {
  fs.mkdirSync(bmUploadsDir, { recursive: true });
}

const bmStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, bmUploadsDir);
  },
  filename: function (req, file, cb) {
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    const base = path
      .basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9_-]/g, "");
    cb(null, `board-${timestamp}-${base}${ext}`);
  },
});

const bmUpload = multer({
  storage: bmStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image uploads are allowed"));
    }
    cb(null, true);
  },
});

// Upload board member profile picture
router.post("/me/upload-photo", bmUpload.single("photo"), async (req, res) => {
  try {
    const id = req.user?.id || Number(req.body?.id) || Number(req.query?.id);
    if (!id) {
      return res
        .status(400)
        .json({ success: false, message: "Missing user id" });
    }
    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: "No photo file uploaded" });
    }

    const photoUrl = `/uploads/board-photos/${req.file.filename}`;

    const { db } = require("../config/database");
    try {
      await db("board_members").where("id", id).update({
        photo_url: photoUrl,
        updated_at: db.fn.now(),
      });
    } catch (err) {
      // If column doesn't exist, add it on the fly then retry
      if (
        String(err?.code) === "42703" ||
        /column \"photo_url\"/.test(err?.message || "")
      ) {
        await db.schema.alterTable("board_members", (table) => {
          table.string("photo_url", 512).nullable();
        });
        await db("board_members").where("id", id).update({
          photo_url: photoUrl,
          updated_at: db.fn.now(),
        });
      } else {
        throw err;
      }
    }

    res.json({
      success: true,
      message: "Profile photo updated successfully",
      data: { photo_url: photoUrl },
    });
  } catch (error) {
    console.error("Board photo upload error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to upload profile photo",
    });
  }
});
