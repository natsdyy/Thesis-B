const { db } = require("../config/database");
const AuditLogger = require("./AuditLogger");
const InventoryService = require("../services/InventoryService");

class SampleProduction {
  // Get all sample productions with details
  static async getAll(filters = {}) {
    try {
      let query = db("sample_productions as sp")
        .select(
          "sp.*",
          "mi.menu_item_name",
          "mi.item_code",
          "r.recipe_name",
          "u.name as assigned_to_name",
          "cu.name as created_by_name",
          db.raw("COUNT(qi.id) as inspection_count"),
          db.raw(
            "COUNT(CASE WHEN qi.result = 'Pass' THEN 1 END) as passed_inspections"
          )
        )
        .leftJoin("menu_items as mi", "sp.menu_item_id", "mi.id")
        .leftJoin("recipes as r", "sp.recipe_id", "r.id")
        .leftJoin("users as u", "sp.assigned_to", "u.id")
        .leftJoin("users as cu", "sp.created_by", "cu.id")
        .leftJoin(
          "menu_quality_inspections as qi",
          "sp.id",
          "qi.sample_production_id"
        )
        .whereNull("sp.deleted_at")
        .groupBy(
          "sp.id",
          "mi.menu_item_name",
          "mi.item_code",
          "r.recipe_name",
          "u.name",
          "cu.name"
        );

      // Apply filters
      if (filters.status) {
        query = query.where("sp.status", filters.status);
      }

      if (filters.menu_item_id) {
        query = query.where("sp.menu_item_id", filters.menu_item_id);
      }

      if (filters.assigned_to) {
        query = query.where("sp.assigned_to", filters.assigned_to);
      }

      if (filters.scheduled_date) {
        query = query.where("sp.scheduled_date", filters.scheduled_date);
      }

      if (filters.search) {
        query = query.where(function () {
          this.where("sp.sample_batch_number", "ilike", `%${filters.search}%`)
            .orWhere("mi.menu_item_name", "ilike", `%${filters.search}%`)
            .orWhere("r.recipe_name", "ilike", `%${filters.search}%`);
        });
      }

      return await query
        .orderBy("sp.scheduled_date", "desc")
        .orderBy("sp.scheduled_time", "desc");
    } catch (error) {
      console.error("Error fetching sample productions:", error);
      throw new Error("Failed to retrieve sample productions");
    }
  }

  // Get sample production by ID with full details
  static async getById(id) {
    try {
      const sampleProduction = await db("sample_productions as sp")
        .select(
          "sp.*",
          "mi.menu_item_name",
          "mi.item_code",
          "mi.description as menu_item_description",
          "mi.selling_price",
          "mi.cost_price",
          "r.recipe_name",
          "r.description as recipe_description",
          "r.instructions",
          "r.batch_size",
          "r.batch_unit",
          "u.name as assigned_to_name",
          "cu.name as created_by_name"
        )
        .leftJoin("menu_items as mi", "sp.menu_item_id", "mi.id")
        .leftJoin("recipes as r", "sp.recipe_id", "r.id")
        .leftJoin("users as u", "sp.assigned_to", "u.id")
        .leftJoin("users as cu", "sp.created_by", "cu.id")
        .where("sp.id", id)
        .whereNull("sp.deleted_at")
        .first();

      if (sampleProduction) {
        // Get recipe ingredients with inventory availability
        sampleProduction.recipe_ingredients = await db(
          "recipe_ingredients as ri"
        )
          .select(
            "ri.*",
            "ii.item_name as ingredient_name",
            "ii.quantity as available_stock",
            "ii.unit_of_measure",
            "ii.unit_cost"
          )
          .leftJoin("inventory_items as ii", "ri.inventory_item_id", "ii.id")
          .where("ri.recipe_id", sampleProduction.recipe_id)
          .orderBy("ri.sequence_order", "asc");

        // Get quality inspections for this sample
        sampleProduction.quality_inspections = await db(
          "quality_inspections as qi"
        )
          .select(
            "qi.*",
            "u.name as inspector_name",
            "au.name as approved_by_name"
          )
          .leftJoin("users as u", "qi.inspector_id", "u.id")
          .leftJoin("users as au", "qi.approved_by", "au.id")
          .where("qi.sample_production_id", id)
          .whereNull("qi.deleted_at")
          .orderBy("qi.created_at", "desc");

        // Get real-time ingredient availability status
        try {
          sampleProduction.ingredient_availability =
            await this.getIngredientAvailability(id);
        } catch (error) {
          // If availability check fails, set default values
          sampleProduction.ingredient_availability = {
            total_ingredients: 0,
            available_ingredients: 0,
            insufficient_ingredients: [],
            sufficient_for_production: false,
            error: error.message,
          };
        }
      }

      return sampleProduction;
    } catch (error) {
      console.error("Error fetching sample production by ID:", error);
      throw new Error("Failed to retrieve sample production");
    }
  }

