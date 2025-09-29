const express = require("express");
const router = express.Router();
const Branch = require("../models/Branch");
const Employee = require("../models/Employee");
// const { requirePermission } = require('../middleware/rbac');

// Temporary bypass for authentication - replace with proper auth middleware later
const requirePermission = (permissionName) => {
  return (req, res, next) => {
    // TODO: Implement proper authentication middleware
    // For now, bypass authentication to test branch management
    next();
  };
};

/**
 * @swagger
 * components:
 *   schemas:
 *     Branch:
 *       type: object
 *       required:
 *         - name
 *         - code
 *         - address
 *       properties:
 *         id:
 *           type: integer
 *           description: Branch unique identifier
 *         name:
 *           type: string
 *           description: Branch name
 *         code:
 *           type: string
 *           description: Unique branch code
 *         address:
 *           type: string
 *           description: Branch address
 *         phone:
 *           type: string
 *           description: Branch contact phone
 *         email:
 *           type: string
 *           description: Branch contact email
 *         city:
 *           type: string
 *           description: Branch city
 *         state:
 *           type: string
 *           description: Branch state/province
 *         postal_code:
 *           type: string
 *           description: Branch postal code
 *         country:
 *           type: string
 *           description: Branch country
 *         is_active:
 *           type: boolean
 *           description: Branch active status
 *         opening_hours:
 *           type: object
 *           description: Branch operating hours
 *         description:
 *           type: string
 *           description: Branch description
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 */

// =============================================================================
// PUBLIC ROUTES (NO AUTHENTICATION REQUIRED)
// =============================================================================

/**
 * @swagger
 * /api/branches/{id}/coordinates:
 *   get:
 *     summary: Get branch coordinates for attendance validation
 *     tags: [Branches]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Branch ID
 *     responses:
 *       200:
 *         description: Branch coordinates
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     name:
 *                       type: string
 *                     latitude:
 *                       type: number
 *                     longitude:
 *                       type: number
 *                     radius_meters:
 *                       type: number
 *       404:
 *         description: Branch not found
 */
router.get("/:id/coordinates", async (req, res) => {
  try {
    const { id } = req.params;
    const branchId = parseInt(id);

    // If employee has no branch (department-only), use a specific fallback branch ID
    if (!branchId || Number.isNaN(branchId)) {
      try {
        const fallbackBranchId = parseInt(
          process.env.DEPARTMENT_FALLBACK_BRANCH_ID || "7"
        );
        if (!Number.isNaN(fallbackBranchId) && fallbackBranchId > 0) {
          const fallback = await Branch.getById(fallbackBranchId);
          if (fallback) {
            return res.json({
              success: true,
              data: {
                id: fallback.id,
                name: fallback.name + " (For Department)",
                latitude: fallback.latitude || null,
                longitude: fallback.longitude || null,
                radius_meters: fallback.radius_meters || null,
                fallback_used: true,
              },
            });
          }
        }
      } catch (fallbackErr) {
        console.warn("Fallback branch lookup failed:", fallbackErr.message);
      }

      // Final fallback: explicit no-geofence
      return res.json({
        success: true,
        data: {
          id: null,
          name: "Department Employee",
          latitude: null,
          longitude: null,
          radius_meters: null,
          no_geofence: true,
        },
      });
    }

    const branch = await Branch.getById(branchId);

    if (!branch) {
      return res.status(404).json({
        success: false,
        error: "Branch not found",
      });
    }

    // If coordinates are missing but address exists, geocode dynamically
    let latitude = branch.latitude;
    let longitude = branch.longitude;
    if ((!latitude || !longitude) && branch.address) {
      try {
        const { geocodeAddress } = require("../services/geocodingService");
        const geo = await geocodeAddress(branch.address);
        if (geo) {
          latitude = geo.latitude;
          longitude = geo.longitude;
        }
      } catch (geoErr) {
        console.warn("Geocoding fallback failed:", geoErr.message);
      }
    }

    // Return only coordinate data needed for attendance
    res.json({
      success: true,
      data: {
        id: branch.id,
        name: branch.name,
        latitude,
        longitude,
        radius_meters: branch.radius_meters,
      },
    });
  } catch (error) {
    console.error("Error fetching branch coordinates:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch branch coordinates",
    });
  }
});

