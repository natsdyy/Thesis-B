const { db } = require("../config/database");

class Inventory {
  // Get all inventory categories
  static async getCategories() {
    try {
      return await db("inventory_categories")
        .whereNull("deleted_at")
        .where("is_active", true)
        .orderBy("name");
    } catch (error) {
      console.error("Error fetching inventory categories:", error);
      throw new Error("Failed to fetch inventory categories");
    }
  }

  // Get item types by category
  static async getItemTypesByCategory(categoryId) {
    try {
      return await db("inventory_item_types")
        .where("category_id", categoryId)
        .whereNull("deleted_at")
        .where("is_active", true)
        .orderBy("name");
    } catch (error) {
      console.error("Error fetching item types:", error);
      throw new Error("Failed to fetch item types");
    }
  }

  // Get all item types with category info
  static async getAllItemTypes() {
    try {
      return await db("inventory_item_types as it")
        .leftJoin("inventory_categories as ic", "it.category_id", "ic.id")
        .select(
          "it.*",
          "ic.name as category_name",
          "ic.description as category_description"
        )
        .whereNull("it.deleted_at")
        .whereNull("ic.deleted_at")
        .where("it.is_active", true)
        .where("ic.is_active", true)
        .orderBy(["ic.name", "it.name"]);
    } catch (error) {
      console.error("Error fetching all item types:", error);
      throw new Error("Failed to fetch item types");
    }
  }

