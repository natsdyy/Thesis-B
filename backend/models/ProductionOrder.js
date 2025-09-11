const { db } = require("../config/database");

class ProductionOrder {
  // Get all production orders with filters
  static async getAll(filters = {}) {
    try {
      let query = db("production_orders as po")
        .select(
          "po.*",
          "r.recipe_name",
          "r.recipe_code",
          "r.category as recipe_category",
          db.raw(
            "COALESCE(u_created.first_name,'') || ' ' || COALESCE(u_created.last_name,'') as created_by_name"
          ),
          db.raw(
            "COALESCE(u_assigned.first_name,'') || ' ' || COALESCE(u_assigned.last_name,'') as assigned_to_name"
          ),
          db.raw("COUNT(pb.id) as batch_count"),
          db.raw("SUM(pb.quantity_produced) as total_produced")
        )
        .leftJoin("recipes as r", "po.recipe_id", "r.id")
        .leftJoin("employees as u_created", "po.created_by", "u_created.id")
        .leftJoin("employees as u_assigned", "po.assigned_to", "u_assigned.id")
        .leftJoin("production_batches as pb", "po.id", "pb.production_order_id")
        .whereNull("po.deleted_at")
        .groupBy(
          "po.id",
          "r.recipe_name",
          "r.recipe_code",
          "r.category",
          "u_created.name",
          "u_assigned.name"
        );

      // Apply filters
      if (filters.status) {
        query = query.where("po.status", filters.status);
      }

      if (filters.priority) {
        query = query.where("po.priority", filters.priority);
      }

      if (filters.assigned_to) {
        query = query.where("po.assigned_to", filters.assigned_to);
      }

      if (filters.date_from) {
        query = query.where("po.planned_start_date", ">=", filters.date_from);
      }

      if (filters.date_to) {
        query = query.where("po.planned_start_date", "<=", filters.date_to);
      }

      if (filters.search) {
        query = query.where(function () {
          this.where("po.order_number", "ilike", `%${filters.search}%`)
            .orWhere("po.product_name", "ilike", `%${filters.search}%`)
            .orWhere("r.recipe_name", "ilike", `%${filters.search}%`);
        });
      }

      return await query.orderBy("po.created_at", "desc");
    } catch (error) {
      console.error("Error fetching production orders:", error);
      throw new Error("Failed to retrieve production orders");
    }
  }

  // Get production order by ID with full details
  static async getById(id) {
    try {
      const order = await db("production_orders as po")
        .select(
          "po.*",
          "r.recipe_name",
          "r.recipe_code",
          "r.category as recipe_category",
          "r.instructions",
          "r.prep_time_minutes",
          "r.cooking_time_minutes",
          "r.total_time_minutes",
          "u_created.name as created_by_name",
          "u_assigned.name as assigned_to_name"
        )
        .leftJoin("recipes as r", "po.recipe_id", "r.id")
        .leftJoin("employees as u_created", "po.created_by", "u_created.id")
        .leftJoin("employees as u_assigned", "po.assigned_to", "u_assigned.id")
        .where("po.id", id)
        .whereNull("po.deleted_at")
        .first();

      if (order) {
        // Get batches for this order
        order.batches = await db("production_batches as pb")
          .select(
            "pb.*",
            db.raw(
              "COALESCE(u.first_name,'') || ' ' || COALESCE(u.last_name,'') as produced_by_name"
            )
          )
          .leftJoin("employees as u", "pb.produced_by", "u.id")
          .where("pb.production_order_id", id)
          .orderBy("pb.created_at", "desc");

        // Get work orders for this production order
        order.work_orders = await db("work_orders as wo")
          .select(
            "wo.*",
            db.raw(
              "COALESCE(u_assigned.first_name,'') || ' ' || COALESCE(u_assigned.last_name,'') as assigned_to_name"
            ),
            db.raw(
              "COALESCE(u_created.first_name,'') || ' ' || COALESCE(u_created.last_name,'') as created_by_name"
            )
          )
          .leftJoin(
            "employees as u_assigned",
            "wo.assigned_to",
            "u_assigned.id"
          )
          .leftJoin("employees as u_created", "wo.created_by", "u_created.id")
          .where("wo.production_order_id", id)
          .orderBy("wo.scheduled_start", "asc");
      }

      return order;
    } catch (error) {
      console.error("Error fetching production order by ID:", error);
      throw new Error("Failed to retrieve production order");
    }
  }

