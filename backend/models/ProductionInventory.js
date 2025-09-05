const { db } = require("../config/database");

class ProductionInventory {
  // Get all production inventory items with details
  static async getAll(filters = {}) {
    try {
      let query = db("production_inventory as pi")
        .select(
          "pi.*",
          "m.menu_name",
          "mi.menu_item_name",
          "mi.item_code",
          "mi.description",
          "mi.selling_price as menu_selling_price",
          "mi.category",
          "mi.is_featured",
          "mi.tags",
          "mi.image_url",
          "r.recipe_name",
          "r.batch_size",
          "r.batch_unit",
          "u.name as created_by_name"
        )
        .leftJoin("menu_items as mi", "pi.menu_item_id", "mi.id")
        .leftJoin("menus as m", "mi.menu_id", "m.id")
        .leftJoin("recipes as r", "pi.recipe_id", "r.id")
        .leftJoin("users as u", "pi.created_by", "u.id")
        .where("pi.is_active", true)
        .whereNull("mi.deleted_at")
        .whereNull("m.deleted_at");

      // Apply filters
      if (filters.category) {
        query = query.where("mi.category", filters.category);
      }

      if (filters.is_featured !== undefined) {
        query = query.where("mi.is_featured", filters.is_featured);
      }

      if (filters.low_stock !== undefined && filters.low_stock) {
        query = query.where(
          "pi.available_quantity",
          "<=",
          db.raw("pi.reorder_point")
        );
      }

      if (filters.search) {
        query = query.where(function () {
          this.where("mi.menu_item_name", "ilike", `%${filters.search}%`)
            .orWhere("mi.item_code", "ilike", `%${filters.search}%`)
            .orWhere("r.recipe_name", "ilike", `%${filters.search}%`);
        });
      }

      return await query.orderBy("mi.menu_item_name", "asc");
    } catch (error) {
      console.error("Error fetching production inventory:", error);
      throw new Error("Failed to retrieve production inventory");
    }
  }

  // Get production inventory item by ID with full details
  static async getById(id) {
    try {
      const inventoryItem = await db("production_inventory as pi")
        .select(
          "pi.*",
          "m.menu_name",
          "mi.menu_item_name",
          "mi.item_code",
          "mi.description",
          "mi.selling_price as menu_selling_price",
          "mi.category",
          "mi.is_featured",
          "mi.tags",
          "mi.preparation_time_minutes",
          "r.recipe_name",
          "r.description as recipe_description",
          "r.instructions",
          "r.batch_size",
          "r.batch_unit",
          "r.cost_per_batch",
          "u.name as created_by_name"
        )
        .leftJoin("menu_items as mi", "pi.menu_item_id", "mi.id")
        .leftJoin("menus as m", "mi.menu_id", "m.id")
        .leftJoin("recipes as r", "pi.recipe_id", "r.id")
        .leftJoin("users as u", "pi.created_by", "u.id")
        .where("pi.id", id)
        .whereNull("mi.deleted_at")
        .whereNull("m.deleted_at")
        .first();

      if (inventoryItem) {
        // Get recipe ingredients with current inventory levels
        inventoryItem.recipe_ingredients = await db("recipe_ingredients as ri")
          .select(
            "ri.*",
            "ii.item_name as ingredient_name",
            "ii.quantity as available_stock",
            "iit.unit_of_measure",
            "ii.unit_cost",
            "ii.expiry_date"
          )
          .leftJoin("inventory_items as ii", "ri.inventory_item_id", "ii.id")
          .leftJoin("inventory_item_types as iit", "ii.item_type_id", "iit.id")
          .where("ri.recipe_id", inventoryItem.recipe_id)
          .orderBy("ri.sequence_order", "asc");

        // Get recent quality inspections
        inventoryItem.recent_inspections = await db(
          "menu_quality_inspections as qi"
        )
          .select(
            "qi.inspection_date",
            "qi.result",
            "qi.overall_quality_score",
            "u.name as inspector_name"
          )
          .leftJoin("users as u", "qi.inspector_id", "u.id")
          .where("qi.menu_item_id", inventoryItem.menu_item_id)
          .whereNull("qi.deleted_at")
          .orderBy("qi.inspection_date", "desc")
          .limit(5);

        // Calculate production capacity based on ingredients
        inventoryItem.production_capacity = this.calculateProductionCapacity(
          inventoryItem.recipe_ingredients,
          inventoryItem.batch_size
        );
      }

      return inventoryItem;
    } catch (error) {
      console.error("Error fetching production inventory item by ID:", error);
      throw new Error("Failed to retrieve production inventory item");
    }
  }

