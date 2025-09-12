const { db } = require("../config/database");

class WorkOrder {
  // Get all work orders with filters
  static async getAll(filters = {}) {
    try {
      let query = db("work_orders as wo")
        .select(
          "wo.*",
          "po.product_name",
          "po.order_number as production_order_number",
          db.raw(
            "COALESCE(u_assigned.first_name,'') || ' ' || COALESCE(u_assigned.last_name,'') as assigned_to_name"
          ),
          db.raw(
            "COALESCE(u_created.first_name,'') || ' ' || COALESCE(u_created.last_name,'') as created_by_name"
          )
        )
        .leftJoin("production_orders as po", "wo.production_order_id", "po.id")
        .leftJoin("employees as u_assigned", "wo.assigned_to", "u_assigned.id")
        .leftJoin("employees as u_created", "wo.created_by", "u_created.id");

      // Apply filters
      if (filters.status) {
        query = query.where("wo.status", filters.status);
      }

      if (filters.priority) {
        query = query.where("wo.priority", filters.priority);
      }

      if (filters.task_type) {
        query = query.where("wo.task_type", filters.task_type);
      }

      if (filters.assigned_to) {
        query = query.where("wo.assigned_to", filters.assigned_to);
      }

      if (filters.production_order_id) {
        query = query.where(
          "wo.production_order_id",
          filters.production_order_id
        );
      }

      if (filters.date_from) {
        query = query.where("wo.scheduled_start", ">=", filters.date_from);
      }

      if (filters.date_to) {
        query = query.where("wo.scheduled_start", "<=", filters.date_to);
      }

      if (filters.search) {
        query = query.where(function () {
          this.where("wo.task_name", "ilike", `%${filters.search}%`)
            .orWhere("wo.work_order_number", "ilike", `%${filters.search}%`)
            .orWhere("wo.task_description", "ilike", `%${filters.search}%`);
        });
      }

      return await query.orderBy("wo.scheduled_start", "asc");
    } catch (error) {
      console.error("Error fetching work orders:", error);
      throw new Error("Failed to retrieve work orders");
    }
  }

  // Get work order by ID
  static async getById(id) {
    try {
      const workOrder = await db("work_orders as wo")
        .select(
          "wo.*",
          "po.product_name",
          "po.order_number as production_order_number",
          db.raw(
            "COALESCE(u_assigned.first_name,'') || ' ' || COALESCE(u_assigned.last_name,'') as assigned_to_name"
          ),
          db.raw(
            "COALESCE(u_created.first_name,'') || ' ' || COALESCE(u_created.last_name,'') as created_by_name"
          )
        )
        .leftJoin("production_orders as po", "wo.production_order_id", "po.id")
        .leftJoin("employees as u_assigned", "wo.assigned_to", "u_assigned.id")
        .leftJoin("employees as u_created", "wo.created_by", "u_created.id")
        .where("wo.id", id)
        .first();

      return workOrder;
    } catch (error) {
      console.error("Error fetching work order by ID:", error);
      throw new Error("Failed to retrieve work order");
    }
  }

  // Create new work order
  static async create(workOrderData) {
    const trx = await db.transaction();

    try {
      // Generate work order number
      const workOrderNumber = await this.generateWorkOrderNumber();

      const [workOrder] = await trx("work_orders")
        .insert({
          work_order_number: workOrderNumber,
          production_order_id: workOrderData.production_order_id,
          task_name: workOrderData.task_name,
          task_description: workOrderData.task_description,
          task_type: workOrderData.task_type,
          assigned_to: workOrderData.assigned_to,
          priority: workOrderData.priority || "Normal",
          scheduled_start: workOrderData.scheduled_start,
          scheduled_end: workOrderData.scheduled_end,
          estimated_duration_minutes: workOrderData.estimated_duration_minutes,
          created_by: workOrderData.created_by,
        })
        .returning("*");

      await trx.commit();
      return await this.getById(workOrder.id);
    } catch (error) {
      await trx.rollback();
      console.error("Error creating work order:", error);
      throw new Error("Failed to create work order");
    }
  }