  // Get current inventory with aggregated data
  static async getCurrentInventory(filters = {}) {
    try {
      let query = db("inventory_items as ii")
        .leftJoin("inventory_item_types as it", "ii.item_type_id", "it.id")
        .leftJoin("inventory_categories as ic", "it.category_id", "ic.id")
        .leftJoin("suppliers as s", "ii.supplier_id", "s.id")
        .select(
          "ii.*",
          "it.name as item_type_name",
          "it.unit_of_measure",
          "it.requires_expiry",
          "it.requires_batch",
          "ic.name as category_name",
          "s.name as supplier_name"
        )
        .whereNull("ii.deleted_at")
        .where("ii.status", "available");

      // Apply filters
      if (filters.category_id) {
        query = query.where("it.category_id", filters.category_id);
      }
      if (filters.item_type_id) {
        query = query.where("ii.item_type_id", filters.item_type_id);
      }
      if (filters.expiry_within_days) {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + filters.expiry_within_days);
        query = query.where(
          "ii.expiry_date",
          "<=",
          futureDate.toISOString().split("T")[0]
        );
      }
      if (filters.supplier_id) {
        query = query.where("ii.supplier_id", filters.supplier_id);
      }

      return await query.orderBy(["ic.name", "it.name", "ii.received_date"]);
    } catch (error) {
      console.error("Error fetching current inventory:", error);
      throw new Error("Failed to fetch current inventory");
    }
  }

  // Get inventory summary by category
  static async getInventorySummary() {
    try {
      const summary = await db("inventory_items as ii")
        .leftJoin("inventory_item_types as it", "ii.item_type_id", "it.id")
        .leftJoin("inventory_categories as ic", "it.category_id", "ic.id")
        .select(
          "ic.id as category_id",
          "ic.name as category_name",
          db.raw("COUNT(DISTINCT ii.item_type_id) as unique_items"),
          db.raw("SUM(ii.quantity) as total_quantity"),
          db.raw("SUM(ii.total_value) as total_value"),
          db.raw("COUNT(ii.id) as total_entries")
        )
        .whereNull("ii.deleted_at")
        .where("ii.status", "available")
        .groupBy("ic.id", "ic.name")
        .orderBy("ic.name");

      return summary;
    } catch (error) {
      console.error("Error fetching inventory summary:", error);
      throw new Error("Failed to fetch inventory summary");
    }
  }

  // Add inventory item (usually from PO receipt)
  static async addInventoryItem(itemData) {
    try {
      const [newItem] = await db("inventory_items")
        .insert({
          item_type_id: itemData.item_type_id,
          supplier_id: itemData.supplier_id || null,
          purchase_order_id: itemData.purchase_order_id || null,
          batch_number: itemData.batch_number || null,
          quantity: itemData.quantity,
          unit_cost: itemData.unit_cost,
          total_value: itemData.quantity * itemData.unit_cost,
          expiry_date: itemData.expiry_date || null,
          received_date: itemData.received_date || new Date(),
          status: "available",
          notes: itemData.notes || null,
          received_by: itemData.received_by,
          created_at: new Date(),
          updated_at: new Date(),
        })
        .returning("*");

      // Log the transaction
      await this.logTransaction({
        inventory_item_id: newItem.id,
        transaction_type: "receipt",
        quantity: itemData.quantity,
        unit_cost: itemData.unit_cost,
        total_value: itemData.quantity * itemData.unit_cost,
        reference_number: itemData.reference_number || null,
        reason: "Initial stock receipt",
        notes: itemData.notes || null,
        performed_by: itemData.received_by,
        transaction_date: new Date(),
      });

      return newItem;
    } catch (error) {
      console.error("Error adding inventory item:", error);
      throw new Error("Failed to add inventory item");
    }
  }

  // Update inventory quantity (consumption, adjustment, etc.)
  static async updateInventoryQuantity(inventoryItemId, transactionData) {
    const trx = await db.transaction();

    try {
      // Get current item
      const currentItem = await trx("inventory_items")
        .where("id", inventoryItemId)
        .first();

      if (!currentItem) {
        throw new Error("Inventory item not found");
      }

      let newQuantity;
      let newTotalValue;

      if (transactionData.transaction_type === "consumption") {
        newQuantity =
          parseFloat(currentItem.quantity) -
          parseFloat(transactionData.quantity);
        if (newQuantity < 0) {
          throw new Error("Insufficient stock available");
        }
      } else if (transactionData.transaction_type === "adjustment") {
        newQuantity = parseFloat(transactionData.quantity);
      } else {
        // For other transaction types, use the quantity as adjustment
        newQuantity =
          parseFloat(currentItem.quantity) +
          parseFloat(transactionData.quantity);
      }

      newTotalValue = newQuantity * parseFloat(currentItem.unit_cost);

      // Update inventory item
      await trx("inventory_items")
        .where("id", inventoryItemId)
        .update({
          quantity: newQuantity,
          total_value: newTotalValue,
          status: newQuantity <= 0 ? "consumed" : "available",
          updated_at: new Date(),
        });

      // Log the transaction
      await trx("inventory_transactions").insert({
        inventory_item_id: inventoryItemId,
        transaction_type: transactionData.transaction_type,
        quantity: transactionData.quantity,
        unit_cost: currentItem.unit_cost,
        total_value:
          parseFloat(transactionData.quantity) *
          parseFloat(currentItem.unit_cost),
        reference_number: transactionData.reference_number || null,
        reason: transactionData.reason || null,
        notes: transactionData.notes || null,
        performed_by: transactionData.performed_by,
        transaction_date: transactionData.transaction_date || new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      });

      await trx.commit();

      // Return updated item
      return await this.getInventoryItemById(inventoryItemId);
    } catch (error) {
      await trx.rollback();
      console.error("Error updating inventory quantity:", error);
      throw error;
    }
  }

  // Get inventory item by ID with full details
  static async getInventoryItemById(id) {
    try {
      return await db("inventory_items as ii")
        .leftJoin("inventory_item_types as it", "ii.item_type_id", "it.id")
        .leftJoin("inventory_categories as ic", "it.category_id", "ic.id")
        .leftJoin("suppliers as s", "ii.supplier_id", "s.id")
        .select(
          "ii.*",
          "it.name as item_type_name",
          "it.unit_of_measure",
          "it.requires_expiry",
          "it.requires_batch",
          "ic.name as category_name",
          "s.name as supplier_name"
        )
        .where("ii.id", id)
        .first();
    } catch (error) {
      console.error("Error fetching inventory item:", error);
      throw new Error("Failed to fetch inventory item");
    }
  }

  // Get transaction history for an item
  static async getTransactionHistory(inventoryItemId) {
    try {
      return await db("inventory_transactions")
        .where("inventory_item_id", inventoryItemId)
        .orderBy("transaction_date", "desc");
    } catch (error) {
      console.error("Error fetching transaction history:", error);
      throw new Error("Failed to fetch transaction history");
    }
  }

  // Log a transaction
  static async logTransaction(transactionData) {
    try {
      return await db("inventory_transactions")
        .insert({
          ...transactionData,
          created_at: new Date(),
          updated_at: new Date(),
        })
        .returning("*");
    } catch (error) {
      console.error("Error logging transaction:", error);
      throw new Error("Failed to log transaction");
    }
  }

  // Get items expiring soon
  static async getExpiringItems(days = 7) {
    try {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + days);

      return await db("inventory_items as ii")
        .leftJoin("inventory_item_types as it", "ii.item_type_id", "it.id")
        .leftJoin("inventory_categories as ic", "it.category_id", "ic.id")
        .select("ii.*", "it.name as item_type_name", "ic.name as category_name")
        .whereNull("ii.deleted_at")
        .where("ii.status", "available")
        .whereNotNull("ii.expiry_date")
        .where("ii.expiry_date", "<=", futureDate.toISOString().split("T")[0])
        .orderBy("ii.expiry_date");
    } catch (error) {
      console.error("Error fetching expiring items:", error);
      throw new Error("Failed to fetch expiring items");
    }
  }

  // Get low stock items (this would need alert configuration)
  static async getLowStockItems() {
    try {
      return await db("inventory_items as ii")
        .leftJoin("inventory_item_types as it", "ii.item_type_id", "it.id")
        .leftJoin("inventory_categories as ic", "it.category_id", "ic.id")
        .leftJoin("inventory_alerts as ia", "it.id", "ia.item_type_id")
        .select(
          "it.id as item_type_id",
          "it.name as item_type_name",
          "ic.name as category_name",
          "ia.min_stock_level",
          db.raw("SUM(ii.quantity) as current_stock")
        )
        .whereNull("ii.deleted_at")
        .where("ii.status", "available")
        .whereNotNull("ia.min_stock_level")
        .where("ia.is_active", true)
        .groupBy("it.id", "it.name", "ic.name", "ia.min_stock_level")
        .havingRaw("SUM(ii.quantity) <= ia.min_stock_level")
        .orderBy("ic.name", "it.name");
    } catch (error) {
      console.error("Error fetching low stock items:", error);
      throw new Error("Failed to fetch low stock items");
    }
  }

  // Get inventory statistics
  static async getInventoryStats() {
    try {
      const stats = await db("inventory_items as ii")
        .leftJoin("inventory_item_types as it", "ii.item_type_id", "it.id")
        .leftJoin("inventory_categories as ic", "it.category_id", "ic.id")
        .select(
          db.raw("COUNT(DISTINCT ii.item_type_id) as total_item_types"),
          db.raw("COUNT(ii.id) as total_inventory_entries"),
          db.raw(
            "SUM(CASE WHEN ii.status = 'available' THEN ii.quantity ELSE 0 END) as total_available_quantity"
          ),
          db.raw(
            "SUM(CASE WHEN ii.status = 'available' THEN ii.total_value ELSE 0 END) as total_available_value"
          ),
          db.raw(
            "COUNT(CASE WHEN ii.expiry_date <= CURRENT_DATE + INTERVAL '7 days' AND ii.status = 'available' THEN 1 END) as expiring_soon_count"
          ),
          db.raw(
            "COUNT(CASE WHEN ii.status = 'expired' THEN 1 END) as expired_count"
          )
        )
        .whereNull("ii.deleted_at")
        .first();

      return stats;
    } catch (error) {
      console.error("Error fetching inventory stats:", error);
      throw new Error("Failed to fetch inventory stats");
    }
  }
}

module.exports = Inventory;
