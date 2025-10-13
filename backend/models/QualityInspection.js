const { db } = require("../config/database");
const AuditLogger = require("./AuditLogger");

// Quality Inspection Types
const INSPECTION_TYPES = {
  DIRECT_INSPECTION: "Direct Inspection",
  SPOT_CHECK: "Spot Check",
  COMPLAINT_INVESTIGATION: "Complaint Investigation",
  SUPPLIER_CHANGE: "Supplier Change",
  PRODUCTION_CHECK: "Production Check",
  SEASONAL_CHECK: "Seasonal Check",
};

// Inspection Result Types
const INSPECTION_RESULTS = {
  PASS: "Pass",
  FAIL: "Fail",
  PENDING: "Pending",
  RETEST_REQUIRED: "Retest Required",
};

// Quality Score Requirements by Inspection Type
const QUALITY_SCORE_REQUIREMENTS = {
  [INSPECTION_TYPES.DIRECT_INSPECTION]: {
    taste_score: true,
    appearance_score: true,
    texture_score: true,
    overall_score: true,
    findings: true,
  },
  [INSPECTION_TYPES.SPOT_CHECK]: {
    taste_score: false,
    appearance_score: false,
    texture_score: false,
    overall_score: false,
    findings: true,
  },
  [INSPECTION_TYPES.COMPLAINT_INVESTIGATION]: {
    taste_score: true,
    appearance_score: true,
    texture_score: true,
    overall_score: true,
    findings: true,
  },
  [INSPECTION_TYPES.SUPPLIER_CHANGE]: {
    taste_score: true,
    appearance_score: true,
    texture_score: true,
    overall_score: true,
    findings: true,
  },
  [INSPECTION_TYPES.PRODUCTION_CHECK]: {
    taste_score: false,
    appearance_score: false,
    texture_score: false,
    overall_score: false,
    findings: true,
  },
  [INSPECTION_TYPES.SEASONAL_CHECK]: {
    taste_score: true,
    appearance_score: true,
    texture_score: true,
    overall_score: true,
    findings: true,
  },
};

class QualityInspection {
  // Get inspection types and requirements
  static getInspectionTypes() {
    return {
      types: INSPECTION_TYPES,
      results: INSPECTION_RESULTS,
      requirements: QUALITY_SCORE_REQUIREMENTS,
    };
  }

  // Validate inspection data based on type
  static validateInspectionData(inspectionData) {
    const { inspection_type, menu_item_id } = inspectionData;
    const requirements = QUALITY_SCORE_REQUIREMENTS[inspection_type];

    // For all inspection types, menu_item_id is required
    if (!menu_item_id) {
      throw new Error("Menu item is required for this inspection type");
    }

    // Validate required fields based on inspection type
    if (requirements.findings && !inspectionData.findings?.trim()) {
      throw new Error("Findings are required for this inspection type");
    }

    return true;
  }

