const { db } = require("../config/database");

class POSModel {
  // Fetch menu items for POS with branch-specific stock
  static async getMenuItemsForPOS(filters = {}) {
    const {
      branch_id = null,
      menu_id = null,
      item_codes = [],
      is_available = true,
      search = null,
    } = filters;

    try {
      // Base query: menu items with optional production inventory join
      let query = db("menu_items as mi")
        .leftJoin("production_inventory as pi", "mi.id", "pi.menu_item_id")
        .select(
          "mi.id",
          "mi.item_code",
          "mi.menu_item_name",
          "mi.menu_id",
          "mi.recipe_id",
          "mi.description",
          "mi.category",
          "mi.selling_price",
          "mi.cost_price",
          "mi.profit_margin",
          "mi.preparation_time_minutes",
          "mi.serving_size",
          "mi.serving_unit",
          "mi.is_available",
          "mi.is_featured",
          "mi.tags",
          "mi.sequence_order",
          "mi.image_url",
          db.raw("COALESCE(pi.available_quantity, 0) as production_stock")
        )
        .whereNull("mi.deleted_at");

      if (is_available !== undefined && is_available !== null) {
        query = query.where("mi.is_available", !!is_available);
      }

      if (menu_id) {
        query = query.where("mi.menu_id", menu_id);
      }

      if (Array.isArray(item_codes) && item_codes.length > 0) {
        query = query.whereIn("mi.item_code", item_codes);
      }

      if (search) {
        query = query.where(function () {
          this.where("mi.menu_item_name", "ilike", `%${search}%`).orWhere(
            "mi.item_code",
            "ilike",
            `%${search}%`
          );
        });
      }

      // Join branch inventory for branch-specific quantity (by item_name, production type)
      if (branch_id) {
        query = query.leftJoin({ bi: "branch_inventory" }, function () {
          this.on("bi.item_name", "=", "mi.menu_item_name")
            .andOn("bi.item_type", "=", db.raw("?", ["production"]))
            .andOn("bi.branch_id", "=", db.raw("?", [branch_id]))
            .andOnNull("bi.deleted_at");
        });

        query = query.select(
          db.raw("COALESCE(bi.quantity, 0) as branch_stock")
        );
      } else {
        query = query.select(db.raw("CAST(0 as integer) as branch_stock"));
      }

      const rows = await query
        .orderBy("mi.sequence_order", "asc")
        .orderBy("mi.menu_item_name", "asc");
      return rows;
    } catch (error) {
      console.error("Error fetching POS menu items:", error);
      throw new Error("Failed to fetch POS menu items");
    }
  }
}

module.exports = POSModel;
