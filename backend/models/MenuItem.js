const { db } = require("../config/database");
const AuditLogger = require("./AuditLogger");

class MenuItem {
  // Get all menu items with recipe details
  static async getAll(filters = {}) {
    try {
      let query = db("menu_items as mi")
        .select(
          "mi.*",
          "mi.menu_item_name as item_name",
          "m.menu_name",
          "m.category as menu_category",
          "r.recipe_name",
          "r.category as recipe_category",
          "r.cost_per_batch",
          "r.batch_size",
          "r.batch_unit",
          "u.name as created_by_name",
          "mi.image_url",
          db.raw("COUNT(sp.id) as sample_count"),
          db.raw(
            "COUNT(CASE WHEN sp.status = 'Completed' THEN 1 END) as completed_samples"
          ),
          db.raw(
            "COUNT(CASE WHEN qi.result = 'Pass' AND qi.deleted_at IS NULL THEN 1 END) as passed_inspections"
          )
        )
        .leftJoin("menus as m", "mi.menu_id", "m.id")
        .leftJoin("recipes as r", "mi.recipe_id", "r.id")
        .leftJoin("users as u", "mi.created_by", "u.id")
        .leftJoin("sample_productions as sp", "mi.id", "sp.menu_item_id")
        .leftJoin(
          "menu_quality_inspections as qi",
          "sp.id",
          "qi.sample_production_id"
        )
        .whereNull("m.deleted_at");

      // Handle deleted items filter
      if (filters.include_deleted === true) {
        // Include both deleted and non-deleted items
      } else if (filters.only_deleted === true) {
        // Only show deleted items
        query = query.whereNotNull("mi.deleted_at");
      } else {
        // Default: exclude deleted items
        query = query.whereNull("mi.deleted_at");
      }

      // Apply basic filters before groupBy
      if (filters.menu_id) {
        query = query.where("mi.menu_id", filters.menu_id);
      }

      if (filters.is_available !== undefined) {
        query = query.where("mi.is_available", filters.is_available);
      }

      if (filters.category) {
        query = query.where("mi.category", filters.category);
      }

      query = query.groupBy(
        "mi.id",
        "m.menu_name",
        "m.category",
        "r.recipe_name",
        "r.category",
        "r.cost_per_batch",
        "r.batch_size",
        "r.batch_unit",
        "u.name"
      );

      // Apply remaining filters after groupBy

      if (filters.search) {
        query = query.where(function () {
          this.where("mi.menu_item_name", "ilike", `%${filters.search}%`)
            .orWhere("mi.item_code", "ilike", `%${filters.search}%`)
            .orWhere("r.recipe_name", "ilike", `%${filters.search}%`);
        });
      }

      // Quality inspection filters
      if (filters.quality_passed) {
        query = query.having("passed_inspections", ">", 0);
      }

      if (filters.inspection_pending) {
        query = query
          .having("sample_count", ">", 0)
          .having("passed_inspections", "=", 0);
      }

      return await query.orderBy("mi.sequence_order", "asc");
    } catch (error) {
      console.error("Error fetching menu items:", error);
      throw new Error("Failed to retrieve menu items");
    }
  }

