const express = require("express");
const router = express.Router();
const OrgChartPosition = require("../models/OrgChartPosition");

// Simple role guard helper
function allowWrite(role) {
  return (
    role === "Super Admin" ||
    role === "Chairman of the Board" ||
    role === "Board of Directors"
  );
}

// List org chart
router.get("/", async (req, res) => {
  try {
    const rows = await OrgChartPosition.list();
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error("OrgChart list error", err);
    res
      .status(500)
      .json({ success: false, message: "Failed to load org chart" });
  }
});

// Create node
router.post("/", async (req, res) => {
  try {
    const role = req.user?.role || req.body?.role; // fallback for environments without auth middleware
    if (!allowWrite(role)) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }
    const node = await OrgChartPosition.create({
      ...req.body,
      created_by: req.user?.id || null,
    });
    res.json({ success: true, data: node });
  } catch (err) {
    console.error("OrgChart create error", err);
    res.status(500).json({ success: false, message: "Failed to create node" });
  }
});

// Update node
router.put("/:id", async (req, res) => {
  try {
    const role = req.user?.role || req.body?.role;
    if (!allowWrite(role)) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }
    const node = await OrgChartPosition.update(req.params.id, {
      ...req.body,
      updated_by: req.user?.id || null,
    });
    if (!node)
      return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, data: node });
  } catch (err) {
    console.error("OrgChart update error", err);
    res.status(500).json({ success: false, message: "Failed to update node" });
  }
});

// Delete node
router.delete("/:id", async (req, res) => {
  try {
    const role = req.user?.role || req.body?.role;
    if (!allowWrite(role)) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }
    const node = await OrgChartPosition.remove(
      req.params.id,
      req.user?.id || null
    );
    if (!node)
      return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, data: node });
  } catch (err) {
    console.error("OrgChart delete error", err);
    res.status(500).json({ success: false, message: "Failed to delete node" });
  }
});

module.exports = router;
