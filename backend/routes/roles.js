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
 *         role_name:
 *           type: string
 *           description: The name of the role
 *           example: "admin"
 *         description:
 *           type: string
 *           description: The description of the role
 *           example: "Administrator with full access"
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
 *               - role_name
 *               - description
 *             properties:
 *               role_name:
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
router.post("/", async (req, res) => {
  try {
    const { role_name, description } = req.body;

    // Validate required fields
    if (!role_name || !description) {
      return res.status(400).json({
        success: false,
        message: "Role name and description are required",
      });
    }

    // Check if role already exists (case insensitive)
    const existingRole = await db("user_roles")
      .select("*")
      .whereRaw("LOWER(role_name) = LOWER(?)", [role_name])
      .whereNull("deleted_at")
      .first();

    if (existingRole) {
      return res.status(409).json({
        success: false,
        message: "Role with this name already exists",
      });
    }

    // Create role
    const newRole = await Roles.create({ role_name, description });
    res.status(201).json({
      success: true,
      data: newRole,
      message: "Role created successfully",
    });
  } catch (error) {
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
 *               - role_name
 *               - description
 *             properties:
 *               role_name:
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
router.put("/:role_id", async (req, res) => {
  try {
    const { role_id } = req.params;
    const { role_name, description } = req.body;

    // Validate required fields
    if (!role_name || !description) {
      return res.status(400).json({
        success: false,
        message: "Role name and description are required",
      });
    }

    // Check if role exists before updating
    const currentRole = await Roles.getById(role_id);
    if (!currentRole) {
      return res.status(404).json({
        success: false,
        message: "Role not found",
      });
    }

    // Check if another role with the same name exists (excluding current role)
    const existingRole = await db("user_roles")
      .select("*")
      .whereRaw("LOWER(role_name) = LOWER(?)", [role_name])
      .whereNot("role_id", role_id)
      .whereNull("deleted_at")
      .first();

    if (existingRole) {
      return res.status(409).json({
        success: false,
        message: "Role with this name already exists",
      });
    }

    // Update role
    const role = await Roles.update(role_id, { role_name, description });
    res.json({
      success: true,
      data: role,
      message: "Role updated successfully",
    });
  } catch (error) {
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
router.delete("/:role_id", async (req, res) => {
  try {
    const { role_id } = req.params;
    const role = await Roles.delete(role_id);
    if (!role) {
      return res.status(404).json({
        success: false,
        message: "Role not found",
      });
    }
    res.json({
      success: true,
      data: role,
      message: "Role deleted successfully",
    });
  } catch (error) {
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
router.patch("/:role_id/restore", async (req, res) => {
  try {
    const { role_id } = req.params;
    const role = await Roles.restore(role_id);
    if (!role) {
      return res.status(404).json({
        success: false,
        message: "Role not found",
      });
    }
    res.json({
      success: true,
      data: role,
      message: "Role restored successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error restoring role",
      error: error.message,
    });
  }
});

module.exports = router;