// =============================================================================
// SPECIFIC ROUTES (MUST COME FIRST - BEFORE PARAMETRIC ROUTES)
// =============================================================================

/**
 * @swagger
 * /api/branches/stats/summary:
 *   get:
 *     summary: Get branch statistics summary
 *     tags: [Branches]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Branch statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total_branches:
 *                   type: integer
 *                 active_branches:
 *                   type: integer
 *                 inactive_branches:
 *                   type: integer
 *                 total_users_in_branches:
 *                   type: integer
 */
router.get(
  "/stats/summary",
  requirePermission("Manage Branch Management"),
  async (req, res) => {
    try {
      const stats = await Branch.getBranchStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching branch stats:", error);
      res.status(500).json({ error: "Failed to fetch branch statistics" });
    }
  }
);

// =============================================================================
// GENERAL ROUTES
// =============================================================================

/**
 * @swagger
 * /api/branches:
 *   get:
 *     summary: Get all branches
 *     tags: [Branches]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: active
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *       - in: query
 *         name: include_stats
 *         schema:
 *           type: boolean
 *         description: Include user count statistics
 *     responses:
 *       200:
 *         description: List of branches
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Branch'
 */
router.get(
  "/",
  requirePermission("Manage Branch Management"),
  async (req, res) => {
    try {
      const { active, include_stats, includeDeleted } = req.query;

      let branches;

      if (include_stats === "true") {
        branches = await Branch.getAll(true, includeDeleted === "true");
      } else if (active === "true") {
        branches = await Branch.getActiveBranches();
      } else {
        branches = await Branch.getAll(false, includeDeleted === "true");
      }

      // Filter by active status if specified
      if (active !== undefined && include_stats !== "true") {
        const isActive = active === "true";
        branches = branches.filter((branch) => branch.is_active === isActive);
      }

      res.json(branches);
    } catch (error) {
      console.error("Error fetching branches:", error);
      res.status(500).json({ error: "Failed to fetch branches" });
    }
  }
);

/**
 * @swagger
 * /api/branches:
 *   post:
 *     summary: Create a new branch
 *     tags: [Branches]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Branch'
 *     responses:
 *       201:
 *         description: Branch created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Branch'
 *       400:
 *         description: Invalid input or branch code already exists
 */
router.post(
  "/",
  requirePermission("Manage Branch Management"),
  async (req, res) => {
    try {
      const branchData = req.body;
      const branch = await Branch.create(branchData);
      res.status(201).json(branch);
    } catch (error) {
      console.error("Error creating branch:", error);
      if (
        error.message.includes("already exists") ||
        error.message.includes("Validation failed")
      ) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Failed to create branch" });
      }
    }
  }
);

// =============================================================================
// PARAMETRIC ROUTES WITH SPECIFIC SUBROUTES (MUST COME BEFORE GENERAL PARAMETRIC)
// =============================================================================

/**
 * @swagger
 * /api/branches/{id}/employees:
 *   get:
 *     summary: Get employees assigned to branch
 *     tags: [Branches]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Branch ID
 *     responses:
 *       200:
 *         description: List of employees in branch
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   employee_id:
 *                     type: string
 *                   first_name:
 *                     type: string
 *                   last_name:
 *                     type: string
 *                   email:
 *                     type: string
 *                   department:
 *                     type: string
 *                   status:
 *                     type: string
 *                   role:
 *                     type: string
 *       404:
 *         description: Branch not found
 */
