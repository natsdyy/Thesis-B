const { db } = require("../config/database");
const AuditLogger = require("./AuditLogger");

class QualityInspection {
  // Get all quality inspections with details
  static async getAll(filters = {}) {
    try {
      let query = db("menu_quality_inspections as qi")
        .select(
          "qi.*",
          "mi.menu_item_name",
          "mi.item_code",
          "sp.sample_batch_number",
          "u.name as inspector_name",
          "au.name as approved_by_name"
        )
        .leftJoin("menu_items as mi", "qi.menu_item_id", "mi.id")
        .leftJoin(
          "sample_productions as sp",
          "qi.sample_production_id",
          "sp.id"
        )
        .leftJoin("users as u", "qi.inspector_id", "u.id")
        .leftJoin("users as au", "qi.approved_by", "au.id")
        .whereNull("qi.deleted_at");

      // Apply filters
      if (filters.result) {
        query = query.where("qi.result", filters.result);
      }

      if (filters.inspection_type) {
        query = query.where("qi.inspection_type", filters.inspection_type);
      }

      if (filters.menu_item_id) {
        query = query.where("qi.menu_item_id", filters.menu_item_id);
      }

      if (filters.inspector_id) {
        query = query.where("qi.inspector_id", filters.inspector_id);
      }

      if (filters.inspection_date) {
        query = query.where("qi.inspection_date", filters.inspection_date);
      }

      if (filters.search) {
        query = query.where(function () {
          this.where("qi.inspection_number", "ilike", `%${filters.search}%`)
            .orWhere("mi.menu_item_name", "ilike", `%${filters.search}%`)
            .orWhere("sp.sample_batch_number", "ilike", `%${filters.search}%`);
        });
      }

      return await query
        .orderBy("qi.inspection_date", "desc")
        .orderBy("qi.inspection_time", "desc");
    } catch (error) {
      console.error("Error fetching quality inspections:", error);
      throw new Error("Failed to retrieve quality inspections");
    }
  }

  // Get quality inspection by ID with full details
  static async getById(id) {
    try {
      const inspection = await db("menu_quality_inspections as qi")
        .select(
          "qi.*",
          "mi.menu_item_name",
          "mi.item_code",
          "mi.description as menu_item_description",
          "mi.selling_price",
          "mi.cost_price",
          "sp.sample_batch_number",
          "sp.batch_size",
          "sp.batch_unit",
          "sp.production_cost",
          "r.recipe_name",
          "u.name as inspector_name",
          "au.name as approved_by_name"
        )
        .leftJoin("menu_items as mi", "qi.menu_item_id", "mi.id")
        .leftJoin(
          "sample_productions as sp",
          "qi.sample_production_id",
          "sp.id"
        )
        .leftJoin("recipes as r", "mi.recipe_id", "r.id")
        .leftJoin("users as u", "qi.inspector_id", "u.id")
        .leftJoin("users as au", "qi.approved_by", "au.id")
        .where("qi.id", id)
        .whereNull("qi.deleted_at")
        .first();

      return inspection;
    } catch (error) {
      console.error("Error fetching quality inspection by ID:", error);
      throw new Error("Failed to retrieve quality inspection");
    }
  }

