const { db } = require("../config/database");
const {
  getCurrentPhilippineTime,
  getCurrentPhilippineDate,
  formatPhilippineTime,
} = require("../utils/timezoneUtils");

class BranchInventory {
  // Get branch inventory by branch ID
  static async getByBranch(branchId, filters = {}) {
    try {
      // Base branch inventory
      let query = db("branch_inventory as bi")
        .where("bi.branch_id", branchId)
        .whereNull("bi.deleted_at")
        // Join to production inventory -> menu_items to enrich with selling_price and image_url
        .leftJoin("menu_items as mi", function () {
          this.on("bi.item_type", "=", db.raw("?", "production"))
            .andOn("mi.menu_item_name", "=", "bi.item_name")
            .andOnNull("mi.deleted_at");
        })
        .select(
          "bi.*",
          // Prefer branch stored selling_price if present; fallback to menu_items.selling_price
          db.raw(
            "COALESCE(bi.selling_price, mi.selling_price) as selling_price"
          ),
          "mi.image_url"
        );

      // Apply filters
      if (filters.item_type) {
        query = query.where("bi.item_type", filters.item_type);
      }
      if (filters.category) {
        query = query.where("bi.category", filters.category);
      }
      if (filters.status) {
        query = query.where("bi.status", filters.status);
      }
      if (filters.search) {
        query = query.where("bi.item_name", "like", `%${filters.search}%`);
      }

      return await query.orderBy(["bi.item_type", "bi.item_name"]);
    } catch (error) {
      console.error("Error fetching branch inventory:", error);
      throw error;
    }
  }

  // Get inventory for multiple branches (optimized - single query)
  static async getByMultipleBranches(branchIds, filters = {}) {
    try {
      console.log(
        `📡 Fetching inventory for ${branchIds.length} branches in single query`
      );

      // Single query for all branches - much more efficient than N+1 queries
      let query = db("branch_inventory as bi")
        .whereIn("bi.branch_id", branchIds)
        .whereNull("bi.deleted_at")
        // Join to production inventory -> menu_items to enrich with selling_price and image_url
        .leftJoin("menu_items as mi", function () {
          this.on("bi.item_type", "=", db.raw("?", "production"))
            .andOn("mi.menu_item_name", "=", "bi.item_name")
            .andOnNull("mi.deleted_at");
        })
        .select(
          "bi.*",
          // Prefer branch stored selling_price if present; fallback to menu_items.selling_price
          db.raw(
            "COALESCE(bi.selling_price, mi.selling_price) as selling_price"
          ),
          "mi.image_url"
        );

      // Apply filters
      if (filters.item_type) {
        query = query.where("bi.item_type", filters.item_type);
      }
      if (filters.category) {
        query = query.where("bi.category", filters.category);
      }
      if (filters.status) {
        query = query.where("bi.status", filters.status);
      }
      if (filters.search) {
        query = query.where("bi.item_name", "like", `%${filters.search}%`);
      }

      const allInventory = await query.orderBy([
        "bi.branch_id",
        "bi.item_type",
        "bi.item_name",
      ]);

      // Group results by branch_id for easier frontend consumption
      const inventoryByBranch = {};
      branchIds.forEach((branchId) => {
        inventoryByBranch[branchId] = [];
      });

      allInventory.forEach((item) => {
        if (inventoryByBranch[item.branch_id]) {
          inventoryByBranch[item.branch_id].push(item);
        }
      });

      console.log(
        `✅ Fetched inventory for ${Object.keys(inventoryByBranch).length} branches`
      );
      return inventoryByBranch;
    } catch (error) {
      console.error("Error fetching multiple branch inventory:", error);
      throw error;
    }
  }

  // Update expiry date for an item
  static async updateExpiryDate(itemId, newExpiryDate) {
    try {
      const currentItem = await db("branch_inventory")
        .where("id", itemId)
        .whereNull("deleted_at")
        .first();

      if (!currentItem) {
        throw new Error("Item not found");
      }

      // If the new expiry date is today or earlier, mark as expired, else keep current status
      let newStatus = currentItem.status;
      if (newExpiryDate) {
        const today = getCurrentPhilippineTime();
        today.setHours(0, 0, 0, 0);
        const expiry = new Date(newExpiryDate);
        expiry.setHours(0, 0, 0, 0);
        if (expiry.getTime() <= today.getTime()) {
          newStatus = "expired";
        }
      }

      const [updatedItem] = await db("branch_inventory")
        .where("id", itemId)
        .update({
          expiry_date: newExpiryDate || null,
          status: newStatus,
          last_updated: getCurrentPhilippineTime(),
          updated_at: getCurrentPhilippineTime(),
        })
        .returning("*");

      return updatedItem;
    } catch (error) {
      console.error("Error updating expiry date:", error);
      throw error;
    }
  }

  // Get branch inventory summary/stats
  static async getBranchStats(branchId) {
    try {
      const stats = await db("branch_inventory")
        .where("branch_id", branchId)
        .whereNull("deleted_at")
        .select(
          db.raw("COUNT(*) as total_items"),
          db.raw("SUM(quantity) as total_quantity"),
          db.raw("SUM(total_value) as total_value"),
          db.raw("COUNT(CASE WHEN status = ? THEN 1 END) as low_stock_items", [
            "low_stock",
          ]),
          db.raw(
            "COUNT(CASE WHEN status = ? THEN 1 END) as out_of_stock_items",
            ["out_of_stock"]
          ),
          db.raw("COUNT(CASE WHEN status = ? THEN 1 END) as expired_items", [
            "expired",
          ])
        )
        .first();

      return {
        totalItems: parseInt(stats.total_items) || 0,
        totalQuantity: parseFloat(stats.total_quantity) || 0,
        totalValue: parseFloat(stats.total_value) || 0,
        lowStockItems: parseInt(stats.low_stock_items) || 0,
        outOfStockItems: parseInt(stats.out_of_stock_items) || 0,
        expiredItems: parseInt(stats.expired_items) || 0,
      };
    } catch (error) {
      console.error("Error fetching branch stats:", error);
      throw error;
    }
  }