  // Get menu item by ID with full details
  static async getById(id) {
    try {
      const menuItem = await db("menu_items as mi")
        .select(
          "mi.*",
          "mi.menu_item_name as item_name",
          "mi.recipe_batch_size",
          "mi.recipe_batch_unit",
          "m.menu_name",
          "m.category as menu_category",
          "r.recipe_name",
          "r.category as recipe_category",
          "r.description as recipe_description",
          "r.instructions",
          "r.batch_size",
          "r.batch_unit",
          "r.cost_per_batch",
          "u.name as created_by_name",
          "mi.image_url"
        )
        .leftJoin("menus as m", "mi.menu_id", "m.id")
        .leftJoin("recipes as r", "mi.recipe_id", "r.id")
        .leftJoin("users as u", "mi.created_by", "u.id")
        .where("mi.id", id)
        .whereNull("mi.deleted_at")
        .first();

      if (menuItem) {
        try {
          // Get recipe ingredients - handle missing columns gracefully
          menuItem.recipe_ingredients = await db("recipe_ingredients as ri")
            .select(
              "ri.*",
              "ii.item_name as ingredient_name",
              "ii.quantity as available_stock"
              // Removed unit_of_measure as it doesn't exist in the schema
            )
            .leftJoin("inventory_items as ii", "ri.inventory_item_id", "ii.id")
            .where("ri.recipe_id", menuItem.recipe_id)
            .orderBy("ri.sequence_order", "asc");
        } catch (ingredientError) {
          console.warn(
            "Could not fetch recipe ingredients:",
            ingredientError.message
          );
          menuItem.recipe_ingredients = [];
        }

        try {
          // Get sample productions
          menuItem.sample_productions = await db("sample_productions as sp")
            .select(
              "sp.*",
              "u.name as assigned_to_name",
              "cu.name as created_by_name"
            )
            .leftJoin("users as u", "sp.assigned_to", "u.id")
            .leftJoin("users as cu", "sp.created_by", "cu.id")
            .where("sp.menu_item_id", id)
            .whereNull("sp.deleted_at")
            .orderBy("sp.created_at", "desc");
        } catch (sampleError) {
          console.warn(
            "Could not fetch sample productions:",
            sampleError.message
          );
          menuItem.sample_productions = [];
        }

        try {
          // Get quality inspections
          menuItem.menu_quality_inspections = await db(
            "menu_quality_inspections as qi"
          )
            .select(
              "qi.*",
              "u.name as inspector_name",
              "sp.sample_batch_number"
            )
            .leftJoin("users as u", "qi.inspector_id", "u.id")
            .leftJoin(
              "sample_productions as sp",
              "qi.sample_production_id",
              "sp.id"
            )
            .where("qi.menu_item_id", id)
            .whereNull("qi.deleted_at")
            .orderBy("qi.created_at", "desc");
        } catch (inspectionError) {
          console.warn(
            "Could not fetch quality inspections:",
            inspectionError.message
          );
          menuItem.menu_quality_inspections = [];
        }
      }

      return menuItem;
    } catch (error) {
      console.error("Error fetching menu item by ID:", error);
      throw new Error("Failed to retrieve menu item");
    }
  }

