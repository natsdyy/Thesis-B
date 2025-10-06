const { db } = require("../config/database");
const bcrypt = require("bcryptjs");

class Supplier {
  // Get all suppliers (optimized)
  static async getAll(includeDeleted = false) {
    try {
      let query = db("suppliers");

      if (!includeDeleted) {
        query = query.whereNull("deleted_at");
      }

      const suppliers = await query.orderBy("name");

      if (suppliers.length === 0) {
        return suppliers;
      }

      const supplierIds = suppliers.map((supplier) => supplier.id);

      // Batch fetch all supplier statistics in optimized queries

      // 1. Get total orders for all suppliers in one query
      const totalOrdersData = await db("purchase_orders")
        .whereIn("supplier_id", supplierIds)
        .where("status", "Completed")
        .select("supplier_id")
        .count("* as count")
        .groupBy("supplier_id");

      // Group total orders by supplier ID
      const totalOrdersBySupplier = {};
      totalOrdersData.forEach((orderData) => {
        totalOrdersBySupplier[orderData.supplier_id] = parseInt(
          orderData.count
        );
      });

      // 2. Get average ratings for all suppliers in one query (if table exists)
      const ratingsTableExists = await db.schema.hasTable("supplier_ratings");
      const avgRatingsBySupplier = {};

      if (ratingsTableExists) {
        const avgRatingsData = await db("supplier_ratings")
          .whereIn("supplier_id", supplierIds)
          .select("supplier_id")
          .avg("rating as avg_rating")
          .groupBy("supplier_id");

        avgRatingsData.forEach((ratingData) => {
          avgRatingsBySupplier[ratingData.supplier_id] = ratingData.avg_rating
            ? parseFloat(ratingData.avg_rating).toFixed(1)
            : 0;
        });
      }

      // 3. Get last order dates for all suppliers in one query
      const lastOrderData = await db("purchase_orders")
        .whereIn("supplier_id", supplierIds)
        .where("status", "Completed")
        .select("supplier_id", "order_date")
        .orderBy("supplier_id")
        .orderBy("order_date", "desc");

      // Group last orders by supplier ID (get the most recent for each)
      const lastOrdersBySupplier = {};
      lastOrderData.forEach((orderData) => {
        if (!lastOrdersBySupplier[orderData.supplier_id]) {
          lastOrdersBySupplier[orderData.supplier_id] = orderData.order_date;
        }
      });

      // Combine all statistics for each supplier
      suppliers.forEach((supplier) => {
        supplier.stats = {
          total_orders: totalOrdersBySupplier[supplier.id] || 0,
          avg_rating: avgRatingsBySupplier[supplier.id] || 0,
          last_order_date: lastOrdersBySupplier[supplier.id] || null,
        };
      });

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

  // ==================== AUTHENTICATION METHODS ====================

  // Hash password
  static async hashPassword(password) {
    try {
      const salt = await bcrypt.genSalt(10);
      return await bcrypt.hash(password, salt);
    } catch (error) {
      console.error("Error hashing password:", error);
      throw new Error("Failed to secure password");
    }
  }

  // Verify password
  static async verifyPassword(plainPassword, hashedPassword) {
    try {
      return await bcrypt.compare(plainPassword, hashedPassword);
    } catch (error) {
      console.error("Error verifying password:", error);
      throw new Error("Password verification failed");
    }
  }

  // Email validation
  static isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Find supplier by email for authentication
  static async findByEmail(email) {
    try {
      if (!email || !this.isValidEmail(email)) {
        throw new Error("Invalid email address");
      }

      const supplier = await db("suppliers")
        .where("email", email.toLowerCase().trim())
        .whereNull("deleted_at")
        .where("is_active", true)
        .where("status", "Active")
        .first();

      return supplier;
    } catch (error) {
      console.error("Error finding supplier by email:", error);
      throw error;
    }
  }

  // Authenticate supplier
  static async authenticate(email, password) {
    try {
      if (!email || !password) {
        return {
          success: false,
          message: "Email and password are required",
          code: "MISSING_CREDENTIALS",
        };
      }

      const supplier = await this.findByEmail(email);

      if (!supplier) {
        return {
          success: false,
          message: "Invalid email or password",
          code: "INVALID_CREDENTIALS",
        };
      }

      // Check if supplier has a password set
      if (!supplier.password) {
        return {
          success: false,
          message:
            "Account not set up for login. Please contact administrator.",
          code: "NO_PASSWORD",
        };
      }

      // Verify password
      const isValidPassword = await this.verifyPassword(
        password,
        supplier.password
      );

      if (!isValidPassword) {
        return {
          success: false,
          message: "Invalid email or password",
          code: "INVALID_CREDENTIALS",
        };
      }

      // Update last login timestamp
      await db("suppliers")
        .where("id", supplier.id)
        .update({ last_login_at: new Date() });

      // Remove password from returned object
      const { password: _, ...supplierWithoutPassword } = supplier;

      return {
        success: true,
        supplier: supplierWithoutPassword,
        message: "Login successful",
        code: "LOGIN_SUCCESS",
      };
    } catch (error) {
      console.error("Error authenticating supplier:", error);
      return {
        success: false,
        message:
          "Authentication service is temporarily unavailable. Please try again.",
        code: "AUTHENTICATION_ERROR",
      };
    }
  }

  // Set default password for supplier
  static async setDefaultPassword(supplierId, password = "supplier123") {
    try {
      const hashedPassword = await this.hashPassword(password);

      const [supplier] = await db("suppliers")
        .where("id", supplierId)
        .update({
          password: hashedPassword,
          updated_at: new Date(),
        })
        .returning("*");

      return supplier;
    } catch (error) {
      console.error("Error setting default password:", error);
      throw new Error("Failed to set default password");
    }
  }

  // Update supplier password
  static async updatePassword(supplierId, newPassword) {
    try {
      if (!newPassword || newPassword.length < 6) {
        throw new Error("Password must be at least 6 characters long");
      }

      const hashedPassword = await this.hashPassword(newPassword);

      const [supplier] = await db("suppliers")
        .where("id", supplierId)
        .update({
          password: hashedPassword,
          updated_at: new Date(),
        })
        .returning("*");

      return supplier;
    } catch (error) {
      console.error("Error updating supplier password:", error);
      throw error;
    }
  }

  // Create supplier with authentication
  static async createWithAuth(supplierData, password = "supplier123") {
    try {
      const hashedPassword = await this.hashPassword(password);

      const [supplier] = await db("suppliers")
        .insert({
          ...supplierData,
          password: hashedPassword,
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
        })
        .returning("*");

      // Remove password from returned object
      const { password: _, ...supplierWithoutPassword } = supplier;
      return supplierWithoutPassword;
    } catch (error) {
      console.error("Error creating supplier with auth:", error);
      throw error;
    }
  }
}

module.exports = Supplier;
