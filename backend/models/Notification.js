const { db } = require("../config/database");
const { getCurrentPhilippineTime } = require("../utils/timezoneUtils");

class Notification {
  // Create a new notification
  static async create(notificationData) {
    try {
      const [notification] = await db("notifications")
        .insert({
          employee_id: notificationData.employee_id || null,
          department: notificationData.department,
          role_filter: notificationData.role_filter || null,
          notification_type: notificationData.notification_type,
          title: notificationData.title,
          message: notificationData.message,
          reference_id: notificationData.reference_id || null,
          reference_table: notificationData.reference_table || null,
          action_url: notificationData.action_url || null,
          created_at: getCurrentPhilippineTime(),
          updated_at: getCurrentPhilippineTime(),
        })
        .returning("*");

      return notification;
    } catch (error) {
      console.error("Error creating notification:", error);
      throw error;
    }
  }

  // Get notifications by employee ID
  static async getByEmployee(employeeId, filters = {}) {
    try {
      let query = db("notifications")
        .where(function () {
          this.where("employee_id", employeeId).orWhere("employee_id", null);
        })
        .whereNull("deleted_at")
        .orderBy("created_at", "desc");

      // Apply filters
      if (filters.is_read !== undefined) {
        query = query.where("is_read", filters.is_read);
      }
      if (filters.notification_type) {
        query = query.where("notification_type", filters.notification_type);
      }
      if (filters.department) {
        query = query.where("department", filters.department);
      }
      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      const notifications = await query;
      return notifications;
    } catch (error) {
      console.error("Error fetching notifications by employee:", error);
      throw error;
    }
  }

  // Get notifications by department
  static async getByDepartment(department, roleFilter = null, filters = {}) {
    try {
      let query = db("notifications")
        .where("department", department)
        .whereNull("deleted_at")
        .orderBy("created_at", "desc");

      // Apply role filter if specified
      if (roleFilter) {
        query = query.where("role_filter", roleFilter);
      }

      // Apply filters
      if (filters.is_read !== undefined) {
        query = query.where("is_read", filters.is_read);
      }
      if (filters.notification_type) {
        query = query.where("notification_type", filters.notification_type);
      }
      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      const notifications = await query;
      return notifications;
    } catch (error) {
      console.error("Error fetching notifications by department:", error);
      throw error;
    }
  }

  // Mark notification as read
  static async markAsRead(id, employeeId = null) {
    try {
      let query = db("notifications").where("id", id).whereNull("deleted_at");

      // If employeeId provided, ensure employee can only mark their own notifications as read
      if (employeeId) {
        query = query.where(function () {
          this.where("employee_id", employeeId).orWhere("employee_id", null);
        });
      }

      const [updated] = await query
        .update({
          is_read: true,
          updated_at: getCurrentPhilippineTime(),
        })
        .returning("*");

      return updated;
    } catch (error) {
      console.error("Error marking notification as read:", error);
      throw error;
    }
  }

  // Mark all notifications as read for employee or department
  static async markAllAsRead(employeeId = null, department = null) {
    try {
      let query = db("notifications")
        .where("is_read", false)
        .whereNull("deleted_at");

      if (employeeId) {
        query = query.where(function () {
          this.where("employee_id", employeeId).orWhere("employee_id", null);
        });
      }

      if (department) {
        query = query.where("department", department);
      }

      const updated = await query.update({
        is_read: true,
        updated_at: getCurrentPhilippineTime(),
      });

      return updated;
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      throw error;
    }
  }

  // Get unread count for employee or department
  static async getUnreadCount(employeeId = null, department = null) {
    try {
      let query = db("notifications")
        .where("is_read", false)
        .whereNull("deleted_at");

      if (employeeId) {
        query = query.where(function () {
          this.where("employee_id", employeeId).orWhere("employee_id", null);
        });
      }

      if (department) {
        query = query.where("department", department);
      }

      const result = await query.count("* as count").first();
      return parseInt(result.count);
    } catch (error) {
      console.error("Error getting unread count:", error);
      throw error;
    }
  }

  // Soft delete notification
  static async delete(id) {
    try {
      const [deleted] = await db("notifications")
        .where("id", id)
        .whereNull("deleted_at")
        .update({
          deleted_at: getCurrentPhilippineTime(),
          updated_at: getCurrentPhilippineTime(),
        })
        .returning("*");

      return deleted;
    } catch (error) {
      console.error("Error deleting notification:", error);
      throw error;
    }
  }

  // Get notification by ID
  static async getById(id) {
    try {
      const notification = await db("notifications")
        .where("id", id)
        .whereNull("deleted_at")
        .first();

      return notification;
    } catch (error) {
      console.error("Error fetching notification by ID:", error);
      throw error;
    }
  }

  // Create notifications for multiple users/departments
  static async createBulk(notificationsData) {
    try {
      const notifications = notificationsData.map((data) => ({
        employee_id: data.employee_id || null,
        department: data.department,
        role_filter: data.role_filter || null,
        notification_type: data.notification_type,
        title: data.title,
        message: data.message,
        reference_id: data.reference_id || null,
        reference_table: data.reference_table || null,
        action_url: data.action_url || null,
        created_at: getCurrentPhilippineTime(),
        updated_at: getCurrentPhilippineTime(),
      }));

      const created = await db("notifications")
        .insert(notifications)
        .returning("*");

      return created;
    } catch (error) {
      console.error("Error creating bulk notifications:", error);
      throw error;
    }
  }
}

module.exports = Notification;