  // Create new production order
  static async create(orderData) {
    const trx = await db.transaction();

    try {
      // Generate order number
      const orderNumber = await this.generateOrderNumber();

      const [order] = await trx("production_orders")
        .insert({
          order_number: orderNumber,
          product_name: orderData.product_name,
          recipe_id: orderData.recipe_id,
          quantity_planned: orderData.quantity_planned,
          unit_of_measure: orderData.unit_of_measure,
          priority: orderData.priority || "Normal",
          status: "Draft",
          planned_start_date: orderData.planned_start_date,
          planned_end_date: orderData.planned_end_date,
          assigned_to: orderData.assigned_to,
          created_by: orderData.created_by,
          notes: orderData.notes,
          estimated_cost: orderData.estimated_cost || 0,
        })
        .returning("*");

      // If work orders are provided, create them
      if (orderData.work_orders && orderData.work_orders.length > 0) {
        const workOrders = orderData.work_orders.map((wo) => ({
          work_order_number: `WO-${orderNumber}-${wo.sequence || 1}`,
          production_order_id: order.id,
          task_name: wo.task_name,
          task_description: wo.task_description,
          task_type: wo.task_type,
          assigned_to: wo.assigned_to,
          scheduled_start: wo.scheduled_start,
          scheduled_end: wo.scheduled_end,
          estimated_duration_minutes: wo.estimated_duration_minutes,
          created_by: orderData.created_by,
        }));

        await trx("work_orders").insert(workOrders);
      }

      await trx.commit();
      return await this.getById(order.id);
    } catch (error) {
      await trx.rollback();
      console.error("Error creating production order:", error);
      throw new Error("Failed to create production order");
    }
  }

  // Update production order
  static async update(id, updateData) {
    const trx = await db.transaction();

    try {
      const [updated] = await trx("production_orders")
        .where("id", id)
        .whereNull("deleted_at")
        .update({
          ...updateData,
          updated_at: new Date(),
        })
        .returning("*");

      if (!updated) {
        throw new Error("Production order not found");
      }

      await trx.commit();
      return await this.getById(id);
    } catch (error) {
      await trx.rollback();
      console.error("Error updating production order:", error);
      throw new Error("Failed to update production order");
    }
  }

  // Update production order status
  static async updateStatus(id, status, updatedBy, notes = null) {
    const trx = await db.transaction();

    try {
      const updateData = {
        status,
        updated_at: new Date(),
      };

      // Handle status-specific updates
      if (status === "In Progress" && !(await this.hasActualStartDate(id))) {
        updateData.actual_start_date = new Date();
      }

      if (status === "Completed") {
        updateData.actual_end_date = new Date();
      }

      if (notes) {
        updateData.notes = notes;
      }

      const [updated] = await trx("production_orders")
        .where("id", id)
        .whereNull("deleted_at")
        .update(updateData)
        .returning("*");

      if (!updated) {
        throw new Error("Production order not found");
      }

      await trx.commit();
      return updated;
    } catch (error) {
      await trx.rollback();
      console.error("Error updating production order status:", error);
      throw new Error("Failed to update production order status");
    }
  }

  // Get dashboard statistics
  static async getDashboardStats() {
    try {
      const stats = await db("production_orders")
        .select(
          db.raw("COUNT(*) as total_orders"),
          db.raw(
            "COUNT(CASE WHEN status = 'Draft' THEN 1 END) as draft_orders"
          ),
          db.raw(
            "COUNT(CASE WHEN status = 'Scheduled' THEN 1 END) as scheduled_orders"
          ),
          db.raw(
            "COUNT(CASE WHEN status = 'In Progress' THEN 1 END) as in_progress_orders"
          ),
          db.raw(
            "COUNT(CASE WHEN status = 'Completed' THEN 1 END) as completed_orders"
          ),
          db.raw("SUM(quantity_planned) as total_planned_quantity"),
          db.raw("SUM(quantity_produced) as total_produced_quantity"),
          db.raw("AVG(actual_cost) as average_cost")
        )
        .whereNull("deleted_at")
        .first();

      // Get today's production
      const today = new Date().toISOString().split("T")[0];
      const todayStats = await db("production_orders")
        .select(
          db.raw("COUNT(*) as today_orders"),
          db.raw("SUM(quantity_planned) as today_planned"),
          db.raw("SUM(quantity_produced) as today_produced")
        )
        .where("planned_start_date", today)
        .whereNull("deleted_at")
        .first();

      return {
        ...stats,
        ...todayStats,
      };
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      throw new Error("Failed to retrieve dashboard statistics");
    }
  }

  // Generate unique order number
  static async generateOrderNumber() {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, "0");
    const day = String(new Date().getDate()).padStart(2, "0");

    const prefix = `PO${year}${month}${day}`;

    const lastOrder = await db("production_orders")
      .where("order_number", "like", `${prefix}%`)
      .orderBy("order_number", "desc")
      .first();

    let sequence = 1;
    if (lastOrder) {
      const lastSequence = parseInt(lastOrder.order_number.slice(-3));
      sequence = lastSequence + 1;
    }

    return `${prefix}${String(sequence).padStart(3, "0")}`;
  }

  // Check if order has actual start date
  static async hasActualStartDate(id) {
    const order = await db("production_orders")
      .select("actual_start_date")
      .where("id", id)
      .first();

    return order && order.actual_start_date !== null;
  }

  // Soft delete production order
  static async delete(id) {
    try {
      const [deleted] = await db("production_orders")
        .where("id", id)
        .whereNull("deleted_at")
        .update({
          deleted_at: new Date(),
          updated_at: new Date(),
        })
        .returning("*");

      if (!deleted) {
        throw new Error("Production order not found");
      }

      return deleted;
    } catch (error) {
      console.error("Error deleting production order:", error);
      throw new Error("Failed to delete production order");
    }
  }
}

module.exports = ProductionOrder;