  // Update work order status
  static async updateStatus(id, status, updatedBy, notes = null) {
    const trx = await db.transaction();

    try {
      const updateData = {
        status,
        updated_at: new Date(),
      };

      // Handle status-specific updates
      if (status === "In Progress" && !(await this.hasActualStartTime(id))) {
        updateData.actual_start = new Date();
      }

      if (status === "Completed") {
        updateData.actual_end = new Date();

        // Calculate actual duration if we have start time
        const workOrder = await trx("work_orders").where("id", id).first();
        if (workOrder.actual_start) {
          const startTime = new Date(workOrder.actual_start);
          const endTime = new Date();
          const durationMs = endTime - startTime;
          updateData.actual_duration_minutes = Math.round(
            durationMs / (1000 * 60)
          );
        }
      }

      if (notes) {
        updateData.completion_notes = notes;
      }

      const [updated] = await trx("work_orders")
        .where("id", id)
        .update(updateData)
        .returning("*");

      if (!updated) {
        throw new Error("Work order not found");
      }

      await trx.commit();
      return updated;
    } catch (error) {
      await trx.rollback();
      console.error("Error updating work order status:", error);
      throw new Error("Failed to update work order status");
    }
  }

  // Update work order
  static async update(id, updateData) {
    const trx = await db.transaction();

    try {
      const [updated] = await trx("work_orders")
        .where("id", id)
        .update({
          ...updateData,
          updated_at: new Date(),
        })
        .returning("*");

      if (!updated) {
        throw new Error("Work order not found");
      }

      await trx.commit();
      return await this.getById(id);
    } catch (error) {
      await trx.rollback();
      console.error("Error updating work order:", error);
      throw new Error("Failed to update work order");
    }
  }

  // Generate unique work order number
  static async generateWorkOrderNumber() {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, "0");
    const day = String(new Date().getDate()).padStart(2, "0");

    const prefix = `WO${year}${month}${day}`;

    const lastWorkOrder = await db("work_orders")
      .where("work_order_number", "like", `${prefix}%`)
      .orderBy("work_order_number", "desc")
      .first();

    let sequence = 1;
    if (lastWorkOrder) {
      const lastSequence = parseInt(lastWorkOrder.work_order_number.slice(-3));
      sequence = lastSequence + 1;
    }

    return `${prefix}${String(sequence).padStart(3, "0")}`;
  }

  // Check if work order has actual start time
  static async hasActualStartTime(id) {
    const workOrder = await db("work_orders")
      .select("actual_start")
      .where("id", id)
      .first();

    return workOrder && workOrder.actual_start !== null;
  }

  // Get work orders by production order
  static async getByProductionOrder(productionOrderId) {
    try {
      return await db("work_orders as wo")
        .select(
          "wo.*",
          db.raw(
            "COALESCE(u_assigned.first_name,'') || ' ' || COALESCE(u_assigned.last_name,'') as assigned_to_name"
          ),
          db.raw(
            "COALESCE(u_created.first_name,'') || ' ' || COALESCE(u_created.last_name,'') as created_by_name"
          )
        )
        .leftJoin("employees as u_assigned", "wo.assigned_to", "u_assigned.id")
        .leftJoin("employees as u_created", "wo.created_by", "u_created.id")
        .where("wo.production_order_id", productionOrderId)
        .orderBy("wo.scheduled_start", "asc");
    } catch (error) {
      console.error("Error fetching work orders by production order:", error);
      throw new Error("Failed to retrieve work orders");
    }
  }

  // Get work order statistics
  static async getStats() {
    try {
      const stats = await db("work_orders")
        .select(
          db.raw("COUNT(*) as total_work_orders"),
          db.raw(
            "COUNT(CASE WHEN status = 'Pending' THEN 1 END) as pending_orders"
          ),
          db.raw(
            "COUNT(CASE WHEN status = 'In Progress' THEN 1 END) as in_progress_orders"
          ),
          db.raw(
            "COUNT(CASE WHEN status = 'Completed' THEN 1 END) as completed_orders"
          ),
          db.raw("AVG(actual_duration_minutes) as avg_duration"),
          db.raw("AVG(estimated_duration_minutes) as avg_estimated_duration")
        )
        .first();

      // Calculate efficiency
      const avgActual = parseFloat(stats.avg_duration || 0);
      const avgEstimated = parseFloat(stats.avg_estimated_duration || 0);
      const efficiency =
        avgEstimated > 0 ? Math.round((avgEstimated / avgActual) * 100) : 0;

      return {
        ...stats,
        efficiency,
      };
    } catch (error) {
      console.error("Error fetching work order stats:", error);
      throw new Error("Failed to retrieve work order statistics");
    }
  }

  // Delete work order
  static async delete(id) {
    try {
      const [deleted] = await db("work_orders")
        .where("id", id)
        .del()
        .returning("*");

      if (!deleted) {
        throw new Error("Work order not found");
      }

      return deleted;
    } catch (error) {
      console.error("Error deleting work order:", error);
      throw new Error("Failed to delete work order");
    }
  }
}

module.exports = WorkOrder;
