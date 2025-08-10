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

module.exports = router;
