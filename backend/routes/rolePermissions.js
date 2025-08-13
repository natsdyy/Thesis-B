const express = require("express");
const router = express.Router();
const RolePermission = require("../models/RolePermission");

/**
 * @swagger
 * /api/role-permissions:
 *   get:
 *     tags: [Role-Permissions]
 *     summary: Get all role-permission assignments
 *     description: Retrieve a list of all role-permission assignments in the system
 *     parameters:
 *       - name: includeDeleted
 *         in: query
 *         description: Include soft deleted assignments
 *         required: false
 *         schema:
 *           type: boolean
 *           example: false
 *     responses:
 *       200:
 *         description: Role-permission assignments retrieved successfully
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
 *                     allOf:
 *                       - $ref: '#/components/schemas/RolePermission'
 *                       - type: object
 *                         properties:
 *                           role_name:
 *                             type: string
 *                             example: "Manager"
 *                           role_description:
 *                             type: string
 *                             example: "HR Manager"
 *                           permission_name:
 *                             type: string
 *                             example: "Manage Employee"
 *                 count:
 *                   type: integer
 *                   example: 25
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get("/", async (req, res) => {
  try {
    const { includeDeleted = false } = req.query;
    const assignments = await RolePermission.getAll(includeDeleted === "true");

    res.json({
      success: true,
      data: assignments,
      count: assignments.length,
    });
  } catch (error) {
    console.error("Error fetching role-permission assignments:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch role-permission assignments",
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/role-permissions/role/{roleId}:
 *   get:
 *     tags: [Role-Permissions]
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
    const permissions = await RolePermission.getPermissionsByRole(roleId);

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

/**
 * @swagger
 * /api/role-permissions/permission/{permissionId}:
 *   get:
 *     tags: [Role-Permissions]
 *     summary: Get roles that have a specific permission
 *     description: Retrieve all roles that have been assigned a specific permission
 *     parameters:
 *       - name: permissionId
 *         in: path
 *         description: The ID of the permission
 *         required: true
 *         schema:
 *           type: integer
 *           example: 1
 *     responses:
 *       200:
 *         description: Roles with permission retrieved successfully
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
 *                   example: 3
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get("/permission/:permissionId", async (req, res) => {
  try {
    const { permissionId } = req.params;
    const roles = await RolePermission.getRolesByPermission(permissionId);

    res.json({
      success: true,
      data: roles,
      count: roles.length,
    });
  } catch (error) {
    console.error("Error fetching roles by permission:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch roles for permission",
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/role-permissions/assign:
 *   post:
 *     tags: [Role-Permissions]
 *     summary: Assign a permission to a role
 *     description: Assign a single permission to a role
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - role_id
 *               - permission_id
 *             properties:
 *               role_id:
 *                 type: integer
 *                 description: The ID of the role
 *                 example: 1
 *               permission_id:
 *                 type: integer
 *                 description: The ID of the permission
 *                 example: 1
 *           examples:
 *             basic:
 *               summary: Assign permission to role
 *               value:
 *                 role_id: 1
 *                 permission_id: 1
 *     responses:
 *       201:
 *         description: Permission assigned to role successfully
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
 *                   example: "Permission assigned to role successfully"
 *                 data:
 *                   $ref: '#/components/schemas/RolePermission'
 *       400:
 *         description: Missing required fields
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Permission already assigned to role
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
router.post("/assign", async (req, res) => {
  try {
    const { role_id, permission_id } = req.body;

    // Validation
    if (!role_id || !permission_id) {
      return res.status(400).json({
        success: false,
        message: "Role ID and Permission ID are required",
      });
    }

    const assignment = await RolePermission.assignPermissionToRole(
      role_id,
      permission_id
    );

    res.status(201).json({
      success: true,
      message: "Permission assigned to role successfully",
      data: assignment,
    });
  } catch (error) {
    console.error("Error assigning permission to role:", error);

    if (error.code === "PERMISSION_ALREADY_ASSIGNED") {
      return res.status(409).json({
        success: false,
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to assign permission to role",
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/role-permissions/bulk-assign:
 *   post:
 *     tags: [Role-Permissions]
 *     summary: Bulk assign permissions to a role
 *     description: Assign multiple permissions to a role in one operation. This will replace all existing permissions for the role.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - role_id
 *               - permission_ids
 *             properties:
 *               role_id:
 *                 type: integer
 *                 description: The ID of the role
 *                 example: 1
 *               permission_ids:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 description: Array of permission IDs to assign
 *                 example: [1, 2, 3, 4]
 *           examples:
 *             hr_manager:
 *               summary: Assign HR manager permissions
 *               value:
 *                 role_id: 1
 *                 permission_ids: [1, 2, 3, 4, 5]
 *             finance_staff:
 *               summary: Assign Finance staff permissions
 *               value:
 *                 role_id: 2
 *                 permission_ids: [1, 6, 7]
 *     responses:
 *       200:
 *         description: Permissions assigned to role successfully
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
 *                   example: "5 permissions assigned to role successfully"
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/RolePermission'
 *       400:
 *         description: Missing required fields
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
router.post("/bulk-assign", async (req, res) => {
  try {
    const { role_id, permission_ids } = req.body;

    // Validation
    if (!role_id || !Array.isArray(permission_ids)) {
      return res.status(400).json({
        success: false,
        message: "Role ID and Permission IDs array are required",
      });
    }

    const assignments = await RolePermission.bulkAssignPermissionsToRole(
      role_id,
      permission_ids
    );

    res.json({
      success: true,
      message: `${assignments.length} permissions assigned to role successfully`,
      data: assignments,
    });
  } catch (error) {
    console.error("Error bulk assigning permissions to role:", error);
    res.status(500).json({
      success: false,
      message: "Failed to bulk assign permissions to role",
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/role-permissions/remove:
 *   delete:
 *     tags: [Role-Permissions]
 *     summary: Remove a permission from a role
 *     description: Remove a specific permission from a role (soft delete)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - role_id
 *               - permission_id
 *             properties:
 *               role_id:
 *                 type: integer
 *                 description: The ID of the role
 *                 example: 1
 *               permission_id:
 *                 type: integer
 *                 description: The ID of the permission to remove
 *                 example: 1
 *           examples:
 *             basic:
 *               summary: Remove permission from role
 *               value:
 *                 role_id: 1
 *                 permission_id: 1
 *     responses:
 *       200:
 *         description: Permission removed from role successfully
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
 *                   example: "Permission removed from role successfully"
 *                 data:
 *                   $ref: '#/components/schemas/RolePermission'
 *       400:
 *         description: Missing required fields
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Permission assignment not found
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
router.delete("/remove", async (req, res) => {
  try {
    const { role_id, permission_id } = req.body;

    // Validation
    if (!role_id || !permission_id) {
      return res.status(400).json({
        success: false,
        message: "Role ID and Permission ID are required",
      });
    }

    const removedAssignment = await RolePermission.removePermissionFromRole(
      role_id,
      permission_id
    );

    res.json({
      success: true,
      message: "Permission removed from role successfully",
      data: removedAssignment,
    });
  } catch (error) {
    console.error("Error removing permission from role:", error);

    if (error.code === "ASSIGNMENT_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to remove permission from role",
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/role-permissions/check/{roleId}/{permissionName}:
 *   get:
 *     tags: [Role-Permissions]
 *     summary: Check if role has specific permission
 *     description: Check whether a specific role has been assigned a specific permission
 *     parameters:
 *       - name: roleId
 *         in: path
 *         description: The ID of the role
 *         required: true
 *         schema:
 *           type: integer
 *           example: 1
 *       - name: permissionName
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
 *                       type: string
 *                       example: "1"
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
router.get("/check/:roleId/:permissionName", async (req, res) => {
  try {
    const { roleId, permissionName } = req.params;
    const hasPermission = await RolePermission.roleHasPermission(
      roleId,
      permissionName
    );

    res.json({
      success: true,
      data: {
        role_id: roleId,
        permission_name: permissionName,
        has_permission: hasPermission,
      },
    });
  } catch (error) {
    console.error("Error checking role permission:", error);
    res.status(500).json({
      success: false,
      message: "Failed to check role permission",
      error: error.message,
    });
  }
});

module.exports = router;