  // Create new menu item from recipe
  static async create(menuItemData) {
    const trx = await db.transaction();

    try {
      // Validate required fields
      if (!menuItemData.recipe_id) {
        throw new Error("Recipe ID is required");
      }

      if (!menuItemData.item_name && !menuItemData.menu_item_name) {
        throw new Error("Menu item name is required");
      }

      if (!menuItemData.created_by) {
        throw new Error("Created by user ID is required");
      }

      // Validate and coerce IDs
      const recipeId = Number(menuItemData.recipe_id);
      if (!Number.isFinite(recipeId) || recipeId <= 0) {
        throw new Error("Invalid recipe_id - must be a positive number");
      }

      // Validate created_by user exists
      const createdBy = Number(menuItemData.created_by);
      if (!Number.isFinite(createdBy) || createdBy <= 0) {
        throw new Error("Invalid created_by user ID");
      }

      const userExists = await trx("users").where("id", createdBy).first();
      if (!userExists) {
        throw new Error("User not found");
      }

      // Get recipe details to calculate costs
      const recipe = await trx("recipes")
        .where("id", recipeId)
        .whereNull("deleted_at")
        .first();

      if (!recipe) {
        throw new Error("Recipe not found or has been deleted");
      }

      if (!recipe.is_active) {
        throw new Error("Cannot create menu item from inactive recipe");
      }

      if (!recipe.category) {
        throw new Error("Recipe must have a category to create menu item");
      }

      if (!recipe.batch_size || recipe.batch_size <= 0) {
        throw new Error("Recipe must have a valid batch size");
      }

      let menuId = Number(menuItemData.menu_id);

      // Validate menu_id if provided

      // Handle menu_id logic
      if (Number.isFinite(menuId) && menuId > 0) {
        // User explicitly selected a menu - validate it exists
        const menuExists = await trx("menus")
          .where("id", menuId)
          .whereNull("deleted_at")
          .where("is_active", true)
          .first();

        if (!menuExists) {
          throw new Error("Selected menu not found or is inactive");
        }
      } else {
        // No valid menu_id provided - need to find or create one
        const targetCategory = menuItemData.category || recipe.category;

        // Strategy 1: Try to find existing menu first
        let menuRow = await trx("menus")
          .select("id")
          .where({ category: targetCategory })
          .whereNull("deleted_at")
          .where("is_active", true)
          .first();

        if (menuRow) {
          // Use existing menu
          menuId = Number(menuRow.id);
        } else {
          // Strategy 2: Auto-create menu for this category
          const menuTimestamp = Date.now();

          // Insert the menu
          await trx("menus").insert({
            menu_code: `MNU${menuTimestamp}`,
            menu_name: `${targetCategory} Menu`,
            description: `Auto-generated menu for ${targetCategory} items`,
            category: targetCategory,
            is_active: true,
            created_by: Number(menuItemData.created_by),
            created_at: trx.fn.now(),
            updated_at: trx.fn.now(),
          });

          // Get the inserted menu ID
          const newMenu = await trx("menus")
            .where("menu_code", `MNU${menuTimestamp}`)
            .where("category", targetCategory)
            .first();

          if (newMenu && newMenu.id) {
            menuId = Number(newMenu.id);
          } else {
            throw new Error(
              "Failed to create menu - could not retrieve created menu"
            );
          }
        }
      }

      // CRITICAL FIX: Ensure menuId is never NaN or 0
      if (!Number.isFinite(menuId) || menuId <= 0) {
        // Create a default menu if we still don't have a valid ID
        const targetCategory =
          menuItemData.category || recipe.category || "General";
        const menuTimestamp = Date.now();
        // Insert the default menu
        await trx("menus").insert({
          menu_code: `MNU${menuTimestamp}`,
          menu_name: `${targetCategory} Menu`,
          description: `Default menu for ${targetCategory} items`,
          category: targetCategory,
          is_active: true,
          created_by: Number(menuItemData.created_by),
          created_at: trx.fn.now(),
          updated_at: trx.fn.now(),
        });

        // Get the inserted default menu ID
        const defaultMenu = await trx("menus")
          .where("menu_code", `MNU${menuTimestamp}`)
          .where("category", targetCategory)
          .first();

        if (defaultMenu && defaultMenu.id) {
          menuId = Number(defaultMenu.id);
        } else {
          throw new Error(
            "Failed to create default menu - could not retrieve created menu"
          );
        }
      }

      // Generate item code
      const timestamp = Date.now();
      const itemCode = `MITM${timestamp}`;

      // Ensure itemCode is a valid string
      if (typeof itemCode !== "string" || itemCode.length < 10) {
        throw new Error("Failed to generate valid item code");
      }

      // Calculate cost price based on recipe
      const costPerBatch = Number(recipe.cost_per_batch || 0);
      const batchSize = Number(recipe.batch_size || 1);
      const costPrice = batchSize > 0 ? costPerBatch / batchSize : 0;

      // Debug the actual insert data
      console.log("=== FINAL CHECK BEFORE INSERT ===");
      console.log("menuId variable:", menuId, "Type:", typeof menuId);
      console.log("recipeId variable:", recipeId, "Type:", typeof recipeId);

      const insertData = {
        menu_item_name: menuItemData.menu_item_name || menuItemData.item_name,
        description: menuItemData.description || null,
        menu_id: menuId,
        recipe_id: recipeId,
        item_code: itemCode,
        cost_price: costPrice, // This is now cost per serving
        category: (menuItemData.category || recipe.category || "").toString(),
        preparation_time_minutes: Number.isFinite(
          Number(menuItemData.preparation_time_minutes)
        )
          ? Number(menuItemData.preparation_time_minutes)
          : 0,
        // Serving size should always be 1 for customer portion
        serving_size: 1,
        serving_unit:
          menuItemData.serving_unit || recipe.batch_unit || "serving",
        // Store recipe batch information for production planning
        recipe_batch_size: recipe.batch_size,
        recipe_batch_unit: recipe.batch_unit,
        image_url: menuItemData.image_url || null,
        selling_price: Number.isFinite(Number(menuItemData.selling_price))
          ? Number(menuItemData.selling_price)
          : 0,
        tags: menuItemData.tags || null,
        created_by: Number.isFinite(Number(menuItemData.created_by))
          ? Number(menuItemData.created_by)
          : 1,
        created_at: trx.fn.now(),
        updated_at: trx.fn.now(),
      };

      console.log("Insert data object:", Object.keys(insertData));
      console.log("Insert data values:", Object.values(insertData));

      // FINAL SAFETY CHECK: Ensure all numeric fields are valid
      if (!Number.isFinite(insertData.menu_id) || insertData.menu_id <= 0) {
        throw new Error("Invalid menu_id - must be a positive number");
      }
      if (!Number.isFinite(insertData.recipe_id) || insertData.recipe_id <= 0) {
        throw new Error("Invalid recipe_id - must be a positive number");
      }
      if (
        !Number.isFinite(insertData.created_by) ||
        insertData.created_by <= 0
      ) {
        throw new Error("Invalid created_by - must be a positive number");
      }

      // Check if item_code column exists before including it
      let finalInsertData = { ...insertData };
      try {
        const hasItemCodeColumn = await trx.schema.hasColumn(
          "menu_items",
          "item_code"
        );
        console.log("item_code column exists:", hasItemCodeColumn);
        if (hasItemCodeColumn) {
          finalInsertData.item_code = itemCode;
          console.log("Including item_code in insert:", itemCode);
        } else {
          console.log("item_code column does not exist, excluding from insert");
        }
      } catch (error) {
        console.log("Error checking item_code column:", error.message);
        // If we can't check, try including it anyway
        finalInsertData.item_code = itemCode;
      }

      const insertResult = await trx("menu_items").insert(finalInsertData);

      // Handle different types of insert results
      let menuItemId;
      if (Array.isArray(insertResult)) {
        menuItemId = insertResult[0];
      } else if (
        insertResult &&
        typeof insertResult === "object" &&
        insertResult.id
      ) {
        menuItemId = insertResult.id;
      } else if (insertResult && typeof insertResult === "number") {
        menuItemId = insertResult;
      } else if (insertResult && insertResult.rowCount === 1) {
        // PostgreSQL Result object - insert was successful, get the ID from the database
        console.log("PostgreSQL Result object detected, fetching inserted ID");
        const insertedItem = await trx("menu_items")
          .where("item_code", itemCode)
          .where("menu_id", menuId)
          .where("recipe_id", recipeId)
          .first();

        if (insertedItem && insertedItem.id) {
          menuItemId = insertedItem.id;
          console.log("Retrieved inserted menu item ID:", menuItemId);
        } else {
          throw new Error(
            "Failed to retrieve inserted menu item ID from database"
          );
        }
      } else {
        console.error("Unexpected insert result:", insertResult);
        throw new Error("Failed to get menu item ID from insert result");
      }

      console.log("Menu item insert result:", insertResult);
      console.log("Extracted menuItemId:", menuItemId);

      // Commit the transaction first
      await trx.commit();

      // Now log the creation action (outside of transaction)
      try {
        await AuditLogger.log({
          menu_item_id: menuItemId,
          user_id: Number.isFinite(Number(menuItemData.created_by))
            ? Number(menuItemData.created_by)
            : 1,
          action_type: "CREATED",
          action_details: {
            recipe_id: menuItemData.recipe_id,
            recipe_name: recipe.recipe_name,
            ...(finalInsertData.item_code && {
              item_code: finalInsertData.item_code,
            }),
            category: (
              menuItemData.category ||
              recipe.category ||
              ""
            ).toString(),
            selling_price: menuItemData.selling_price,
            cost_price: costPrice,
          },
          notes: `Menu item created from recipe "${recipe.recipe_name}"`,
        });
      } catch (auditError) {
        console.warn("Failed to create audit log:", auditError.message);
        // Don't fail the entire operation if audit logging fails
      }

      return await this.getById(menuItemId);
    } catch (error) {
      await trx.rollback();
      console.error("Error creating menu item:", error);
      throw new Error("Failed to create menu item");
    }
  }

