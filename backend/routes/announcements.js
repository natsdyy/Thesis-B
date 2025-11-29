const express = require("express");
const router = express.Router();
const Announcement = require("../models/Announcement");
const { authenticateToken, requirePermission } = require("../middleware/rbac");

/**
 * @swagger
 * /api/announcements/public/active:
 *   get:
 *     summary: Get active announcements for public display
 *     tags: [Announcements]
 *     description: Public endpoint that returns only active announcements that are currently valid
 *     responses:
 *       200:
 *         description: Active announcements retrieved successfully
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
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       title:
 *                         type: string
 *                       subtitle:
 *                         type: string
 *                       description:
 *                         type: string
 *                       content:
 *                         type: string
 *                       image_url:
 *                         type: string
 *                       promo_details:
 *                         type: string
 *                       valid_from:
 *                         type: string
 *                         format: date-time
 *                       valid_until:
 *                         type: string
 *                         format: date-time
 *                       action_link:
 *                         type: string
 *                       action_text:
 *                         type: string
 */
router.get("/public/active", async (req, res) => {
  try {
    const announcements = await Announcement.getActiveAnnouncements();

    res.json({
      success: true,
      data: announcements,
      count: announcements.length,
    });
  } catch (error) {
    console.error("Error fetching active announcements:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching active announcements",
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/announcements:
 *   get:
 *     summary: Get all announcements (admin)
 *     tags: [Announcements]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: is_active
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in title, subtitle, or description
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Limit number of results
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *         description: Offset for pagination
 *     responses:
 *       200:
 *         description: Announcements retrieved successfully
 */
router.get("/", authenticateToken, async (req, res) => {
  try {
    const filters = {
      is_active: req.query.is_active !== undefined ? req.query.is_active === "true" : undefined,
      search: req.query.search,
      limit: req.query.limit ? parseInt(req.query.limit) : undefined,
      offset: req.query.offset ? parseInt(req.query.offset) : undefined,
    };

    // Remove undefined filters
    Object.keys(filters).forEach((key) => {
      if (filters[key] === undefined) {
        delete filters[key];
      }
    });

    const announcements = await Announcement.getAll(filters);

    res.json({
      success: true,
      data: announcements,
      count: announcements.length,
    });
  } catch (error) {
    console.error("Error fetching announcements:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching announcements",
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/announcements/{id}:
 *   get:
 *     summary: Get announcement by ID (admin)
 *     tags: [Announcements]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Announcement ID
 *     responses:
 *       200:
 *         description: Announcement retrieved successfully
 */
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const announcement = await Announcement.getById(req.params.id);

    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: "Announcement not found",
      });
    }

    res.json({
      success: true,
      data: announcement,
    });
  } catch (error) {
    console.error("Error fetching announcement:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching announcement",
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/announcements:
 *   post:
 *     summary: Create new announcement (admin)
 *     tags: [Announcements]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *             properties:
 *               title:
 *                 type: string
 *               subtitle:
 *                 type: string
 *               description:
 *                 type: string
 *               content:
 *                 type: string
 *               image_url:
 *                 type: string
 *               promo_details:
 *                 type: string
 *               valid_from:
 *                 type: string
 *                 format: date-time
 *               valid_until:
 *                 type: string
 *                 format: date-time
 *               action_link:
 *                 type: string
 *               action_text:
 *                 type: string
 *               is_active:
 *                 type: boolean
 *               display_order:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Announcement created successfully
 */
router.post("/", authenticateToken, requirePermission("announcements:create"), async (req, res) => {
  try {
    console.log("Received announcement data:", JSON.stringify(req.body, null, 2));
    
    const announcementData = {
      ...req.body,
      created_by: req.user?.id || req.user?.employee_id || null,
    };

    console.log("Processing announcement data:", JSON.stringify(announcementData, null, 2));

    const announcement = await Announcement.create(announcementData);

    res.status(201).json({
      success: true,
      message: "Announcement created successfully",
      data: announcement,
    });
  } catch (error) {
    console.error("Error creating announcement:", error);
    console.error("Error stack:", error.stack);
    res.status(500).json({
      success: false,
      message: error.message || "Error creating announcement",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * @swagger
 * /api/announcements/{id}:
 *   put:
 *     summary: Update announcement (admin)
 *     tags: [Announcements]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Announcement ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               subtitle:
 *                 type: string
 *               description:
 *                 type: string
 *               content:
 *                 type: string
 *               image_url:
 *                 type: string
 *               promo_details:
 *                 type: string
 *               valid_from:
 *                 type: string
 *                 format: date-time
 *               valid_until:
 *                 type: string
 *                 format: date-time
 *               action_link:
 *                 type: string
 *               action_text:
 *                 type: string
 *               is_active:
 *                 type: boolean
 *               display_order:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Announcement updated successfully
 */
router.put("/:id", authenticateToken, requirePermission("announcements:update"), async (req, res) => {
  try {
    const announcement = await Announcement.update(req.params.id, req.body);

    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: "Announcement not found",
      });
    }

    res.json({
      success: true,
      message: "Announcement updated successfully",
      data: announcement,
    });
  } catch (error) {
    console.error("Error updating announcement:", error);
    res.status(500).json({
      success: false,
      message: "Error updating announcement",
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/announcements/{id}:
 *   delete:
 *     summary: Delete announcement (admin)
 *     tags: [Announcements]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Announcement ID
 *     responses:
 *       200:
 *         description: Announcement deleted successfully
 */
router.delete("/:id", authenticateToken, requirePermission("announcements:delete"), async (req, res) => {
  try {
    // Check if announcement exists first
    const announcement = await Announcement.getById(req.params.id);
    
    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: "Announcement not found",
      });
    }

    // Perform hard delete (permanently remove from database)
    await Announcement.hardDelete(req.params.id);

    res.json({
      success: true,
      message: "Announcement deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting announcement:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting announcement",
      error: error.message,
    });
  }
});

module.exports = router;

