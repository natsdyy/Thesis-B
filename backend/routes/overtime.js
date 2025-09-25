const express = require("express");
const router = express.Router();
const {
  authenticateToken,
  requireAnyPermission,
} = require("../middleware/rbac");
const OvertimeRequest = require("../models/OvertimeRequest");
const EmployeeScheduleService = require("../services/EmployeeScheduleService");

function normalizeYMD(value) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const str = String(value);
  const m = str.match(/\d{4}-\d{2}-\d{2}/);
  return m ? m[0] : null;
}

async function applyApprovedOTToAttendance(_db, employeeId, otDate) {
  // Robust normalization to YYYY-MM-DD regardless of TZ/app client
  const dateStr = normalizeYMD(otDate);
  if (!dateStr) return;

  // Sum approved OT hours for this employee and date
  const { db: knex } = require("../config/database");
  const [{ total }] = await knex("overtime_requests")
    .where({ employee_id: employeeId, status: "approved" })
    .andWhere("ot_date", "=", dateStr)
    .sum({ total: knex.raw("COALESCE(total_hours, 0)") });

  const approvedHours = Number(total || 0);

  // Update the attendance record on that local calendar day; if none, create a stub
  const existing = await knex("attendance_records")
    .where("employee_id", employeeId)
    .andWhere((qb) => {
      qb.whereRaw("DATE(created_at) = ?", [dateStr]).orWhereRaw(
        "DATE(COALESCE(time_in, created_at)) = ?",
        [dateStr]
      );
    })
    .first();

  if (existing) {
    await knex("attendance_records")
      .where({ id: existing.id })
      .update({
        overtime_hours: approvedHours.toFixed(2),
        is_overtime: approvedHours > 0,
        updated_at: knex.fn.now(),
      });
  } else {
    await knex("attendance_records").insert({
      employee_id: employeeId,
      overtime_hours: approvedHours.toFixed(2),
      is_overtime: approvedHours > 0,
      status: "present",
      created_at: new Date(`${dateStr}T00:00:00`),
      updated_at: knex.fn.now(),
    });
  }
}

// Safer variant: fetch request using to_char to avoid DATE→JS TZ shift
async function applyApprovedOTToAttendanceByRequestId(requestId) {
  const { db: knex } = require("../config/database");
  const row = await knex("overtime_requests as ot")
    .select(
      "ot.employee_id",
      knex.raw("to_char(ot.ot_date, 'YYYY-MM-DD') as ot_date")
    )
    .where("ot.id", requestId)
    .first();
  if (!row) return;
  await applyApprovedOTToAttendance(null, row.employee_id, row.ot_date);
}

/**
 * @swagger
 * tags:
 *   name: Overtime
 *   description: Overtime request management
 */

/**
 * @swagger
 * /api/overtime:
 *   post:
 *     summary: Submit a new overtime request
 *     tags: [Overtime]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [ot_date, start_time, end_time, total_hours]
 *             properties:
 *               ot_date:
 *                 type: string
 *                 format: date
 *               start_time:
 *                 type: string
 *                 example: "18:00"
 *               end_time:
 *                 type: string
 *                 example: "21:00"
 *               total_hours:
 *                 type: number
 *               reason:
 *                 type: string
 *     responses:
 *       201:
 *         description: Overtime request submitted
 */
