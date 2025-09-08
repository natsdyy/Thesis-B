const express = require("express");
const router = express.Router();
const Employee = require("../models/Employee");

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
    const { includeDeleted, department } = req.query;

    let employees;
    if (department) {
      employees = await Employee.getByDepartment(department);
    } else {
      employees = await Employee.getAll(includeDeleted === "true");
    }

    res.json({
      success: true,
      data: employees,
      count: employees.length,
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
router.post("/", async (req, res) => {
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
router.put("/:id", async (req, res) => {
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
router.patch("/:id/status", async (req, res) => {
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
router.delete("/:id", async (req, res) => {
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
router.patch("/:id/restore", async (req, res) => {
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

module.exports = router;