  // Create new sample production
  static async create(sampleData) {
    const trx = await db.transaction();

    try {
      // Check ingredient availability before planning sample production
      const availabilityCheck =
        await InventoryService.checkRecipeIngredientsAvailability(
          sampleData.recipe_id,
          sampleData.batch_size
        );

      // Generate sample batch number
      const timestamp = Date.now();
      const batchNumber = `SAMP${timestamp}`;

      const [sampleId] = await trx("sample_productions").insert({
        ...sampleData,
        sample_batch_number: batchNumber,
        ingredient_availability_status:
          availabilityCheck.sufficient_for_production
            ? "sufficient"
            : "insufficient",
        created_at: trx.fn.now(),
        updated_at: trx.fn.now(),
      });

      // Get menu item details for audit logging
      const menuItem = await trx("menu_items")
        .where("id", sampleData.menu_item_id)
        .select("menu_item_name", "item_code")
        .first();

      // Log the sample planning action with availability details
      await AuditLogger.log({
        menu_item_id: sampleData.menu_item_id,
        sample_production_id: sampleId,
        user_id: sampleData.created_by,
        action_type: "SAMPLE_PLANNED",
        action_details: {
          sample_batch_number: batchNumber,
          batch_size: sampleData.batch_size,
          batch_unit: sampleData.batch_unit,
          scheduled_date: sampleData.scheduled_date,
          scheduled_time: sampleData.scheduled_time,
          assigned_to: sampleData.assigned_to,
          menu_item_name: menuItem?.menu_item_name,
          ingredient_availability: availabilityCheck,
        },
        notes: `Sample production planned for "${menuItem?.menu_item_name}" - Batch ${batchNumber}. Ingredients: ${availabilityCheck.sufficient_for_production ? "Available" : "Insufficient"}`,
      });

      await trx.commit();

      // Return sample production with availability details
      const sampleProduction = await this.getById(sampleId);
      sampleProduction.ingredient_availability = availabilityCheck;

      return sampleProduction;
    } catch (error) {
      await trx.rollback();
      console.error("Error creating sample production:", error);
      throw new Error("Failed to create sample production");
    }
  }

  // Update sample production status
  static async updateStatus(id, status, userId, additionalData = {}) {
    try {
      // Get current sample data before update for audit logging
      const currentSample = await this.getById(id);

      const updateData = {
        status,
        updated_at: db.fn.now(),
      };

      // Set timestamps based on status
      if (status === "In Progress" && !additionalData.actual_start_date) {
        updateData.actual_start_date = db.fn.now();
      } else if (status === "Completed" && !additionalData.actual_end_date) {
        updateData.actual_end_date = db.fn.now();
      }

      // Merge additional data
      Object.assign(updateData, additionalData);

      await db("sample_productions").where("id", id).update(updateData);

      const updatedSample = await this.getById(id);

      // Log the status update action
      let actionType = "SAMPLE_STARTED";
      let notes = `Sample production "${currentSample.menu_item_name}" started`;

      if (status === "Completed") {
        actionType = "SAMPLE_COMPLETED";
        notes = `Sample production "${currentSample.menu_item_name}" completed - Batch ${currentSample.sample_batch_number}`;
      } else if (status === "Failed") {
        actionType = "SAMPLE_COMPLETED";
        notes = `Sample production "${currentSample.menu_item_name}" failed - Batch ${currentSample.sample_batch_number}`;
      } else if (status === "Cancelled") {
        actionType = "SAMPLE_COMPLETED";
        notes = `Sample production "${currentSample.menu_item_name}" cancelled - Batch ${currentSample.sample_batch_number}`;
      }

      await AuditLogger.log({
        menu_item_id: currentSample.menu_item_id,
        sample_production_id: id,
        user_id: userId,
        action_type: actionType,
        action_details: {
          sample_batch_number: currentSample.sample_batch_number,
          old_status: currentSample.status,
          new_status: status,
          batch_size: currentSample.batch_size,
          batch_unit: currentSample.batch_unit,
          quantity_produced: additionalData.quantity_produced,
          production_cost: additionalData.production_cost,
          changes: this.getChanges(currentSample, updatedSample),
        },
        notes,
      });

      return updatedSample;
    } catch (error) {
      console.error("Error updating sample production status:", error);
      throw new Error("Failed to update sample production status");
    }
  }

