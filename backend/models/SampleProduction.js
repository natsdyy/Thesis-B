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
          db.raw(
            "COALESCE(e.first_name,'') || ' ' || COALESCE(e.last_name,'') as assigned_to_name"
          ),
          db.raw(
            "COALESCE(ce.first_name,'') || ' ' || COALESCE(ce.last_name,'') as created_by_name"
          ),
          db.raw("COUNT(qi.id) as inspection_count"),
          db.raw(
            "COUNT(CASE WHEN qi.result = 'Pass' THEN 1 END) as passed_inspections"
          )
        )
        .leftJoin("menu_items as mi", "sp.menu_item_id", "mi.id")
        .leftJoin("recipes as r", "sp.recipe_id", "r.id")
        .leftJoin("employees as e", "sp.assigned_to", "e.id")
        .leftJoin("employees as ce", "sp.created_by", "ce.id")
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
          "e.first_name",
          "e.last_name",
          "ce.first_name",
          "ce.last_name"
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

      const results = await query
        .orderBy("sp.scheduled_date", "desc")
        .orderBy("sp.scheduled_time", "desc");

      // Format scheduled_date to handle timezone issues
      return results.map((sample) => ({
        ...sample,
        scheduled_date: sample.scheduled_date
          ? (() => {
              // If it's already a date string (YYYY-MM-DD), return as is
              if (
                typeof sample.scheduled_date === "string" &&
                sample.scheduled_date.match(/^\d{4}-\d{2}-\d{2}$/)
              ) {
                return sample.scheduled_date;
              }
              // If it's a datetime, extract just the date part in local timezone
              const date = new Date(sample.scheduled_date);
              const year = date.getFullYear();
              const month = String(date.getMonth() + 1).padStart(2, "0");
              const day = String(date.getDate()).padStart(2, "0");
              return `${year}-${month}-${day}`;
            })()
          : null,
      }));
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
          db.raw(
            "COALESCE(e.first_name,'') || ' ' || COALESCE(e.last_name,'') as assigned_to_name"
          ),
          db.raw(
            "COALESCE(ce.first_name,'') || ' ' || COALESCE(ce.last_name,'') as created_by_name"
          )
        )
        .leftJoin("menu_items as mi", "sp.menu_item_id", "mi.id")
        .leftJoin("recipes as r", "sp.recipe_id", "r.id")
        .leftJoin("employees as e", "sp.assigned_to", "e.id")
        .leftJoin("employees as ce", "sp.created_by", "ce.id")
        .where("sp.id", id)
        .whereNull("sp.deleted_at")
        .first();

      if (sampleProduction) {
        // Format scheduled_date to handle timezone issues
        sampleProduction.scheduled_date = sampleProduction.scheduled_date
          ? (() => {
              // If it's already a date string (YYYY-MM-DD), return as is
              if (
                typeof sampleProduction.scheduled_date === "string" &&
                sampleProduction.scheduled_date.match(/^\d{4}-\d{2}-\d{2}$/)
              ) {
                return sampleProduction.scheduled_date;
              }
              // If it's a datetime, extract just the date part in local timezone
              const date = new Date(sampleProduction.scheduled_date);
              const year = date.getFullYear();
              const month = String(date.getMonth() + 1).padStart(2, "0");
              const day = String(date.getDate()).padStart(2, "0");
              return `${year}-${month}-${day}`;
            })()
          : null;
        // Get recipe ingredients with inventory availability
        sampleProduction.recipe_ingredients = await db(
          "recipe_ingredients as ri"
        )
          .select(
            "ri.*",
            "ii.item_name as ingredient_name",
            "ii.quantity as available_stock",
            "iit.unit_of_measure",
            "ii.unit_cost"
          )
          .leftJoin("inventory_items as ii", "ri.inventory_item_id", "ii.id")
          .leftJoin("inventory_item_types as iit", "ii.item_type_id", "iit.id")
          .where("ri.recipe_id", sampleProduction.recipe_id)
          .orderBy("ri.sequence_order", "asc");

        // Quality inspections will be handled separately when needed
        sampleProduction.quality_inspections = [];

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

      const sampleIdResult = await trx("sample_productions")
        .insert({
          ...sampleData,
          sample_batch_number: batchNumber,
          ingredient_availability_status:
            availabilityCheck.sufficient_for_production
              ? "sufficient"
              : "insufficient",
          created_at: trx.fn.now(),
          updated_at: trx.fn.now(),
        })
        .returning("id");

      const sampleId = sampleIdResult[0].id;

      // Get menu item details for audit logging
      const menuItem = await trx("menu_items")
        .where("id", sampleData.menu_item_id)
        .select("menu_item_name", "item_code")
        .first();

      await trx.commit();

      // Log the sample planning action with availability details (after transaction commit)
      try {
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
      } catch (auditError) {
        console.warn(
          "Failed to create audit log (non-blocking):",
          auditError.message
        );
      }

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
  static async updateStatus(
    id,
    status,
    userId,
    additionalData = {},
    customNotes = null
  ) {
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
      let notes =
        customNotes ||
        `Sample production "${currentSample.menu_item_name}" started`;

      if (status === "Completed") {
        actionType = "SAMPLE_COMPLETED";
        notes =
          customNotes ||
          `Sample production "${currentSample.menu_item_name}" completed - Batch ${currentSample.sample_batch_number}`;
      } else if (status === "Failed") {
        actionType = "SAMPLE_COMPLETED";
        notes =
          customNotes ||
          `Sample production "${currentSample.menu_item_name}" failed - Batch ${currentSample.sample_batch_number}`;
      } else if (status === "Cancelled") {
        actionType = "SAMPLE_COMPLETED";
        notes =
          customNotes ||
          `Sample production "${currentSample.menu_item_name}" cancelled - Batch ${currentSample.sample_batch_number}`;
      }

      await AuditLogger.log({
        menu_item_id: currentSample.menu_item_id,
        sample_production_id: id,
        employee_id: userId,
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

  // Update sample production (general update)
  static async update(id, updateData) {
    try {
      // Get current sample data before update for audit logging
      const currentSample = await this.getById(id);

      const finalUpdateData = {
        ...updateData,
        updated_at: db.fn.now(),
      };

      // Remove fields that shouldn't be updated directly
      delete finalUpdateData.id;
      delete finalUpdateData.created_at;
      delete finalUpdateData.created_by;

      const [updatedSample] = await db("sample_productions")
        .where("id", id)
        .update(finalUpdateData)
        .returning("*");

      if (!updatedSample) {
        throw new Error("Sample production not found");
      }

      // Log the update action
      await AuditLogger.log({
        menu_item_id: currentSample.menu_item_id,
        sample_production_id: id,
        user_id: currentSample.created_by, // Use created_by since updated_by doesn't exist
        action_type: "SAMPLE_UPDATED",
        action_details: {
          old_data: currentSample,
          new_data: updatedSample,
          changes: this.getChanges(currentSample, updatedSample),
        },
        notes: `Sample production updated - Batch ${currentSample.sample_batch_number}`,
      });

      return updatedSample;
    } catch (error) {
      console.error("Error updating sample production:", error);
      throw new Error("Failed to update sample production");
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
    return await this.updateStatus(
      id,
      "Completed",
      userId,
      {
        actual_end_date: db.fn.now(),
        quantity_produced: quantityProduced,
        production_cost: productionCost,
        production_notes: notes,
      },
      notes
    );
  }

  // Cancel sample production
  static async cancelProduction(id, userId) {
    return await this.updateStatus(id, "Cancelled", userId);
  }

  // Fail sample production
  static async failProduction(id, userId, additionalData = {}) {
    const updateData = {
      actual_end_date: db.fn.now(),
    };

    // Add failure-specific data if provided
    if (additionalData.failure_reason) {
      updateData.failure_reason = additionalData.failure_reason;
    }
    if (additionalData.quantity_lost !== undefined) {
      updateData.quantity_lost = additionalData.quantity_lost;
    }
    if (additionalData.cost_incurred !== undefined) {
      updateData.production_cost = additionalData.cost_incurred; // Use existing production_cost column
    }
    if (additionalData.production_notes) {
      updateData.production_notes = additionalData.production_notes;
    }

    // Create custom notes for audit log
    const customNotes = additionalData.production_notes || null;

    return await this.updateStatus(
      id,
      "Failed",
      userId,
      updateData,
      customNotes
    );
  }

  // Get real-time ingredient availability for sample production
  static async getIngredientAvailability(sampleProductionId) {
    try {
      // Get just the recipe_id and batch_size needed for availability check
      const sample = await db("sample_productions")
        .select("recipe_id", "batch_size")
        .where("id", sampleProductionId)
        .whereNull("deleted_at")
        .first();

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

  // Archive sample production (soft delete with archive flag)
  static async archive(id, userId, customNotes = null) {
    try {
      // Get current sample data before archiving for audit logging
      const currentSample = await this.getById(id);

      await db("sample_productions").where("id", id).update({
        deleted_at: db.fn.now(),
        updated_at: db.fn.now(),
        // Add archive flag if you have an archived column
        // archived: true,
      });

      // Log the archiving action
      await AuditLogger.log({
        menu_item_id: currentSample.menu_item_id,
        sample_production_id: id,
        employee_id: userId,
        action_type: "SAMPLE_ARCHIVED",
        action_details: {
          sample_batch_number: currentSample.sample_batch_number,
          menu_item_name: currentSample.menu_item_name,
          reason: "archived",
        },
        notes:
          customNotes && String(customNotes).trim().length > 0
            ? String(customNotes).trim()
            : `Sample production "${currentSample.menu_item_name}" archived - Batch ${currentSample.sample_batch_number}`,
      });

      return true;
    } catch (error) {
      console.error("Error archiving sample production:", error);
      throw new Error("Failed to archive sample production");
    }
  }

  // Get audit logs for sample productions
  static async getAuditLogs(filters = {}) {
    try {
      let query = db("menu_item_audit_log as al")
        .select(
          "al.*",
          db.raw(
            "COALESCE(e.first_name,'') || ' ' || COALESCE(e.last_name,'') as user_name"
          ),
          "mi.menu_item_name",
          "sp.sample_batch_number"
        )
        .leftJoin("employees as e", "al.user_id", "e.id")
        .leftJoin("menu_items as mi", "al.menu_item_id", "mi.id")
        .leftJoin(
          "sample_productions as sp",
          "al.sample_production_id",
          "sp.id"
        )
        .whereNotNull("al.sample_production_id")
        .orderBy("al.created_at", "desc");

      // Apply filters
      if (filters.sample_production_id) {
        query = query.where(
          "al.sample_production_id",
          filters.sample_production_id
        );
      }

      if (filters.action_type) {
        query = query.where("al.action_type", filters.action_type);
      }

      if (filters.user_id) {
        query = query.where("al.user_id", filters.user_id);
      }

      if (filters.date_from) {
        query = query.where("al.created_at", ">=", filters.date_from);
      }

      if (filters.date_to) {
        query = query.where("al.created_at", "<=", filters.date_to);
      }

      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      const auditLogs = await query;

      // Parse action_details JSON strings
      return auditLogs.map((log) => ({
        ...log,
        action_details: log.action_details
          ? JSON.parse(log.action_details)
          : null,
      }));
    } catch (error) {
      console.error("Error fetching sample production audit logs:", error);
      throw new Error("Failed to retrieve audit logs");
    }
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
        employee_id: userId,
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
