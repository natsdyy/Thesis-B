const { db } = require("../config/database");

class ItemReturn {
  // Get all item returns with related data
  static async getAll(filters = {}) {
    try {
      let query = db("item_returns as ir")
        .leftJoin("purchase_orders as po", "ir.purchase_order_id", "po.id")
        .leftJoin(
          "purchase_order_items as poi",
          "ir.purchase_order_item_id",
          "poi.id"
        )
        .leftJoin(
          "supply_request_items as sri",
          "poi.supply_request_item_id",
          "sri.id"
        )
        .select(
          "ir.*",
          "po.po_number",
          "poi.item_name",
          "poi.quantity as original_quantity",
          "poi.unit_price",
          "sri.item_unit",
          "sri.item_type"
        );

      // Apply filters
      if (filters.purchase_order_id) {
        query = query.where("ir.purchase_order_id", filters.purchase_order_id);
      }

      if (filters.status) {
        query = query.where("ir.status", filters.status);
      }

      if (filters.return_reason) {
        query = query.where("ir.return_reason", filters.return_reason);
      }

      if (filters.logged_by) {
        query = query.where("ir.logged_by", "like", `%${filters.logged_by}%`);
      }

      const itemReturns = await query.orderBy("ir.created_at", "desc");

      // Calculate return value for each return
      for (let returnItem of itemReturns) {
        returnItem.return_value =
          returnItem.return_quantity * (returnItem.unit_price || 0);
      }

      return itemReturns;
    } catch (error) {
      throw error;
    }
  }

  // Get item return by ID
  static async getById(id) {
    try {
      const itemReturn = await db("item_returns as ir")
        .leftJoin("purchase_orders as po", "ir.purchase_order_id", "po.id")
        .leftJoin(
          "purchase_order_items as poi",
          "ir.purchase_order_item_id",
          "poi.id"
        )
        .leftJoin(
          "supply_request_items as sri",
          "poi.supply_request_item_id",
          "sri.id"
        )
        .select(
          "ir.*",
          "po.po_number",
          "poi.item_name",
          "poi.quantity as original_quantity",
          "poi.unit_price",
          "sri.item_unit",
          "sri.item_type"
        )
        .where("ir.id", id)
        .first();

      if (itemReturn) {
        itemReturn.return_value =
          itemReturn.return_quantity * (itemReturn.unit_price || 0);
      }

      return itemReturn;
    } catch (error) {
      throw error;
    }
  }

  // Create new item return
  static async create(returnData) {
    try {
      const [itemReturn] = await db("item_returns")
        .insert({
          purchase_order_id: returnData.purchase_order_id,
          purchase_order_item_id: returnData.purchase_order_item_id,
          return_quantity: returnData.return_quantity,
          return_reason: returnData.return_reason,
          notes: returnData.notes,
          logged_by: returnData.logged_by,
          status: "Pending",
        })
        .returning("*");

      return itemReturn;
    } catch (error) {
      throw error;
    }
  }

  // Complete item return (change status from Pending to Completed)
  static async complete(id, completedBy) {
    try {
      const result = await db("item_returns")
        .where("id", id)
        .whereIn("status", ["Pending", "Processed"]) // Allow completing both Pending and Processed
        .update({
          status: "Completed",
          processed_at: new Date(),
          processed_by: completedBy,
        })
        .returning("*");

      // Check if any rows were updated
      if (result && result.length > 0) {
        return result[0];
      }

      // If no rows were updated, check if the item return exists
      const existingReturn = await this.getById(id);
      if (!existingReturn) {
        return null; // Item return not found
      }

      // Item return exists but status is not "Pending" or "Processed"
      throw new Error(
        "Item return cannot be completed. Current status: " +
          existingReturn.status
      );
    } catch (error) {
      throw error;
    }
  }

