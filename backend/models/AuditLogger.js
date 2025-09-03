const { db } = require("../config/database");

class AuditLogger {
  /**
   * Log an action to the audit log
   * @param {Object} logData - Audit log data
   * @param {number} logData.menu_item_id - Menu item ID (optional)
   * @param {number} logData.sample_production_id - Sample production ID (optional)
   * @param {number} logData.quality_inspection_id - Quality inspection ID (optional)
   * @param {number} logData.user_id - User who performed the action
   * @param {string} logData.action_type - Type of action performed
   * @param {Object|string} logData.action_details - Details of the action
   * @param {string} logData.notes - Additional notes
   */
  static async log(logData) {
    try {
      const {
        menu_item_id,
        sample_production_id,
        quality_inspection_id,
        user_id,
        action_type,
        action_details,
        notes,
      } = logData;

      // Convert action_details to JSON string if it's an object
      const detailsJson =
        typeof action_details === "object"
          ? JSON.stringify(action_details)
          : action_details;

      const [logEntry] = await db("menu_item_audit_log").insert({
        menu_item_id,
        sample_production_id,
        quality_inspection_id,
        user_id,
        action_type,
        action_details: detailsJson,
        notes,
        created_at: new Date(),
        updated_at: new Date(),
      });

      return logEntry;
    } catch (error) {
      console.error("Error creating audit log:", error);
      // Don't throw error to prevent audit logging from breaking main functionality
      return null;
    }
  }

  /**
   * Get audit logs for a specific menu item
   * @param {number} menuItemId - Menu item ID
   * @param {Object} options - Query options
   */
  static async getLogsForMenuItem(menuItemId, options = {}) {
    try {
      let query = db("menu_item_audit_log as al")
        .leftJoin("users as u", "al.user_id", "u.id")
        .select("al.*", "u.name as user_name", "u.email as user_email")
        .where("al.menu_item_id", menuItemId)
        .orderBy("al.created_at", "desc");

      if (options.limit) {
        query = query.limit(options.limit);
      }

      if (options.action_type) {
        query = query.where("al.action_type", options.action_type);
      }

      if (options.date_from) {
        query = query.where("al.created_at", ">=", options.date_from);
      }

      if (options.date_to) {
        query = query.where("al.created_at", "<=", options.date_to);
      }

      const logs = await query;

      // Parse action_details JSON
      return logs.map((log) => ({
        ...log,
        action_details:
          typeof log.action_details === "string"
            ? JSON.parse(log.action_details)
            : log.action_details,
      }));
    } catch (error) {
      console.error("Error fetching audit logs:", error);
      throw new Error("Failed to retrieve audit logs");
    }
  }

  /**
   * Get audit logs for a specific sample production
   * @param {number} sampleProductionId - Sample production ID
   */
  static async getLogsForSampleProduction(sampleProductionId) {
    try {
      const logs = await db("menu_item_audit_log as al")
        .leftJoin("users as u", "al.user_id", "u.id")
        .select("al.*", "u.name as user_name", "u.email as user_email")
        .where("al.sample_production_id", sampleProductionId)
        .orderBy("al.created_at", "desc");

      return logs.map((log) => ({
        ...log,
        action_details:
          typeof log.action_details === "string"
            ? JSON.parse(log.action_details)
            : log.action_details,
      }));
    } catch (error) {
      console.error("Error fetching sample production audit logs:", error);
      throw new Error("Failed to retrieve sample production audit logs");
    }
  }

  /**
   * Get audit logs for a specific quality inspection
   * @param {number} qualityInspectionId - Quality inspection ID
   */
  static async getLogsForQualityInspection(qualityInspectionId) {
    try {
      const logs = await db("menu_item_audit_log as al")
        .leftJoin("users as u", "al.user_id", "u.id")
        .select("al.*", "u.name as user_name", "u.email as user_email")
        .where("al.quality_inspection_id", qualityInspectionId)
        .orderBy("al.created_at", "desc");

      return logs.map((log) => ({
        ...log,
        action_details:
          typeof log.action_details === "string"
            ? JSON.parse(log.action_details)
            : log.action_details,
      }));
    } catch (error) {
      console.error("Error fetching quality inspection audit logs:", error);
      throw new Error("Failed to retrieve quality inspection audit logs");
    }
  }

  /**
   * Get all audit logs with filtering
   * @param {Object} filters - Filter options
   */
  static async getAllLogs(filters = {}) {
    try {
      let query = db("menu_item_audit_log as al")
        .leftJoin("users as u", "al.user_id", "u.id")
        .leftJoin("menu_items as mi", "al.menu_item_id", "mi.id")
        .leftJoin(
          "sample_productions as sp",
          "al.sample_production_id",
          "sp.id"
        )
        .leftJoin(
          "menu_quality_inspections as qi",
          "al.quality_inspection_id",
          "qi.id"
        )
        .select(
          "al.*",
          "u.name as user_name",
          "u.email as user_email",
          "mi.menu_item_name",
          "sp.sample_batch_number",
          "qi.inspection_number"
        )
        .orderBy("al.created_at", "desc");

      if (filters.menu_item_id) {
        query = query.where("al.menu_item_id", filters.menu_item_id);
      }

      if (filters.user_id) {
        query = query.where("al.user_id", filters.user_id);
      }

      if (filters.action_type) {
        query = query.where("al.action_type", filters.action_type);
      }

      if (filters.date_from) {
        query = query.where("al.created_at", ">=", filters.date_from);
      }

      if (filters.date_to) {
        query = query.where("al.created_at", "<=", filters.date_to);
      }

      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      const logs = await query;

      return logs.map((log) => ({
        ...log,
        action_details:
          typeof log.action_details === "string"
            ? JSON.parse(log.action_details)
            : log.action_details,
      }));
    } catch (error) {
      console.error("Error fetching all audit logs:", error);
      throw new Error("Failed to retrieve audit logs");
    }
  }

  /**
   * Get audit statistics
   */
  static async getAuditStats() {
    try {
      const stats = await db("menu_item_audit_log")
        .select(
          db.raw("COUNT(*) as total_logs"),
          db.raw("COUNT(DISTINCT menu_item_id) as menu_items_affected"),
          db.raw("COUNT(DISTINCT user_id) as active_users"),
          db.raw(
            "COUNT(CASE WHEN action_type = 'CREATED' THEN 1 END) as items_created"
          ),
          db.raw(
            "COUNT(CASE WHEN action_type = 'APPROVED_FOR_PRODUCTION' THEN 1 END) as items_approved"
          ),
          db.raw(
            "COUNT(CASE WHEN action_type = 'QUALITY_PASSED' THEN 1 END) as quality_passed"
          ),
          db.raw(
            "COUNT(CASE WHEN action_type = 'QUALITY_FAILED' THEN 1 END) as quality_failed"
          )
        )
        .first();

      // Get recent activity (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const recentActivity = await db("menu_item_audit_log")
        .where("created_at", ">=", sevenDaysAgo)
        .count("* as recent_logs")
        .first();

      return {
        ...stats,
        recent_activity: parseInt(recentActivity.recent_logs) || 0,
      };
    } catch (error) {
      console.error("Error fetching audit stats:", error);
      throw new Error("Failed to retrieve audit statistics");
    }
  }
}

module.exports = AuditLogger;