router.post("/", authenticateToken, async (req, res) => {
  try {
    const employeeId = req.user.id;
    const { ot_date, start_time, end_time, total_hours, reason } = req.body;

    if (
      !ot_date ||
      !start_time ||
      !end_time ||
      typeof total_hours === "undefined"
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields" });
    }

    // Validate against employee schedule: OT must start at or after scheduled end time
    const schedule = await EmployeeScheduleService.getEmployeeScheduleForDate(
      employeeId,
      ot_date
    );

    if (!schedule || !schedule.end_time) {
      return res.status(400).json({
        success: false,
        message:
          "No active schedule found for the selected date. OT requires a valid schedule.",
      });
    }

    // Build Date objects considering possible overnight shifts
    const baseDateStr = ot_date; // YYYY-MM-DD
    const schedStart = new Date(`${baseDateStr}T${schedule.start_time}`);
    let schedEnd = new Date(`${baseDateStr}T${schedule.end_time}`);
    if (schedEnd <= schedStart) {
      // Overnight shift ends next day
      schedEnd.setDate(schedEnd.getDate() + 1);
    }

    const reqStart = new Date(`${baseDateStr}T${start_time}`);
    let reqEnd = new Date(`${baseDateStr}T${end_time}`);
    if (reqEnd <= reqStart) {
      // Support OT that passes midnight
      reqEnd.setDate(reqEnd.getDate() + 1);
    }

    // Compute effective OT only from schedule end onwards
    const effectiveStart = reqStart < schedEnd ? schedEnd : reqStart;
    const effectiveMs = Math.max(0, reqEnd - effectiveStart);
    const computedHours = effectiveMs / (1000 * 60 * 60);

    if (computedHours <= 0) {
      return res.status(400).json({
        success: false,
        message: `OT must start at or after your scheduled end time (${schedule.end_time}).`,
      });
    }

    const created = await OvertimeRequest.create(
      {
        employee_id: employeeId,
        ot_date,
        start_time,
        end_time,
        total_hours: Math.round(computedHours * 100) / 100,
        reason,
      },
      employeeId
    );

    res.status(201).json({
      success: true,
      data: created,
      message: "Overtime request submitted",
    });
  } catch (error) {
    console.error("Error submitting overtime:", error);
    res.status(500).json({
      success: false,
      message: "Error submitting overtime",
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/overtime/mine:
 *   get:
 *     summary: List my overtime requests
 *     tags: [Overtime]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of requests
 */
router.get("/mine", authenticateToken, async (req, res) => {
  try {
    const employeeId = req.user.id;
    const page = parseInt(req.query.page || "1");
    const limit = parseInt(req.query.limit || "20");
    const rows = await OvertimeRequest.getMine(employeeId, { page, limit });
    res.json({ success: true, data: rows, count: rows.length });
  } catch (error) {
    console.error("Error fetching my overtime:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching my overtime",
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/overtime:
 *   get:
 *     summary: List overtime requests (managers)
 *     tags: [Overtime]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, approved, rejected]
 *       - in: query
 *         name: branch_id
 *         schema:
 *           type: integer
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of requests
 */
router.get(
  "/",
  authenticateToken,
  // Allow Managers by role, otherwise require permissions
  (req, res, next) => {
    const user = req.user || {};
    const roleName = (user.role || "").toLowerCase();
    if (roleName.includes("manager")) {
      return next();
    }
    return requireAnyPermission([
      "manage_overtime",
      "manage_employees",
      "manage_attendance",
    ])(req, res, next);
  },
  async (req, res) => {
    try {
      const { status, branch_id } = req.query;
      const page = parseInt(req.query.page || "1");
      const limit = parseInt(req.query.limit || "50");
      const rows = await OvertimeRequest.getAll({
        status,
        branch_id,
        page,
        limit,
      });
      res.json({ success: true, data: rows, count: rows.length });
    } catch (error) {
      console.error("Error fetching overtime list:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching overtime list",
        error: error.message,
      });
    }
  }
);

/**
 * @swagger
 * /api/overtime/{id}/approve:
 *   post:
 *     summary: Approve overtime request
 *     tags: [Overtime]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Approved request
 */
router.post(
  "/:id/approve",
  authenticateToken,
  (req, res, next) => {
    const user = req.user || {};
    const roleName = (user.role || "").toLowerCase();
    if (roleName.includes("manager")) {
      return next();
    }
    return requireAnyPermission([
      "manage_overtime",
      "manage_employees",
      "manage_attendance",
    ])(req, res, next);
  },
  async (req, res) => {
    try {
      const { id } = req.params;
      const notes = req.body?.notes || null;
      const approverId = req.user.id;
      const updated = await OvertimeRequest.approve(id, approverId, notes);

      // Reflect approved OT into attendance record's overtime fields
      if (updated) {
        try {
          await applyApprovedOTToAttendanceByRequestId(updated.id);
        } catch (e) {
          console.error(
            "Failed to apply approved OT to attendance:",
            e.message
          );
        }
      }
      res.json({ success: true, data: updated, message: "Overtime approved" });
    } catch (error) {
      console.error("Error approving overtime:", error);
      res.status(500).json({
        success: false,
        message: "Error approving overtime",
        error: error.message,
      });
    }
  }
);

/**
 * @swagger
 * /api/overtime/{id}/reject:
 *   post:
 *     summary: Reject overtime request
 *     tags: [Overtime]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Rejected request
 */
router.post(
  "/:id/reject",
  authenticateToken,
  (req, res, next) => {
    const user = req.user || {};
    const roleName = (user.role || "").toLowerCase();
    if (roleName.includes("manager")) {
      return next();
    }
    return requireAnyPermission([
      "manage_overtime",
      "manage_employees",
      "manage_attendance",
    ])(req, res, next);
  },
  async (req, res) => {
    try {
      const { id } = req.params;
      const notes = req.body?.notes || null;
      const approverId = req.user.id;
      const updated = await OvertimeRequest.reject(id, approverId, notes);

      // Recalculate approved OT sum and update attendance
      if (updated) {
        try {
          await applyApprovedOTToAttendanceByRequestId(updated.id);
        } catch (e) {
          console.error(
            "Failed to update attendance after OT rejection:",
            e.message
          );
        }
      }
      res.json({ success: true, data: updated, message: "Overtime rejected" });
    } catch (error) {
      console.error("Error rejecting overtime:", error);
      res.status(500).json({
        success: false,
        message: "Error rejecting overtime",
        error: error.message,
      });
    }
  }
);

module.exports = router;