  // Update menu item
  static async update(id, updateData, userId) {
    try {
      // Get current item data before update for audit logging
      const currentItem = await this.getById(id);

      // Filter and map updateData to valid database columns
      const filteredData = {};
      const allowedFields = [
        "menu_item_name",
        "recipe_id",
        "menu_id",
        "description",
        "category",
        "selling_price",
        "preparation_time_minutes",
        "serving_unit",
        "tags",
        "image_url",
      ];

      // Map incoming fields to database columns
      if (updateData.menu_item_name !== undefined)
        filteredData.menu_item_name = updateData.menu_item_name;
      if (updateData.recipe_id !== undefined)
        filteredData.recipe_id = updateData.recipe_id;
      if (updateData.menu_id !== undefined && updateData.menu_id !== null)
        filteredData.menu_id = updateData.menu_id;
      // Ensure menu_id is always present (preserve existing if not being updated)
      if (!filteredData.menu_id && currentItem.menu_id)
        filteredData.menu_id = currentItem.menu_id;
      if (updateData.description !== undefined)
        filteredData.description = updateData.description;
      if (updateData.category !== undefined)
        filteredData.category = updateData.category;
      if (updateData.selling_price !== undefined)
        filteredData.selling_price = updateData.selling_price;
      if (updateData.preparation_time_minutes !== undefined)
        filteredData.preparation_time_minutes =
          updateData.preparation_time_minutes;
      if (updateData.serving_unit !== undefined)
        filteredData.serving_unit = updateData.serving_unit;
      if (updateData.tags !== undefined) filteredData.tags = updateData.tags;
      if (updateData.image_url !== undefined)
        filteredData.image_url = updateData.image_url;

      await db("menu_items")
        .where("id", id)
        .update({
          ...filteredData,
          updated_at: db.fn.now(),
        });

      const updatedItem = await this.getById(id);

      // Log the update action
      await AuditLogger.log({
        menu_item_id: id,
        user_id: userId,
        action_type: "UPDATED",
        action_details: {
          changes: this.getChanges(currentItem, updatedItem),
          old_values: currentItem,
          new_values: updatedItem,
        },
        notes: `Menu item "${updatedItem.menu_item_name}" updated`,
      });

      return updatedItem;
    } catch (error) {
      console.error("Error updating menu item:", error);
      throw new Error("Failed to update menu item");
    }
  }

