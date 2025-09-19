const { db } = require("../config/database");

class POSOrder {
  // Generate unique order number
  static generateOrderNumber() {
    const now = new Date();
    const timestamp = now.getTime().toString().slice(-6);
    const random = Math.floor(Math.random() * 100)
      .toString()
      .padStart(2, "0");
    return `#${timestamp}${random}`;
  }

  // Get all POS orders with filters
  static async getAll(filters = {}) {
    try {
      const {
        branch_id = null,
        cashier_id = null,
        status = null,
        order_type = null,
        date_from = null,
        date_to = null,
        limit = 20,
        offset = 0,
      } = filters;

      let query = db("pos_sales_orders as pso")
        .leftJoin("branches as b", "pso.branch_id", "b.id")
        .leftJoin("employees as c", "pso.cashier_id", "c.id")
        .leftJoin("employees as m", "pso.manager_id", "m.id")
        .leftJoin("employees as v", "pso.voided_by", "v.id")
        .select(
          "pso.*",
          "b.name as branch_name",
          "c.first_name as cashier_first_name",
          "c.last_name as cashier_last_name",
          "m.first_name as manager_first_name",
          "m.last_name as manager_last_name",
          "v.first_name as voided_by_first_name",
          "v.last_name as voided_by_last_name"
        );

      // Apply filters
      if (branch_id) {
        query = query.where("pso.branch_id", branch_id);
      }

      if (cashier_id) {
        query = query.where("pso.cashier_id", cashier_id);
      }

      if (status) {
        query = query.where("pso.status", status);
      }

      if (order_type) {
        query = query.where("pso.order_type", order_type);
      }

      if (date_from) {
        query = query.where("pso.created_at", ">=", date_from);
      }

      if (date_to) {
        query = query.where("pso.created_at", "<=", date_to);
      }

      // Get total count
      const countQuery = query.clone().clearSelect().count({ total: "pso.id" });
      const [countRow] = await countQuery;
      const total = parseInt(countRow?.total || 0, 10);

      // Get paginated results
      const orders = await query
        .orderBy("pso.created_at", "desc")
        .limit(limit)
        .offset(offset);

      // Fetch items for each order
      const ordersWithItems = await Promise.all(
        orders.map(async (order) => {
          const items = await db("pos_order_items as poi")
            .leftJoin("menu_items as mi", "poi.menu_item_id", "mi.id")
            .select("poi.*", "mi.menu_item_name", "mi.image_url", "mi.category")
            .where("poi.order_id", order.id)
            .orderBy("poi.id");

          return {
            ...order,
            items,
          };
        })
      );

      return { orders: ordersWithItems, total };
    } catch (error) {
      console.error("Error fetching POS orders:", error);
      throw new Error("Failed to fetch POS orders");
    }
  }

  // Get order by ID with items
  static async getById(id) {
    try {
      const order = await db("pos_sales_orders as pso")
        .leftJoin("branches as b", "pso.branch_id", "b.id")
        .leftJoin("employees as c", "pso.cashier_id", "c.id")
        .leftJoin("employees as m", "pso.manager_id", "m.id")
        .leftJoin("employees as v", "pso.voided_by", "v.id")
        .select(
          "pso.*",
          "b.name as branch_name",
          "c.first_name as cashier_first_name",
          "c.last_name as cashier_last_name",
          "m.first_name as manager_first_name",
          "m.last_name as manager_last_name",
          "v.first_name as voided_by_first_name",
          "v.last_name as voided_by_last_name"
        )
        .where("pso.id", id)
        .first();

      if (!order) {
        throw new Error("POS order not found");
      }

      // Get order items
      const items = await db("pos_order_items as poi")
        .leftJoin("menu_items as mi", "poi.menu_item_id", "mi.id")
        .select("poi.*", "mi.menu_item_name", "mi.image_url", "mi.category")
        .where("poi.order_id", id)
        .orderBy("poi.id");

      return {
        ...order,
        items,
      };
    } catch (error) {
      console.error("Error fetching POS order by ID:", error);
      throw new Error("Failed to retrieve POS order");
    }
  }

