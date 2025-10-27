const express = require("express");
const router = express.Router();
const Roles = require("../models/Roles");
const { db } = require("../config/database");
/**
 * @swagger
 * components:
 *   schemas:
 *     Role:
 *       type: object
 *       properties:
 *         role_id:
 *           type: integer
 *           description: The auto-generated id of the role
 *           example: 1
 *         role:
 *           type: string
 *           description: The name of the role
 *           example: "Manager"
 *         department:
 *           type: string
 *           description: The department the role belongs to
 *           example: "Human Resource"
 *         description:
 *           type: string
 *           description: The description of the role
 *           example: "Manage the human resource department"
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: When the role was created
 *         updated_at:
 *           type: string
 *           format: date-time
 *           description: When the role was last updated
 *         deleted_at:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           description: When the role was deleted (soft delete)
 *         is_active:
 *           type: boolean
 *           description: Whether the role is active
 *           example: true
 */

/**
 * @swagger
 * /api/roles:
 *   get:
 *     tags: [Roles]
 *     summary: Get all roles
 *     description: Retrieve a list of all roles with optional inclusion of soft-deleted roles
 *     parameters:
 *       - name: includeDeleted
 *         in: query
 *         description: Include soft deleted roles
 *         required: false
 *         schema:
 *           type: boolean
 *           example: false
 *     responses:
 *       200:
 *         description: List of roles retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Role'
 *                 count:
 *                   type: integer
 *                   example: 5
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Error fetching roles"
 *                 error:
 *                   type: string
 *                   example: "Database connection failed"
 */
// Get all roles
router.get("/", async (req, res) => {
  try {
    const includeDeleted = req.query.includeDeleted === "true";
    const roles = await Roles.getAll(includeDeleted);
    res.json({
      success: true,
      data: roles,
      count: roles.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching roles",
      error: error.message,
    });
  }
});

// ===== POSITIONS MANAGEMENT ROUTES =====

/**
 * @swagger
 * /api/roles/positions:
 *   get:
 *     tags: [Positions]
 *     summary: Get all positions grouped by department
 *     description: Retrieve all positions (roles) grouped by department for positions management. Excludes system roles.
 *     parameters:
 *       - name: includeDeleted
 *         in: query
 *         description: Include soft deleted positions
 *         required: false
 *         schema:
 *           type: boolean
 *           example: false
 *     responses:
 *       200:
 *         description: Positions retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   additionalProperties:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         role_id:
 *                           type: integer
 *                           example: 1
 *                         role:
 *                           type: string
 *                           example: "Manager"
 *                         department:
 *                           type: string
 *                           example: "Human Resource"
 *                         description:
 *                           type: string
 *                           example: "HR Department Manager"
 *                         rate_per_hour:
 *                           type: number
 *                           example: 38.0
 *                         is_active:
 *                           type: boolean
 *                           example: true
 *                         created_at:
 *                           type: string
 *                           format: date-time
 *                         updated_at:
 *                           type: string
 *                           format: date-time
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Error fetching positions"
 *                 error:
 *                   type: string
 */