  // Approve menu item for production (after quality inspection)
  static async approveForProduction(id, userId) {
    try {
      // First check if item exists and is not deleted
      const itemExists = await db("menu_items")
        .where("id", id)
        .whereNull("deleted_at")
        .first();

      if (!itemExists) {
        throw new Error("Menu item not found or has been deleted");
      }

      if (itemExists.is_available) {
        throw new Error("Menu item is already approved for production");
      }

      // Get current item data before update for audit logging
      const currentItem = await this.getById(id);

      await db("menu_items").where("id", id).update({
        is_available: true,
        updated_at: db.fn.now(),
      });

      // Add to production inventory
      const menuItem = await this.getById(id);
      if (menuItem) {
        await db("production_inventory")
          .insert({
            menu_item_id: id,
            recipe_id: menuItem.recipe_id,
            unit_of_measure: menuItem.serving_unit,
            unit_cost: menuItem.cost_price,
            selling_price: menuItem.selling_price,
            profit_margin_percent: menuItem.profit_margin,
            available_quantity: 0, // Start with 0, will be updated when produced
            created_by: userId,
            created_at: db.fn.now(),
            updated_at: db.fn.now(),
          })
          .onConflict("menu_item_id")
          .merge(); // Update if exists

        // Log the approval action
        await AuditLogger.log({
          menu_item_id: id,
          user_id: userId,
          action_type: "APPROVED_FOR_PRODUCTION",
          action_details: {
            menu_item_name: menuItem.menu_name,
            selling_price: menuItem.selling_price,
            cost_price: menuItem.cost_price,
            profit_margin: menuItem.profit_margin,
          },
          notes: `Menu item "${menuItem.menu_item_name}" approved for production and added to inventory`,
        });

        // Log inventory addition
        await AuditLogger.log({
          menu_item_id: id,
          user_id: userId,
          action_type: "ADDED_TO_INVENTORY",
          action_details: {
            unit_of_measure: menuItem.serving_unit,
            unit_cost: menuItem.cost_price,
            selling_price: menuItem.selling_price,
            profit_margin_percent: menuItem.profit_margin,
          },
          notes: `Menu item "${menuItem.menu_item_name}" added to production inventory`,
        });
      }

      return await this.getById(id);
    } catch (error) {
      console.error("Error approving menu item:", error);
      throw new Error("Failed to approve menu item for production");
    }
  }