  // Create new quality inspection
  static async create(inspectionData) {
    const trx = await db.transaction();

    try {
      // Generate inspection number
      const timestamp = Date.now();
      const inspectionNumber = `QI${timestamp}`;

      const [inspectionId] = await trx("menu_quality_inspections").insert({
        ...inspectionData,
        inspection_number: inspectionNumber,
        inspection_date: inspectionData.inspection_date || trx.fn.now(),
        inspection_time: inspectionData.inspection_time || trx.fn.now(),
        created_at: trx.fn.now(),
        updated_at: trx.fn.now(),
      });

      // Get sample production details for audit logging
      const sampleProduction = await trx("sample_productions")
        .where("id", inspectionData.sample_production_id)
        .select("sample_batch_number", "menu_item_id")
        .first();

      // Log the quality inspection action
      await AuditLogger.log({
        menu_item_id: inspectionData.menu_item_id,
        sample_production_id: inspectionData.sample_production_id,
        quality_inspection_id: inspectionId,
        user_id: inspectionData.inspector_id,
        action_type: "QUALITY_INSPECTION",
        action_details: {
          inspection_number: inspectionNumber,
          inspection_type: inspectionData.inspection_type,
          result: inspectionData.result,
          overall_quality_score: inspectionData.overall_quality_score,
          sample_batch_number: sampleProduction?.sample_batch_number,
          requires_retest: inspectionData.requires_retest,
        },
        notes: `Quality inspection completed for batch ${sampleProduction?.sample_batch_number} - Result: ${inspectionData.result}`,
      });

      await trx.commit();
      return await this.getById(inspectionId);
    } catch (error) {
      await trx.rollback();
      console.error("Error creating quality inspection:", error);
      throw new Error("Failed to create quality inspection");
    }
  }

  // Update quality inspection
  static async update(id, updateData, userId) {
    try {
      // Get current inspection data before update for audit logging
      const currentInspection = await this.getById(id);

      await db("menu_quality_inspections")
        .where("id", id)
        .update({
          ...updateData,
          updated_at: db.fn.now(),
        });

      const updatedInspection = await this.getById(id);

      // Log the update action
      await AuditLogger.log({
        menu_item_id: currentInspection.menu_item_id,
        sample_production_id: currentInspection.sample_production_id,
        quality_inspection_id: id,
        user_id: userId,
        action_type: "QUALITY_INSPECTION",
        action_details: {
          inspection_number: currentInspection.inspection_number,
          changes: this.getChanges(currentInspection, updatedInspection),
          old_values: currentInspection,
          new_values: updatedInspection,
        },
        notes: `Quality inspection updated for ${currentInspection.menu_item_name}`,
      });

      return updatedInspection;
    } catch (error) {
      console.error("Error updating quality inspection:", error);
      throw new Error("Failed to update quality inspection");
    }
  }

  // Approve inspection and menu item for production
  static async approveForProduction(id, approvedByUserId) {
    const trx = await db.transaction();

    try {
      // Get current inspection data before update for audit logging
      const currentInspection = await this.getById(id);

      // Update inspection
      await trx("menu_quality_inspections").where("id", id).update({
        result: "Pass",
        approved_for_production: true,
        approved_by: approvedByUserId,
        approved_at: trx.fn.now(),
        updated_at: trx.fn.now(),
      });

      // Get inspection details
      const inspection = await trx("menu_quality_inspections")
        .where("id", id)
        .first();

      // Approve menu item for production
      await trx("menu_items").where("id", inspection.menu_item_id).update({
        is_available: true,
        updated_at: trx.fn.now(),
      });

      // Add/Update production inventory
      const menuItem = await trx("menu_items")
        .where("id", inspection.menu_item_id)
        .first();

      await trx("production_inventory")
        .insert({
          menu_item_id: inspection.menu_item_id,
          recipe_id: menuItem.recipe_id,
          unit_of_measure: menuItem.serving_unit,
          unit_cost: menuItem.cost_price,
          selling_price: menuItem.selling_price,
          profit_margin_percent: menuItem.profit_margin,
          available_quantity: 0, // Start with 0, will be updated when produced
          last_produced_date: trx.fn.now(),
          created_by: approvedByUserId,
          created_at: trx.fn.now(),
          updated_at: trx.fn.now(),
        })
        .onConflict("menu_item_id")
        .merge({
          unit_cost: menuItem.cost_price,
          selling_price: menuItem.selling_price,
          profit_margin_percent: menuItem.profit_margin,
          last_produced_date: trx.fn.now(),
          updated_at: trx.fn.now(),
        });

      // Log the approval action
      await AuditLogger.log({
        menu_item_id: inspection.menu_item_id,
        sample_production_id: inspection.sample_production_id,
        quality_inspection_id: id,
        user_id: approvedByUserId,
        action_type: "QUALITY_PASSED",
        action_details: {
          inspection_number: currentInspection.inspection_number,
          sample_batch_number: currentInspection.sample_batch_number,
          menu_item_name: currentInspection.menu_item_name,
          overall_quality_score: currentInspection.overall_quality_score,
        },
        notes: `Quality inspection passed and approved for production - ${currentInspection.menu_item_name}`,
      });

      // Log the production approval
      await AuditLogger.log({
        menu_item_id: inspection.menu_item_id,
        user_id: approvedByUserId,
        action_type: "APPROVED_FOR_PRODUCTION",
        action_details: {
          menu_item_name: menuItem.menu_item_name,
          selling_price: menuItem.selling_price,
          cost_price: menuItem.cost_price,
          profit_margin: menuItem.profit_margin,
          quality_score: currentInspection.overall_quality_score,
        },
        notes: `Menu item "${menuItem.menu_item_name}" approved for production based on quality inspection`,
      });

      await trx.commit();
      return await this.getById(id);
    } catch (error) {
      await trx.rollback();
      console.error("Error approving for production:", error);
      throw new Error("Failed to approve for production");
    }
  }

