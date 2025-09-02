// backend/services/categoryMappingService.js
const { db } = require("../config/database");

class CategoryMappingService {
  // Get all inventory categories with their item types
  static async getInventoryCategories() {
    try {
      const categories = await db("inventory_categories as ic")
        .leftJoin("inventory_item_types as it", "ic.id", "it.category_id")
        .select(
          "ic.id as category_id",
          "ic.name as category_name",
          "ic.description as category_description",
          "ic.is_active as category_active",
          "it.id as item_type_id",
          "it.name as item_type_name",
          "it.description as item_type_description",
          "it.unit_of_measure",
          "it.requires_expiry",
          "it.requires_batch",
          "it.is_active as item_type_active"
        )
        .where("ic.is_active", true)
        .orderBy("ic.name")
        .orderBy("it.name");

      // Group by category
      const groupedCategories = {};
      categories.forEach((row) => {
        if (!groupedCategories[row.category_id]) {
          groupedCategories[row.category_id] = {
            id: row.category_id,
            name: row.category_name,
            description: row.category_description,
            is_active: row.category_active,
            item_types: [],
          };
        }

        if (row.item_type_id && row.item_type_active) {
          groupedCategories[row.category_id].item_types.push({
            id: row.item_type_id,
            name: row.item_type_name,
            description: row.item_type_description,
            unit_of_measure: row.unit_of_measure,
            requires_expiry: row.requires_expiry,
            requires_batch: row.requires_batch,
          });
        }
      });

      return Object.values(groupedCategories);
    } catch (error) {
      console.error("Error fetching inventory categories:", error);
      throw new Error("Failed to retrieve inventory categories");
    }
  }

  // Get item types for a specific category
  static async getItemTypesByCategory(categoryId) {
    try {
      const itemTypes = await db("inventory_item_types")
        .where("category_id", categoryId)
        .where("is_active", true)
        .orderBy("name");

      return itemTypes;
    } catch (error) {
      console.error("Error fetching item types by category:", error);
      throw new Error("Failed to retrieve item types");
    }
  }

  // Get category by item type name
  static async getCategoryByItemType(itemTypeName) {
    try {
      const result = await db("inventory_item_types as it")
        .leftJoin("inventory_categories as ic", "it.category_id", "ic.id")
        .select("ic.*")
        .where("it.name", itemTypeName)
        .where("it.is_active", true)
        .first();

      return result;
    } catch (error) {
      console.error("Error fetching category by item type:", error);
      throw new Error("Failed to retrieve category");
    }
  }

  // Validate request type against inventory categories
  static async validateRequestType(requestType) {
    try {
      const itemType = await db("inventory_item_types")
        .where("name", requestType)
        .where("is_active", true)
        .first();

      return !!itemType;
    } catch (error) {
      console.error("Error validating request type:", error);
      return false;
    }
  }

  // Get unit of measure for an item type
  static async getUnitOfMeasure(itemTypeName) {
    try {
      const itemType = await db("inventory_item_types")
        .where("name", itemTypeName)
        .where("is_active", true)
        .select("unit_of_measure")
        .first();

      return itemType ? itemType.unit_of_measure : "pieces";
    } catch (error) {
      console.error("Error fetching unit of measure:", error);
      return "pieces";
    }
  }
}

module.exports = CategoryMappingService;