  // Get production inventory by menu item ID
  static async getByMenuItem(menuItemId) {
    try {
      return await db("production_inventory")
        .where("menu_item_id", menuItemId)
        .where("is_active", true)
        .first();
    } catch (error) {
      console.error("Error fetching production inventory by menu item:", error);
      throw new Error("Failed to retrieve production inventory for menu item");
    }
  }

  // Update stock levels
  static async updateStock(id, newQuantity, userId, notes = null) {
    try {
      const inventoryItem = await db("production_inventory")
        .where("id", id)
        .first();

      if (!inventoryItem) {
        throw new Error("Production inventory item not found");
      }

      await db("production_inventory").where("id", id).update({
        available_quantity: newQuantity,
        last_produced_date: db.fn.now(),
        updated_at: db.fn.now(),
      });

      // Log the stock update
      await this.logStockUpdate(
        id,
        inventoryItem.available_quantity,
        newQuantity,
        userId,
        notes
      );

      return await this.getById(id);
    } catch (error) {
      console.error("Error updating stock:", error);
      throw new Error("Failed to update stock levels");
    }
  }

  // Add stock (production completed)
  static async addStock(menuItemId, quantityProduced, productionCost, userId) {
    try {
      const inventoryItem = await this.getByMenuItem(menuItemId);

      if (!inventoryItem) {
        throw new Error("Production inventory item not found");
      }

      const newQuantity = inventoryItem.available_quantity + quantityProduced;
      const newUnitCost = productionCost / quantityProduced;

      await db("production_inventory").where("id", inventoryItem.id).update({
        available_quantity: newQuantity,
        unit_cost: newUnitCost,
        production_cost_per_unit: newUnitCost,
        last_produced_date: db.fn.now(),
        updated_at: db.fn.now(),
      });

      // Log the production
      await this.logStockUpdate(
        inventoryItem.id,
        inventoryItem.available_quantity,
        newQuantity,
        userId,
        `Production completed: ${quantityProduced} units at cost ₱${productionCost}`
      );

      return await this.getById(inventoryItem.id);
    } catch (error) {
      console.error("Error adding stock:", error);
      throw new Error("Failed to add stock from production");
    }
  }

  // Update pricing
  static async updatePricing(id, sellingPrice, userId) {
    try {
      const inventoryItem = await db("production_inventory")
        .where("id", id)
        .first();

      if (!inventoryItem) {
        throw new Error("Production inventory item not found");
      }

      const profitMargin = this.calculateProfitMargin(
        sellingPrice,
        inventoryItem.unit_cost
      );

      await db("production_inventory").where("id", id).update({
        selling_price: sellingPrice,
        profit_margin_percent: profitMargin,
        updated_at: db.fn.now(),
      });

      // Update menu item pricing as well
      await db("menu_items").where("id", inventoryItem.menu_item_id).update({
        selling_price: sellingPrice,
        profit_margin: profitMargin,
        updated_at: db.fn.now(),
      });

      return await this.getById(id);
    } catch (error) {
      console.error("Error updating pricing:", error);
      throw new Error("Failed to update pricing");
    }
  }

