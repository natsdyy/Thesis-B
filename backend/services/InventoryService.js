const { db } = require("../config/database");

class InventoryService {
  /**
   * Check ingredient availability for a recipe
   * @param {number} recipeId - Recipe ID
   * @param {number} batchSize - Batch size to check availability for
   * @returns {Object} Availability status with detailed breakdown
   */
  static async checkRecipeIngredientsAvailability(recipeId, batchSize = 1) {
    try {
      // Get recipe ingredients with inventory links
      const ingredients = await db("recipe_ingredients as ri")
        .leftJoin("inventory_items as ii", "ri.inventory_item_id", "ii.id")
        .leftJoin(
          "inventory_item_types as iit",
          "ri.inventory_item_type_id",
          "iit.id"
        )
        .leftJoin("inventory_categories as ic", "iit.category_id", "ic.id")
        .select(
          "ri.*",
          "ii.quantity as available_stock",
          "ii.item_name as inventory_item_name",
          "ii.unit_of_measure as inventory_unit",
          "ii.expiry_date",
          "ii.status as inventory_status",
          "iit.name as item_type_name",
          "iit.unit_of_measure as item_type_unit",
          "ic.name as category_name"
        )
        .where("ri.recipe_id", recipeId)
        .orderBy("ri.sequence_order");

      const status = {
        total_ingredients: ingredients.length,
        available_ingredients: 0,
        insufficient_ingredients: [],
        sufficient_for_production: true,
        ingredients: [],
      };

      for (const ingredient of ingredients) {
        // Calculate required quantity for the batch
        const requiredQuantity = ingredient.quantity_required * batchSize;

        // Get available stock (only count 'available' status items)
        let availableQuantity = 0;

        if (ingredient.inventory_item_id) {
          // If directly linked to inventory item
          if (ingredient.inventory_status === "available") {
            availableQuantity = ingredient.available_stock || 0;
          }
        } else if (ingredient.inventory_item_type_id) {
          // If linked to item type, sum all available items of that type
          const typeItems = await db("inventory_items")
            .where("item_type_id", ingredient.inventory_item_type_id)
            .where("status", "available")
            .whereNull("deleted_at");

          availableQuantity = typeItems.reduce(
            (sum, item) => sum + item.quantity,
            0
          );
        }

        const isAvailable = availableQuantity >= requiredQuantity;

        const ingredientStatus = {
          ingredient_name:
            ingredient.ingredient_name ||
            ingredient.inventory_item_name ||
            ingredient.item_type_name,
          required_quantity: requiredQuantity,
          available_quantity: availableQuantity,
          unit:
            ingredient.unit ||
            ingredient.inventory_unit ||
            ingredient.item_type_unit,
          is_available: isAvailable,
          linked_to_inventory: !!ingredient.inventory_item_id,
          linked_to_item_type: !!ingredient.inventory_item_type_id,
          category: ingredient.category_name,
          expiry_date: ingredient.expiry_date,
        };

        status.ingredients.push(ingredientStatus);

        if (isAvailable) {
          status.available_ingredients++;
        } else {
          status.insufficient_ingredients.push(ingredientStatus);
          status.sufficient_for_production = false;
        }
      }

      return status;
    } catch (error) {
      console.error("Error checking recipe ingredients availability:", error);
      throw new Error("Failed to check ingredient availability");
    }
  }

  /**
   * Get available inventory items for a specific item type
   * @param {number} itemTypeId - Inventory item type ID
   * @returns {Array} Available inventory items
   */
  static async getAvailableInventoryForItemType(itemTypeId) {
    try {
      return await db("inventory_items as ii")
        .leftJoin("inventory_item_types as iit", "ii.item_type_id", "iit.id")
        .leftJoin("inventory_categories as ic", "iit.category_id", "ic.id")
        .leftJoin("suppliers as s", "ii.supplier_id", "s.id")
        .select(
          "ii.*",
          "iit.name as item_type_name",
          "iit.unit_of_measure",
          "ic.name as category_name",
          "s.name as supplier_name"
        )
        .where("ii.item_type_id", itemTypeId)
        .where("ii.status", "available")
        .where("ii.quantity", ">", 0)
        .whereNull("ii.deleted_at")
        .orderBy("ii.expiry_date", "asc");
    } catch (error) {
      console.error("Error fetching available inventory for item type:", error);
      throw new Error("Failed to fetch available inventory");
    }
  }

