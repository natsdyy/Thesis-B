const { db } = require("../config/database");

class Customer {
  // Create new customer
  static async create(customerData) {
    try {
      const [customer] = await db("customers")
        .insert({
          name: customerData.name,
          email: customerData.email,
          phone: customerData.phone || null,
          address: customerData.address || null,
          city: customerData.city || null,
          province: customerData.province || null,
          postal_code: customerData.postal_code || null,
          birth_date: customerData.birth_date || null,
          gender: customerData.gender || null,
          notes: customerData.notes || null,
        })
        .returning("*");

      return customer;
    } catch (error) {
      console.error("Error creating customer:", error);
      throw new Error("Failed to create customer");
    }
  }

  // Find or create customer by email
  static async findOrCreate(customerData) {
    try {
      // First, try to find existing customer by email
      let customer = await db("customers")
        .where("email", customerData.email)
        .first();

      if (customer) {
        // Update customer info if provided
        if (customerData.name && customerData.name !== customer.name) {
          customer = await this.update(customer.id, { name: customerData.name });
        }
        if (customerData.phone && customerData.phone !== customer.phone) {
          customer = await this.update(customer.id, { phone: customerData.phone });
        }
        return customer;
      }

      // Create new customer if not found
      return await this.create(customerData);
    } catch (error) {
      console.error("Error finding or creating customer:", error);
      throw new Error("Failed to find or create customer");
    }
  }

  // Get all customers with pagination and filters
  static async getAll(filters = {}) {
    try {
      const {
        limit = 20,
        offset = 0,
        search = null,
        city = null,
        province = null,
        gender = null,
        date_from = null,
        date_to = null,
        sort_by = "created_at",
        sort_order = "desc",
      } = filters;

      let query = db("customers");

      // Apply filters
      if (search) {
        query = query.where(function () {
          this.where("name", "ilike", `%${search}%`)
            .orWhere("email", "ilike", `%${search}%`)
            .orWhere("phone", "ilike", `%${search}%`);
        });
      }

      if (city) {
        query = query.where("city", "ilike", `%${city}%`);
      }

      if (province) {
        query = query.where("province", "ilike", `%${province}%`);
      }

      if (gender) {
        query = query.where("gender", gender);
      }

      if (date_from) {
        query = query.where("created_at", ">=", date_from);
      }

      if (date_to) {
        query = query.where("created_at", "<=", date_to);
      }

      // Get total count
      const countQuery = query.clone().clearSelect().count({ total: "id" });
      const [countRow] = await countQuery;
      const total = parseInt(countRow?.total || 0, 10);

      // Get paginated results
      const customers = await query
        .orderBy(sort_by, sort_order)
        .limit(limit)
        .offset(offset);

      return { customers, total };
    } catch (error) {
      console.error("Error fetching customers:", error);
      throw new Error("Failed to fetch customers");
    }
  }

  // Get customer by ID
  static async getById(id) {
    try {
      const customer = await db("customers").where("id", id).first();
      return customer;
    } catch (error) {
      console.error("Error fetching customer by ID:", error);
      throw new Error("Failed to fetch customer");
    }
  }

  // Get customer by email
  static async getByEmail(email) {
    try {
      const customer = await db("customers").where("email", email).first();
      return customer;
    } catch (error) {
      console.error("Error fetching customer by email:", error);
      throw new Error("Failed to fetch customer");
    }
  }

  // Update customer
  static async update(id, updateData) {
    try {
      const [updatedCustomer] = await db("customers")
        .where("id", id)
        .update({
          ...updateData,
          updated_at: new Date(),
        })
        .returning("*");

      return updatedCustomer;
    } catch (error) {
      console.error("Error updating customer:", error);
      throw new Error("Failed to update customer");
    }
  }

  // Delete customer
  static async delete(id) {
    try {
      const deletedCount = await db("customers").where("id", id).del();
      return deletedCount > 0;
    } catch (error) {
      console.error("Error deleting customer:", error);
      throw new Error("Failed to delete customer");
    }
  }