  // Get order by order number (for public rating)
  static async getByOrderNumber(orderNumber) {
    try {
      const order = await db("pos_sales_orders as pso")
        .leftJoin("branches as b", "pso.branch_id", "b.id")
        .leftJoin("employees as c", "pso.cashier_id", "c.id")
        .leftJoin("employees as m", "pso.manager_id", "m.id")
        .leftJoin("employees as v", "pso.voided_by", "v.id")
        .select(
          "pso.*",
          "b.name as branch_name",
          "c.first_name as cashier_first_name",
          "c.last_name as cashier_last_name",
          "m.first_name as manager_first_name",
          "m.last_name as manager_last_name",
          "v.first_name as voided_by_first_name",
          "v.last_name as voided_by_last_name"
        )
        .where("pso.order_number", orderNumber)
        .first();

      if (!order) {
        return null;
      }

      // Get order items
      const items = await db("pos_order_items as poi")
        .leftJoin("menu_items as mi", "poi.menu_item_id", "mi.id")
        .select("poi.*", "mi.menu_item_name", "mi.image_url", "mi.category")
        .where("poi.order_id", order.id)
        .orderBy("poi.id");

      return {
        ...order,
        items,
        branch: order.branch_name ? { name: order.branch_name } : null,
        cashier: order.cashier_first_name
          ? {
              name: `${order.cashier_first_name} ${order.cashier_last_name}`.trim(),
            }
          : null,
      };
    } catch (error) {
      console.error("Error fetching POS order by order number:", error);
      throw new Error("Failed to retrieve POS order");
    }
  }

  // Create new POS order
  static async create(orderData) {
    const trx = await db.transaction();

    try {
      // Generate order number
      const orderNumber = this.generateOrderNumber();

      // Create the order
      const [order] = await trx("pos_sales_orders")
        .insert({
          order_number: orderNumber,
          branch_id: orderData.branch_id,
          cashier_id: orderData.cashier_id,
          manager_id: orderData.manager_id || null,
          order_type: orderData.order_type || "Dine In",
          subtotal: orderData.subtotal,
          tax_amount: orderData.tax_amount || 0,
          total_amount: orderData.total_amount,
          amount_paid: orderData.amount_paid,
          change_amount: orderData.change_amount,
          status: "pending",
          notes: orderData.notes || null,
        })
        .returning("*");

      // Create order items
      if (orderData.items && orderData.items.length > 0) {
        const orderItems = orderData.items.map((item) => ({
          order_id: order.id,
          menu_item_id: item.menu_item_id,
          item_name: item.item_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
          notes: item.notes || null,
        }));

        await trx("pos_order_items").insert(orderItems);
      }

      await trx.commit();

      // Return the full order with items
      return await this.getById(order.id);
    } catch (error) {
      await trx.rollback();
      console.error("Error creating POS order:", error);
      throw new Error("Failed to create POS order");
    }
  }

  // Process order (change status from pending to processing)
  static async processOrder(id, processedBy = null) {
    try {
      const [updatedOrder] = await db("pos_sales_orders")
        .where("id", id)
        .where("status", "pending")
        .update({
          status: "processing",
          processed_at: new Date(),
          updated_at: new Date(),
        })
        .returning("*");

      if (!updatedOrder) {
        throw new Error("Order not found or not in pending status");
      }

      // Get order items
      const items = await db("pos_order_items as poi")
        .leftJoin("menu_items as mi", "poi.menu_item_id", "mi.id")
        .select("poi.*", "mi.menu_item_name", "mi.image_url", "mi.category")
        .where("poi.order_id", id)
        .orderBy("poi.id");

      return {
        ...updatedOrder,
        items,
      };
    } catch (error) {
      console.error("Error processing POS order:", error);
      throw new Error("Failed to process order");
    }
  }

  // Complete order (change status from processing to completed)
  static async completeOrder(id) {
    const trx = await db.transaction();

    try {
      // Update order status
      const [updatedOrder] = await trx("pos_sales_orders")
        .where("id", id)
        .where("status", "processing")
        .update({
          status: "completed",
          completed_at: new Date(),
          updated_at: new Date(),
        })
        .returning("*");

      if (!updatedOrder) {
        throw new Error("Order not found or not in processing status");
      }

      // Deduct inventory for each item
      const orderItems = await trx("pos_order_items").where("order_id", id);

      for (const item of orderItems) {
        // Find corresponding branch inventory item
        const branchInventory = await trx("branch_inventory")
          .where("branch_id", updatedOrder.branch_id)
          .where("item_name", item.item_name)
          .where("item_type", "production")
          .whereNull("deleted_at")
          .first();

        if (branchInventory) {
          // Create branch inventory transaction for consumption
          await trx("branch_inventory_transactions").insert({
            branch_id: updatedOrder.branch_id,
            inventory_item_id: item.menu_item_id,
            item_name: item.item_name,
            item_type: "production",
            transaction_type: "consumption",
            quantity: item.quantity,
            unit_of_measure: branchInventory.unit || "pieces", // Dynamic unit from branch inventory
            unit_cost: item.unit_price,
            total_value: item.total_price,
            reference_number: updatedOrder.order_number,
            reason: "POS Sale",
            notes: `Sold via POS Order ${updatedOrder.order_number}`,
            performed_by: updatedOrder.cashier_id,
            transaction_date: new Date(),
          });

          // Update branch inventory quantity
          await trx("branch_inventory")
            .where("id", branchInventory.id)
            .decrement("quantity", item.quantity);
        }
      }

      // Get order items for the response
      const items = await db("pos_order_items as poi")
        .leftJoin("menu_items as mi", "poi.menu_item_id", "mi.id")
        .select("poi.*", "mi.menu_item_name", "mi.image_url", "mi.category")
        .where("poi.order_id", id)
        .orderBy("poi.id");

      await trx.commit();
      return {
        ...updatedOrder,
        items,
      };
    } catch (error) {
      await trx.rollback();
      console.error("Error completing POS order:", error);
      throw new Error("Failed to complete order");
    }
  }

