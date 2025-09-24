const express = require("express");
const router = express.Router();
const { db } = require("../config/database");
const { authenticateToken } = require("../middleware/rbac");

// Get all shift types
router.get("/", authenticateToken, async (req, res) => {
  try {
    const shiftTypes = await db("shift_types")
      .select("*")
      .where("is_active", true)
      .orderBy("start_time", "asc");

    res.json({
      success: true,
      data: shiftTypes,
    });
  } catch (error) {
    console.error("Error fetching shift types:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch shift types",
      error: error.message,
    });
  }
});

// Create new shift type
router.post("/", authenticateToken, async (req, res) => {
  try {
    const {
      name,
      start_time,
      end_time,
      color_class = "bg-gray-100 text-gray-800",
      description = "",
    } = req.body;

    // Validation
    if (!name || !start_time || !end_time) {
      return res.status(400).json({
        success: false,
        message: "Name, start_time, and end_time are required",
      });
    }

    // Check if shift type name already exists
    const existingShift = await db("shift_types")
      .where("name", name)
      .where("is_active", true)
      .first();

    if (existingShift) {
      return res.status(409).json({
        success: false,
        message: "Shift type with this name already exists",
        code: "DUPLICATE_SHIFT_NAME",
      });
    }

    const newShiftType = {
      name,
      start_time,
      end_time,
      color_class,
      description,
      is_active: true,
      created_at: db.fn.now(),
      updated_at: db.fn.now(),
    };

    const [created] = await db("shift_types")
      .insert(newShiftType)
      .returning("*");

    res.status(201).json({
      success: true,
      data: created,
      message: "Shift type created successfully",
    });
  } catch (error) {
    console.error("Error creating shift type:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create shift type",
      error: error.message,
    });
  }
});

// Update shift type
router.put("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, start_time, end_time, color_class, description } = req.body;

    // Check if shift type exists
    const existingShift = await db("shift_types")
      .where("id", id)
      .where("is_active", true)
      .first();

    if (!existingShift) {
      return res.status(404).json({
        success: false,
        message: "Shift type not found",
      });
    }

    // Check if name already exists (excluding current record)
    if (name && name !== existingShift.name) {
      const duplicateShift = await db("shift_types")
        .where("name", name)
        .where("is_active", true)
        .where("id", "!=", id)
        .first();

      if (duplicateShift) {
        return res.status(409).json({
          success: false,
          message: "Shift type with this name already exists",
          code: "DUPLICATE_SHIFT_NAME",
        });
      }
    }

    const updateData = {
      updated_at: db.fn.now(),
    };

    if (name) updateData.name = name;
    if (start_time) updateData.start_time = start_time;
    if (end_time) updateData.end_time = end_time;
    if (color_class) updateData.color_class = color_class;
    if (description !== undefined) updateData.description = description;

    const [updated] = await db("shift_types")
      .where("id", id)
      .update(updateData)
      .returning("*");

    res.json({
      success: true,
      data: updated,
      message: "Shift type updated successfully",
    });
  } catch (error) {
    console.error("Error updating shift type:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update shift type",
      error: error.message,
    });
  }
});

// Delete shift type (soft delete)
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if shift type exists
    const existingShift = await db("shift_types")
      .where("id", id)
      .where("is_active", true)
      .first();

    if (!existingShift) {
      return res.status(404).json({
        success: false,
        message: "Shift type not found",
      });
    }

    // Check if shift type is being used in employee schedules
    const schedulesUsingShift = await db("employee_schedules")
      .where("shift_name", existingShift.name)
      .where("is_active", true)
      .first();

    if (schedulesUsingShift) {
      return res.status(409).json({
        success: false,
        message:
          "Cannot delete shift type that is currently being used in employee schedules",
        code: "SHIFT_IN_USE",
      });
    }

    // Soft delete by setting is_active to false
    await db("shift_types").where("id", id).update({
      is_active: false,
      updated_at: db.fn.now(),
    });

    res.json({
      success: true,
      message: "Shift type deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting shift type:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete shift type",
      error: error.message,
    });
  }
});

// Get shift type by ID
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const shiftType = await db("shift_types")
      .where("id", id)
      .where("is_active", true)
      .first();

    if (!shiftType) {
      return res.status(404).json({
        success: false,
        message: "Shift type not found",
      });
    }

    res.json({
      success: true,
      data: shiftType,
    });
  } catch (error) {
    console.error("Error fetching shift type:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch shift type",
      error: error.message,
    });
  }
});

module.exports = router;
