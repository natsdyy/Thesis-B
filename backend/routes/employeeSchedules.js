const express = require("express");
const router = express.Router();
const { db } = require("../config/database");
const { authenticateToken } = require("../middleware/rbac");

// Get employee schedules for a specific branch and date range, or department employees
router.get("/", authenticateToken, async (req, res) => {
  try {
    const {
      branch_id,
      start_date,
      end_date,
      employee_id,
      department_employees,
    } = req.query;

    let query = db("employee_schedules as es")
      .select(
        "es.id",
        "es.employee_id",
        "es.branch_id",
        "es.schedule_date",
        "es.shift_name",
        "es.start_time",
        "es.end_time",
        "es.notes",
        "es.is_active",
        "es.created_at",
        "es.updated_at",
        "e.first_name",
        "e.last_name",
        "e.email",
        "ur.role"
      )
      .leftJoin("employees as e", "es.employee_id", "e.id")
      .leftJoin("user_roles as ur", "e.role_id", "ur.role_id")
      .where("es.is_active", true);

    // Handle department employees (no branch_id) or branch employees
    if (department_employees === "true") {
      // For department employees, get schedules where branch_id is null
      query = query.whereNull("es.branch_id");
    } else {
      // For branch employees, require branch_id
      if (!branch_id) {
        return res.status(400).json({
          success: false,
          message: "Branch ID is required for branch employees",
        });
      }
      // Include department-level schedules (es.branch_id IS NULL) so employees see assignments made at department scope
      query = query.andWhere(function () {
        this.where("es.branch_id", branch_id).orWhereNull("es.branch_id");
      });
    }

    // Filter by date range if provided
    if (start_date) {
      query = query.where("es.schedule_date", ">=", start_date);
    }
    if (end_date) {
      query = query.where("es.schedule_date", "<=", end_date);
    }

    // Filter by specific employee if provided
    if (employee_id) {
      query = query.where("es.employee_id", employee_id);
    }

    const schedules = await query.orderBy(["es.schedule_date", "e.first_name"]);

    // Group schedules by employee and date for easier frontend consumption
    const groupedSchedules = {};
    schedules.forEach((schedule) => {
      // Format schedule_date to avoid timezone issues
      let formattedScheduleDate = schedule.schedule_date;
      if (schedule.schedule_date instanceof Date) {
        // If it's a Date object, format it to YYYY-MM-DD in local time
        const year = schedule.schedule_date.getFullYear();
        const month = (schedule.schedule_date.getMonth() + 1)
          .toString()
          .padStart(2, "0");
        const day = schedule.schedule_date
          .getDate()
          .toString()
          .padStart(2, "0");
        formattedScheduleDate = `${year}-${month}-${day}`;
      } else if (typeof schedule.schedule_date === "string") {
        // If it's already a string, ensure it's just the date part
        formattedScheduleDate = schedule.schedule_date.split("T")[0];
      }

      const key = `${schedule.employee_id}_${formattedScheduleDate}`;
      groupedSchedules[key] = {
        id: schedule.id,
        employee_id: schedule.employee_id,
        employee_name: `${schedule.first_name} ${schedule.last_name}`,
        employee_role: schedule.role,
        employee_email: schedule.email,
        branch_id: schedule.branch_id,
        schedule_date: formattedScheduleDate,
        shift_name: schedule.shift_name,
        start_time: schedule.start_time,
        end_time: schedule.end_time,
        notes: schedule.notes,
        is_active: schedule.is_active,
        created_at: schedule.created_at,
        updated_at: schedule.updated_at,
      };
    });

    res.json({
      success: true,
      data: Object.values(groupedSchedules),
      total: schedules.length,
    });
  } catch (error) {
    console.error("Error fetching employee schedules:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch employee schedules",
      error: error.message,
    });
  }
});

