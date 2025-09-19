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
      category = null,
      limit = 24,
      offset = 0,
    } = filters;

    try {
      // Base query: menu items with optional production inventory join
      let baseQuery = db("menu_items as mi")
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
        baseQuery = baseQuery.where("mi.is_available", !!is_available);
      }

      if (menu_id) {
        baseQuery = baseQuery.where("mi.menu_id", menu_id);
      }

      if (Array.isArray(item_codes) && item_codes.length > 0) {
        baseQuery = baseQuery.whereIn("mi.item_code", item_codes);
      }

      if (search) {
        baseQuery = baseQuery.where(function () {
          this.where("mi.menu_item_name", "ilike", `%${search}%`).orWhere(
            "mi.item_code",
            "ilike",
            `%${search}%`
          );
        });
      }

      if (category) {
        baseQuery = baseQuery.where("mi.category", category);
      }

      // Join branch inventory for branch-specific quantity (by item_name, production type)
      if (branch_id) {
        baseQuery = baseQuery.leftJoin({ bi: "branch_inventory" }, function () {
          this.on("bi.item_name", "=", "mi.menu_item_name")
            .andOn("bi.item_type", "=", db.raw("?", ["production"]))
            .andOn("bi.branch_id", "=", db.raw("?", [branch_id]))
            .andOnNull("bi.deleted_at");
        });

        baseQuery = baseQuery.select(
          db.raw("COALESCE(bi.quantity, 0) as branch_stock")
        );
      } else {
        baseQuery = baseQuery.select(
          db.raw("CAST(0 as integer) as branch_stock")
        );
      }

      // Clone for count
      const countQuery = baseQuery
        .clone()
        .clearSelect()
        .count({ total: "mi.id" });

      // Apply ordering and pagination
      const dataQuery = baseQuery
        .clone()
        .orderBy("mi.sequence_order", "asc")
        .orderBy("mi.menu_item_name", "asc")
        .limit(Math.max(1, Number(limit)))
        .offset(Math.max(0, Number(offset)));

      const [countRow] = await countQuery;
      const rows = await dataQuery;

      const total = parseInt(countRow?.total || 0, 10);
      return { rows, total };
    } catch (error) {
      console.error("Error fetching POS menu items:", error);
      throw new Error("Failed to fetch POS menu items");
    }
  }
}

module.exports = POSModel;