  // Calculate production capacity based on available ingredients
  static calculateProductionCapacity(ingredients, batchSize) {
    if (!ingredients || ingredients.length === 0) {
      return { max_batches: 0, limiting_factor: "No ingredients found" };
    }

    let maxBatches = Infinity;
    let limitingFactor = null;
    let limitingIngredient = null;

    ingredients.forEach((ingredient) => {
      const availableStock = parseFloat(ingredient.available_stock || 0);
      const requiredPerBatch = parseFloat(ingredient.quantity_required || 0);

      if (requiredPerBatch > 0) {
        const possibleBatches = Math.floor(availableStock / requiredPerBatch);

        if (possibleBatches < maxBatches) {
          maxBatches = possibleBatches;
          limitingFactor = `${availableStock} ${ingredient.unit_of_measure} available`;
          limitingIngredient = ingredient.ingredient_name;
        }
      }
    });

    return {
      max_batches: maxBatches === Infinity ? 0 : maxBatches,
      limiting_factor: limitingFactor,
      limiting_ingredient: limitingIngredient,
      can_produce: maxBatches > 0,
    };
  }

  // Calculate profit margin
  static calculateProfitMargin(sellingPrice, costPrice) {
    if (costPrice === 0) return 0;
    return ((sellingPrice - costPrice) / costPrice) * 100;
  }

  // Get low stock items
  static async getLowStockItems() {
    try {
      return await db("production_inventory as pi")
        .select("pi.*", "mi.menu_item_name", "mi.item_code", "mi.category")
        .leftJoin("menu_items as mi", "pi.menu_item_id", "mi.id")
        .where("pi.is_active", true)
        .where("pi.available_quantity", "<=", db.raw("pi.reorder_point"))
        .where("pi.reorder_point", ">", 0)
        .orderBy("pi.available_quantity", "asc");
    } catch (error) {
      console.error("Error fetching low stock items:", error);
      throw new Error("Failed to retrieve low stock items");
    }
  }

  // Log stock updates for audit trail
  static async logStockUpdate(
    inventoryId,
    oldQuantity,
    newQuantity,
    userId,
    notes
  ) {
    try {
      await db("menu_item_audit_log").insert({
        production_inventory_id: inventoryId,
        user_id: userId,
        action_type: "INVENTORY_UPDATED",
        action_details: JSON.stringify({
          old_quantity: oldQuantity,
          new_quantity: newQuantity,
          quantity_change: newQuantity - oldQuantity,
        }),
        notes: notes,
        created_at: db.fn.now(),
      });
    } catch (error) {
      console.error("Error logging stock update:", error);
      // Don't throw error for logging failures
    }
  }

  // Get production inventory statistics
  static async getStats() {
    try {
      const stats = await db("production_inventory as pi")
        .select(
          db.raw("COUNT(DISTINCT pi.id) as total_items"),
          db.raw("SUM(pi.available_quantity) as total_quantity"),
          db.raw("AVG(pi.unit_cost) as average_cost"),
          db.raw("AVG(pi.selling_price) as average_selling_price"),
          db.raw("AVG(pi.profit_margin_percent) as average_margin"),
          db.raw(
            "COUNT(DISTINCT CASE WHEN pi.available_quantity <= pi.reorder_point THEN pi.id END) as low_stock_items"
          ),
          db.raw("SUM(pi.total_produced) as total_produced_all_time"),
          db.raw("SUM(pi.total_distributed) as total_distributed_all_time")
        )
        .where("pi.is_active", true)
        .first();

      // Get distribution statistics
      const distributionStats = await db(
        "production_inventory_distributions as pid"
      )
        .select(
          db.raw("COUNT(DISTINCT pid.id) as total_distributions"),
          db.raw("SUM(pid.quantity_distributed) as total_quantity_distributed"),
          db.raw("COUNT(DISTINCT pid.branch_id) as branches_served"),
          db.raw("COUNT(DISTINCT pid.menu_item_id) as items_distributed")
        )
        .where("pid.status", "completed")
        .whereNull("pid.deleted_at")
        .first();

      // Get recent distribution activity (last 30 days)
      const recentDistributions = await db(
        "production_inventory_distributions as pid"
      )
        .select(
          db.raw("COUNT(DISTINCT pid.id) as recent_distributions"),
          db.raw("SUM(pid.quantity_distributed) as recent_quantity_distributed")
        )
        .where("pid.status", "completed")
        .where(
          "pid.distribution_date",
          ">=",
          db.raw("NOW() - INTERVAL '30 days'")
        )
        .whereNull("pid.deleted_at")
        .first();

      return {
        ...stats,
        ...distributionStats,
        ...recentDistributions,
      };
    } catch (error) {
      console.error("Error fetching production inventory stats:", error);
      throw new Error("Failed to retrieve production inventory statistics");
    }
  }

