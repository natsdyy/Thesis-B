const { db } = require("../config/database");

class Supplier {
  // Get all suppliers
  static async getAll(includeDeleted = false) {
    try {
      let query = db("suppliers");

      if (!includeDeleted) {
        query = query.whereNull("deleted_at");
      }

      const suppliers = await query.orderBy("name");

      // Get statistics for each supplier
      for (let supplier of suppliers) {
        supplier.stats = await this.getSupplierStats(supplier.id);
      }

      return suppliers;
    } catch (error) {
      throw error;
    }
  }

  // Get supplier by ID
  static async getById(id) {
    try {
      const supplier = await db("suppliers").where("id", id).first();

      if (supplier) {
        supplier.stats = await this.getSupplierStats(id);
      }

      return supplier;
    } catch (error) {
      throw error;
    }
  }

  // Create supplier
  static async create(supplierData) {
    try {
      const [supplier] = await db("suppliers")
        .insert(supplierData)
        .returning("*");

      return supplier.id;
    } catch (error) {
      throw error;
    }
  }

  // Update supplier
  static async update(id, supplierData) {
    try {
      const [updatedSupplier] = await db("suppliers")
        .where("id", id)
        .update({
          ...supplierData,
          updated_at: new Date(),
        })
        .returning("*");

      return updatedSupplier;
    } catch (error) {
      throw error;
    }
  }

  // Delete supplier
  static async delete(id) {
    try {
      const [deletedSupplier] = await db("suppliers")
        .where("id", id)
        .update({ deleted_at: new Date() })
        .returning("*");

      return deletedSupplier;
    } catch (error) {
      throw error;
    }
  }

  // Get supplier statistics
  static async getSupplierStats(supplierId) {
    try {
      // Get total orders (completed purchase orders)
      const totalOrders = await db("purchase_orders")
        .where("supplier_id", supplierId)
        .where("status", "Completed")
        .count("* as count")
        .first();

      // Check if supplier_ratings table exists
      const ratingsTableExists = await db.schema.hasTable("supplier_ratings");
      let avgRating = { avg_rating: null };

      if (ratingsTableExists) {
        avgRating = await db("supplier_ratings")
          .where("supplier_id", supplierId)
          .avg("rating as avg_rating")
          .first();
      }

      // Get last order date
      const lastOrder = await db("purchase_orders")
        .where("supplier_id", supplierId)
        .where("status", "Completed")
        .orderBy("order_date", "desc")
        .select("order_date")
        .first();

      return {
        total_orders: parseInt(totalOrders.count) || 0,
        avg_rating: avgRating.avg_rating
          ? parseFloat(avgRating.avg_rating).toFixed(1)
          : 0,
        last_order_date: lastOrder ? lastOrder.order_date : null,
      };
    } catch (error) {
      // Return default stats if there's an error
      return {
        total_orders: 0,
        avg_rating: 0,
        last_order_date: null,
      };
    }
  }

  // Get suppliers with purchase order statistics
  static async getSuppliersWithStats() {
    try {
      // Use a simpler approach to avoid enum comparison issues
      const suppliers = await db("suppliers")
        .whereNull("deleted_at")
        .orderBy("name");

      // Get stats for each supplier individually
      for (let supplier of suppliers) {
        const stats = await this.getSupplierStats(supplier.id);
        supplier.total_orders = stats.total_orders;
        supplier.last_order_date = stats.last_order_date;
        supplier.avg_rating = stats.avg_rating;
      }

      return suppliers;
    } catch (error) {
      // Fallback: return suppliers without stats if there's an error
      try {
        const suppliers = await db("suppliers")
          .whereNull("deleted_at")
          .orderBy("name");

        return suppliers.map((supplier) => ({
          ...supplier,
          total_orders: 0,
          last_order_date: null,
          avg_rating: 0,
        }));
      } catch (fallbackError) {
        throw fallbackError;
      }
    }
  }
}

module.exports = Supplier;