// Get all positions grouped by department
router.get("/positions", async (req, res) => {
  try {
    const includeDeleted = req.query.includeDeleted === "true";
    const positions = await Roles.getAllPositions(includeDeleted);

    res.json({
      success: true,
      data: positions,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching positions",
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/roles/positions/{role_id}:
 *   get:
 *     tags: [Positions]
 *     summary: Get position by ID
 *     description: Retrieve a specific position by its ID for positions management
 *     parameters:
 *       - name: role_id
 *         in: path
 *         description: The ID of the position
 *         required: true
 *         schema:
 *           type: integer
 *           example: 1
 *     responses:
 *       200:
 *         description: Position retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     role_id:
 *                       type: integer
 *                       example: 1
 *                     role:
 *                       type: string
 *                       example: "Manager"
 *                     department:
 *                       type: string
 *                       example: "Human Resource"
 *                     description:
 *                       type: string
 *                       example: "HR Department Manager"
 *                     rate_per_hour:
 *                       type: number
 *                       example: 38.0
 *                     is_active:
 *                       type: boolean
 *                       example: true
 *                     created_at:
 *                       type: string
 *                       format: date-time
 *                     updated_at:
 *                       type: string
 *                       format: date-time
 *       404:
 *         description: Position not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Position not found"
 *       500:
 *         description: Server error
 */
// Get position by ID
router.get("/positions/:role_id", async (req, res) => {
  try {
    const { role_id } = req.params;
    const position = await Roles.getPositionById(role_id);

    if (!position) {
      return res.status(404).json({
        success: false,
        message: "Position not found",
      });
    }

    res.json({
      success: true,
      data: position,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching position",
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/roles/positions/{role_id}/rate:
 *   put:
 *     tags: [Positions]
 *     summary: Update rate per hour for a position
 *     description: Update the rate per hour for a specific position
 *     parameters:
 *       - name: role_id
 *         in: path
 *         description: The ID of the position to update
 *         required: true
 *         schema:
 *           type: integer
 *           example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - rate_per_hour
 *             properties:
 *               rate_per_hour:
 *                 type: number
 *                 description: The new rate per hour
 *                 example: 40.5
 *                 minimum: 0
 *     responses:
 *       200:
 *         description: Rate per hour updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     role_id:
 *                       type: integer
 *                       example: 1
 *                     role:
 *                       type: string
 *                       example: "Manager"
 *                     department:
 *                       type: string
 *                       example: "Human Resource"
 *                     description:
 *                       type: string
 *                       example: "HR Department Manager"
 *                     rate_per_hour:
 *                       type: number
 *                       example: 40.5
 *                     is_active:
 *                       type: boolean
 *                       example: true
 *                     created_at:
 *                       type: string
 *                       format: date-time
 *                     updated_at:
 *                       type: string
 *                       format: date-time
 *                 message:
 *                   type: string
 *                   example: "Rate per hour updated successfully"
 *       400:
 *         description: Invalid rate per hour value
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Rate per hour must be a positive number"
 *       404:
 *         description: Position not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Position not found"
 *       500:
 *         description: Server error
 */
// Update rate per hour for a position
router.put("/positions/:role_id/rate", async (req, res) => {
  try {
    const { role_id } = req.params;
    const { rate_per_hour } = req.body;

    // Validate required field
    if (typeof rate_per_hour === "undefined" || rate_per_hour === null) {
      return res.status(400).json({
        success: false,
        message: "Rate per hour is required",
        code: "MISSING_RATE",
      });
    }

    // Validate rate_per_hour
    if (typeof rate_per_hour !== "number" || rate_per_hour < 0) {
      return res.status(400).json({
        success: false,
        message: "Rate per hour must be a positive number",
        code: "INVALID_RATE",
      });
    }

    const updatedPosition = await Roles.updateRatePerHour(
      role_id,
      rate_per_hour
    );

    res.json({
      success: true,
      data: updatedPosition,
      message: "Rate per hour updated successfully",
    });
  } catch (error) {
    if (error.code === "POSITION_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: error.message,
        code: "POSITION_NOT_FOUND",
      });
    }

    if (error.code === "INVALID_RATE") {
      return res.status(400).json({
        success: false,
        message: error.message,
        code: "INVALID_RATE",
      });
    }

    res.status(500).json({
      success: false,
      message: "Error updating rate per hour",
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/roles/positions/{role_id}/status:
 *   put:
 *     tags: [Positions]
 *     summary: Update status for a position
 *     description: Update the is_active status for a specific position
 *     parameters:
 *       - name: role_id
 *         in: path
 *         description: The ID of the position to update
 *         required: true
 *         schema:
 *           type: integer
 *           example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - is_active
 *             properties:
 *               is_active:
 *                 type: boolean
 *                 description: The new active status
 *                 example: true
 *     responses:
 *       200:
 *         description: Status updated successfully
 *       400:
 *         description: Invalid status value
 *       404:
 *         description: Position not found
 *       500:
 *         description: Server error
 */
// Update status for a position
router.put("/positions/:role_id/status", async (req, res) => {
  console.log('=== PUT /positions/:role_id/status called ===')
  console.log('role_id:', req.params.role_id)
  console.log('body:', req.body)
  console.log('is_active:', req.body.is_active)
  
  try {
    const { role_id } = req.params;
    const { is_active } = req.body;

    // Validate required field
    if (typeof is_active === "undefined" || is_active === null) {
      return res.status(400).json({
        success: false,
        message: "is_active is required",
        code: "MISSING_STATUS",
      });
    }

    // Validate is_active
    if (typeof is_active !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "is_active must be a boolean value",
        code: "INVALID_STATUS",
      });
    }

    const updatedPosition = await Roles.updatePositionStatus(
      role_id,
      is_active
    );

    res.json({
      success: true,
      data: updatedPosition,
      message: "Position status updated successfully",
    });
  } catch (error) {
    if (error.code === "POSITION_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: error.message,
        code: "POSITION_NOT_FOUND",
      });
    }

    if (error.code === "INVALID_STATUS") {
      return res.status(400).json({
        success: false,
        message: error.message,
        code: "INVALID_STATUS",
      });
    }

    res.status(500).json({
      success: false,
      message: "Error updating position status",
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/roles/positions/department/{department}:
 *   get:
 *     tags: [Positions]
 *     summary: Get positions by department
 *     description: Retrieve all positions for a specific department
 *     parameters:
 *       - name: department
 *         in: path
 *         description: The department name
 *         required: true
 *         schema:
 *           type: string
 *           example: "Human Resource"
 *       - name: includeDeleted
 *         in: query
 *         description: Include soft deleted positions
 *         required: false
 *         schema:
 *           type: boolean
 *           example: false
 *     responses:
 *       200:
 *         description: Positions retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       role_id:
 *                         type: integer
 *                         example: 1
 *                       role:
 *                         type: string
 *                         example: "Manager"
 *                       department:
 *                         type: string
 *                         example: "Human Resource"
 *                       description:
 *                         type: string
 *                         example: "HR Department Manager"
 *                       rate_per_hour:
 *                         type: number
 *                         example: 38.0
 *                       is_active:
 *                         type: boolean
 *                         example: true
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *                       updated_at:
 *                         type: string
 *                         format: date-time
 *                 count:
 *                   type: integer
 *                   example: 2
 *       500:
 *         description: Server error
 */
// Get positions by department
router.get("/positions/department/:department", async (req, res) => {
  try {
    const { department } = req.params;
    const includeDeleted = req.query.includeDeleted === "true";
    const positions = await Roles.getPositionsByDepartment(
      department,
      includeDeleted
    );

    res.json({
      success: true,
      data: positions,
      count: positions.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching positions by department",
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/roles/{role_id}:
 *   get:
 *     tags: [Roles]
 *     summary: Get a role by ID
 *     description: Retrieve a specific role by its ID
 *     parameters:
 *       - name: role_id
 *         in: path
 *         description: The ID of the role
 *         required: true
 *         schema:
 *           type: integer
 *           example: 1
 *     responses:
 *       200:
 *         description: Role retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Role'
 *       404:
 *         description: Role not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Role not found"
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Error fetching role"
 *                 error:
 *                   type: string
 */
// Get role by ID
router.get("/:role_id", async (req, res) => {
  try {
    const { role_id } = req.params;
    const role = await Roles.getById(role_id);
    if (!role) {
      return res.status(404).json({
        success: false,
        message: "Role not found",
      });
    }
    res.json({
      success: true,
      data: role,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching role",
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/roles:
 *   post:
 *     tags: [Roles]
 *     summary: Create a new role
 *     description: Create a new role with role name and description
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - role
 *               - description
 *             properties:
 *               role:
 *                 type: string
 *                 description: The name of the role
 *                 example: "manager"
 *               description:
 *                 type: string
 *                 description: The description of the role
 *                 example: "Manager with departmental access"
 *     responses:
 *       201:
 *         description: Role created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Role'
 *                 message:
 *                   type: string
 *                   example: "Role created successfully"
 *       409:
 *         description: Role already exists
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Role with this name already exists"
 *       400:
 *         description: Missing required fields
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Role name and description are required"
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Error creating role"
 *                 error:
 *                   type: string
 */
// Create new role
router.post("/", async (req, res) => {
  try {
    const { role, department, description } = req.body;

    // Validate required fields
    if (!role || !department || !description) {
      return res.status(400).json({
        success: false,
        message: "Role name, department, and description are required",
        code: "MISSING_FIELDS",
      });
    }

    // Validate role name length and format
    if (role.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: "Role name must be at least 2 characters long",
        code: "INVALID_ROLE_NAME",
      });
    }

    // Create role
    const newRole = await Roles.create({
      role: role.trim(),
      department: department.trim(),
      description: description.trim(),
    });

    res.status(201).json({
      success: true,
      data: newRole,
      message: "Role created successfully",
    });
  } catch (error) {
    if (error.code === "DUPLICATE_ROLE") {
      return res.status(409).json({
        success: false,
        message: error.message,
        code: "DUPLICATE_ROLE",
      });
    }

    res.status(500).json({
      success: false,
      message: "Error creating role",
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/roles/{role_id}:
 *   put:
 *     tags: [Roles]
 *     summary: Update a role
 *     description: Update an existing role's name and description
 *     parameters:
 *       - name: role_id
 *         in: path
 *         description: The ID of the role to update
 *         required: true
 *         schema:
 *           type: integer
 *           example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - role
 *               - description
 *             properties:
 *               role:
 *                 type: string
 *                 description: The name of the role
 *                 example: "senior_manager"
 *               description:
 *                 type: string
 *                 description: The description of the role
 *                 example: "Senior manager with extended privileges"
 *     responses:
 *       200:
 *         description: Role updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Role'
 *                 message:
 *                   type: string
 *                   example: "Role updated successfully"
 *       400:
 *         description: Missing required fields
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Role name and description are required"
 *       404:
 *         description: Role not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Role not found"
 *       409:
 *         description: Role name already exists
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Role with this name already exists"
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Error updating role"
 *                 error:
 *                   type: string
 */
// Update role
router.put("/:role_id", async (req, res) => {
  try {
    const { role_id } = req.params;
    const { role, department, description } = req.body;

    // Validate required fields
    if (!role || !department || !description) {
      return res.status(400).json({
        success: false,
        message: "Role name, department, and description are required",
        code: "MISSING_FIELDS",
      });
    }

    // Validate role name length and format
    if (role.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: "Role name must be at least 2 characters long",
        code: "INVALID_ROLE_NAME",
      });
    }

    // Update role
    const updatedRole = await Roles.update(role_id, {
      role: role.trim(),
      department: department.trim(),
      description: description.trim(),
    });

    res.json({
      success: true,
      data: updatedRole,
      message: "Role updated successfully",
    });
  } catch (error) {
    if (error.code === "ROLE_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: error.message,
        code: "ROLE_NOT_FOUND",
      });
    }

    if (error.code === "DUPLICATE_ROLE") {
      return res.status(409).json({
        success: false,
        message: error.message,
        code: "DUPLICATE_ROLE",
      });
    }

    res.status(500).json({
      success: false,
      message: "Error updating role",
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/roles/{role_id}:
 *   delete:
 *     tags: [Roles]
 *     summary: Delete a role (soft delete)
 *     description: Soft delete a role by setting its deleted_at timestamp
 *     parameters:
 *       - name: role_id
 *         in: path
 *         description: The ID of the role to delete
 *         required: true
 *         schema:
 *           type: integer
 *           example: 1
 *     responses:
 *       200:
 *         description: Role deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Role'
 *                 message:
 *                   type: string
 *                   example: "Role deleted successfully"
 *       404:
 *         description: Role not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Role not found"
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Error deleting role"
 *                 error:
 *                   type: string
 */
// Delete role
router.delete("/:role_id", async (req, res) => {
  try {
    const { role_id } = req.params;
    const deletedRole = await Roles.delete(role_id);

    res.json({
      success: true,
      data: deletedRole,
      message: "Role deleted successfully",
    });
  } catch (error) {
    if (error.code === "ROLE_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: error.message,
        code: "ROLE_NOT_FOUND",
      });
    }

    res.status(500).json({
      success: false,
      message: "Error deleting role",
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/roles/{role_id}/restore:
 *   patch:
 *     tags: [Roles]
 *     summary: Restore a soft deleted role
 *     description: Restore a soft-deleted role by clearing its deleted_at timestamp
 *     parameters:
 *       - name: role_id
 *         in: path
 *         description: The ID of the role to restore
 *         required: true
 *         schema:
 *           type: integer
 *           example: 1
 *     responses:
 *       200:
 *         description: Role restored successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Role'
 *                 message:
 *                   type: string
 *                   example: "Role restored successfully"
 *       404:
 *         description: Role not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Role not found"
 *       409:
 *         description: Cannot restore due to duplicate
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Cannot restore: A role with this name already exists"
 *       400:
 *         description: Role is not deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Role is not deleted and cannot be restored"
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Error restoring role"
 *                 error:
 *                   type: string
 */
// Restore role
router.patch("/:role_id/restore", async (req, res) => {
  try {
    const { role_id } = req.params;
    const restoredRole = await Roles.restore(role_id);

    res.json({
      success: true,
      data: restoredRole,
      message: "Role restored successfully",
    });
  } catch (error) {
    if (error.code === "ROLE_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: error.message,
        code: "ROLE_NOT_FOUND",
      });
    }

    if (error.code === "ROLE_NOT_DELETED") {
      return res.status(400).json({
        success: false,
        message: error.message,
        code: "ROLE_NOT_DELETED",
      });
    }

    if (error.code === "DUPLICATE_ROLE") {
      return res.status(409).json({
        success: false,
        message: error.message,
        code: "DUPLICATE_ROLE",
      });
    }

    res.status(500).json({
      success: false,
      message: "Error restoring role",
      error: error.message,
    });
  }
});

// Get roles by department
router.get("/department/:department", async (req, res) => {
  try {
    const { department } = req.params;
    const includeDeleted = req.query.includeDeleted === "true";
    const roles = await Roles.getByDepartment(department, includeDeleted);

    res.json({
      success: true,
      data: roles,
      count: roles.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching roles by department",
      error: error.message,
    });
  }
});

// Get only deleted roles
router.get("/deleted/list", async (req, res) => {
  try {
    const deletedRoles = await Roles.getDeleted();
    res.json({
      success: true,
      data: deletedRoles,
      count: deletedRoles.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching deleted roles",
      error: error.message,
    });
  }
});

// Get role count
router.get("/count/all", async (req, res) => {
  try {
    const includeDeleted = req.query.includeDeleted === "true";
    const count = await Roles.getCount(includeDeleted);
    res.json({
      success: true,
      count: count,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error getting role count",
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/roles/{role_id}/permissions:
 *   get:
 *     tags: [Roles]
 *     summary: Get role with permissions
 *     description: Retrieve a specific role along with all its assigned permissions
 *     parameters:
 *       - name: role_id
 *         in: path
 *         description: The ID of the role
 *         required: true
 *         schema:
 *           type: integer
 *           example: 1
 *     responses:
 *       200:
 *         description: Role with permissions retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/RoleWithPermissions'
 *       404:
 *         description: Role not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
// Get role with permissions
router.get("/:role_id/permissions", async (req, res) => {
  try {
    const { role_id } = req.params;
    const roleWithPermissions = await Roles.getByIdWithPermissions(role_id);

    if (!roleWithPermissions) {
      return res.status(404).json({
        success: false,
        message: "Role not found",
      });
    }

    res.json({
      success: true,
      data: roleWithPermissions,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching role with permissions",
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/roles/with-permissions:
 *   post:
 *     tags: [Roles]
 *     summary: Create role with permissions
 *     description: Create a new role and assign permissions to it in one operation
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - role
 *               - department
 *               - description
 *             properties:
 *               role:
 *                 type: string
 *                 description: The name of the role
 *                 example: "Senior Manager"
 *               department:
 *                 type: string
 *                 description: The department the role belongs to
 *                 example: "Human Resource"
 *               description:
 *                 type: string
 *                 description: The description of the role
 *                 example: "Senior manager with extended privileges"
 *               permission_ids:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 description: Array of permission IDs to assign to the role
 *                 example: [1, 2, 3, 4, 5]
 *           examples:
 *             hr_manager:
 *               summary: Create HR Manager with permissions
 *               value:
 *                 role: "Senior Manager"
 *                 department: "Human Resource"
 *                 description: "Senior HR manager with full HR permissions"
 *                 permission_ids: [1, 2, 3, 4, 5]
 *     responses:
 *       201:
 *         description: Role created successfully with permissions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Role created successfully with permissions"
 *                 data:
 *                   $ref: '#/components/schemas/RoleWithPermissions'
 *       400:
 *         description: Missing required fields or invalid data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Role already exists in department
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
// Create role with permissions
router.post("/with-permissions", async (req, res) => {
  try {
    const { role, department, description, permission_ids } = req.body;

    // Validate required fields
    if (!role || !department || !description) {
      return res.status(400).json({
        success: false,
        message: "Role name, department, and description are required",
        code: "MISSING_FIELDS",
      });
    }

    // Validate role name length and format
    if (role.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: "Role name must be at least 2 characters long",
        code: "INVALID_ROLE_NAME",
      });
    }

    // Create role with permissions
    const newRole = await Roles.createWithPermissions({
      role: role.trim(),
      department: department.trim(),
      description: description.trim(),
      permission_ids: permission_ids || [],
    });

    res.status(201).json({
      success: true,
      data: newRole,
      message: "Role created successfully with permissions",
    });
  } catch (error) {
    if (error.code === "DUPLICATE_ROLE") {
      return res.status(409).json({
        success: false,
        message: error.message,
        code: "DUPLICATE_ROLE",
      });
    }

    res.status(500).json({
      success: false,
      message: "Error creating role with permissions",
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/roles/{role_id}/permissions:
 *   put:
 *     tags: [Roles]
 *     summary: Update role with permissions
 *     description: Update a role's information and replace all its permissions in one operation
 *     parameters:
 *       - name: role_id
 *         in: path
 *         description: The ID of the role to update
 *         required: true
 *         schema:
 *           type: integer
 *           example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - role
 *               - department
 *               - description
 *             properties:
 *               role:
 *                 type: string
 *                 description: The updated name of the role
 *                 example: "Updated Manager"
 *               department:
 *                 type: string
 *                 description: The updated department
 *                 example: "Human Resource"
 *               description:
 *                 type: string
 *                 description: The updated description
 *                 example: "Updated manager with new permissions"
 *               permission_ids:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 description: Array of permission IDs to assign (replaces existing)
 *                 example: [1, 3, 5, 7]
 *     responses:
 *       200:
 *         description: Role updated successfully with permissions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Role updated successfully with permissions"
 *                 data:
 *                   $ref: '#/components/schemas/RoleWithPermissions'
 *       400:
 *         description: Missing required fields or invalid data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Role not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Role name already exists in department
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
// Update role with permissions
router.put("/:role_id/permissions", async (req, res) => {
  try {
    const { role_id } = req.params;
    const { role, department, description, permission_ids } = req.body;

    // Validate required fields
    if (!role || !department || !description) {
      return res.status(400).json({
        success: false,
        message: "Role name, department, and description are required",
        code: "MISSING_FIELDS",
      });
    }

    // Validate role name length and format
    if (role.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: "Role name must be at least 2 characters long",
        code: "INVALID_ROLE_NAME",
      });
    }

    // Update role with permissions
    const updatedRole = await Roles.updateWithPermissions(role_id, {
      role: role.trim(),
      department: department.trim(),
      description: description.trim(),
      permission_ids: permission_ids || [],
    });

    res.json({
      success: true,
      data: updatedRole,
      message: "Role updated successfully with permissions",
    });
  } catch (error) {
    if (error.code === "ROLE_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: error.message,
        code: "ROLE_NOT_FOUND",
      });
    }

    if (error.code === "DUPLICATE_ROLE") {
      return res.status(409).json({
        success: false,
        message: error.message,
        code: "DUPLICATE_ROLE",
      });
    }

    res.status(500).json({
      success: false,
      message: "Error updating role with permissions",
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/roles/with-permissions/all:
 *   get:
 *     tags: [Roles]
 *     summary: Get all roles with permissions
 *     description: Retrieve all roles along with their assigned permissions
 *     parameters:
 *       - name: includeDeleted
 *         in: query
 *         description: Include soft deleted roles
 *         required: false
 *         schema:
 *           type: boolean
 *           example: false
 *     responses:
 *       200:
 *         description: All roles with permissions retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/RoleWithPermissions'
 *                 count:
 *                   type: integer
 *                   example: 11
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
// Get all roles with their permissions
router.get("/with-permissions/all", async (req, res) => {
  try {
    const includeDeleted = req.query.includeDeleted === "true";
    const rolesWithPermissions =
      await Roles.getAllWithPermissions(includeDeleted);

    res.json({
      success: true,
      data: rolesWithPermissions,
      count: rolesWithPermissions.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching roles with permissions",
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/roles/{role_id}/has-permission/{permission_name}:
 *   get:
 *     tags: [Roles]
 *     summary: Check if role has specific permission
 *     description: Check whether a specific role has been assigned a specific permission
 *     parameters:
 *       - name: role_id
 *         in: path
 *         description: The ID of the role
 *         required: true
 *         schema:
 *           type: integer
 *           example: 1
 *       - name: permission_name
 *         in: path
 *         description: The name of the permission to check
 *         required: true
 *         schema:
 *           type: string
 *           example: "Manage Employee"
 *     responses:
 *       200:
 *         description: Permission check completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     role_id:
 *                       type: integer
 *                       example: 1
 *                     permission_name:
 *                       type: string
 *                       example: "Manage Employee"
 *                     has_permission:
 *                       type: boolean
 *                       example: true
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
// Check if role has specific permission
router.get("/:role_id/has-permission/:permission_name", async (req, res) => {
  try {
    const { role_id, permission_name } = req.params;
    const hasPermission = await Roles.hasPermission(role_id, permission_name);

    res.json({
      success: true,
      data: {
        role_id: parseInt(role_id),
        permission_name,
        has_permission: hasPermission,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error checking role permission",
      error: error.message,
    });
  }
});

module.exports = router;