  // Soft delete menu item
  static async delete(id, userId) {
    try {
      // Get current item data before deletion for audit logging
      const currentItem = await this.getById(id);

      await db("menu_items").where("id", id).update({
        deleted_at: db.fn.now(),
        updated_at: db.fn.now(),
      });

      // Log the deletion action
      await AuditLogger.log({
        menu_item_id: id,
        user_id: userId,
        action_type: "DELETED",
        action_details: {
          menu_item_name: currentItem.menu_item_name,
          item_code: currentItem.item_code,
          recipe_name: currentItem.recipe_name,
        },
        notes: `Menu item "${currentItem.menu_item_name}" deleted`,
      });

      return true;
    } catch (error) {
      console.error("Error deleting menu item:", error);
      throw new Error("Failed to delete menu item");
    }
  }

  // Restore soft deleted menu item
  static async restore(id, userId) {
    try {
      // Get current item data before restoration for audit logging
      const currentItem = await db("menu_items")
        .select("*")
        .where("id", id)
        .whereNotNull("deleted_at")
        .first();

      if (!currentItem) {
        throw new Error("Menu item not found or not deleted");
      }

      await db("menu_items").where("id", id).update({
        deleted_at: null,
        updated_at: db.fn.now(),
      });

      // Log the restoration action
      await AuditLogger.log({
        menu_item_id: id,
        user_id: userId,
        action_type: "RESTORED",
        action_details: {
          menu_item_name: currentItem.menu_item_name,
          item_code: currentItem.item_code,
          recipe_name: currentItem.recipe_name,
        },
        notes: `Menu item "${currentItem.menu_item_name}" restored`,
      });

      return true;
    } catch (error) {
      console.error("Error restoring menu item:", error);
      throw new Error("Failed to restore menu item");
    }
  }

  // Helper method to get changes between old and new objects
  static getChanges(oldObj, newObj) {
    const changes = {};
    const fieldsToCompare = [
      "menu_item_name",
      "description",
      "category",
      "selling_price",
      "cost_price",
      "profit_margin",
      "is_available",
      "is_featured",
      "preparation_time_minutes",
      "serving_size",
      "serving_unit",
      "tags",
    ];

    fieldsToCompare.forEach((field) => {
      if (oldObj[field] !== newObj[field]) {
        changes[field] = {
          from: oldObj[field],
          to: newObj[field],
        };
      }
    });

    return changes;
  }

  // Get available recipes for menu creation
  static async getAvailableRecipes() {
    try {
      return await db("recipes")
        .select(
          "id",
          "recipe_name",
          "category",
          "batch_size",
          "batch_unit",
          "cost_per_batch",
          "is_active"
        )
        .where("is_active", true)
        .whereNull("deleted_at")
        .orderBy("recipe_name", "asc");
    } catch (error) {
      console.error("Error fetching available recipes:", error);
      throw new Error("Failed to retrieve available recipes");
    }
  }

  // Calculate profit margin
  static calculateProfitMargin(sellingPrice, costPrice) {
    if (costPrice === 0) return 0;
    return ((sellingPrice - costPrice) / costPrice) * 100;
  }

  // Get menu item statistics
  static async getStats() {
    try {
      const stats = await db("menu_items as mi")
        .select(
          db.raw("COUNT(DISTINCT mi.id) as total_items"),
          db.raw(
            "COUNT(DISTINCT CASE WHEN mi.is_available = true THEN mi.id END) as available_items"
          ),
          db.raw(
            "COUNT(DISTINCT CASE WHEN mi.is_featured = true THEN mi.id END) as featured_items"
          ),
          db.raw("AVG(mi.selling_price) as average_price"),
          db.raw("AVG(mi.profit_margin) as average_margin"),
          db.raw("COUNT(DISTINCT mi.category) as total_categories")
        )
        .whereNull("mi.deleted_at")
        .first();

      return stats;
    } catch (error) {
      console.error("Error fetching menu item stats:", error);
      throw new Error("Failed to retrieve menu item statistics");
    }
  }
}

module.exports = MenuItem;
