const { db } = require("../config/database");

class ProductionInventory {
  // Create new production inventory entry when menu item is approved for production
  static async create(menuItemId, userId, additionalData = {}) {
    const trx = await db.transaction();

    try {
      // Get menu item and recipe details
      const menuItem = await trx("menu_items as mi")
        .select(
          "mi.*",
          "r.recipe_name",
          "r.batch_size",
          "r.batch_unit",
          "r.cost_per_batch"
        )
        .leftJoin("recipes as r", "mi.recipe_id", "r.id")
        .where("mi.id", menuItemId)
        .whereNull("mi.deleted_at")
        .first();

      if (!menuItem) {
        throw new Error("Menu item not found");
      }

      if (!menuItem.recipe_id) {
        throw new Error("Menu item must have an associated recipe");
      }

      // Check if production inventory already exists for this menu item
      const existingInventory = await trx("production_inventory")
        .where("menu_item_id", menuItemId)
        .where("is_active", true)
        .first();

      if (existingInventory) {
        throw new Error(
          "Production inventory already exists for this menu item"
        );
      }

      // Create production inventory entry with 0 initial stock
      const [productionInventory] = await trx("production_inventory")
        .insert({
          menu_item_id: menuItemId,
          recipe_id: menuItem.recipe_id,
          available_quantity: 0, // Start with 0 stock - proper real-world practice
          unit_of_measure: menuItem.batch_unit || "servings",
          unit_cost: 0.0, // Will be updated after first production
          selling_price: menuItem.selling_price || 0.0,
          last_produced_date: null, // No production yet
          last_batch_size: 0,
          production_cost_per_unit: 0.0, // Will be calculated after production
          profit_margin_percent: 0.0, // Will be calculated after production
          is_active: true,
          quality_status: "Approved", // Default status for approved menu items
          next_quality_check_date: null,
          total_produced: 0, // No production yet
          total_sold: 0,
          reorder_point: additionalData.reorder_point || 20, // Default reorder point
          maximum_stock: additionalData.maximum_stock || 0,
          created_by: userId,
          created_at: db.fn.now(),
          updated_at: db.fn.now(),
        })
        .returning("*");

      // Log the creation action
      await trx("menu_item_audit_log").insert({
        menu_item_id: menuItemId,
        employee_id: userId,
        action_type: "ADDED_TO_INVENTORY",
        action_details: JSON.stringify({
          production_inventory_id: productionInventory.id,
          initial_stock: 0,
          reorder_point: productionInventory.reorder_point,
          maximum_stock: productionInventory.maximum_stock,
          quality_status: productionInventory.quality_status,
        }),
        notes: `Production inventory created for "${menuItem.menu_item_name}" - Starting with 0 stock`,
        created_at: db.fn.now(),
      });

      await trx.commit();

      // Return the created production inventory with full details
      return await this.getById(productionInventory.id);
    } catch (error) {
      await trx.rollback();
      console.error("Error creating production inventory:", error);
      throw new Error(
        `Failed to create production inventory: ${error.message}`
      );
    }
  }

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
          db.raw(
            "COALESCE(e.first_name,'') || ' ' || COALESCE(e.last_name,'') as created_by_name"
          )
        )
        .leftJoin("menu_items as mi", "pi.menu_item_id", "mi.id")
        .leftJoin("menus as m", "mi.menu_id", "m.id")
        .leftJoin("recipes as r", "pi.recipe_id", "r.id")
        .leftJoin("employees as e", "pi.created_by", "e.id")
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

      const results = await query.orderBy("mi.menu_item_name", "asc");

      // Calculate production capacity for each item
      for (let item of results) {
        try {
          // Get recipe ingredients for production capacity calculation
          const ingredients = await db("recipe_ingredients as ri")
            .select(
              "ri.*",
              "ii.item_name as ingredient_name",
              "ii.quantity as available_stock",
              "iit.unit_of_measure",
              "ii.unit_cost"
            )
            .leftJoin("inventory_items as ii", "ri.inventory_item_id", "ii.id")
            .leftJoin(
              "inventory_item_types as iit",
              "ii.item_type_id",
              "iit.id"
            )
            .where("ri.recipe_id", item.recipe_id)
            .orderBy("ri.sequence_order", "asc");

          // Calculate production capacity
          item.production_capacity = this.calculateProductionCapacity(
            ingredients,
            item.batch_size
          );
        } catch (error) {
          console.error(
            `Error calculating production capacity for item ${item.id}:`,
            error
          );
          // Set default values if calculation fails
          item.production_capacity = {
            max_batches: 0,
            limiting_factor: "Calculation error",
            can_produce: false,
          };
        }
      }

      return results;
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
          db.raw(
            "COALESCE(e.first_name,'') || ' ' || COALESCE(e.last_name,'') as created_by_name"
          )
        )
        .leftJoin("menu_items as mi", "pi.menu_item_id", "mi.id")
        .leftJoin("menus as m", "mi.menu_id", "m.id")
        .leftJoin("recipes as r", "pi.recipe_id", "r.id")
        .leftJoin("employees as e", "pi.created_by", "e.id")
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
            db.raw(
              "COALESCE(e.first_name,'') || ' ' || COALESCE(e.last_name,'') as inspector_name"
            )
          )
          .leftJoin("employees as e", "qi.inspector_id", "e.id")
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
      // Get the menu_item_id from the production_inventory record
      const inventoryItem = await db("production_inventory")
        .select("menu_item_id")
        .where("id", inventoryId)
        .first();

      if (!inventoryItem) {
        console.error("Could not find production inventory item for logging");
        return;
      }

      await db("menu_item_audit_log").insert({
        menu_item_id: inventoryItem.menu_item_id,
        employee_id: userId,
        action_type: "INVENTORY_UPDATED",
        action_details: JSON.stringify({
          production_inventory_id: inventoryId,
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

  // Get recent activity for production inventory
  static async getRecentActivity(limit = 10) {
    try {
      // Get inventory update activities
      const inventoryActivities = await db.raw(
        `
        SELECT 
          mal.id,
          mal.action_type,
          mal.action_details,
          mal.notes,
          mal.created_at,
          mal.employee_id as user_id,
          COALESCE(mi.menu_item_name, 'Unknown Item') as item_name,
          COALESCE(pi.available_quantity, 0) as available_quantity,
          COALESCE(COALESCE(e.first_name,'') || ' ' || COALESCE(e.last_name,''), 'Unknown Employee') as performed_by,
          'inventory' as activity_source
        FROM menu_item_audit_log mal
        LEFT JOIN menu_items mi ON mal.menu_item_id = mi.id AND mi.deleted_at IS NULL
        LEFT JOIN production_inventory pi ON mal.menu_item_id = pi.menu_item_id
        LEFT JOIN employees e ON mal.employee_id = e.id
        WHERE mal.action_type = ?
        ORDER BY mal.created_at DESC
        LIMIT ?
      `,
        ["INVENTORY_UPDATED", limit]
      );

      // Get production batch activities
      const productionActivities = await db.raw(
        `
        SELECT 
          pb.id,
          pb.status as action_type,
          CONCAT('{"batch_number":"', pb.batch_number, '","status":"', pb.status, '","description":"Batch #', pb.batch_number, ' - ', pb.status, '"}') as action_details,
          pb.notes,
          pb.updated_at as created_at,
          pb.assigned_to as user_id,
          COALESCE(mi.menu_item_name, 'Unknown Item') as item_name,
          COALESCE(pi.available_quantity, 0) as available_quantity,
          COALESCE(COALESCE(e.first_name,'') || ' ' || COALESCE(e.last_name,''), 'Unknown Employee') as performed_by,
          'production' as activity_source,
          pb.batch_size,
          pb.quantity_produced
        FROM production_batches pb
        LEFT JOIN menu_items mi ON pb.menu_item_id = mi.id AND mi.deleted_at IS NULL
        LEFT JOIN production_inventory pi ON pb.menu_item_id = pi.menu_item_id
        LEFT JOIN employees e ON pb.assigned_to = e.id
        WHERE pb.status IN ('In Progress', 'Completed', 'Quality Check', 'Failed')
        ORDER BY pb.updated_at DESC
        LIMIT ?
      `,
        [limit]
      );

      // Combine and sort activities
      const allActivities = [
        ...inventoryActivities.rows,
        ...productionActivities.rows,
      ]
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, limit);

      // Parse and format activities
      return allActivities.map((activity) => {
        let details = {};
        if (activity.action_details) {
          try {
            details = JSON.parse(activity.action_details);
          } catch (e) {
            // If parsing fails, create a simple details object
            details = {
              description: activity.action_details,
              batch_number: activity.batch_number || null,
              status: activity.action_type,
            };
          }
        }

        return {
          id: activity.id,
          action_type: activity.action_type,
          item_name: activity.item_name,
          old_quantity: details.old_quantity || 0,
          new_quantity: details.new_quantity || 0,
          quantity_change: details.quantity_change || 0,
          performed_by: activity.performed_by,
          created_at: activity.created_at,
          notes: activity.notes,
          action_details: activity.action_details,
          activity_source: activity.activity_source,
          batch_size: activity.batch_size || 0,
          quantity_produced: activity.quantity_produced || 0,
          batch_number: details.batch_number || null,
          description: details.description || activity.action_details,
        };
      });
    } catch (error) {
      console.error("Error fetching recent activity:", error);
      throw new Error("Failed to retrieve recent activity");
    }
  }

  // Get audit logs with filters and pagination
  static async getAuditLogs(filters = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        search = "",
        action_type = "",
        date_from = "",
        date_to = "",
        menu_item_id = null,
      } = filters;

      const offset = (page - 1) * limit;

      // Build WHERE conditions dynamically
      const whereConditions = [];
      const queryParams = [];

      // Base condition
      whereConditions.push("1=1");

      // Search filter
      if (search) {
        whereConditions.push(`(
          mi.menu_item_name ILIKE $${queryParams.length + 1} OR
          e.name ILIKE $${queryParams.length + 1} OR
          mal.notes ILIKE $${queryParams.length + 1}
        )`);
        queryParams.push(`%${search}%`);
      }

      // Action type filter
      if (action_type) {
        whereConditions.push(`mal.action_type = $${queryParams.length + 1}`);
        queryParams.push(action_type);
      }

      // Date filters
      if (date_from) {
        whereConditions.push(`mal.created_at >= $${queryParams.length + 1}`);
        queryParams.push(date_from);
      }

      if (date_to) {
        whereConditions.push(`mal.created_at <= $${queryParams.length + 1}`);
        queryParams.push(date_to);
      }

      // Menu item filter
      if (menu_item_id) {
        whereConditions.push(`mal.menu_item_id = $${queryParams.length + 1}`);
        queryParams.push(menu_item_id);
      }

      const whereClause = whereConditions.join(" AND ");

      // Get total count with optimized query
      const countQuery = `
        SELECT COUNT(*) as count
        FROM menu_item_audit_log mal
        LEFT JOIN menu_items mi ON mal.menu_item_id = mi.id AND mi.deleted_at IS NULL
        LEFT JOIN employees e ON mal.employee_id = e.id
        WHERE ${whereClause}
      `;

      const countResult = await db.raw(countQuery, queryParams);
      const total = parseInt(countResult.rows[0].count);

      // Get paginated results with optimized query
      const dataQuery = `
        SELECT 
          mal.id,
          mal.action_type,
          mal.action_details,
          mal.notes,
          mal.created_at,
          mal.employee_id as user_id,
          mal.menu_item_id,
          COALESCE(mi.menu_item_name, 'Unknown Item') as item_name,
          COALESCE(pi.available_quantity, 0) as available_quantity,
          COALESCE(COALESCE(e.first_name,'') || ' ' || COALESCE(e.last_name,''), 'Unknown Employee') as performed_by
        FROM menu_item_audit_log mal
        LEFT JOIN menu_items mi ON mal.menu_item_id = mi.id AND mi.deleted_at IS NULL
        LEFT JOIN production_inventory pi ON mal.menu_item_id = pi.menu_item_id
        LEFT JOIN employees e ON mal.employee_id = e.id
        WHERE ${whereClause}
        ORDER BY mal.created_at DESC
        LIMIT ? OFFSET ?
      `;

      const dataParams = [...queryParams, limit, offset];
      const activitiesResult = await db.raw(dataQuery, dataParams);

      // Parse action_details and add quantity information
      const processedActivities = activitiesResult.rows.map((activity) => {
        const details = activity.action_details
          ? JSON.parse(activity.action_details)
          : {};
        return {
          id: activity.id,
          action_type: activity.action_type,
          menu_item_id: activity.menu_item_id,
          item_name: activity.item_name,
          old_quantity: details.old_quantity || 0,
          new_quantity: details.new_quantity || 0,
          quantity_change: details.quantity_change || 0,
          performed_by: activity.performed_by,
          created_at: activity.created_at,
          notes: activity.notes,
          action_details: activity.action_details,
        };
      });

      return {
        data: processedActivities,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      console.error("Error fetching audit logs:", error);
      throw new Error("Failed to retrieve audit logs");
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
          db.raw(
            "COALESCE(e.first_name,'') || ' ' || COALESCE(e.last_name,'') as distributed_by_name"
          )
        )
        .leftJoin(
          "production_inventory as pi",
          "pid.production_inventory_id",
          "pi.id"
        )
        .leftJoin("menu_items as mi", "pid.menu_item_id", "mi.id")
        .leftJoin("branches as b", "pid.branch_id", "b.id")
        .leftJoin("employees as e", "pid.distributed_by", "e.id")
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
          "b.name as branch_name",
          db.raw(
            "COALESCE(e.first_name,'') || ' ' || COALESCE(e.last_name,'') as distributed_by_name"
          )
        )
        .leftJoin(
          "production_inventory as pi",
          "pid.production_inventory_id",
          "pi.id"
        )
        .leftJoin("menu_items as mi", "pid.menu_item_id", "mi.id")
        .leftJoin("branches as b", "pid.branch_id", "b.id")
        .leftJoin("employees as e", "pid.distributed_by", "e.id");

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
  // NOTE: This method is deprecated in favor of proper production workflow
  // Stock should only be added through actual production, not from recipe batch size
  static async updateInitialStockFromRecipe(inventoryId, userId) {
    try {
      const inventoryItem = await this.getById(inventoryId);

      if (!inventoryItem) {
        throw new Error("Production inventory item not found");
      }

      if (inventoryItem.available_quantity > 0) {
        return inventoryItem; // Already has stock
      }

      // Get recipe batch size for reference
      const recipe = await db("recipes")
        .select("batch_size", "batch_unit")
        .where("id", inventoryItem.recipe_id)
        .first();

      if (!recipe) {
        throw new Error("Recipe not found");
      }

      // IMPORTANT: This method now only sets initial stock to 0 and updates reorder points
      // Stock should only be added through actual production workflow
      const reorderPoint = Math.ceil(recipe.batch_size * 0.2); // 20% of batch size
      const maxStock = recipe.batch_size * 2; // 2x batch size

      await db("production_inventory").where("id", inventoryId).update({
        available_quantity: 0, // Keep at 0 - proper real-world practice
        unit_of_measure: recipe.batch_unit,
        reorder_point: reorderPoint,
        maximum_stock: maxStock,
        updated_at: db.fn.now(),
      });

      // Log the configuration update (not a stock addition)
      await this.logStockUpdate(
        inventoryId,
        0,
        0, // No stock change
        userId,
        `Production inventory configured - Reorder point: ${reorderPoint}, Max stock: ${maxStock}. Stock remains at 0 until actual production.`
      );

      return await this.getById(inventoryId);
    } catch (error) {
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
        employee_id: userId,
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

  // ==================== PRODUCTION EXECUTION METHODS ====================

  // Execute production batch
  static async executeProduction(executionData) {
    const trx = await db.transaction();

    try {
      const {
        menu_item_id,
        recipe_id,
        batch_size,
        production_date,
        assigned_to,
        notes = null,
      } = executionData;

      // Get recipe details and ingredient requirements
      const Recipe = require("./Recipe");
      const recipe = await Recipe.getById(recipe_id);
      if (!recipe) {
        throw new Error("Recipe not found");
      }

      // Check ingredient availability
      const ingredientCheck = await Recipe.checkIngredientAvailability(
        recipe_id,
        batch_size
      );
      if (!ingredientCheck.all_ingredients_available) {
        throw new Error("Insufficient ingredients for production");
      }

      // Generate batch number
      const batchNumber = this.generateBatchNumber(menu_item_id);

      // Create production batch record
      const [batchId] = await trx("production_batches")
        .insert({
          batch_number: batchNumber,
          menu_item_id: menu_item_id,
          recipe_id: recipe_id,
          batch_size: batch_size,
          quantity_produced: 0,
          status: "In Progress",
          production_date: production_date,
          assigned_to: assigned_to,
          notes: notes,
          start_time: new Date(),
          created_at: new Date(),
          updated_at: new Date(),
        })
        .returning("id");

      // Consume ingredients from SCM inventory
      const Inventory = require("./Inventory");
      const ingredientConsumption = ingredientCheck.ingredient_availability.map(
        (ingredient) => ({
          inventory_item_id: ingredient.inventory_item_id,
          quantity_consumed: ingredient.required_quantity,
          performed_by: `User ${assigned_to}`,
        })
      );

      await Inventory.consumeIngredientsForProduction(
        batchId,
        ingredientConsumption
      );

      // Update production inventory (initially still 0 until batch is completed)
      await trx("production_inventory")
        .where("menu_item_id", menu_item_id)
        .update({
          last_produced_date: production_date,
          last_batch_size: batch_size,
          updated_at: new Date(),
        });

      await trx.commit();

      return {
        batch_id: batchId,
        batch_number: batchNumber,
        status: "In Progress",
        message: "Production batch started successfully",
      };
    } catch (error) {
      await trx.rollback();
      console.error("Error executing production:", error);
      throw new Error(error.message || "Failed to execute production");
    }
  }

  // Get production batches (active or completed based on filters)
  static async getActiveBatches(filters = {}) {
    try {
      let query = db("production_batches as pb")
        .select(
          "pb.*",
          "mi.menu_item_name",
          "mi.item_code",
          "r.recipe_name",
          db.raw(
            "COALESCE(e.first_name,'') || ' ' || COALESCE(e.last_name,'') as assigned_to_name"
          )
        )
        .leftJoin("menu_items as mi", "pb.menu_item_id", "mi.id")
        .leftJoin("recipes as r", "pb.recipe_id", "r.id")
        .leftJoin("employees as e", "pb.assigned_to", "e.id")
        .orderBy("pb.created_at", "desc");

      // Apply status filter
      if (filters.status) {
        if (filters.status === "Completed") {
          // For completed batches, get all completed batches
          query = query.where("pb.status", "Completed");
        } else {
          // For active batches, get in progress and quality check
          query = query.whereIn("pb.status", ["In Progress", "Quality Check"]);
        }
      } else {
        // Default: get active batches (in progress and quality check)
        query = query.whereIn("pb.status", ["In Progress", "Quality Check"]);
      }

      // Apply other filters
      if (filters.assigned_to) {
        query = query.where("pb.assigned_to", filters.assigned_to);
      }

      const batches = await query;

      // Calculate progress for each batch
      return batches.map((batch) => {
        let progress = 0;
        if (batch.status === "In Progress") progress = 50;
        else if (batch.status === "Quality Check") progress = 80;
        else if (batch.status === "Completed") progress = 100;

        return {
          ...batch,
          progress: progress,
          // Add formatted dates for history display
          formatted_start_time: batch.start_time
            ? new Date(batch.start_time).toLocaleDateString("en-PH", {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })
            : "N/A",
          formatted_end_time: batch.end_time
            ? new Date(batch.end_time).toLocaleDateString("en-PH", {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })
            : "N/A",
        };
      });
    } catch (error) {
      console.error("Error fetching active batches:", error);
      throw new Error("Failed to fetch active production batches");
    }
  }

  // Update batch status
  static async updateBatchStatus(
    batchId,
    status,
    notes = null,
    quantityProduced = null
  ) {
    const trx = await db.transaction();

    try {
      const updateData = {
        status: status,
        updated_at: new Date(),
      };

      if (notes) updateData.notes = notes;
      if (quantityProduced !== null)
        updateData.quantity_produced = quantityProduced;

      // If completing the batch, set end time and update production inventory
      if (status === "Completed") {
        updateData.end_time = new Date();

        // Get batch details
        const batch = await trx("production_batches")
          .where("id", batchId)
          .first();

        if (!batch) {
          throw new Error("Production batch not found");
        }

        const finalQuantity = quantityProduced || batch.batch_size;

        // Calculate production cost from consumed ingredients
        const productionCost = await this.calculateProductionCost(batchId, trx);

        // Calculate new unit cost (average cost method)
        const currentInventory = await trx("production_inventory")
          .where("menu_item_id", batch.menu_item_id)
          .first();

        let newUnitCost = 0;
        if (currentInventory) {
          const currentQuantity = currentInventory.available_quantity || 0;
          const currentTotalCost =
            (currentInventory.unit_cost || 0) * currentQuantity;
          const newTotalCost = currentTotalCost + productionCost;
          const newTotalQuantity = currentQuantity + finalQuantity;

          newUnitCost =
            newTotalQuantity > 0 ? newTotalCost / newTotalQuantity : 0;
        } else {
          newUnitCost = finalQuantity > 0 ? productionCost / finalQuantity : 0;
        }

        // Update production inventory with completed quantity and new unit cost
        await trx("production_inventory")
          .where("menu_item_id", batch.menu_item_id)
          .increment("available_quantity", finalQuantity)
          .increment("total_produced", finalQuantity)
          .update({
            unit_cost: newUnitCost,
            production_cost_per_unit: newUnitCost,
            last_produced_date: new Date(),
            last_batch_size: finalQuantity,
            updated_at: new Date(),
          });

        // Update batch with actual cost
        updateData.actual_cost = productionCost;
      }

      // Update the batch
      await trx("production_batches").where("id", batchId).update(updateData);

      await trx.commit();

      // Return updated batch
      return await this.getBatchById(batchId);
    } catch (error) {
      await trx.rollback();
      console.error("Error updating batch status:", error);
      throw new Error("Failed to update batch status");
    }
  }

  // Calculate production cost from consumed ingredients
  static async calculateProductionCost(batchId, trx = null) {
    const dbInstance = trx || db;

    try {
      // Get all inventory transactions for this production batch
      const transactions = await dbInstance("inventory_transactions")
        .select("unit_cost", "quantity")
        .where("reference_number", `BATCH-${batchId}`)
        .where("transaction_type", "production_consumption");

      // Calculate total cost (quantity is negative for consumption, so we use absolute value)
      const totalCost = transactions.reduce((sum, transaction) => {
        const cost =
          Math.abs(transaction.quantity) * (transaction.unit_cost || 0);
        return sum + cost;
      }, 0);

      return totalCost;
    } catch (error) {
      console.error("Error calculating production cost:", error);
      return 0;
    }
  }

  // Get batch by ID
  static async getBatchById(batchId) {
    try {
      const batch = await db("production_batches as pb")
        .select(
          "pb.*",
          "mi.menu_item_name",
          "mi.item_code",
          "r.recipe_name",
          db.raw(
            "COALESCE(e.first_name,'') || ' ' || COALESCE(e.last_name,'') as assigned_to_name"
          )
        )
        .leftJoin("menu_items as mi", "pb.menu_item_id", "mi.id")
        .leftJoin("recipes as r", "pb.recipe_id", "r.id")
        .leftJoin("employees as e", "pb.assigned_to", "e.id")
        .where("pb.id", batchId)
        .first();

      return batch;
    } catch (error) {
      console.error("Error fetching batch by ID:", error);
      throw new Error("Failed to fetch batch details");
    }
  }

  // Get ingredient requirements for production
  static async getIngredientRequirements(menuItemId, customBatchSize = null) {
    try {
      // Convert menuItemId to integer to ensure proper type
      const menuId = parseInt(menuItemId);
      if (isNaN(menuId)) {
        throw new Error("Invalid menu item ID");
      }

      // First try to get from production inventory
      let productionItem = await db("production_inventory as pi")
        .select("pi.*", "r.batch_size as recipe_batch_size")
        .leftJoin("recipes as r", "pi.recipe_id", "r.id")
        .where("pi.menu_item_id", menuId)
        .first();

      // If not in production inventory, get directly from menu item
      if (!productionItem) {
        const menuItem = await db("menu_items as mi")
          .select(
            "mi.*",
            "r.batch_size as recipe_batch_size",
            "r.id as recipe_id"
          )
          .leftJoin("recipes as r", "mi.recipe_id", "r.id")
          .where("mi.id", menuId)
          .where("mi.deleted_at", null) // Only get non-deleted items
          .first();

        if (!menuItem) {
          // Let's check if the menu item exists at all
          const menuExists = await db("menu_items").where("id", menuId).first();

          if (!menuExists) {
            throw new Error(`Menu item with ID ${menuId} does not exist`);
          } else if (menuExists.deleted_at) {
            throw new Error(`Menu item with ID ${menuId} has been deleted`);
          } else {
            throw new Error(
              `Menu item with ID ${menuId} has no associated recipe`
            );
          }
        }

        if (!menuItem.recipe_id) {
          throw new Error(
            `Menu item "${menuItem.menu_item_name}" has no associated recipe`
          );
        }

        productionItem = {
          recipe_id: menuItem.recipe_id,
          recipe_batch_size: menuItem.recipe_batch_size,
        };
      }

      const batchSize =
        customBatchSize || productionItem.recipe_batch_size || 1;

      // Get recipe ingredient requirements
      const Recipe = require("./Recipe");
      const availability = await Recipe.checkIngredientAvailability(
        productionItem.recipe_id,
        batchSize
      );

      return availability.ingredient_availability;
    } catch (error) {
      console.error("Error fetching ingredient requirements:", error.message);
      throw new Error(
        `Failed to fetch ingredient requirements: ${error.message}`
      );
    }
  }

  // Generate batch number
  static generateBatchNumber(menuItemId) {
    const date = new Date();
    const year = date.getFullYear().toString().substr(-2);
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hour = String(date.getHours()).padStart(2, "0");
    const minute = String(date.getMinutes()).padStart(2, "0");

    return `BATCH-${menuItemId}-${year}${month}${day}${hour}${minute}`;
  }

  // Create production inventory entry (called when quality inspection is approved)
  static async createFromQualityApproval(menuItemId, recipeId, createdBy) {
    const trx = await db.transaction();

    try {
      // Check if production inventory already exists
      const existing = await trx("production_inventory")
        .where("menu_item_id", menuItemId)
        .first();

      if (existing) {
        return existing;
      }

      // Get menu item and recipe details
      const menuItem = await trx("menu_items as mi")
        .select("mi.*", "r.batch_unit", "r.cost_per_batch")
        .leftJoin("recipes as r", "mi.recipe_id", "r.id")
        .where("mi.id", menuItemId)
        .first();

      if (!menuItem) {
        throw new Error("Menu item not found");
      }

      // Create production inventory entry
      const [inventoryId] = await trx("production_inventory")
        .insert({
          menu_item_id: menuItemId,
          recipe_id: recipeId,
          available_quantity: 0, // Default quantity 0 - ready for production
          unit_of_measure: menuItem.batch_unit || "servings",
          unit_cost: 0, // Will be calculated after first production
          selling_price: menuItem.selling_price || 0,
          production_cost_per_unit: 0,
          profit_margin_percent: 0,
          is_active: true,
          quality_status: "Approved",
          total_produced: 0,
          total_sold: 0,
          reorder_point: 0,
          maximum_stock: 0,
          created_by: createdBy,
          created_at: new Date(),
          updated_at: new Date(),
        })
        .returning("id");

      await trx.commit();

      return await this.getById(inventoryId);
    } catch (error) {
      await trx.rollback();
      console.error(
        "Error creating production inventory from quality approval:",
        error
      );
      throw new Error("Failed to create production inventory entry");
    }
  }
}

module.exports = ProductionInventory;