  // Fail inspection with findings
  static async failInspection(
    id,
    findings,
    correctiveActions,
    requiresRetest,
    retestDate,
    userId
  ) {
    try {
      // Get current inspection data before update for audit logging
      const currentInspection = await this.getById(id);

      await db("menu_quality_inspections").where("id", id).update({
        result: "Fail",
        findings: findings,
        corrective_actions: correctiveActions,
        requires_retest: requiresRetest,
        retest_date: retestDate,
        updated_at: db.fn.now(),
      });

      const updatedInspection = await this.getById(id);

      // Log the failure action
      await AuditLogger.log({
        menu_item_id: currentInspection.menu_item_id,
        sample_production_id: currentInspection.sample_production_id,
        quality_inspection_id: id,
        user_id: userId,
        action_type: "QUALITY_FAILED",
        action_details: {
          inspection_number: currentInspection.inspection_number,
          sample_batch_number: currentInspection.sample_batch_number,
          menu_item_name: currentInspection.menu_item_name,
          overall_quality_score: currentInspection.overall_quality_score,
          findings: findings,
          corrective_actions: correctiveActions,
          requires_retest: requiresRetest,
          retest_date: retestDate,
        },
        notes: `Quality inspection failed for "${currentInspection.menu_item_name}" - ${findings}`,
      });

      return updatedInspection;
    } catch (error) {
      console.error("Error failing inspection:", error);
      throw new Error("Failed to update inspection result");
    }
  }

  // Mark as retest required
  static async requireRetest(id, retestDate, userId) {
    try {
      // Get current inspection data before update for audit logging
      const currentInspection = await this.getById(id);

      await db("menu_quality_inspections").where("id", id).update({
        result: "Retest Required",
        requires_retest: true,
        retest_date: retestDate,
        updated_at: db.fn.now(),
      });

      const updatedInspection = await this.getById(id);

      // Log the retest action
      await AuditLogger.log({
        menu_item_id: currentInspection.menu_item_id,
        sample_production_id: currentInspection.sample_production_id,
        quality_inspection_id: id,
        user_id: userId,
        action_type: "QUALITY_INSPECTION",
        action_details: {
          inspection_number: currentInspection.inspection_number,
          sample_batch_number: currentInspection.sample_batch_number,
          menu_item_name: currentInspection.item_name,
          result: "Retest Required",
          retest_date: retestDate,
        },
        notes: `Retest required for "${currentInspection.item_name}" - Scheduled for ${retestDate}`,
      });

      return updatedInspection;
    } catch (error) {
      console.error("Error requiring retest:", error);
      throw new Error("Failed to require retest");
    }
  }