  // Record distribution to branch
  static async recordDistribution(
    menuItemId,
    quantityDistributed,
    branchId,
    userId,
    notes = null
  ) {
    try {
      const inventoryItem = await this.getByMenuItem(menuItemId);

      if (!inventoryItem) {
        throw new Error("Production inventory item not found");
      }

      if (inventoryItem.available_quantity < quantityDistributed) {
        throw new Error("Insufficient stock for distribution");
      }

      const newQuantity =
        inventoryItem.available_quantity - quantityDistributed;

      await db("production_inventory")
        .where("id", inventoryItem.id)
        .update({
          available_quantity: newQuantity,
          total_distributed:
            (inventoryItem.total_distributed || 0) + quantityDistributed,
          updated_at: db.fn.now(),
        });

      // Log the distribution
      await this.logStockUpdate(
        inventoryItem.id,
        inventoryItem.available_quantity,
        newQuantity,
        userId,
        `Distributed ${quantityDistributed} units to branch ${branchId}${notes ? ` - ${notes}` : ""}`
      );

      // Create distribution record
      await db("production_inventory_distributions").insert({
        production_inventory_id: inventoryItem.id,
        menu_item_id: menuItemId,
        branch_id: branchId,
        quantity_distributed: quantityDistributed,
        distribution_date: db.fn.now(),
        distributed_by: userId,
        notes: notes,
        created_at: db.fn.now(),
      });

      return await this.getById(inventoryItem.id);
    } catch (error) {
      console.error("Error recording distribution:", error);
      throw new Error("Failed to record distribution");
    }
  }

  // Get distribution history for a menu item
  static async getDistributionHistory(menuItemId, filters = {}) {
    try {
      let query = db("production_inventory_distributions as pid")
        .select(
          "pid.*",
          "pi.available_quantity",
          "mi.menu_item_name",
          "mi.item_code",
          "b.branch_name",
          "u.name as distributed_by_name"
        )
        .leftJoin(
          "production_inventory as pi",
          "pid.production_inventory_id",
          "pi.id"
        )
        .leftJoin("menu_items as mi", "pid.menu_item_id", "mi.id")
        .leftJoin("branches as b", "pid.branch_id", "b.id")
        .leftJoin("users as u", "pid.distributed_by", "u.id")
        .where("pid.menu_item_id", menuItemId);

      // Apply filters
      if (filters.branch_id) {
        query = query.where("pid.branch_id", filters.branch_id);
      }

      if (filters.date_from) {
        query = query.where("pid.distribution_date", ">=", filters.date_from);
      }

      if (filters.date_to) {
        query = query.where("pid.distribution_date", "<=", filters.date_to);
      }

      return await query.orderBy("pid.distribution_date", "desc");
    } catch (error) {
      console.error("Error fetching distribution history:", error);
      throw new Error("Failed to retrieve distribution history");
    }
  }