  // Void order (cancel the order)
  static async voidOrder(id, voidReason, voidedBy) {
    const trx = await db.transaction();

    try {
      // Check if order can be voided
      const order = await trx("pos_sales_orders")
        .where("id", id)
        .whereIn("status", ["pending", "processing"])
        .first();

      if (!order) {
        throw new Error(
          "Order not found or cannot be voided (already completed/voided)"
        );
      }

      // Update order status
      const [updatedOrder] = await trx("pos_sales_orders")
        .where("id", id)
        .update({
          status: "void",
          void_reason: voidReason,
          voided_by: voidedBy,
          voided_at: new Date(),
          updated_at: new Date(),
        })
        .returning("*");

      await trx.commit();
      return updatedOrder;
    } catch (error) {
      await trx.rollback();
      console.error("Error voiding POS order:", error);
      throw new Error("Failed to void order");
    }
  }

  // Get sales statistics for a branch
  static async getSalesStats(branchId, dateFrom = null, dateTo = null) {
    try {
      let query = db("pos_sales_orders")
        .where("branch_id", branchId)
        .where("status", "completed");

      if (dateFrom) {
        query = query.where("created_at", ">=", dateFrom);
      }

      if (dateTo) {
        query = query.where("created_at", "<=", dateTo);
      }

      const stats = await query
        .select(
          db.raw("COUNT(*) as total_orders"),
          db.raw("SUM(total_amount) as total_sales"),
          db.raw("AVG(total_amount) as average_order_value"),
          db.raw("SUM(tax_amount) as total_tax")
        )
        .first();

      return {
        total_orders: parseInt(stats.total_orders) || 0,
        total_sales: parseFloat(stats.total_sales) || 0,
        average_order_value: parseFloat(stats.average_order_value) || 0,
        total_tax: parseFloat(stats.total_tax) || 0,
      };
    } catch (error) {
      console.error("Error fetching sales stats:", error);
      throw new Error("Failed to fetch sales statistics");
    }
  }

  // Get daily sales summary
  static async getDailySummary(branchId, date) {
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const summary = await db("pos_sales_orders")
        .where("branch_id", branchId)
        .whereBetween("created_at", [startOfDay, endOfDay])
        .select(
          db.raw("COUNT(*) as total_orders"),
          db.raw(
            "COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_orders"
          ),
          db.raw(
            "COUNT(CASE WHEN status = 'void' THEN 1 END) as voided_orders"
          ),
          db.raw(
            "SUM(CASE WHEN status = 'completed' THEN total_amount ELSE 0 END) as total_sales"
          ),
          db.raw(
            "SUM(CASE WHEN status = 'completed' THEN tax_amount ELSE 0 END) as total_tax"
          ),
          db.raw(
            "AVG(CASE WHEN status = 'completed' THEN total_amount ELSE NULL END) as average_order_value"
          )
        )
        .first();

      return {
        date: date,
        branch_id: branchId,
        total_orders: parseInt(summary.total_orders) || 0,
        completed_orders: parseInt(summary.completed_orders) || 0,
        voided_orders: parseInt(summary.voided_orders) || 0,
        total_sales: parseFloat(summary.total_sales) || 0,
        total_tax: parseFloat(summary.total_tax) || 0,
        average_order_value: parseFloat(summary.average_order_value) || 0,
      };
    } catch (error) {
      console.error("Error fetching daily summary:", error);
      throw new Error("Failed to fetch daily summary");
    }
  }
}

module.exports = POSOrder;