// Create employee schedule
router.post("/", authenticateToken, async (req, res) => {
  try {
    const {
      employee_id,
      branch_id,
      schedule_date,
      shift_name,
      start_time,
      end_time,
      notes = "",
    } = req.body;

    // Validation - branch_id is optional for department employees
    if (
      !employee_id ||
      !schedule_date ||
      !shift_name ||
      !start_time ||
      !end_time
    ) {
      return res.status(400).json({
        success: false,
        message:
          "employee_id, schedule_date, shift_name, start_time, and end_time are required",
      });
    }

    // Get employee details
    const employee = await db("employees").where("id", employee_id).first();

    if (!employee) {
      return res.status(400).json({
        success: false,
        message: "Employee not found",
      });
    }

    // Check if this is a department employee (no branch_id) or branch employee
    const isDepartmentEmployee = !employee.branch_id || !branch_id;

    if (!isDepartmentEmployee) {
      // For branch employees, verify they belong to the specified branch
      if (employee.branch_id !== branch_id) {
        return res.status(400).json({
          success: false,
          message: "Employee not found in this branch",
        });
      }
    }

    // Check if schedule already exists for this employee on this date
    const existingSchedule = await db("employee_schedules")
      .where("employee_id", employee_id)
      .where("schedule_date", schedule_date)
      .where("is_active", true)
      .first();

    if (existingSchedule) {
      return res.status(409).json({
        success: false,
        message: "Schedule already exists for this employee on this date",
        code: "DUPLICATE_SCHEDULE",
      });
    }

    // No automatic day-off restrictions - all days are working days
    // Day Off is now handled as a shift type that can be assigned

    const newSchedule = {
      employee_id,
      branch_id: isDepartmentEmployee ? null : branch_id,
      schedule_date,
      shift_name,
      start_time,
      end_time,
      notes,
      is_active: true,
      created_at: db.fn.now(),
      updated_at: db.fn.now(),
    };

    const [created] = await db("employee_schedules")
      .insert(newSchedule)
      .returning("*");

    // Fetch employee details for response
    const scheduleWithEmployee = await db("employee_schedules as es")
      .select("es.*", "e.first_name", "e.last_name", "e.email", "ur.role")
      .leftJoin("employees as e", "es.employee_id", "e.id")
      .leftJoin("user_roles as ur", "e.role_id", "ur.role_id")
      .where("es.id", created.id)
      .first();

    // Format schedule_date to avoid timezone issues
    let formattedScheduleDate = scheduleWithEmployee.schedule_date;
    if (scheduleWithEmployee.schedule_date instanceof Date) {
      const year = scheduleWithEmployee.schedule_date.getFullYear();
      const month = (scheduleWithEmployee.schedule_date.getMonth() + 1)
        .toString()
        .padStart(2, "0");
      const day = scheduleWithEmployee.schedule_date
        .getDate()
        .toString()
        .padStart(2, "0");
      formattedScheduleDate = `${year}-${month}-${day}`;
    } else if (typeof scheduleWithEmployee.schedule_date === "string") {
      formattedScheduleDate = scheduleWithEmployee.schedule_date.split("T")[0];
    }

    res.status(201).json({
      success: true,
      data: {
        ...scheduleWithEmployee,
        schedule_date: formattedScheduleDate,
        employee_name: `${scheduleWithEmployee.first_name} ${scheduleWithEmployee.last_name}`,
      },
      message: "Employee schedule created successfully",
    });
  } catch (error) {
    console.error("Error creating employee schedule:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create employee schedule",
      error: error.message,
    });
  }
});

// Update employee schedule
router.put("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { shift_name, start_time, end_time, notes } = req.body;

    // Check if schedule exists
    const existingSchedule = await db("employee_schedules")
      .where("id", id)
      .where("is_active", true)
      .first();

    if (!existingSchedule) {
      return res.status(404).json({
        success: false,
        message: "Employee schedule not found",
      });
    }

    // No automatic day-off restrictions - all days are working days

    const updateData = {
      updated_at: db.fn.now(),
    };

    if (shift_name) updateData.shift_name = shift_name;
    if (start_time) updateData.start_time = start_time;
    if (end_time) updateData.end_time = end_time;
    if (notes !== undefined) updateData.notes = notes;

    const [updated] = await db("employee_schedules")
      .where("id", id)
      .update(updateData)
      .returning("*");

    // Fetch employee details for response
    const scheduleWithEmployee = await db("employee_schedules as es")
      .select("es.*", "e.first_name", "e.last_name", "e.email", "ur.role")
      .leftJoin("employees as e", "es.employee_id", "e.id")
      .leftJoin("user_roles as ur", "e.role_id", "ur.role_id")
      .where("es.id", updated.id)
      .first();

    // Format schedule_date to avoid timezone issues
    let formattedScheduleDate = scheduleWithEmployee.schedule_date;
    if (scheduleWithEmployee.schedule_date instanceof Date) {
      const year = scheduleWithEmployee.schedule_date.getFullYear();
      const month = (scheduleWithEmployee.schedule_date.getMonth() + 1)
        .toString()
        .padStart(2, "0");
      const day = scheduleWithEmployee.schedule_date
        .getDate()
        .toString()
        .padStart(2, "0");
      formattedScheduleDate = `${year}-${month}-${day}`;
    } else if (typeof scheduleWithEmployee.schedule_date === "string") {
      formattedScheduleDate = scheduleWithEmployee.schedule_date.split("T")[0];
    }

    res.json({
      success: true,
      data: {
        ...scheduleWithEmployee,
        schedule_date: formattedScheduleDate,
        employee_name: `${scheduleWithEmployee.first_name} ${scheduleWithEmployee.last_name}`,
      },
      message: "Employee schedule updated successfully",
    });
  } catch (error) {
    console.error("Error updating employee schedule:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update employee schedule",
      error: error.message,
    });
  }
});

// Delete employee schedule (soft delete by setting is_active to false)
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if schedule exists
    const existingSchedule = await db("employee_schedules")
      .where("id", id)
      .where("is_active", true)
      .first();

    if (!existingSchedule) {
      return res.status(404).json({
        success: false,
        message: "Employee schedule not found",
      });
    }

    // No automatic day-off restrictions - all days are working days

    // Soft delete by setting is_active to false
    await db("employee_schedules").where("id", id).update({
      is_active: false,
      updated_at: db.fn.now(),
    });

    res.json({
      success: true,
      message: "Employee schedule removed successfully",
    });
  } catch (error) {
    console.error("Error deleting employee schedule:", error);
    res.status(500).json({
      success: false,
      message: "Failed to remove employee schedule",
      error: error.message,
    });
  }
});

// Get available shift types
router.get("/shift-types", authenticateToken, async (req, res) => {
  try {
    const shiftTypes = await db("shift_types")
      .select("*")
      .where("is_active", true)
      .orderBy("start_time", "asc");

    // Transform the data to match the expected format
    const formattedShiftTypes = shiftTypes.map((shift) => ({
      id: shift.id,
      name: shift.name,
      start_time: shift.start_time,
      end_time: shift.end_time,
      color: shift.color_class,
    }));

    res.json({
      success: true,
      data: formattedShiftTypes,
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

module.exports = router;
