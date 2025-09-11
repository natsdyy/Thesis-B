const { db } = require("../config/database");

class ProductionWaste {
  // Get all production waste records with filters
  static async getAll(filters = {}) {
    try {
      let query = db("production_waste as pw")
        .select(
          "pw.*",
          "pb.batch_number",
          "r.recipe_name as batch_product_name",
          "iit.name as item_type_name",
          "ic.name as category_name",
          db.raw(
            "COALESCE(u.first_name,'') || ' ' || COALESCE(u.last_name,'') as reported_by_name"
          )
        )
        .leftJoin("production_batches as pb", "pw.production_batch_id", "pb.id")
        .leftJoin("recipes as r", "pb.recipe_id", "r.id")
        .leftJoin(
          "inventory_item_types as iit",
          "pw.inventory_item_type_id",
          "iit.id"
        )
        .leftJoin("inventory_categories as ic", "iit.category_id", "ic.id")
        .leftJoin("employees as u", "pw.reported_by", "u.id");

      // Apply filters
      if (filters.waste_type) {
        query = query.where("pw.waste_type", filters.waste_type);
      }

      if (filters.is_preventable !== undefined) {
        query = query.where("pw.is_preventable", filters.is_preventable);
      }

      if (filters.date_from) {
        query = query.where("pw.waste_date", ">=", filters.date_from);
      }

      if (filters.date_to) {
        query = query.where("pw.waste_date", "<=", filters.date_to);
      }

      if (filters.production_batch_id) {
        query = query.where(
          "pw.production_batch_id",
          filters.production_batch_id
        );
      }

      if (filters.search) {
        query = query.where(function () {
          this.where("pw.waste_record_number", "ilike", `%${filters.search}%`)
            .orWhere("pw.reason", "ilike", `%${filters.search}%`)
            .orWhere("iit.name", "ilike", `%${filters.search}%`);
        });
      }

      return await query.orderBy("pw.waste_date", "desc");
    } catch (error) {
      console.error("Error fetching production waste:", error);
      throw new Error("Failed to retrieve production waste records");
    }
  }

  // Get production waste by ID
  static async getById(id) {
    try {
      const waste = await db("production_waste as pw")
        .select(
          "pw.*",
          "pb.batch_number",
          "r.recipe_name as batch_product_name",
          "iit.name as item_type_name",
          "ic.name as category_name",
          db.raw(
            "COALESCE(u.first_name,'') || ' ' || COALESCE(u.last_name,'') as reported_by_name"
          )
        )
        .leftJoin("production_batches as pb", "pw.production_batch_id", "pb.id")
        .leftJoin("recipes as r", "pb.recipe_id", "r.id")
        .leftJoin(
          "inventory_item_types as iit",
          "pw.inventory_item_type_id",
          "iit.id"
        )
        .leftJoin("inventory_categories as ic", "iit.category_id", "ic.id")
        .leftJoin("employees as u", "pw.reported_by", "u.id")
        .where("pw.id", id)
        .first();

      return waste;
    } catch (error) {
      console.error("Error fetching production waste by ID:", error);
      throw new Error("Failed to retrieve production waste record");
    }
  }

  // Create new production waste record
  static async create(wasteData) {
    const trx = await db.transaction();

    try {
      // Generate waste record number
      const wasteRecordNumber = await this.generateWasteRecordNumber();

      const [waste] = await trx("production_waste")
        .insert({
          waste_record_number: wasteRecordNumber,
          production_batch_id: wasteData.production_batch_id,
          inventory_item_type_id: wasteData.inventory_item_type_id,
          waste_type: wasteData.waste_type,
          quantity_wasted: wasteData.quantity_wasted,
          unit: wasteData.unit,
          estimated_cost: wasteData.estimated_cost || 0,
          reason: wasteData.reason,
          prevention_notes: wasteData.prevention_notes,
          waste_date: wasteData.waste_date || new Date(),
          reported_by: wasteData.reported_by,
          is_preventable: wasteData.is_preventable !== false,
        })
        .returning("*");

      await trx.commit();
      return await this.getById(waste.id);
    } catch (error) {
      await trx.rollback();
      console.error("Error creating production waste record:", error);
      throw new Error("Failed to create production waste record");
    }
  }

  // Get waste statistics
  static async getStats(dateFrom = null, dateTo = null) {
    try {
      let query = db("production_waste");

      if (dateFrom) {
        query = query.where("waste_date", ">=", dateFrom);
      }

      if (dateTo) {
        query = query.where("waste_date", "<=", dateTo);
      }

      const stats = await query
        .select(
          db.raw("COUNT(*) as total_waste_records"),
          db.raw("SUM(quantity_wasted) as total_quantity_wasted"),
          db.raw("SUM(estimated_cost) as total_waste_cost"),
          db.raw(
            "COUNT(CASE WHEN is_preventable = true THEN 1 END) as preventable_waste"
          ),
          db.raw(
            "SUM(CASE WHEN is_preventable = true THEN estimated_cost ELSE 0 END) as preventable_cost"
          )
        )
        .first();

      // Calculate rates
      const total = parseInt(stats.total_waste_records || 0);
      const preventable = parseInt(stats.preventable_waste || 0);
      const preventableRate =
        total > 0 ? Math.round((preventable / total) * 100) : 0;

      // Get waste by type
      const wasteByType = await query
        .clone()
        .select(
          "waste_type",
          db.raw("COUNT(*) as count"),
          db.raw("SUM(quantity_wasted) as total_quantity"),
          db.raw("SUM(estimated_cost) as total_cost")
        )
        .groupBy("waste_type")
        .orderBy("total_cost", "desc");

      return {
        ...stats,
        preventable_rate: preventableRate,
        waste_by_type: wasteByType,
      };
    } catch (error) {
      console.error("Error fetching waste stats:", error);
      throw new Error("Failed to retrieve waste statistics");
    }
  }

  // Generate unique waste record number
  static async generateWasteRecordNumber() {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, "0");
    const day = String(new Date().getDate()).padStart(2, "0");

    const prefix = `WR${year}${month}${day}`;

    const lastRecord = await db("production_waste")
      .where("waste_record_number", "like", `${prefix}%`)
      .orderBy("waste_record_number", "desc")
      .first();

    let sequence = 1;
    if (lastRecord) {
      const lastSequence = parseInt(lastRecord.waste_record_number.slice(-3));
      sequence = lastSequence + 1;
    }

    return `${prefix}${String(sequence).padStart(3, "0")}`;
  }

  // Update production waste record
  static async update(id, updateData) {
    try {
      const [updated] = await db("production_waste")
        .where("id", id)
        .update({
          ...updateData,
          updated_at: new Date(),
        })
        .returning("*");

      if (!updated) {
        throw new Error("Production waste record not found");
      }

      return await this.getById(id);
    } catch (error) {
      console.error("Error updating production waste record:", error);
      throw new Error("Failed to update production waste record");
    }
  }

  // Delete production waste record
  static async delete(id) {
    try {
      const [deleted] = await db("production_waste")
        .where("id", id)
        .del()
        .returning("*");

      if (!deleted) {
        throw new Error("Production waste record not found");
      }

      return deleted;
    } catch (error) {
      console.error("Error deleting production waste record:", error);
      throw new Error("Failed to delete production waste record");
    }
  }
}

module.exports = ProductionWaste;