  // Get quality inspection statistics
  static async getStats() {
    try {
      const stats = await db("menu_quality_inspections as qi")
        .select(
          db.raw("COUNT(DISTINCT qi.id) as total_inspections"),
          db.raw(
            "COUNT(DISTINCT CASE WHEN qi.result = 'Pass' THEN qi.id END) as passed_inspections"
          ),
          db.raw(
            "COUNT(DISTINCT CASE WHEN qi.result = 'Fail' THEN qi.id END) as failed_inspections"
          ),
          db.raw(
            "COUNT(DISTINCT CASE WHEN qi.result = 'Retest Required' THEN qi.id END) as retest_required"
          ),
          db.raw(
            "COUNT(DISTINCT CASE WHEN qi.approved_for_production = true THEN qi.id END) as approved_for_production"
          ),
          db.raw("AVG(qi.taste_score) as average_taste_score"),
          db.raw("AVG(qi.appearance_score) as average_appearance_score"),
          db.raw("AVG(qi.texture_score) as average_texture_score"),
          db.raw("AVG(qi.overall_quality_score) as average_overall_score")
        )
        .whereNull("qi.deleted_at")
        .first();

      // Calculate pass rate
      stats.pass_rate =
        stats.total_inspections > 0
          ? Math.round(
              (stats.passed_inspections / stats.total_inspections) * 100
            )
          : 0;

      return stats;
    } catch (error) {
      console.error("Error fetching quality inspection stats:", error);
      throw new Error("Failed to retrieve quality inspection statistics");
    }
  }

  // Get inspections by menu item
  static async getByMenuItem(menuItemId) {
    try {
      return await db("menu_quality_inspections as qi")
        .select("qi.*", "u.name as inspector_name", "sp.sample_batch_number")
        .leftJoin("users as u", "qi.inspector_id", "u.id")
        .leftJoin(
          "sample_productions as sp",
          "qi.sample_production_id",
          "sp.id"
        )
        .where("qi.menu_item_id", menuItemId)
        .whereNull("qi.deleted_at")
        .orderBy("qi.created_at", "desc");
    } catch (error) {
      console.error("Error fetching inspections by menu item:", error);
      throw new Error("Failed to retrieve inspections for menu item");
    }
  }

  // Get pending inspections
  static async getPendingInspections() {
    try {
      return await db("menu_quality_inspections as qi")
        .select(
          "qi.*",
          "mi.item_name",
          "mi.item_code",
          "sp.sample_batch_number",
          "u.name as inspector_name"
        )
        .leftJoin("menu_items as mi", "qi.menu_item_id", "mi.id")
        .leftJoin(
          "sample_productions as sp",
          "qi.sample_production_id",
          "sp.id"
        )
        .leftJoin("users as u", "qi.inspector_id", "u.id")
        .where("qi.result", "Pending")
        .whereNull("qi.deleted_at")
        .orderBy("qi.inspection_date", "asc")
        .orderBy("qi.inspection_time", "asc");
    } catch (error) {
      console.error("Error fetching pending inspections:", error);
      throw new Error("Failed to retrieve pending inspections");
    }
  }

  // Soft delete quality inspection
  static async delete(id, userId) {
    try {
      // Get current inspection data before deletion for audit logging
      const currentInspection = await this.getById(id);

      await db("menu_quality_inspections").where("id", id).update({
        deleted_at: db.fn.now(),
        updated_at: db.fn.now(),
      });

      // Log the deletion action
      await AuditLogger.log({
        menu_item_id: currentInspection.menu_item_id,
        sample_production_id: currentInspection.sample_production_id,
        quality_inspection_id: id,
        user_id: userId,
        action_type: "DELETED",
        action_details: {
          inspection_number: currentInspection.inspection_number,
          menu_item_name: currentInspection.item_name,
          sample_batch_number: currentInspection.sample_batch_number,
        },
        notes: `Quality inspection deleted for "${currentInspection.item_name}"`,
      });

      return true;
    } catch (error) {
      console.error("Error deleting quality inspection:", error);
      throw new Error("Failed to delete quality inspection");
    }
  }

  // Helper method to get changes between old and new objects
  static getChanges(oldObj, newObj) {
    const changes = {};
    const fieldsToCompare = [
      "result",
      "overall_quality_score",
      "taste_score",
      "appearance_score",
      "texture_score",
      "findings",
      "corrective_actions",
      "recommendations",
      "requires_retest",
      "retest_date",
      "approved_for_production",
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

module.exports = QualityInspection;
