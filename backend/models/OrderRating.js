const { db } = require("../config/database");

class OrderRating {
  // Create new order rating
  static async create(ratingData) {
    try {
      const [rating] = await db("order_ratings")
        .insert({
          order_number: ratingData.orderNumber,
          order_total: ratingData.orderTotal || null,
          branch_name: ratingData.branch || null,
          cashier_name: ratingData.cashier || null,
          order_timestamp: ratingData.orderTimestamp || null,
          customer_name: ratingData.customerName,
          customer_email: ratingData.customerEmail,
          overall_rating: ratingData.overallRating || null,
          item_ratings: ratingData.itemRatings ? JSON.stringify(ratingData.itemRatings) : null,
          comments: ratingData.comments || null,
          source: ratingData.source || "QR Code Rating",
          image_filename: ratingData.imageFilename || null,
          image_path: ratingData.imagePath || null,
          customer_id: ratingData.customer_id || null,
        })
        .returning("*");

      return rating;
    } catch (error) {
      console.error("Error creating order rating:", error);
      throw new Error("Failed to create order rating");
    }
  }

  // Get all order ratings with pagination
  static async getAll(filters = {}) {
    try {
      const {
        limit = 20,
        offset = 0,
        search = null,
        rating = null,
        order_number = null,
        branch_name = null,
        date_from = null,
        date_to = null,
      } = filters;

      let query = db("order_ratings");

      // Apply filters
      if (search) {
        query = query.where(function () {
          this.where("customer_name", "ilike", `%${search}%`)
            .orWhere("customer_email", "ilike", `%${search}%`)
            .orWhere("order_number", "ilike", `%${search}%`)
            .orWhere("comments", "ilike", `%${search}%`);
        });
      }

      if (rating) {
        query = query.where("overall_rating", rating);
      }

      if (order_number) {
        query = query.where("order_number", order_number);
      }

      if (branch_name) {
        query = query.where("branch_name", "ilike", `%${branch_name}%`);
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
      const ratings = await query
        .orderBy("created_at", "desc")
        .limit(limit)
        .offset(offset);

      // Parse item_ratings JSON for each rating
      const ratingsWithParsedItems = ratings.map(rating => ({
        ...rating,
        item_ratings: rating.item_ratings ? JSON.parse(rating.item_ratings) : null,
      }));

      return { ratings: ratingsWithParsedItems, total };
    } catch (error) {
      console.error("Error fetching order ratings:", error);
      throw new Error("Failed to fetch order ratings");
    }
  }

  // Get order rating by ID
  static async getById(id) {
    try {
      const rating = await db("order_ratings").where("id", id).first();
      if (rating && rating.item_ratings) {
        rating.item_ratings = JSON.parse(rating.item_ratings);
      }
      return rating;
    } catch (error) {
      console.error("Error fetching order rating by ID:", error);
      throw new Error("Failed to fetch order rating");
    }
  }

  // Get ratings by order number
  static async getByOrderNumber(orderNumber) {
    try {
      const ratings = await db("order_ratings")
        .where("order_number", orderNumber)
        .orderBy("created_at", "desc");

      // Parse item_ratings JSON for each rating
      return ratings.map(rating => ({
        ...rating,
        item_ratings: rating.item_ratings ? JSON.parse(rating.item_ratings) : null,
      }));
    } catch (error) {
      console.error("Error fetching ratings by order number:", error);
      throw new Error("Failed to fetch ratings for order");
    }
  }

  // Update order rating
  static async update(id, updateData) {
    try {
      const [updatedRating] = await db("order_ratings")
        .where("id", id)
        .update({
          ...updateData,
          item_ratings: updateData.item_ratings ? JSON.stringify(updateData.item_ratings) : updateData.item_ratings,
          updated_at: new Date(),
        })
        .returning("*");

      if (updatedRating && updatedRating.item_ratings) {
        updatedRating.item_ratings = JSON.parse(updatedRating.item_ratings);
      }

      return updatedRating;
    } catch (error) {
      console.error("Error updating order rating:", error);
      throw new Error("Failed to update order rating");
    }
  }

  // Delete order rating
  static async delete(id) {
    try {
      const deletedCount = await db("order_ratings").where("id", id).del();
      return deletedCount > 0;
    } catch (error) {
      console.error("Error deleting order rating:", error);
      throw new Error("Failed to delete order rating");
    }
  }

  // Get rating statistics
  static async getStats(filters = {}) {
    try {
      const { branch_name = null, date_from = null, date_to = null } = filters;

      let query = db("order_ratings");

      if (branch_name) {
        query = query.where("branch_name", "ilike", `%${branch_name}%`);
      }

      if (date_from) {
        query = query.where("created_at", ">=", date_from);
      }

      if (date_to) {
        query = query.where("created_at", "<=", date_to);
      }

      const stats = await query
        .select(
          db.raw("COUNT(*) as total_ratings"),
          db.raw("AVG(overall_rating) as average_rating"),
          db.raw("COUNT(CASE WHEN overall_rating >= 4 THEN 1 END) as positive_ratings"),
          db.raw("COUNT(CASE WHEN overall_rating <= 2 THEN 1 END) as negative_ratings"),
          db.raw("COUNT(CASE WHEN image_filename IS NOT NULL THEN 1 END) as ratings_with_images"),
          db.raw("COUNT(DISTINCT order_number) as unique_orders_rated")
        )
        .first();

      return {
        total_ratings: parseInt(stats.total_ratings) || 0,
        average_rating: parseFloat(stats.average_rating) || 0,
        positive_ratings: parseInt(stats.positive_ratings) || 0,
        negative_ratings: parseInt(stats.negative_ratings) || 0,
        ratings_with_images: parseInt(stats.ratings_with_images) || 0,
        unique_orders_rated: parseInt(stats.unique_orders_rated) || 0,
      };
    } catch (error) {
      console.error("Error fetching rating stats:", error);
      throw new Error("Failed to fetch rating statistics");
    }
  }

  // Get top rated items
  static async getTopRatedItems(limit = 10) {
    try {
      const ratings = await db("order_ratings")
        .whereNotNull("item_ratings")
        .select("item_ratings");

      // Parse and aggregate item ratings
      const itemStats = {};
      
      ratings.forEach(rating => {
        if (rating.item_ratings) {
          const items = JSON.parse(rating.item_ratings);
          items.forEach(item => {
            if (!itemStats[item.itemName]) {
              itemStats[item.itemName] = {
                name: item.itemName,
                total_ratings: 0,
                total_score: 0,
                average_rating: 0,
              };
            }
            if (item.rating) {
              itemStats[item.itemName].total_ratings += 1;
              itemStats[item.itemName].total_score += item.rating;
            }
          });
        }
      });

      // Calculate averages and sort
      const topItems = Object.values(itemStats)
        .map(item => ({
          ...item,
          average_rating: item.total_ratings > 0 ? item.total_score / item.total_ratings : 0,
        }))
        .filter(item => item.total_ratings > 0)
        .sort((a, b) => b.average_rating - a.average_rating)
        .slice(0, limit);

      return topItems;
    } catch (error) {
      console.error("Error fetching top rated items:", error);
      throw new Error("Failed to fetch top rated items");
    }
  }
}

module.exports = OrderRating;
