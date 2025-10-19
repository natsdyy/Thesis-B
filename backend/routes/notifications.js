const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/rbac");
const Notification = require("../models/Notification");

/**
 * @swagger
 * /api/notifications:
 *   get:
 *     summary: Get notifications for the authenticated user
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: is_read
 *         schema:
 *           type: boolean
 *         description: Filter by read status
 *       - in: query
 *         name: notification_type
 *         schema:
 *           type: string
 *         description: Filter by notification type
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of notifications to return
 *     responses:
 *       200:
 *         description: Notifications retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get("/", authenticateToken, async (req, res) => {
  try {
    const { is_read, notification_type, limit = 20 } = req.query;
    const employeeId = req.user.id;
    const userDepartment = req.user.department;

    // Get employee-specific notifications
    const employeeNotifications = await Notification.getByEmployee(employeeId, {
      is_read: is_read !== undefined ? is_read === "true" : undefined,
      notification_type,
      limit: parseInt(limit),
    });

    // Get department-wide notifications (where employee_id is null)
    const departmentNotifications = await Notification.getByDepartment(
      userDepartment,
      null,
      {
        is_read: is_read !== undefined ? is_read === "true" : undefined,
        notification_type,
        limit: parseInt(limit),
      }
    );

    // Combine and sort notifications
    const allNotifications = [
      ...employeeNotifications,
      ...departmentNotifications,
    ]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, parseInt(limit));

    res.json({
      success: true,
      data: allNotifications,
      count: allNotifications.length,
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch notifications",
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/notifications/unread-count:
 *   get:
 *     summary: Get unread notification count for the authenticated user
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Unread count retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get("/unread-count", authenticateToken, async (req, res) => {
  try {
    const employeeId = req.user.id;
    const userDepartment = req.user.department;

    // Get unread count for employee
    const employeeUnreadCount = await Notification.getUnreadCount(employeeId);

    // Get unread count for department (excluding employee-specific ones to avoid double counting)
    const departmentUnreadCount = await Notification.getUnreadCount(
      null,
      userDepartment
    );

    // Total unread count
    const totalUnreadCount = employeeUnreadCount + departmentUnreadCount;

    res.json({
      success: true,
      data: {
        unread_count: totalUnreadCount,
        employee_unread: employeeUnreadCount,
        department_unread: departmentUnreadCount,
      },
    });
  } catch (error) {
    console.error("Error fetching unread count:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch unread count",
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/notifications/{id}/read:
 *   patch:
 *     summary: Mark a notification as read
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Notification ID
 *     responses:
 *       200:
 *         description: Notification marked as read
 *       404:
 *         description: Notification not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.patch("/:id/read", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const employeeId = req.user.id;

    const updated = await Notification.markAsRead(id, employeeId);

    if (!updated) {
      return res.status(404).json({
        success: false,
        message:
          "Notification not found or you don't have permission to mark it as read",
      });
    }

    res.json({
      success: true,
      message: "Notification marked as read",
      data: updated,
    });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    res.status(500).json({
      success: false,
      message: "Failed to mark notification as read",
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/notifications/mark-all-read:
 *   patch:
 *     summary: Mark all notifications as read for the authenticated user
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All notifications marked as read
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.patch("/mark-all-read", authenticateToken, async (req, res) => {
  try {
    const employeeId = req.user.id;
    const userDepartment = req.user.department;

    // Mark employee-specific notifications as read
    await Notification.markAllAsRead(employeeId);

    // Mark department-wide notifications as read
    await Notification.markAllAsRead(null, userDepartment);

    res.json({
      success: true,
      message: "All notifications marked as read",
    });
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    res.status(500).json({
      success: false,
      message: "Failed to mark all notifications as read",
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/notifications/{id}:
 *   delete:
 *     summary: Delete a notification (soft delete)
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Notification ID
 *     responses:
 *       200:
 *         description: Notification deleted successfully
 *       404:
 *         description: Notification not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const employeeId = req.user.id;

    // Check if notification exists and belongs to user
    const notification = await Notification.getById(id);
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    // Check if user can delete this notification
    // User can delete their own notifications or department-wide notifications
    if (notification.employee_id && notification.employee_id !== employeeId) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to delete this notification",
      });
    }

    const deleted = await Notification.delete(id);

    res.json({
      success: true,
      message: "Notification deleted successfully",
      data: deleted,
    });
  } catch (error) {
    console.error("Error deleting notification:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete notification",
      error: error.message,
    });
  }
});

module.exports = router;