  // Start sample production
  static async startProduction(id, userId) {
    return await this.updateStatus(id, "In Progress", userId, {
      actual_start_date: db.fn.now(),
    });
  }

  // Complete sample production
  static async completeProduction(
    id,
    quantityProduced,
    productionCost,
    notes,
    userId
  ) {
    return await this.updateStatus(id, "Completed", userId, {
      actual_end_date: db.fn.now(),
      quantity_produced: quantityProduced,
      production_cost: productionCost,
      production_notes: notes,
    });
  }

  // Cancel sample production
  static async cancelProduction(id, userId) {
    return await this.updateStatus(id, "Cancelled", userId);
  }

  // Get real-time ingredient availability for sample production
  static async getIngredientAvailability(sampleProductionId) {
    try {
      const sample = await this.getById(sampleProductionId);
      if (!sample) {
        throw new Error("Sample production not found");
      }

      // Use the new InventoryService for real-time availability check
      const availabilityCheck =
        await InventoryService.checkRecipeIngredientsAvailability(
          sample.recipe_id,
          sample.batch_size
        );

      return availabilityCheck;
    } catch (error) {
      console.error("Error getting ingredient availability:", error);
      throw new Error("Failed to get ingredient availability");
    }
  }

  // Legacy method for backward compatibility - now uses InventoryService
  static async calculateIngredientAvailability(ingredients, batchSize) {
    // This method is kept for backward compatibility but now uses InventoryService
    // Instead of relying on static data, it would need recipe_id and batch_size
    console.warn(
      "calculateIngredientAvailability is deprecated. Use getIngredientAvailability with recipe_id instead."
    );
    return {
      total_ingredients: 0,
      available_ingredients: 0,
      insufficient_ingredients: [],
      sufficient_for_production: false,
      deprecated: true,
    };
  }

  // Get sample production statistics
  static async getStats() {
    try {
      const stats = await db("sample_productions as sp")
        .select(
          db.raw("COUNT(DISTINCT sp.id) as total_samples"),
          db.raw(
            "COUNT(DISTINCT CASE WHEN sp.status = 'Planned' THEN sp.id END) as planned_samples"
          ),
          db.raw(
            "COUNT(DISTINCT CASE WHEN sp.status = 'In Progress' THEN sp.id END) as in_progress_samples"
          ),
          db.raw(
            "COUNT(DISTINCT CASE WHEN sp.status = 'Completed' THEN sp.id END) as completed_samples"
          ),
          db.raw(
            "COUNT(DISTINCT CASE WHEN sp.status = 'Failed' THEN sp.id END) as failed_samples"
          ),
          db.raw("AVG(sp.production_cost) as average_cost"),
          db.raw("SUM(sp.quantity_produced) as total_quantity_produced")
        )
        .whereNull("sp.deleted_at")
        .first();

      return stats;
    } catch (error) {
      console.error("Error fetching sample production stats:", error);
      throw new Error("Failed to retrieve sample production statistics");
    }
  }

  // Soft delete sample production
  static async delete(id, userId) {
    try {
      // Get current sample data before deletion for audit logging
      const currentSample = await this.getById(id);

      await db("sample_productions").where("id", id).update({
        deleted_at: db.fn.now(),
        updated_at: db.fn.now(),
      });

      // Log the deletion action
      await AuditLogger.log({
        menu_item_id: currentSample.menu_item_id,
        sample_production_id: id,
        user_id: userId,
        action_type: "SAMPLE_COMPLETED", // Using this for deletion as well
        action_details: {
          sample_batch_number: currentSample.sample_batch_number,
          menu_item_name: currentSample.item_name,
          reason: "deleted",
        },
        notes: `Sample production "${currentSample.item_name}" deleted - Batch ${currentSample.sample_batch_number}`,
      });

      return true;
    } catch (error) {
      console.error("Error deleting sample production:", error);
      throw new Error("Failed to delete sample production");
    }
  }

  // Helper method to get changes between old and new objects
  static getChanges(oldObj, newObj) {
    const changes = {};
    const fieldsToCompare = [
      "status",
      "batch_size",
      "batch_unit",
      "scheduled_date",
      "scheduled_time",
      "assigned_to",
      "actual_start_date",
      "actual_end_date",
      "quantity_produced",
      "production_cost",
      "production_notes",
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
}

module.exports = SampleProduction;
