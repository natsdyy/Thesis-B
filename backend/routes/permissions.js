const express = require("express");
const router = express.Router();
const Permission = require("../models/Permission");
const RolePermission = require("../models/RolePermission");

/**
 * @swagger
 * /api/permissions:
 *   get:
 *     tags: [Permissions]
 *     summary: Get all permissions
 *     description: Retrieve a list of all permissions in the system
 *     responses:
 *       200:
 *         description: List of permissions retrieved successfully
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
 *                     $ref: '#/components/schemas/Permission'
 *                 count:
 *                   type: integer
 *                   example: 10
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get("/", async (req, res) => {
  try {
    const permissions = await Permission.getAll();

    res.json({
      success: true,
      data: permissions,
      count: permissions.length,
    });
  } catch (error) {
    console.error("Error fetching permissions:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch permissions",
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/permissions/{id}:
 *   get:
 *     tags: [Permissions]
 *     summary: Get a permission by ID
 *     description: Retrieve a specific permission by its ID
 *     parameters:
 *       - name: id
 *         in: path
 *         description: The ID of the permission
 *         required: true
 *         schema:
 *           type: integer
 *           example: 1
 *     responses:
 *       200:
 *         description: Permission retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Permission'
 *       404:
 *         description: Permission not found
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
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const permission = await Permission.getById(id);

    if (!permission) {
      return res.status(404).json({
        success: false,
        message: "Permission not found",
      });
    }

    res.json({
      success: true,
      data: permission,
    });
  } catch (error) {
    console.error("Error fetching permission:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch permission",
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/permissions:
 *   post:
 *     tags: [Permissions]
 *     summary: Create a new permission
 *     description: Create a new permission in the system
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - permission_name
 *             properties:
 *               permission_name:
 *                 type: string
 *                 description: The name of the permission
 *                 example: "Manage Inventory"
 *           examples:
 *             basic:
 *               summary: Basic permission creation
 *               value:
 *                 permission_name: "Manage Inventory"
 *     responses:
 *       201:
 *         description: Permission created successfully
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
 *                   example: "Permission created successfully"
 *                 data:
 *                   $ref: '#/components/schemas/Permission'
 *       400:
 *         description: Missing required fields
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Permission already exists
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
router.post("/", async (req, res) => {
  try {
    const { permission_name } = req.body;

    // Validation
    if (!permission_name) {
      return res.status(400).json({
        success: false,
        message: "Permission name is required",
      });
    }

    const newPermission = await Permission.create({
      permission_name: permission_name.trim(),
    });

    res.status(201).json({
      success: true,
      message: "Permission created successfully",
      data: newPermission,
    });
  } catch (error) {
    console.error("Error creating permission:", error);

    if (error.code === "DUPLICATE_PERMISSION") {
      return res.status(409).json({
        success: false,
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to create permission",
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/permissions/{id}:
 *   put:
 *     tags: [Permissions]
 *     summary: Update a permission
 *     description: Update an existing permission's information
 *     parameters:
 *       - name: id
 *         in: path
 *         description: The ID of the permission to update
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
 *               - permission_name
 *             properties:
 *               permission_name:
 *                 type: string
 *                 description: The updated name of the permission
 *                 example: "Manage Updated Inventory"
 *     responses:
 *       200:
 *         description: Permission updated successfully
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
 *                   example: "Permission updated successfully"
 *                 data:
 *                   $ref: '#/components/schemas/Permission'
 *       400:
 *         description: Missing required fields
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Permission not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Permission name already exists
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
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { permission_name } = req.body;

    // Validation
    if (!permission_name) {
      return res.status(400).json({
        success: false,
        message: "Permission name is required",
      });
    }

    const updatedPermission = await Permission.update(id, {
      permission_name: permission_name.trim(),
    });

    res.json({
      success: true,
      message: "Permission updated successfully",
      data: updatedPermission,
    });
  } catch (error) {
    console.error("Error updating permission:", error);

    if (error.code === "PERMISSION_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }

    if (error.code === "DUPLICATE_PERMISSION") {
      return res.status(409).json({
        success: false,
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to update permission",
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/permissions/{id}:
 *   delete:
 *     tags: [Permissions]
 *     summary: Delete a permission
 *     description: Delete a permission from the system (hard delete)
 *     parameters:
 *       - name: id
 *         in: path
 *         description: The ID of the permission to delete
 *         required: true
 *         schema:
 *           type: integer
 *           example: 1
 *     responses:
 *       200:
 *         description: Permission deleted successfully
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
 *                   example: "Permission deleted successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     permission_id:
 *                       type: integer
 *                       example: 1
 *                     permission_name:
 *                       type: string
 *                       example: "Deleted Permission"
 *       404:
 *         description: Permission not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Permission is in use and cannot be deleted
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
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const deletedPermission = await Permission.delete(id);

    res.json({
      success: true,
      message: "Permission deleted successfully",
      data: deletedPermission,
    });
  } catch (error) {
    console.error("Error deleting permission:", error);

    if (error.code === "PERMISSION_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }

    if (error.code === "PERMISSION_IN_USE") {
      return res.status(409).json({
        success: false,
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to delete permission",
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/permissions/seed:
 *   post:
 *     tags: [Permissions]
 *     summary: Seed default permissions
 *     description: Populate the database with default permissions for the system
 *     responses:
 *       200:
 *         description: Default permissions seeded successfully
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
 *                   example: "17 permissions seeded successfully"
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Permission'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post("/seed", async (req, res) => {
  try {
    const seededPermissions = await Permission.seedDefaultPermissions();

    res.json({
      success: true,
      message: `${seededPermissions.length} permissions seeded successfully`,
      data: seededPermissions,
    });
  } catch (error) {
    console.error("Error seeding permissions:", error);
    res.status(500).json({
      success: false,
      message: "Failed to seed permissions",
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/permissions/role/{roleId}:
 *   get:
 *     tags: [Permissions]
 *     summary: Get permissions for a specific role
 *     description: Retrieve all permissions assigned to a specific role
 *     parameters:
 *       - name: roleId
 *         in: path
 *         description: The ID of the role
 *         required: true
 *         schema:
 *           type: integer
 *           example: 1
 *     responses:
 *       200:
 *         description: Permissions for role retrieved successfully
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
 *                     $ref: '#/components/schemas/Permission'
 *                 count:
 *                   type: integer
 *                   example: 5
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get("/role/:roleId", async (req, res) => {
  try {
    const { roleId } = req.params;
    const permissions = await Permission.getByRoleId(roleId);

    res.json({
      success: true,
      data: permissions,
      count: permissions.length,
    });
  } catch (error) {
    console.error("Error fetching permissions by role:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch permissions for role",
      error: error.message,
    });
  }
});

module.exports = router;
