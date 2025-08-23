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
      const suppliers = await db("suppliers")
        .whereNull("deleted_at")
        .orderBy("name");

      // Check if supplier_ratings table exists
      const tableExists = await db.schema.hasTable("supplier_ratings");

      if (tableExists) {
        // Get ratings for each supplier
        for (let supplier of suppliers) {
          // Get average rating
          const ratingResult = await db("supplier_ratings")
            .where("supplier_id", supplier.id)
            .avg("rating as avg_rating")
            .first();

          // Convert to number instead of string
          supplier.rating = ratingResult?.avg_rating
            ? parseFloat(ratingResult.avg_rating)
            : 0;

          // Get total orders
          const orderResult = await db("purchase_orders")
            .where("supplier_id", supplier.id)
            .whereNull("deleted_at")
            .count("* as total_orders")
            .first();

          // Convert to number instead of string
          supplier.total_orders = parseInt(orderResult?.total_orders) || 0;

          // Get last order date
          const lastOrderResult = await db("purchase_orders")
            .where("supplier_id", supplier.id)
            .whereNull("deleted_at")
            .orderBy("created_at", "desc")
            .first();

          supplier.last_order_date = lastOrderResult?.created_at || null;
        }
      } else {
        suppliers.forEach((supplier) => {
          supplier.rating = 0;
          supplier.total_orders = 0;
          supplier.last_order_date = null;
        });
      }

      return suppliers;
    } catch (error) {
      throw error;
    }
  }

  // NEW: Validate if supplier can be used in purchase orders
  static async validateForPurchaseOrder(supplierId) {
    try {
      const supplier = await db("suppliers")
        .where("id", supplierId)
        .whereNull("deleted_at")
        .first();

      if (!supplier) {
        throw new Error("Supplier not found or has been deleted");
      }

      if (supplier.status !== "Active") {
        throw new Error(
          `Cannot create purchase order with ${supplier.status.toLowerCase()} supplier: ${supplier.name}`
        );
      }

      return supplier;
    } catch (error) {
      throw error;
    }
  }

  // NEW: Get only active suppliers for purchase orders
  static async getActiveSuppliers() {
    try {
      return await db("suppliers")
        .where("status", "Active")
        .whereNull("deleted_at")
        .orderBy("name");
    } catch (error) {
      throw error;
    }
  }

  // NEW: Restore deleted supplier
  static async restore(id) {
    try {
      if (!id || isNaN(id)) {
        throw new Error("Invalid supplier ID provided");
      }

      const existingSupplier = await db("suppliers").where("id", id).first();
      if (!existingSupplier) {
        throw new Error("Supplier not found");
      }

      if (!existingSupplier.deleted_at) {
        throw new Error("Supplier is not deleted and cannot be restored");
      }

      const [supplier] = await db("suppliers")
        .where("id", id)
        .update({
          deleted_at: null,
          updated_at: new Date(),
        })
        .returning("*");

      return supplier;
    } catch (error) {
      console.error("Error restoring supplier:", error);

      // Re-throw validation errors
      if (
        error.message.includes("Invalid") ||
        error.message.includes("not found") ||
        error.message.includes("cannot be restored")
      ) {
        throw error;
      }

      throw new Error("Failed to restore supplier. Please try again.");
    }
  }

  // NEW: Get deleted suppliers
  static async getDeletedSuppliers() {
    try {
      return await db("suppliers")
        .whereNotNull("deleted_at")
        .orderBy("deleted_at", "desc");
    } catch (error) {
      throw error;
    }
  }
}

module.exports = Supplier;