  // Get all quality inspections with details
  static async getAll(filters = {}) {
    try {
      let query = db("menu_quality_inspections as qi")
        .select(
          "qi.*",
          "mi.menu_item_name as item_name",
          "mi.item_code",
          db.raw(
            "COALESCE(e.first_name,'') || ' ' || COALESCE(e.last_name,'') as inspector_name"
          ),
          db.raw(
            "COALESCE(ae.first_name,'') || ' ' || COALESCE(ae.last_name,'') as approved_by_name"
          )
        )
        .leftJoin("menu_items as mi", "qi.menu_item_id", "mi.id")
        .leftJoin("employees as e", "qi.inspector_id", "e.id")
        .leftJoin("employees as ae", "qi.approved_by", "ae.id")
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
          this.where(
            "qi.inspection_number",
            "ilike",
            `%${filters.search}%`
          ).orWhere("mi.menu_item_name", "ilike", `%${filters.search}%`);
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
          "mi.menu_item_name as item_name",
          "mi.item_code",
          "mi.description as menu_item_description",
          "mi.selling_price",
          "mi.cost_price",
          "r.recipe_name",
          db.raw(
            "COALESCE(e.first_name,'') || ' ' || COALESCE(e.last_name,'') as inspector_name"
          ),
          db.raw(
            "COALESCE(ae.first_name,'') || ' ' || COALESCE(ae.last_name,'') as approved_by_name"
          )
        )
        .leftJoin("menu_items as mi", "qi.menu_item_id", "mi.id")
        .leftJoin("recipes as r", "mi.recipe_id", "r.id")
        .leftJoin("employees as e", "qi.inspector_id", "e.id")
        .leftJoin("employees as ae", "qi.approved_by", "ae.id")
        .where("qi.id", id)
        .whereNull("qi.deleted_at")
        .first();

      return inspection;
    } catch (error) {
      console.error("Error fetching quality inspection by ID:", error);
      throw new Error("Failed to retrieve quality inspection");
    }
  }

  // Helper function to convert dd/mm/yyyy to yyyy-mm-dd
  static convertDateFormat(dateString) {
    if (
      !dateString ||
      dateString.trim() === "" ||
      dateString === "undefined" ||
      dateString === "null"
    ) {
      return null;
    }

    // Handle dd/mm/yyyy format
    if (dateString.includes("/")) {
      const [day, month, year] = dateString.split("/");
      if (
        day &&
        month &&
        year &&
        day.length > 0 &&
        month.length > 0 &&
        year.length > 0
      ) {
        return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
      }
    }

    // If already in yyyy-mm-dd format, return as is
    if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return dateString;
    }

    return null;
  }

  // Create new quality inspection
  static async create(inspectionData) {
    const trx = await db.transaction();

    try {
      // Validate inspection data based on type
      this.validateInspectionData(inspectionData);

      // Generate inspection number
      const timestamp = Date.now();
      const inspectionNumber = `QI${timestamp}`;

      // Ensure menu item exists
      const menuItem = await trx("menu_items")
        .where("id", inspectionData.menu_item_id)
        .select("id", "menu_item_name")
        .first();

      if (!menuItem) {
        throw new Error("Menu item not found");
      }

      // Prepare data for insertion
      const insertData = {
        ...inspectionData,
        inspection_number: inspectionNumber,
        inspection_date:
          this.convertDateFormat(inspectionData.inspection_date) ||
          trx.fn.now(),
        inspection_time: inspectionData.inspection_time || trx.fn.now(),
        retest_date: this.convertDateFormat(inspectionData.retest_date),
        // Convert empty strings to null for integer fields
        sample_production_id: null, // No longer used
        menu_item_id: inspectionData.menu_item_id,
        inspector_id: inspectionData.inspector_id || null,
        approved_by: inspectionData.approved_by || null,
        // Convert empty strings to null and decimal values to integers for numeric fields
        taste_score: inspectionData.taste_score
          ? Math.max(
              1,
              Math.min(10, Math.round(parseFloat(inspectionData.taste_score)))
            )
          : null,
        appearance_score: inspectionData.appearance_score
          ? Math.max(
              1,
              Math.min(
                10,
                Math.round(parseFloat(inspectionData.appearance_score))
              )
            )
          : null,
        texture_score: inspectionData.texture_score
          ? Math.max(
              1,
              Math.min(10, Math.round(parseFloat(inspectionData.texture_score)))
            )
          : null,
        overall_quality_score: inspectionData.overall_quality_score
          ? Math.max(
              1,
              Math.min(
                10,
                Math.round(parseFloat(inspectionData.overall_quality_score))
              )
            )
          : null,
        created_at: trx.fn.now(),
        updated_at: trx.fn.now(),
      };

      const [result] = await trx("menu_quality_inspections")
        .insert(insertData)
        .returning("id");

      if (!result) {
        throw new Error("Failed to get inspection ID after creation");
      }

      // Extract the actual ID value from the result object
      const inspectionId = result.id || result;

      // Commit the transaction first
      await trx.commit();

      // Log the quality inspection action (after transaction commit)
      try {
        await AuditLogger.log({
          menu_item_id: inspectionData.menu_item_id,
          sample_production_id: null,
          quality_inspection_id: inspectionId,
          employee_id: inspectionData.inspector_id,
          action_type: "QUALITY_INSPECTION",
          action_details: {
            inspection_number: inspectionNumber,
            inspection_type: inspectionData.inspection_type,
            result: inspectionData.result,
            overall_quality_score: inspectionData.overall_quality_score,
            requires_retest: inspectionData.requires_retest,
          },
          notes: `Quality inspection completed for ${menuItem.menu_item_name} - Result: ${inspectionData.result}`,
        });
      } catch (auditError) {
        console.warn("Failed to create audit log:", auditError.message);
        // Don't fail the entire operation if audit logging fails
      }
      return await this.getById(inspectionId);
    } catch (error) {
      await trx.rollback();
      console.error("Error creating quality inspection:", error);
      throw new Error("Failed to create quality inspection");
    }
  }

  // Update quality inspection status
  static async updateStatus(id, updateData) {
    try {
      const { result, notes, updated_by } = updateData;

      // Validate result
      const validResults = ["Pending", "Pass", "Fail", "Retest Required"];
      if (!validResults.includes(result)) {
        throw new Error("Invalid inspection result");
      }

      return await this.update(
        id,
        {
          result,
          notes: notes || null,
          updated_by,
        },
        updated_by
      );
    } catch (error) {
      console.error("Error updating inspection status:", error);
      throw error;
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
        sample_production_id: null,
        quality_inspection_id: id,
        employee_id: userId,
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

      await trx.commit();

      // Log the approval action (after transaction commit)
      try {
        await AuditLogger.log({
          menu_item_id: inspection.menu_item_id,
          sample_production_id: null,
          quality_inspection_id: id,
          employee_id: approvedByUserId,
          action_type: "QUALITY_PASSED",
          action_details: {
            inspection_number: currentInspection.inspection_number,
            menu_item_name: currentInspection.menu_item_name,
            overall_quality_score: currentInspection.overall_quality_score,
          },
          notes: `Quality inspection passed and approved for production - ${currentInspection.menu_item_name}`,
        });

        // Log the production approval
        await AuditLogger.log({
          menu_item_id: inspection.menu_item_id,
          employee_id: approvedByUserId,
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
      } catch (auditError) {
        console.warn("Failed to create audit log:", auditError.message);
        // Don't fail the entire operation if audit logging fails
      }
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
        sample_production_id: null,
        quality_inspection_id: id,
        employee_id: userId,
        action_type: "QUALITY_FAILED",
        action_details: {
          inspection_number: currentInspection.inspection_number,
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
        sample_production_id: null,
        quality_inspection_id: id,
        employee_id: userId,
        action_type: "QUALITY_INSPECTION",
        action_details: {
          inspection_number: currentInspection.inspection_number,
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
        .select(
          "qi.*",
          db.raw(
            "COALESCE(e.first_name,'') || ' ' || COALESCE(e.last_name,'') as inspector_name"
          )
        )
        .leftJoin("employees as e", "qi.inspector_id", "e.id")
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
          "mi.menu_item_name as item_name",
          "mi.item_code",
          db.raw(
            "COALESCE(e.first_name,'') || ' ' || COALESCE(e.last_name,'') as inspector_name"
          )
        )
        .leftJoin("menu_items as mi", "qi.menu_item_id", "mi.id")
        .leftJoin("employees as e", "qi.inspector_id", "e.id")
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
        sample_production_id: null,
        quality_inspection_id: id,
        employee_id: userId,
        action_type: "DELETED",
        action_details: {
          inspection_number: currentInspection.inspection_number,
          menu_item_name: currentInspection.item_name,
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
