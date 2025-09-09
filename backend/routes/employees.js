const express = require("express");
const router = express.Router();
const Employee = require("../models/Employee");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { authenticateToken } = require("../middleware/rbac");

/**
 * @swagger
 * /api/employees:
 *   get:
 *     summary: Get all employees
 *     tags: [Employees]
 *     parameters:
 *       - in: query
 *         name: includeDeleted
 *         schema:
 *           type: boolean
 *         description: Include deleted employees
 *       - in: query
 *         name: department
 *         schema:
 *           type: string
 *         description: Filter by department
 *     responses:
 *       200:
 *         description: Employees retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Employee'
 *                 count:
 *                   type: integer
 */
router.get("/", async (req, res) => {
  try {
    const { includeDeleted, department, page = 1, limit = 10 } = req.query;

    let result;
    if (department) {
      result = await Employee.getByDepartment(
        department,
        includeDeleted === "true",
        parseInt(page),
        parseInt(limit)
      );
    } else {
      result = await Employee.getAll(
        includeDeleted === "true",
        parseInt(page),
        parseInt(limit)
      );
    }

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
      count: result.data.length,
    });
  } catch (error) {
    console.error("Error fetching employees:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching employees",
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/employees/stats:
 *   get:
 *     summary: Get employee statistics
 *     tags: [Employees]
 *     responses:
 *       200:
 *         description: Employee statistics retrieved successfully
 */
router.get("/stats", async (req, res) => {
  try {
    const stats = await Employee.getStats();
    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Error fetching employee stats:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching employee statistics",
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/employees/departments-with-roles:
 *   get:
 *     summary: Get all departments with their available roles
 *     tags: [Employees]
 *     responses:
 *       200:
 *         description: Departments with roles retrieved successfully
 */
router.get("/departments-with-roles", async (req, res) => {
  try {
    const departmentsWithRoles = await Employee.getDepartmentsWithRoles();
    res.json({
      success: true,
      data: departmentsWithRoles,
    });
  } catch (error) {
    console.error("Error fetching departments with roles:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching departments with roles",
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/employees/roles/{department}:
 *   get:
 *     summary: Get roles for a specific department
 *     tags: [Employees]
 *     parameters:
 *       - in: path
 *         name: department
 *         required: true
 *         schema:
 *           type: string
 *         description: Department name
 *     responses:
 *       200:
 *         description: Department roles retrieved successfully
 */
router.get("/roles/:department", async (req, res) => {
  try {
    const { department } = req.params;
    const roles = await Employee.getRolesByDepartment(department);
    res.json({
      success: true,
      data: roles,
    });
  } catch (error) {
    console.error("Error fetching department roles:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching department roles",
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/employees/{id}:
 *   get:
 *     summary: Get employee by ID
 *     tags: [Employees]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Employee ID
 *     responses:
 *       200:
 *         description: Employee retrieved successfully
 *       404:
 *         description: Employee not found
 */
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const employee = await Employee.getById(id);

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    res.json({
      success: true,
      data: employee,
    });
  } catch (error) {
    console.error("Error fetching employee:", error);

    if (error.message === "Invalid employee ID provided") {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: "Error fetching employee",
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/employees/employee-id/{employeeId}:
 *   get:
 *     summary: Get employee by employee ID
 *     tags: [Employees]
 *     parameters:
 *       - in: path
 *         name: employeeId
 *         required: true
 *         schema:
 *           type: string
 *         description: Employee ID (e.g., EMP000001)
 *     responses:
 *       200:
 *         description: Employee retrieved successfully
 *       404:
 *         description: Employee not found
 */
router.get("/employee-id/:employeeId", async (req, res) => {
  try {
    const { employeeId } = req.params;
    const employee = await Employee.getByEmployeeId(employeeId);

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    res.json({
      success: true,
      data: employee,
    });
  } catch (error) {
    console.error("Error fetching employee by employee ID:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching employee",
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/employees:
 *   post:
 *     summary: Create new employee
 *     tags: [Employees]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/EmployeeInput'
 *     responses:
 *       201:
 *         description: Employee created successfully
 *       400:
 *         description: Validation error
 */
router.post("/", authenticateToken, async (req, res) => {
  try {
    const employeeData = req.body;

    // Get current user ID from request (assuming authentication middleware sets req.user)
    const createdBy = req.user?.id || null;

    const newEmployee = await Employee.create(employeeData, createdBy);

    res.status(201).json({
      success: true,
      data: newEmployee,
      message: "Employee created successfully",
    });
  } catch (error) {
    console.error("Error creating employee:", error);

    if (
      error.message.includes("Validation failed") ||
      error.message.includes("already exists")
    ) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: "Error creating employee",
      error: error.message,
    });
  }
});

// =================== PHOTO UPLOAD (similar to menu upload) ===================
const uploadsDir = path.join(__dirname, "..", "uploads", "employee-photos");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    const base = path
      .basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9_-]/g, "");
    cb(null, `employee-${timestamp}-${base}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image uploads are allowed"));
    }
    cb(null, true);
  },
});

// Upload photo and create employee in one request
router.post(
  "/upload",
  authenticateToken,
  upload.single("photo"),
  async (req, res) => {
    try {
      const photoUrl = req.file
        ? `/uploads/employee-photos/${req.file.filename}`
        : null;

      const payload = req.body || {};
      const createdBy = req.user?.id || null;

      const employee = await Employee.create(
        { ...payload, photo_url: photoUrl },
        createdBy
      );

      res.status(201).json({
        success: true,
        data: employee,
        message: "Employee created with photo successfully",
      });
    } catch (error) {
      console.error("Error uploading photo or creating employee:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to upload photo/create employee",
      });
    }
  }
);

/**
 * @swagger
 * /api/employees/{id}:
 *   put:
 *     summary: Update employee
 *     tags: [Employees]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Employee ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/EmployeeInput'
 *     responses:
 *       200:
 *         description: Employee updated successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: Employee not found
 */
router.put("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const employeeData = req.body;

    // Get current user ID from request
    const updatedBy = req.user?.id || null;

    const updatedEmployee = await Employee.update(id, employeeData, updatedBy);

    if (!updatedEmployee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    res.json({
      success: true,
      data: updatedEmployee,
      message: "Employee updated successfully",
    });
  } catch (error) {
    console.error("Error updating employee:", error);

    if (
      error.message.includes("Invalid employee ID") ||
      error.message === "Employee not found"
    ) {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }

    if (
      error.message.includes("Validation failed") ||
      error.message.includes("already exists") ||
      error.message.includes("Cannot update")
    ) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: "Error updating employee",
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/employees/{id}/status:
 *   patch:
 *     summary: Update employee status
 *     tags: [Employees]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Employee ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [Active, Inactive, Terminated, On Leave]
 *     responses:
 *       200:
 *         description: Employee status updated successfully
 *       400:
 *         description: Invalid status
 *       404:
 *         description: Employee not found
 */
router.patch("/:id/status", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Status is required",
      });
    }

    const updatedBy = req.user?.id || null;
    const employee = await Employee.updateStatus(id, status, updatedBy);

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    res.json({
      success: true,
      data: employee,
      message: "Employee status updated successfully",
    });
  } catch (error) {
    console.error("Error updating employee status:", error);

    if (
      error.message.includes("Invalid") ||
      error.message === "Employee not found"
    ) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: "Error updating employee status",
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/employees/{id}:
 *   delete:
 *     summary: Soft delete employee
 *     tags: [Employees]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Employee ID
 *     responses:
 *       200:
 *         description: Employee deleted successfully
 *       404:
 *         description: Employee not found
 */
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const deletedBy = req.user?.id || null;
    const employee = await Employee.delete(id, deletedBy);

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    res.json({
      success: true,
      data: employee,
      message: "Employee deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting employee:", error);

    if (
      error.message.includes("Invalid") ||
      error.message === "Employee not found" ||
      error.message.includes("already deleted")
    ) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: "Error deleting employee",
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/employees/{id}/restore:
 *   patch:
 *     summary: Restore soft deleted employee
 *     tags: [Employees]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Employee ID
 *     responses:
 *       200:
 *         description: Employee restored successfully
 *       400:
 *         description: Employee cannot be restored
 *       404:
 *         description: Employee not found
 */
router.patch("/:id/restore", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const restoredBy = req.user?.id || null;
    const employee = await Employee.restore(id, restoredBy);

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    res.json({
      success: true,
      data: employee,
      message: "Employee restored successfully",
    });
  } catch (error) {
    console.error("Error restoring employee:", error);

    if (
      error.message.includes("Invalid") ||
      error.message === "Employee not found" ||
      error.message.includes("cannot be restored")
    ) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: "Error restoring employee",
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/employees/{id}/terminate:
 *   post:
 *     summary: Terminate employee with comprehensive details
 *     tags: [Employees]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Employee ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - termination_reason
 *               - last_working_day
 *             properties:
 *               termination_reason:
 *                 type: string
 *                 enum: [Resignation, Performance Issues, Misconduct, End of Contract, Company Restructuring, Health Issues, Other]
 *               last_working_day:
 *                 type: string
 *                 format: date
 *               handover_notes:
 *                 type: string
 *               final_payroll_processed:
 *                 type: boolean
 *                 default: false
 *               system_access_revoked:
 *                 type: boolean
 *                 default: false
 *     responses:
 *       200:
 *         description: Employee terminated successfully
 *       400:
 *         description: Validation error or employee already terminated
 *       404:
 *         description: Employee not found
 */
router.post("/:id/terminate", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const terminationData = req.body;
    const terminatedBy = req.user?.id || null;

    const result = await Employee.terminateEmployee(
      id,
      terminationData,
      terminatedBy
    );

    res.json({
      success: true,
      data: result,
      message: "Employee terminated successfully",
    });
  } catch (error) {
    console.error("Error terminating employee:", error);

    if (
      error.message.includes("Invalid") ||
      error.message === "Employee not found" ||
      error.message.includes("already terminated") ||
      error.message.includes("Cannot terminate") ||
      error.message.includes("required")
    ) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: "Error terminating employee",
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/employees/{id}/termination:
 *   get:
 *     summary: Get termination record for an employee
 *     tags: [Employees]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Employee ID
 *     responses:
 *       200:
 *         description: Termination record retrieved successfully
 *       404:
 *         description: Termination record not found
 */
router.get("/:id/termination", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const termination = await Employee.getTerminationRecord(id);

    if (!termination) {
      return res.status(404).json({
        success: false,
        message: "Termination record not found",
      });
    }

    res.json({
      success: true,
      data: termination,
    });
  } catch (error) {
    console.error("Error fetching termination record:", error);

    if (error.message === "Invalid employee ID provided") {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: "Error fetching termination record",
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/employees/{id}/termination/checklist:
 *   patch:
 *     summary: Update termination checklist items
 *     tags: [Employees]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Employee ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               final_payroll_processed:
 *                 type: boolean
 *               system_access_revoked:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Termination checklist updated successfully
 *       404:
 *         description: Termination record not found
 */
router.patch(
  "/:id/termination/checklist",
  authenticateToken,
  async (req, res) => {
    try {
      const { id } = req.params;
      const checklistData = req.body;
      const updatedBy = req.user?.id || null;

      const updated = await Employee.updateTerminationChecklist(
        id,
        checklistData,
        updatedBy
      );

      res.json({
        success: true,
        data: updated,
        message: "Termination checklist updated successfully",
      });
    } catch (error) {
      console.error("Error updating termination checklist:", error);

      if (
        error.message === "Invalid employee ID provided" ||
        error.message === "Termination record not found"
      ) {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }

      res.status(500).json({
        success: false,
        message: "Error updating termination checklist",
        error: error.message,
      });
    }
  }
);

/**
 * @swagger
 * /api/employees/{id}/restore-terminated:
 *   patch:
 *     summary: Restore terminated employee back to active status
 *     tags: [Employees]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Employee ID
 *     responses:
 *       200:
 *         description: Terminated employee restored successfully
 *       400:
 *         description: Employee cannot be restored (not terminated)
 *       404:
 *         description: Employee not found
 */
router.patch("/:id/restore-terminated", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const restoredBy = req.user?.id || null;
    const employee = await Employee.restoreTerminatedEmployee(id, restoredBy);

    res.json({
      success: true,
      data: employee,
      message: "Terminated employee restored successfully",
    });
  } catch (error) {
    console.error("Error restoring terminated employee:", error);

    if (
      error.message.includes("Invalid") ||
      error.message === "Employee not found" ||
      error.message.includes("not terminated") ||
      error.message.includes("cannot be restored")
    ) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: "Error restoring terminated employee",
      error: error.message,
    });
  }
});

module.exports = router;