  // Cancel item return (change status to Completed with cancelled flag)
  static async cancel(id, cancelledBy) {
    try {
      const result = await db("item_returns")
        .where("id", id)
        .where("status", "Pending") // Only allow cancelling pending returns
        .update({
          status: "Completed", // Use Completed status instead of Cancelled
          processed_at: new Date(),
          processed_by: cancelledBy,
          notes: db.raw("COALESCE(notes, '') || ' [CANCELLED]'"), // Add cancelled indicator to notes
        })
        .returning("*");

      // Check if any rows were updated
      if (result && result.length > 0) {
        return result[0];
      }

      // If no rows were updated, check if the item return exists
      const existingReturn = await this.getById(id);
      if (!existingReturn) {
        return null; // Item return not found
      }

      // Item return exists but status is not "Pending"
      throw new Error(
        "Only pending returns can be cancelled. Current status: " +
          existingReturn.status
      );
    } catch (error) {
      throw error;
    }
  }

  // Update item return
  static async update(id, updateData) {
    try {
      const [itemReturn] = await db("item_returns")
        .where("id", id)
        .update(updateData)
        .returning("*");

      return itemReturn;
    } catch (error) {
      throw error;
    }
  }

  // Delete item return (soft delete)
  static async delete(id) {
    try {
      const [deletedItemReturn] = await db("item_returns")
        .where("id", id)
        .update({ deleted_at: new Date() })
        .returning("*");

      return deletedItemReturn;
    } catch (error) {
      throw error;
    }
  }

  // Get return statistics
  static async getStats(filters = {}) {
    try {
      let query = db("item_returns");

      // Apply filters
      if (filters.purchase_order_id) {
        query = query.where("purchase_order_id", filters.purchase_order_id);
      }

      const stats = await query
        .select(
          db.raw("COUNT(*) as total_returns"),
          db.raw(
            "COUNT(CASE WHEN status = 'Pending' THEN 1 END) as pending_returns"
          ),
          db.raw(
            "COUNT(CASE WHEN status = 'Processed' THEN 1 END) as processed_returns"
          ),
          db.raw(
            "COUNT(CASE WHEN status = 'Completed' THEN 1 END) as completed_returns"
          ),
          db.raw(
            "COUNT(CASE WHEN status = 'Completed' AND notes LIKE '%CANCELLED%' THEN 1 END) as cancelled_returns"
          )
        )
        .first();

      // Calculate total return value
      const valueQuery = db("item_returns as ir").leftJoin(
        "purchase_order_items as poi",
        "ir.purchase_order_item_id",
        "poi.id"
      );

      if (filters.purchase_order_id) {
        valueQuery.where("ir.purchase_order_id", filters.purchase_order_id);
      }

      const valueStats = await valueQuery
        .select(
          db.raw("SUM(ir.return_quantity * poi.unit_price) as total_value")
        )
        .first();

      return {
        total_returns: parseInt(stats.total_returns) || 0,
        pending_returns: parseInt(stats.pending_returns) || 0,
        processed_returns: parseInt(stats.processed_returns) || 0,
        completed_returns: parseInt(stats.completed_returns) || 0,
        cancelled_returns: parseInt(stats.cancelled_returns) || 0,
        total_value: parseFloat(valueStats.total_value) || 0,
      };
    } catch (error) {
      console.error("Error fetching return stats:", error);
      return {
        total_returns: 0,
        pending_returns: 0,
        processed_returns: 0,
        completed_returns: 0,
        cancelled_returns: 0,
        total_value: 0,
      };
    }
  }

  // Get returns by purchase order
  static async getByPurchaseOrder(purchaseOrderId) {
    try {
      return await this.getAll({ purchase_order_id: purchaseOrderId });
    } catch (error) {
      throw error;
    }
  }

  // Get returns by status
  static async getByStatus(status) {
    try {
      return await this.getAll({ status });
    } catch (error) {
      throw error;
    }
  }
}

module.exports = ItemReturn;
