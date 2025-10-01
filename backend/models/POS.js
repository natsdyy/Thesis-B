const { db } = require("../config/database");

class POSModel {
  // Fetch menu items for POS with branch-specific stock (both production and SCM items)
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
      // Query 1: Production items (existing functionality)
      let productionQuery = db("menu_items as mi")
        .leftJoin("production_inventory as pi", "mi.id", "pi.menu_item_id")
        .select(
          "mi.id",
          "mi.item_code",
          "mi.menu_item_name as item_name",
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
          db.raw("COALESCE(pi.available_quantity, 0) as production_stock"),
          db.raw("'production' as item_type")
        )
        .whereNull("mi.deleted_at");

      // Query 2: SCM items (ONLY beverages) from branch inventory
      let scmQuery = db("branch_inventory as bi")
        .select(
          "bi.id",
          "bi.item_name",
          "bi.category",
          "bi.selling_price",
          "bi.quantity as branch_stock",
          "bi.expiry_date as branch_expiry_date",
          "bi.unit",
          "bi.item_type",
          db.raw("NULL as item_code"),
          db.raw("NULL as menu_id"),
          db.raw("NULL as recipe_id"),
          db.raw("NULL as description"),
          db.raw("NULL as cost_price"),
          db.raw("NULL as profit_margin"),
          db.raw("0 as preparation_time_minutes"),
          db.raw("NULL as serving_size"),
          db.raw("NULL as serving_unit"),
          db.raw("true as is_available"),
          db.raw("false as is_featured"),
          db.raw("NULL as tags"),
          db.raw("999 as sequence_order"),
          db.raw("NULL as image_url"),
          db.raw("0 as production_stock")
        )
        .where("bi.item_type", "scm")
        .where("bi.category", "Beverages") // ONLY include beverage items
        .where("bi.branch_id", branch_id)
        .whereNull("bi.deleted_at")
        .where("bi.quantity", ">", 0);

      // Apply filters to production query
      if (is_available !== undefined && is_available !== null) {
        productionQuery = productionQuery.where(
          "mi.is_available",
          !!is_available
        );
      }

      if (menu_id) {
        productionQuery = productionQuery.where("mi.menu_id", menu_id);
      }

      if (Array.isArray(item_codes) && item_codes.length > 0) {
        productionQuery = productionQuery.whereIn("mi.item_code", item_codes);
      }

      if (search) {
        productionQuery = productionQuery.where(function () {
          this.where("mi.menu_item_name", "ilike", `%${search}%`).orWhere(
            "mi.item_code",
            "ilike",
            `%${search}%`
          );
        });

        scmQuery = scmQuery.where("bi.item_name", "ilike", `%${search}%`);
      }

      if (category) {
        productionQuery = productionQuery.where("mi.category", category);
        scmQuery = scmQuery.where("bi.category", category);
      }

      // Join branch inventory for production items
      if (branch_id) {
        productionQuery = productionQuery.leftJoin(
          { bi: "branch_inventory" },
          function () {
            this.on("bi.item_name", "=", "mi.menu_item_name")
              .andOn("bi.item_type", "=", db.raw("?", ["production"]))
              .andOn("bi.branch_id", "=", db.raw("?", [branch_id]))
              .andOnNull("bi.deleted_at");
          }
        );

        productionQuery = productionQuery.select(
          db.raw("COALESCE(bi.quantity, 0) as branch_stock"),
          "bi.expiry_date as branch_expiry_date"
        );
      } else {
        productionQuery = productionQuery.select(
          db.raw("CAST(0 as integer) as branch_stock"),
          db.raw("NULL as branch_expiry_date")
        );
      }

      // Execute both queries in parallel
      const [productionResults, scmResults] = await Promise.all([
        productionQuery
          .orderBy("mi.sequence_order", "asc")
          .orderBy("mi.menu_item_name", "asc"),
        branch_id
          ? scmQuery.orderBy("bi.item_name", "asc")
          : Promise.resolve([]),
      ]);

      // Combine results
      let combinedResults = [...productionResults, ...scmResults];

      // Filter out expired items for POS safety
      if (branch_id) {
        const today = new Date().toISOString().split("T")[0];
        combinedResults = combinedResults.filter((item) => {
          // If item has expiry date, check if it's expired
          if (item.branch_expiry_date) {
            const expiryDate = new Date(item.branch_expiry_date)
              .toISOString()
              .split("T")[0];
            return expiryDate > today; // Only include items that haven't expired
          }
          // If no expiry date, include the item (assume it doesn't expire)
          return true;
        });
      }

      // Apply pagination to combined results
      const total = combinedResults.length;
      const startIndex = Math.max(0, Number(offset));
      const endIndex = startIndex + Math.max(1, Number(limit));
      const paginatedResults = combinedResults.slice(startIndex, endIndex);

      // Normalize the results to ensure consistent field names
      const normalizedResults = paginatedResults.map((item) => ({
        ...item,
        menu_item_name: item.item_name || item.menu_item_name,
        stock_quantity: item.branch_stock || item.production_stock || 0,
        is_expired: item.branch_expiry_date
          ? new Date(item.branch_expiry_date).toISOString().split("T")[0] <=
            new Date().toISOString().split("T")[0]
          : false,
      }));

      return { rows: normalizedResults, total };
    } catch (error) {
      console.error("Error fetching POS menu items:", error);
      throw new Error("Failed to fetch POS menu items");
    }
  }
}

module.exports = POSModel;
