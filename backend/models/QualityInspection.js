const { db } = require("../config/database");

class QualityInspection {
  // Get all quality inspections with filters
  static async getAll(filters = {}) {
    try {
      let query = db("production_quality_inspections as qi")
        .select(
          "qi.*",
          "pb.batch_number",
          "r.recipe_name as product_name",
          "wo.task_name as work_order_task",
          "u.name as inspector_name"
        )
        .leftJoin("production_batches as pb", "qi.production_batch_id", "pb.id")
        .leftJoin("recipes as r", "pb.recipe_id", "r.id")
        .leftJoin("work_orders as wo", "qi.work_order_id", "wo.id")
        .leftJoin("users as u", "qi.inspector_id", "u.id");

      // Apply filters
      if (filters.status) {
        query = query.where("qi.status", filters.status);
      }

      if (filters.inspection_type) {
        query = query.where("qi.inspection_type", filters.inspection_type);
      }

      if (filters.inspection_stage) {
        query = query.where("qi.inspection_stage", filters.inspection_stage);
      }

      if (filters.inspector_id) {
        query = query.where("qi.inspector_id", filters.inspector_id);
      }

      if (filters.date_from) {
        query = query.where("qi.inspection_date", ">=", filters.date_from);
      }

      if (filters.date_to) {
        query = query.where("qi.inspection_date", "<=", filters.date_to);
      }

      if (filters.search) {
        query = query.where(function () {
          this.where("qi.inspection_number", "ilike", `%${filters.search}%`)
            .orWhere("qi.findings", "ilike", `%${filters.search}%`)
            .orWhere("pb.batch_number", "ilike", `%${filters.search}%`);
        });
      }

      return await query.orderBy("qi.inspection_date", "desc");
    } catch (error) {
      console.error("Error fetching quality inspections:", error);
      throw new Error("Failed to retrieve quality inspections");
    }
  }

  // Get quality inspection by ID with checklist items
  static async getById(id) {
    try {
      const inspection = await db("production_quality_inspections as qi")
        .select(
          "qi.*",
          "pb.batch_number",
          "r.recipe_name as product_name",
          "wo.task_name as work_order_task",
          "u.name as inspector_name"
        )
        .leftJoin("production_batches as pb", "qi.production_batch_id", "pb.id")
        .leftJoin("recipes as r", "pb.recipe_id", "r.id")
        .leftJoin("work_orders as wo", "qi.work_order_id", "wo.id")
        .leftJoin("users as u", "qi.inspector_id", "u.id")
        .where("qi.id", id)
        .first();

      if (inspection) {
        // Get checklist items for this inspection
        inspection.checklist_items = await db(
          "production_quality_checklist_items"
        )
          .where("inspection_id", id)
          .orderBy("id", "asc");
      }

      return inspection;
    } catch (error) {
      console.error("Error fetching quality inspection by ID:", error);
      throw new Error("Failed to retrieve quality inspection");
    }
  }

  // Create new quality inspection
  static async create(inspectionData, checklistItems = []) {
    const trx = await db.transaction();

    try {
      // Generate inspection number
      const inspectionNumber = await this.generateInspectionNumber();

      const [inspection] = await trx("production_quality_inspections")
        .insert({
          inspection_number: inspectionNumber,
          production_batch_id: inspectionData.production_batch_id,
          work_order_id: inspectionData.work_order_id,
          inspection_type: inspectionData.inspection_type,
          inspection_stage: inspectionData.inspection_stage,
          inspector_id: inspectionData.inspector_id,
          inspection_date: inspectionData.inspection_date || new Date(),
          inspection_criteria: inspectionData.inspection_criteria,
          findings: inspectionData.findings,
          corrective_actions: inspectionData.corrective_actions,
          requires_retest: inspectionData.requires_retest || false,
          retest_date: inspectionData.retest_date,
        })
        .returning("*");

      // Add checklist items if provided
      if (checklistItems.length > 0) {
        const itemsToInsert = checklistItems.map((item) => ({
          inspection_id: inspection.id,
          check_item: item.check_item,
          check_description: item.check_description,
          result: item.result || null,
          notes: item.notes,
          is_critical: item.is_critical || false,
        }));

        await trx("production_quality_checklist_items").insert(itemsToInsert);
      }

      await trx.commit();
      return await this.getById(inspection.id);
    } catch (error) {
      await trx.rollback();
      console.error("Error creating quality inspection:", error);
      throw new Error("Failed to create quality inspection");
    }
  }

  // Update quality inspection
  static async update(id, updateData, checklistItems = null) {
    const trx = await db.transaction();

    try {
      const [updated] = await trx("production_quality_inspections")
        .where("id", id)
        .update({
          ...updateData,
          updated_at: new Date(),
        })
        .returning("*");

      if (!updated) {
        throw new Error("Quality inspection not found");
      }

      // Update checklist items if provided
      if (checklistItems !== null) {
        // Delete existing checklist items
        await trx("production_quality_checklist_items")
          .where("inspection_id", id)
          .del();

        // Add new checklist items
        if (checklistItems.length > 0) {
          const itemsToInsert = checklistItems.map((item) => ({
            inspection_id: id,
            check_item: item.check_item,
            check_description: item.check_description,
            result: item.result || null,
            notes: item.notes,
            is_critical: item.is_critical || false,
          }));

          await trx("production_quality_checklist_items").insert(itemsToInsert);
        }
      }

      await trx.commit();
      return await this.getById(id);
    } catch (error) {
      await trx.rollback();
      console.error("Error updating quality inspection:", error);
      throw new Error("Failed to update quality inspection");
    }
  }