  // Get customer statistics
  static async getStats() {
    try {
      const stats = await db("customers")
        .select(
          db.raw("COUNT(*) as total_customers"),
          db.raw("COUNT(CASE WHEN last_visit >= NOW() - INTERVAL '30 days' THEN 1 END) as active_customers"),
          db.raw("AVG(average_rating) as overall_average_rating"),
          db.raw("SUM(total_spent) as total_revenue"),
          db.raw("AVG(total_spent) as average_customer_value"),
          db.raw("COUNT(CASE WHEN gender = 'male' THEN 1 END) as male_customers"),
          db.raw("COUNT(CASE WHEN gender = 'female' THEN 1 END) as female_customers")
        )
        .first();

      return {
        total_customers: parseInt(stats.total_customers) || 0,
        active_customers: parseInt(stats.active_customers) || 0,
        overall_average_rating: parseFloat(stats.overall_average_rating) || 0,
        total_revenue: parseFloat(stats.total_revenue) || 0,
        average_customer_value: parseFloat(stats.average_customer_value) || 0,
        male_customers: parseInt(stats.male_customers) || 0,
        female_customers: parseInt(stats.female_customers) || 0,
      };
    } catch (error) {
      console.error("Error fetching customer stats:", error);
      throw new Error("Failed to fetch customer statistics");
    }
  }

  // Get customer with feedback and ratings
  static async getWithFeedbackAndRatings(id) {
    try {
      const customer = await db("customers").where("id", id).first();
      if (!customer) {
        return null;
      }

      // Get customer feedback
      const feedback = await db("feedback")
        .where("customer_id", id)
        .orderBy("created_at", "desc");

      // Get customer order ratings
      const ratings = await db("order_ratings")
        .where("customer_id", id)
        .orderBy("created_at", "desc");

      // Parse item_ratings JSON for each rating
      const ratingsWithParsedItems = ratings.map(rating => ({
        ...rating,
        item_ratings: rating.item_ratings ? JSON.parse(rating.item_ratings) : null,
      }));

      return {
        ...customer,
        feedback,
        ratings: ratingsWithParsedItems,
      };
    } catch (error) {
      console.error("Error fetching customer with feedback and ratings:", error);
      throw new Error("Failed to fetch customer details");
    }
  }

  // Update customer statistics
  static async updateStats(id) {
    try {
      // Get customer's total orders and spent amount from order_ratings
      const orderStats = await db("order_ratings")
        .where("customer_id", id)
        .select(
          db.raw("COUNT(*) as total_orders"),
          db.raw("SUM(order_total) as total_spent"),
          db.raw("AVG(overall_rating) as average_rating"),
          db.raw("MAX(created_at) as last_visit")
        )
        .first();

      // Update customer record
      await db("customers")
        .where("id", id)
        .update({
          total_orders: parseInt(orderStats.total_orders) || 0,
          total_spent: parseFloat(orderStats.total_spent) || 0,
          average_rating: parseFloat(orderStats.average_rating) || null,
          last_visit: orderStats.last_visit,
          updated_at: new Date(),
        });

      return true;
    } catch (error) {
      console.error("Error updating customer stats:", error);
      throw new Error("Failed to update customer statistics");
    }
  }

  // Get top customers by spending
  static async getTopCustomers(limit = 10) {
    try {
      const customers = await db("customers")
        .orderBy("total_spent", "desc")
        .limit(limit);

      return customers;
    } catch (error) {
      console.error("Error fetching top customers:", error);
      throw new Error("Failed to fetch top customers");
    }
  }

  // Get customers by location
  static async getByLocation(city = null, province = null) {
    try {
      let query = db("customers");

      if (city) {
        query = query.where("city", "ilike", `%${city}%`);
      }

      if (province) {
        query = query.where("province", "ilike", `%${province}%`);
      }

      const customers = await query.orderBy("name", "asc");

      return customers;
    } catch (error) {
      console.error("Error fetching customers by location:", error);
      throw new Error("Failed to fetch customers by location");
    }
  }
}

module.exports = Customer;
