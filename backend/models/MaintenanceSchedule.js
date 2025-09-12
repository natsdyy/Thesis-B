const { db } = require("../config/database");

class MaintenanceSchedule {
  // Get all maintenance schedules with filters
  static async getAll(filters = {}) {
    try {
      let query = db("maintenance_schedules as ms")
        .select(
          "ms.*",
          "e.equipment_name",
          "e.equipment_code",
          db.raw(
            "COALESCE(u_assigned.first_name,'') || ' ' || COALESCE(u_assigned.last_name,'') as assigned_to_name"
          )
        )
        .leftJoin("equipment as e", "ms.equipment_id", "e.id")
        .leftJoin("employees as u_assigned", "ms.assigned_to", "u_assigned.id");

      // Apply filters
      if (filters.maintenance_type) {
        query = query.where("ms.maintenance_type", filters.maintenance_type);
      }

      if (filters.equipment_id) {
        query = query.where("ms.equipment_id", filters.equipment_id);
      }

      if (filters.assigned_to) {
        query = query.where("ms.assigned_to", filters.assigned_to);
      }

      if (filters.date_from) {
        query = query.where("ms.next_due_date", ">=", filters.date_from);
      }

      if (filters.date_to) {
        query = query.where("ms.next_due_date", "<=", filters.date_to);
      }

      if (filters.search) {
        query = query.where(function () {
          this.where("ms.task_name", "ilike", `%${filters.search}%`)
            .orWhere("ms.task_description", "ilike", `%${filters.search}%`)
            .orWhere("e.equipment_name", "ilike", `%${filters.search}%`);
        });
      }

      return await query.orderBy("ms.next_due_date", "asc");
    } catch (error) {
      console.error("Error fetching maintenance schedules:", error);
      throw new Error("Failed to retrieve maintenance schedules");
    }
  }

  // Get maintenance schedule by ID
  static async getById(id) {
    try {
      const schedule = await db("maintenance_schedules as ms")
        .select(
          "ms.*",
          "e.equipment_name",
          "e.equipment_code",
          db.raw(
            "COALESCE(u_assigned.first_name,'') || ' ' || COALESCE(u_assigned.last_name,'') as assigned_to_name"
          )
        )
        .leftJoin("equipment as e", "ms.equipment_id", "e.id")
        .leftJoin("employees as u_assigned", "ms.assigned_to", "u_assigned.id")
        .where("ms.id", id)
        .first();

      return schedule;
    } catch (error) {
      console.error("Error fetching maintenance schedule by ID:", error);
      throw new Error("Failed to retrieve maintenance schedule");
    }
  }

  // Create new maintenance schedule
  static async create(scheduleData) {
    try {
      const [schedule] = await db("maintenance_schedules")
        .insert({
          equipment_id: scheduleData.equipment_id,
          maintenance_type: scheduleData.maintenance_type,
          task_name: scheduleData.task_name,
          task_description:
            scheduleData.task_description || scheduleData.description,
          frequency_days: scheduleData.frequency_days || 30,
          last_performed: scheduleData.last_performed,
          next_due_date:
            scheduleData.next_due_date || scheduleData.scheduled_date,
          is_active: true,
          estimated_duration_minutes:
            scheduleData.estimated_duration_minutes || 60,
          assigned_to: scheduleData.assigned_to,
        })
        .returning("*");

      return await this.getById(schedule.id);
    } catch (error) {
      console.error("Error creating maintenance schedule:", error);
      throw new Error("Failed to create maintenance schedule");
    }
  }

  // Update maintenance schedule
  static async update(id, updateData) {
    try {
      const [updated] = await db("maintenance_schedules")
        .where("id", id)
        .update({
          ...updateData,
          updated_at: new Date(),
        })
        .returning("*");

      if (!updated) {
        throw new Error("Maintenance schedule not found");
      }

      return await this.getById(id);
    } catch (error) {
      console.error("Error updating maintenance schedule:", error);
      throw new Error("Failed to update maintenance schedule");
    }
  }