  // Add item to branch inventory (from distribution)
  static async addItem(branchId, itemData) {
    try {
      const [item] = await db("branch_inventory")
        .insert({
          branch_id: branchId,
          item_name: itemData.name,
          item_type: itemData.type, // 'scm' or 'production'
          category: itemData.category,
          quantity: parseFloat(itemData.quantity),
          unit: itemData.unit,
          unit_cost: parseFloat(itemData.cost_price),
          selling_price: parseFloat(itemData.selling_price) || null,
          total_value:
            parseFloat(itemData.quantity) * parseFloat(itemData.cost_price),
          minimum_stock: parseFloat(itemData.minimum_stock) || 0,
          status: "available",
          expiry_date: itemData.expiry_date || null,
          supplier_name: itemData.supplier_name || null,
          distribution_reference: itemData.distribution_reference || null,
          last_updated: getCurrentPhilippineTime(),
        })
        .returning("*");

      return item;
    } catch (error) {
      console.error("Error adding item to branch inventory:", error);
      throw error;
    }
  }

  // Update item quantity (for consumption, adjustments, etc.)
  static async updateQuantity(itemId, newQuantity, reason = "adjustment") {
    try {
      const currentItem = await db("branch_inventory")
        .where("id", itemId)
        .whereNull("deleted_at")
        .first();

      if (!currentItem) {
        throw new Error("Item not found");
      }

      const updatedQuantity = parseFloat(newQuantity);
      const newTotalValue = updatedQuantity * parseFloat(currentItem.unit_cost);

      // Determine new status based on quantity
      let newStatus = currentItem.status;
      if (updatedQuantity <= 0) {
        newStatus = "out_of_stock";
      } else if (updatedQuantity <= parseFloat(currentItem.minimum_stock)) {
        newStatus = "low_stock";
      } else {
        newStatus = "available";
      }

      const [updatedItem] = await db("branch_inventory")
        .where("id", itemId)
        .update({
          quantity: updatedQuantity,
          total_value: newTotalValue,
          status: newStatus,
          last_updated: getCurrentPhilippineTime(),
          updated_at: getCurrentPhilippineTime(),
        })
        .returning("*");

      return updatedItem;
    } catch (error) {
      console.error("Error updating item quantity:", error);
      throw error;
    }
  }

  // Get low stock items for a branch
  static async getLowStockItems(branchId) {
    try {
      return await db("branch_inventory")
        .where("branch_id", branchId)
        .where("status", "low_stock")
        .whereNull("deleted_at")
        .orderBy("item_name");
    } catch (error) {
      console.error("Error fetching low stock items:", error);
      throw error;
    }
  }

  // Get expiring items for a branch
  static async getExpiringItems(branchId, days = 7) {
    try {
      const futureDate = getCurrentPhilippineTime();
      futureDate.setDate(futureDate.getDate() + days);

      return await db("branch_inventory")
        .where("branch_id", branchId)
        .whereNotNull("expiry_date")
        .where("expiry_date", "<=", formatPhilippineTime(futureDate, "date"))
        .where("status", "!=", "expired")
        .whereNull("deleted_at")
        .orderBy("expiry_date");
    } catch (error) {
      console.error("Error fetching expiring items:", error);
      throw error;
    }
  }

  // Get recent activity for a branch
  static async getRecentActivity(branchId, limit = 10) {
    try {
      // Pull from branch_inventory_transactions so we capture distributions,
      // consumption, adjustments, and rejections
      return await db("branch_inventory_transactions as t")
        .leftJoin("employees as e", "t.performed_by", "e.id")
        .leftJoin("branch_inventory as bi", "t.inventory_item_id", "bi.id")
        .where("t.branch_id", branchId)
        .whereNull("t.deleted_at")
        .orderBy("t.created_at", "desc")
        .limit(limit)
        .select(
          "t.id",
          "t.item_name",
          "t.item_type",
          "t.transaction_type",
          "t.quantity",
          "t.unit_of_measure",
          "t.reference_number",
          "t.adjustment_type",
          "t.new_expiry_date",
          db.raw("bi.category as category_name"),
          db.raw(
            "COALESCE(e.first_name,'') || ' ' || COALESCE(e.last_name,'') as performed_by_name"
          ),
          db.raw("t.created_at as timestamp")
        );
    } catch (error) {
      console.error("Error fetching recent activity:", error);
      throw error;
    }
  }

  // Soft delete item
  static async deleteItem(itemId) {
    try {
      await db("branch_inventory").where("id", itemId).update({
        deleted_at: getCurrentPhilippineTime(),
        updated_at: getCurrentPhilippineTime(),
      });

      return true;
    } catch (error) {
      console.error("Error deleting item:", error);
      throw error;
    }
  }

  // Update item status (for manual status changes)
  static async updateStatus(itemId, status) {
    try {
      const [updatedItem] = await db("branch_inventory")
        .where("id", itemId)
        .update({
          status: status,
          last_updated: getCurrentPhilippineTime(),
          updated_at: getCurrentPhilippineTime(),
        })
        .returning("*");

      return updatedItem;
    } catch (error) {
      console.error("Error updating item status:", error);
      throw error;
    }
  }
}

module.exports = BranchInventory;