  // Get all distributions with filters
  static async getAllDistributions(filters = {}) {
    try {
      let query = db("production_inventory_distributions as pid")
        .select(
          "pid.*",
          "pi.available_quantity",
          "mi.menu_item_name",
          "mi.item_code",
          "mi.category",
          "b.branch_name",
          "u.name as distributed_by_name"
        )
        .leftJoin(
          "production_inventory as pi",
          "pid.production_inventory_id",
          "pi.id"
        )
        .leftJoin("menu_items as mi", "pid.menu_item_id", "mi.id")
        .leftJoin("branches as b", "pid.branch_id", "b.id")
        .leftJoin("users as u", "pid.distributed_by", "u.id");

      // Apply filters
      if (filters.branch_id) {
        query = query.where("pid.branch_id", filters.branch_id);
      }

      if (filters.menu_item_id) {
        query = query.where("pid.menu_item_id", filters.menu_item_id);
      }

      if (filters.date_from) {
        query = query.where("pid.distribution_date", ">=", filters.date_from);
      }

      if (filters.date_to) {
        query = query.where("pid.distribution_date", "<=", filters.date_to);
      }

      if (filters.search) {
        query = query.where(function () {
          this.where("mi.menu_item_name", "ilike", `%${filters.search}%`)
            .orWhere("mi.item_code", "ilike", `%${filters.search}%`)
            .orWhere("b.branch_name", "ilike", `%${filters.search}%`);
        });
      }

      return await query.orderBy("pid.distribution_date", "desc");
    } catch (error) {
      console.error("Error fetching all distributions:", error);
      throw new Error("Failed to retrieve distributions");
    }
  }

  // Check distribution availability
  static async checkDistributionAvailability(menuItemId, requestedQuantity) {
    try {
      const inventoryItem = await this.getByMenuItem(menuItemId);

      if (!inventoryItem) {
        return {
          available: false,
          current_stock: 0,
          requested_quantity: requestedQuantity,
          shortfall: requestedQuantity,
          message: "Menu item not found in production inventory",
        };
      }

      const available = inventoryItem.available_quantity >= requestedQuantity;
      const shortfall = Math.max(
        0,
        requestedQuantity - inventoryItem.available_quantity
      );

      return {
        available: available,
        current_stock: inventoryItem.available_quantity,
        requested_quantity: requestedQuantity,
        shortfall: shortfall,
        message: available
          ? "Sufficient stock available"
          : `Insufficient stock. Shortfall: ${shortfall} units`,
      };
    } catch (error) {
      console.error("Error checking distribution availability:", error);
      throw new Error("Failed to check distribution availability");
    }
  }

  // Update initial stock for items with 0 stock based on recipe batch size
  static async updateInitialStockFromRecipe(inventoryId, userId) {
    try {
      const inventoryItem = await this.getById(inventoryId);

      if (!inventoryItem) {
        throw new Error("Production inventory item not found");
      }

      if (inventoryItem.available_quantity > 0) {
        return inventoryItem; // Already has stock
      }

      // Get recipe batch size
      const recipe = await db("recipes")
        .select("batch_size", "batch_unit")
        .where("id", inventoryItem.recipe_id)
        .first();

      if (!recipe) {
        throw new Error("Recipe not found");
      }

      const initialStock = recipe.batch_size;
      const reorderPoint = Math.ceil(initialStock * 0.2);

      await db("production_inventory").where("id", inventoryId).update({
        available_quantity: initialStock,
        unit_of_measure: recipe.batch_unit,
        reorder_point: reorderPoint,
        updated_at: db.fn.now(),
      });

      // Log the stock update
      await this.logStockUpdate(
        inventoryId,
        0,
        initialStock,
        userId,
        `Initial stock set from recipe batch size: ${initialStock} ${recipe.batch_unit}`
      );

      return await this.getById(inventoryId);
    } catch (error) {
      console.error("Error updating initial stock from recipe:", error);
      throw new Error("Failed to update initial stock from recipe");
    }
  }

  // Soft delete production inventory item
  static async deactivate(id, userId) {
    try {
      await db("production_inventory").where("id", id).update({
        is_active: false,
        updated_at: db.fn.now(),
      });

      // Log deactivation
      await db("menu_item_audit_log").insert({
        production_inventory_id: id,
        user_id: userId,
        action_type: "INVENTORY_DEACTIVATED",
        action_details: JSON.stringify({ deactivated: true }),
        notes: "Production inventory item deactivated",
        created_at: db.fn.now(),
      });

      return true;
    } catch (error) {
      console.error("Error deactivating production inventory item:", error);
      throw new Error("Failed to deactivate production inventory item");
    }
  }
}

module.exports = ProductionInventory;