  // Update maintenance schedule status
  static async updateStatus(id, status, updatedBy, notes = null) {
    try {
      const updateData = {
        status,
        updated_at: new Date(),
      };

      // Handle status-specific updates
      if (status === "In Progress") {
        updateData.actual_start_date = new Date();
      }

      if (status === "Completed") {
        updateData.actual_end_date = new Date();
      }

      if (notes) {
        updateData.notes = notes;
      }

      const [updated] = await db("maintenance_schedules")
        .where("id", id)
        .update(updateData)
        .returning("*");

      if (!updated) {
        throw new Error("Maintenance schedule not found");
      }

      return updated;
    } catch (error) {
      console.error("Error updating maintenance schedule status:", error);
      throw new Error("Failed to update maintenance schedule status");
    }
  }

  // Generate unique maintenance number
  static async generateMaintenanceNumber() {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, "0");
    const day = String(new Date().getDate()).padStart(2, "0");

    const prefix = `MS${year}${month}${day}`;

    const lastSchedule = await db("maintenance_schedules")
      .where("maintenance_number", "like", `${prefix}%`)
      .orderBy("maintenance_number", "desc")
      .first();

    let sequence = 1;
    if (lastSchedule) {
      const lastSequence = parseInt(lastSchedule.maintenance_number.slice(-3));
      sequence = lastSequence + 1;
    }

    return `${prefix}${String(sequence).padStart(3, "0")}`;
  }

  // Get maintenance schedule statistics
  static async getStats() {
    try {
      const stats = await db("maintenance_schedules")
        .select(
          db.raw("COUNT(*) as total_schedules"),
          db.raw(
            "COUNT(CASE WHEN status = 'Scheduled' THEN 1 END) as scheduled"
          ),
          db.raw(
            "COUNT(CASE WHEN status = 'In Progress' THEN 1 END) as in_progress"
          ),
          db.raw(
            "COUNT(CASE WHEN status = 'Completed' THEN 1 END) as completed"
          ),
          db.raw("COUNT(CASE WHEN status = 'Overdue' THEN 1 END) as overdue")
        )
        .first();

      // Get overdue maintenance
      const today = new Date().toISOString().split("T")[0];
      const overdueStats = await db("maintenance_schedules")
        .select(db.raw("COUNT(*) as overdue_count"))
        .where("scheduled_date", "<", today)
        .where("status", "Scheduled")
        .first();

      return {
        ...stats,
        ...overdueStats,
      };
    } catch (error) {
      console.error("Error fetching maintenance schedule stats:", error);
      throw new Error("Failed to retrieve maintenance schedule statistics");
    }
  }

  // Get overdue maintenance schedules
  static async getOverdueSchedules() {
    try {
      const today = new Date().toISOString().split("T")[0];

      return await db("maintenance_schedules as ms")
        .select(
          "ms.*",
          "e.equipment_name",
          "e.equipment_code",
          db.raw(
            "COALESCE(u_assigned.first_name,'') || ' ' || COALESCE(u_assigned.last_name,'') as assigned_to_name"
          )
        )
        .leftJoin("equipment as e", "ms.equipment_id", "e.id")
        .leftJoin("employees as u_assigned", "ms.assigned_to", "u_assigned.id")
        .where("ms.scheduled_date", "<", today)
        .where("ms.status", "Scheduled")
        .orderBy("ms.scheduled_date", "asc");
    } catch (error) {
      console.error("Error fetching overdue maintenance schedules:", error);
      throw new Error("Failed to retrieve overdue maintenance schedules");
    }
  }

  // Delete maintenance schedule
  static async delete(id) {
    try {
      const [deleted] = await db("maintenance_schedules")
        .where("id", id)
        .del()
        .returning("*");

      if (!deleted) {
        throw new Error("Maintenance schedule not found");
      }

      return deleted;
    } catch (error) {
      console.error("Error deleting maintenance schedule:", error);
      throw new Error("Failed to delete maintenance schedule");
    }
  }
}

module.exports = MaintenanceSchedule;