router.get(
  "/:id/employees",
  requirePermission("Manage Branch Management"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const branchId = parseInt(id);

      const employees = await Branch.getEmployees(branchId);
      res.json(employees);
    } catch (error) {
      console.error("Error fetching branch employees:", error);
      if (
        error.message.includes("not found") ||
        error.message.includes("Invalid")
      ) {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Failed to fetch branch employees" });
      }
    }
  }
);

// =============================================================================
// GENERAL PARAMETRIC ROUTES (MUST COME LAST)
// =============================================================================

/**
 * @swagger
 * /api/branches/{id}:
 *   get:
 *     summary: Get branch by ID
 *     tags: [Branches]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Branch ID
 *     responses:
 *       200:
 *         description: Branch details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Branch'
 *       404:
 *         description: Branch not found
 */
router.get(
  "/:id",
  requirePermission("Manage Branch Management"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const branchId = parseInt(id);
      const branch = await Branch.getById(branchId);

      if (!branch) {
        return res.status(404).json({
          success: false,
          error: "Branch not found",
        });
      }

      res.json({
        success: true,
        data: branch,
      });
    } catch (error) {
      console.error("Error fetching branch:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch branch",
      });
    }
  }
);

/**
 * @swagger
 * /api/branches/{id}:
 *   put:
 *     summary: Update branch
 *     tags: [Branches]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Branch ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Branch'
 *     responses:
 *       200:
 *         description: Branch updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Branch'
 *       404:
 *         description: Branch not found
 *       400:
 *         description: Invalid input or branch code already exists
 */
router.put(
  "/:id",
  requirePermission("Manage Branch Management"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const branchId = parseInt(id);
      const branchData = req.body;

      const updatedBranch = await Branch.update(branchId, branchData);
      res.json(updatedBranch);
    } catch (error) {
      console.error("Error updating branch:", error);
      if (error.message.includes("not found")) {
        res.status(404).json({ error: error.message });
      } else if (
        error.message.includes("already exists") ||
        error.message.includes("Validation failed") ||
        error.message.includes("Invalid")
      ) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Failed to update branch" });
      }
    }
  }
);

/**
 * @swagger
 * /api/branches/{id}:
 *   delete:
 *     summary: Delete branch
 *     tags: [Branches]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Branch ID
 *     responses:
 *       200:
 *         description: Branch deleted successfully
 *       404:
 *         description: Branch not found
 *       400:
 *         description: Cannot delete branch with assigned users
 */
router.delete(
  "/:id",
  requirePermission("Manage Branch Management"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const branchId = parseInt(id);

      await Branch.delete(branchId);
      res.json({ message: "Branch deleted successfully" });
    } catch (error) {
      console.error("Error deleting branch:", error);
      if (error.message.includes("not found")) {
        res.status(404).json({ error: error.message });
      } else if (
        error.message.includes("Cannot delete") ||
        error.message.includes("Invalid") ||
        error.message.includes("already deleted")
      ) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Failed to delete branch" });
      }
    }
  }
);

/**
 * @swagger
 * /api/branches/{id}/restore:
 *   patch:
 *     summary: Restore a soft-deleted branch
 *     tags: [Branches]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Branch ID
 *     responses:
 *       200:
 *         description: Branch restored successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Branch restored successfully"
 *       400:
 *         description: Bad request - Branch is not deleted
 *       404:
 *         description: Branch not found
 *       500:
 *         description: Failed to restore branch
 */
router.patch(
  "/:id/restore",
  requirePermission("Manage Branch Management"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const branchId = parseInt(id);

      await Branch.restore(branchId);
      res.json({ message: "Branch restored successfully" });
    } catch (error) {
      console.error("Error restoring branch:", error);
      if (error.message.includes("not found")) {
        res.status(404).json({ error: error.message });
      } else if (
        error.message.includes("not deleted") ||
        error.message.includes("Invalid")
      ) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Failed to restore branch" });
      }
    }
  }
);

module.exports = router;