  /**
   * Get inventory availability summary for multiple ingredients
   * @param {Array} ingredientRequirements - Array of {inventory_item_id, quantity_required}
   * @returns {Object} Summary of availability
   */
  static async getBulkAvailabilityCheck(ingredientRequirements) {
    try {
      const summary = {
        total_ingredients: ingredientRequirements.length,
        available_ingredients: 0,
        insufficient_ingredients: [],
        sufficient_for_production: true,
        details: [],
      };

      for (const req of ingredientRequirements) {
        const availableItems = await db("inventory_items")
          .where("id", req.inventory_item_id)
          .where("status", "available")
          .whereNull("deleted_at")
          .select("quantity", "item_name", "unit_of_measure", "expiry_date");

        const availableItem = availableItems[0];
        const availableQuantity = availableItem ? availableItem.quantity : 0;
        const isAvailable = availableQuantity >= req.quantity_required;

        const detail = {
          inventory_item_id: req.inventory_item_id,
          item_name: availableItem?.item_name || "Unknown",
          required_quantity: req.quantity_required,
          available_quantity: availableQuantity,
          unit: availableItem?.unit_of_measure || "unit",
          is_available: isAvailable,
          expiry_date: availableItem?.expiry_date,
        };

        summary.details.push(detail);

        if (isAvailable) {
          summary.available_ingredients++;
        } else {
          summary.insufficient_ingredients.push(detail);
          summary.sufficient_for_production = false;
        }
      }

      return summary;
    } catch (error) {
      console.error("Error checking bulk availability:", error);
      throw new Error("Failed to check bulk availability");
    }
  }

  /**
   * Get low stock alerts for critical ingredients
   * @returns {Array} Low stock items
   */
  static async getLowStockAlerts() {
    try {
      // Get items where current stock is below reorder point
      const lowStockItems = await db("inventory_items as ii")
        .leftJoin("inventory_item_types as iit", "ii.item_type_id", "iit.id")
        .leftJoin("inventory_categories as ic", "iit.category_id", "ic.id")
        .select(
          "ii.*",
          "iit.name as item_type_name",
          "iit.reorder_level",
          "ic.name as category_name",
          db.raw("(ii.quantity <= iit.reorder_level) as is_low_stock")
        )
        .where("ii.status", "available")
        .where("ii.quantity", ">", 0)
        .whereNull("ii.deleted_at")
        .whereRaw("ii.quantity <= iit.reorder_level")
        .orderBy("ii.quantity", "asc");

      return lowStockItems.map((item) => ({
        id: item.id,
        item_name: item.item_name,
        item_type_name: item.item_type_name,
        category_name: item.category_name,
        current_quantity: item.quantity,
        reorder_level: item.reorder_level,
        shortage_amount: item.reorder_level - item.quantity,
        unit_of_measure: item.unit_of_measure,
        expiry_date: item.expiry_date,
      }));
    } catch (error) {
      console.error("Error fetching low stock alerts:", error);
      throw new Error("Failed to fetch low stock alerts");
    }
  }

  /**
   * Get inventory items expiring soon
   * @param {number} daysAhead - Number of days to look ahead
   * @returns {Array} Items expiring soon
   */
  static async getExpiringSoon(daysAhead = 30) {
    try {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + daysAhead);

      const expiringItems = await db("inventory_items as ii")
        .leftJoin("inventory_item_types as iit", "ii.item_type_id", "iit.id")
        .leftJoin("inventory_categories as ic", "iit.category_id", "ic.id")
        .select(
          "ii.*",
          "iit.name as item_type_name",
          "ic.name as category_name"
        )
        .where("ii.status", "available")
        .where("ii.quantity", ">", 0)
        .where("ii.expiry_date", "<=", futureDate.toISOString().split("T")[0])
        .whereNull("ii.deleted_at")
        .orderBy("ii.expiry_date", "asc");

      return expiringItems.map((item) => ({
        id: item.id,
        item_name: item.item_name,
        item_type_name: item.item_type_name,
        category_name: item.category_name,
        quantity: item.quantity,
        unit_of_measure: item.unit_of_measure,
        expiry_date: item.expiry_date,
        days_until_expiry: Math.ceil(
          (new Date(item.expiry_date) - new Date()) / (1000 * 60 * 60 * 24)
        ),
      }));
    } catch (error) {
      console.error("Error fetching expiring items:", error);
      throw new Error("Failed to fetch expiring items");
    }
  }

  /**
   * Get inventory statistics for dashboard
   * @returns {Object} Inventory statistics
   */
  static async getInventoryStats() {
    try {
      const stats = await db("inventory_items as ii")
        .leftJoin("inventory_item_types as iit", "ii.item_type_id", "iit.id")
        .select(
          db.raw("COUNT(DISTINCT ii.id) as total_items"),
          db.raw("SUM(ii.quantity) as total_quantity"),
          db.raw(
            "COUNT(DISTINCT CASE WHEN ii.quantity <= iit.reorder_level THEN ii.id END) as low_stock_items"
          ),
          db.raw(
            "COUNT(DISTINCT CASE WHEN ii.expiry_date <= DATE_ADD(CURDATE(), INTERVAL 30 DAY) THEN ii.id END) as expiring_soon"
          ),
          db.raw("SUM(ii.total_value) as total_value"),
          db.raw("AVG(ii.unit_cost) as average_cost")
        )
        .where("ii.status", "available")
        .where("ii.quantity", ">", 0)
        .whereNull("ii.deleted_at")
        .first();

      return stats;
    } catch (error) {
      console.error("Error fetching inventory stats:", error);
      throw new Error("Failed to fetch inventory statistics");
    }
  }
}

module.exports = InventoryService;
