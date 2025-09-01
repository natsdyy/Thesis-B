const { db } = require("../config/database");

class Equipment {
  // Get all equipment with filters
  static async getAll(filters = {}) {
    try {
      let query = db("equipment as e")
        .select("e.*", "u_created.name as created_by_name")
        .leftJoin("users as u_created", "e.created_by", "u_created.id");

      // Apply filters
      if (filters.status) {
        query = query.where("e.status", filters.status);
      }

      if (filters.equipment_type) {
        query = query.where("e.equipment_type", filters.equipment_type);
      }

      if (filters.category) {
        query = query.where("e.category", filters.category);
      }

      if (filters.search) {
        query = query.where(function () {
          this.where("e.equipment_name", "ilike", `%${filters.search}%`)
            .orWhere("e.equipment_code", "ilike", `%${filters.search}%`)
            .orWhere("e.description", "ilike", `%${filters.search}%`);
        });
      }

      return await query.orderBy("e.equipment_name", "asc");
    } catch (error) {
      console.error("Error fetching equipment:", error);
      throw new Error("Failed to retrieve equipment");
    }
  }

  // Get equipment by ID
  static async getById(id) {
    try {
      const equipment = await db("equipment as e")
        .select("e.*", "u_created.name as created_by_name")
        .leftJoin("users as u_created", "e.created_by", "u_created.id")
        .where("e.id", id)
        .first();

      return equipment;
    } catch (error) {
      console.error("Error fetching equipment by ID:", error);
      throw new Error("Failed to retrieve equipment");
    }
  }

  // Create new equipment
  static async create(equipmentData) {
    try {
      // Generate equipment code
      const equipmentCode = await this.generateEquipmentCode(
        equipmentData.category
      );

      const [equipment] = await db("equipment")
        .insert({
          equipment_code: equipmentCode,
          equipment_name: equipmentData.equipment_name,
          description: equipmentData.description,
          category: equipmentData.category,
          location: equipmentData.location,
          purchase_date: equipmentData.purchase_date,
          purchase_cost: equipmentData.purchase_cost || 0,
          status: equipmentData.status || "Active",
          manufacturer: equipmentData.manufacturer,
          model: equipmentData.model,
          serial_number: equipmentData.serial_number,
          specifications: equipmentData.specifications,
          created_by: equipmentData.created_by,
        })
        .returning("*");

      return await this.getById(equipment.id);
    } catch (error) {
      console.error("Error creating equipment:", error);
      throw new Error("Failed to create equipment");
    }
  }

  // Update equipment
  static async update(id, updateData) {
    try {
      const [updated] = await db("equipment")
        .where("id", id)
        .update({
          ...updateData,
          updated_at: new Date(),
        })
        .returning("*");

      if (!updated) {
        throw new Error("Equipment not found");
      }

      return await this.getById(id);
    } catch (error) {
      console.error("Error updating equipment:", error);
      throw new Error("Failed to update equipment");
    }
  }

  // Update equipment status
  static async updateStatus(id, status, updatedBy, notes = null) {
    try {
      const updateData = {
        status,
        updated_at: new Date(),
      };

      if (notes) {
        updateData.notes = notes;
      }

      const [updated] = await db("equipment")
        .where("id", id)
        .update(updateData)
        .returning("*");

      if (!updated) {
        throw new Error("Equipment not found");
      }

      return updated;
    } catch (error) {
      console.error("Error updating equipment status:", error);
      throw new Error("Failed to update equipment status");
    }
  }

  // Generate unique equipment code
  static async generateEquipmentCode(category) {
    const typeCode = category.substring(0, 3).toUpperCase();
    const year = new Date().getFullYear().toString().slice(-2);

    const lastEquipment = await db("equipment")
      .where("equipment_code", "like", `${typeCode}${year}%`)
      .orderBy("equipment_code", "desc")
      .first();

    let sequence = 1;
    if (lastEquipment) {
      const lastSequence = parseInt(lastEquipment.equipment_code.slice(-3));
      sequence = lastSequence + 1;
    }

    return `${typeCode}${year}${String(sequence).padStart(3, "0")}`;
  }

  // Get equipment statistics
  static async getStats() {
    try {
      const stats = await db("equipment")
        .select(
          db.raw("COUNT(*) as total_equipment"),
          db.raw("COUNT(CASE WHEN status = 'Active' THEN 1 END) as active"),
          db.raw(
            "COUNT(CASE WHEN status = 'Maintenance' THEN 1 END) as maintenance"
          ),
          db.raw("COUNT(CASE WHEN status = 'Broken' THEN 1 END) as broken"),
          db.raw("COUNT(CASE WHEN status = 'Retired' THEN 1 END) as retired")
        )
        .first();

      return stats;
    } catch (error) {
      console.error("Error fetching equipment stats:", error);
      throw new Error("Failed to retrieve equipment statistics");
    }
  }

  // Delete equipment
  static async delete(id) {
    try {
      const [deleted] = await db("equipment")
        .where("id", id)
        .del()
        .returning("*");

      if (!deleted) {
        throw new Error("Equipment not found");
      }

      return deleted;
    } catch (error) {
      console.error("Error deleting equipment:", error);
      throw new Error("Failed to delete equipment");
    }
  }
}

module.exports = Equipment;