  // Update inspection status
  static async updateStatus(
    id,
    status,
    updatedBy,
    findings = null,
    correctiveActions = null
  ) {
    const trx = await db.transaction();

    try {
      const updateData = {
        status,
        updated_at: new Date(),
      };

      if (findings) {
        updateData.findings = findings;
      }

      if (correctiveActions) {
        updateData.corrective_actions = correctiveActions;
      }

      const [updated] = await trx("production_quality_inspections")
        .where("id", id)
        .update(updateData)
        .returning("*");

      if (!updated) {
        throw new Error("Quality inspection not found");
      }

      await trx.commit();
      return updated;
    } catch (error) {
      await trx.rollback();
      console.error("Error updating inspection status:", error);
      throw new Error("Failed to update inspection status");
    }
  }

  // Get quality statistics
  static async getStats() {
    try {
      const stats = await db("production_quality_inspections")
        .select(
          db.raw("COUNT(*) as total_inspections"),
          db.raw(
            "COUNT(CASE WHEN status = 'Passed' THEN 1 END) as passed_inspections"
          ),
          db.raw(
            "COUNT(CASE WHEN status = 'Failed' THEN 1 END) as failed_inspections"
          ),
          db.raw(
            "COUNT(CASE WHEN status = 'Pending' THEN 1 END) as pending_inspections"
          ),
          db.raw(
            "COUNT(CASE WHEN requires_retest = true THEN 1 END) as retest_required"
          )
        )
        .first();

      // Calculate pass rate
      const total = parseInt(stats.total_inspections || 0);
      const passed = parseInt(stats.passed_inspections || 0);
      const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;

      // Get today's inspections
      const today = new Date().toISOString().split("T")[0];
      const todayStats = await db("production_quality_inspections")
        .select(
          db.raw("COUNT(*) as today_inspections"),
          db.raw(
            "COUNT(CASE WHEN status = 'Passed' THEN 1 END) as today_passed"
          )
        )
        .where("inspection_date", ">=", today)
        .first();

      return {
        ...stats,
        ...todayStats,
        pass_rate: passRate,
      };
    } catch (error) {
      console.error("Error fetching quality stats:", error);
      throw new Error("Failed to retrieve quality statistics");
    }
  }

  // Generate unique inspection number
  static async generateInspectionNumber() {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, "0");
    const day = String(new Date().getDate()).padStart(2, "0");

    const prefix = `QI${year}${month}${day}`;

    const lastInspection = await db("production_quality_inspections")
      .where("inspection_number", "like", `${prefix}%`)
      .orderBy("inspection_number", "desc")
      .first();

    let sequence = 1;
    if (lastInspection) {
      const lastSequence = parseInt(lastInspection.inspection_number.slice(-3));
      sequence = lastSequence + 1;
    }

    return `${prefix}${String(sequence).padStart(3, "0")}`;
  }

  // Get critical failures
  static async getCriticalFailures(dateFrom = null, dateTo = null) {
    try {
      let query = db("production_quality_inspections as qi")
        .select(
          "qi.*",
          "pb.batch_number",
          "r.recipe_name as product_name",
          "u.name as inspector_name"
        )
        .leftJoin("production_batches as pb", "qi.production_batch_id", "pb.id")
        .leftJoin("recipes as r", "pb.recipe_id", "r.id")
        .leftJoin("users as u", "qi.inspector_id", "u.id")
        .where("qi.status", "Failed");

      if (dateFrom) {
        query = query.where("qi.inspection_date", ">=", dateFrom);
      }

      if (dateTo) {
        query = query.where("qi.inspection_date", "<=", dateTo);
      }

      const failures = await query.orderBy("qi.inspection_date", "desc");

      // Get checklist items for each failure to identify critical issues
      for (let failure of failures) {
        failure.checklist_items = await db("production_quality_checklist_items")
          .where("inspection_id", failure.id)
          .where("is_critical", true)
          .where("result", "Fail");
      }

      // Filter only inspections with critical failures
      return failures.filter((f) => f.checklist_items.length > 0);
    } catch (error) {
      console.error("Error fetching critical failures:", error);
      throw new Error("Failed to retrieve critical failures");
    }
  }

  // Delete quality inspection
  static async delete(id) {
    const trx = await db.transaction();

    try {
      // Delete checklist items first
      await trx("production_quality_checklist_items")
        .where("inspection_id", id)
        .del();

      // Delete inspection
      const [deleted] = await trx("production_quality_inspections")
        .where("id", id)
        .del()
        .returning("*");

      if (!deleted) {
        throw new Error("Quality inspection not found");
      }

      await trx.commit();
      return deleted;
    } catch (error) {
      await trx.rollback();
      console.error("Error deleting quality inspection:", error);
      throw new Error("Failed to delete quality inspection");
    }
  }
}

module.exports = QualityInspection;
