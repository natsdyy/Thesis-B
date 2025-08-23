const { db } = require("../config/database");

class SupplierRating {
  // Create a new rating
  static async create(ratingData) {
    try {
      const [rating] = await db("supplier_ratings")
        .insert({
          supplier_id: ratingData.supplier_id,
          purchase_order_id: ratingData.purchase_order_id,
          rating: ratingData.rating,
          comment: ratingData.comment || null,
          rated_by: ratingData.rated_by,
        })
        .returning("*");

      return rating;
    } catch (error) {
      throw error;
    }
  }

  // Get rating by purchase order ID
  static async getByPurchaseOrderId(purchaseOrderId) {
    try {
      return await db("supplier_ratings")
        .where("purchase_order_id", purchaseOrderId)
        .first();
    } catch (error) {
      throw error;
    }
  }

  // Get all ratings for a supplier
  static async getBySupplierId(supplierId) {
    try {
      return await db("supplier_ratings")
        .where("supplier_id", supplierId)
        .orderBy("created_at", "desc");
    } catch (error) {
      throw error;
    }
  }

  // Update a rating
  static async update(purchaseOrderId, ratingData) {
    try {
      const [updatedRating] = await db("supplier_ratings")
        .where("purchase_order_id", purchaseOrderId)
        .update({
          rating: ratingData.rating,
          comment: ratingData.comment || null,
          rated_by: ratingData.rated_by,
          updated_at: new Date(),
        })
        .returning("*");

      return updatedRating;
    } catch (error) {
      throw error;
    }
  }

  // Check if purchase order has been rated
  static async hasRating(purchaseOrderId) {
    try {
      const rating = await this.getByPurchaseOrderId(purchaseOrderId);
      return !!rating;
    } catch (error) {
      throw error;
    }
  }

  // Get average rating for a supplier
  static async getAverageRating(supplierId) {
    try {
      const result = await db("supplier_ratings")
        .where("supplier_id", supplierId)
        .avg("rating as average_rating")
        .count("id as total_ratings")
        .first();

      return {
        average_rating: result.average_rating
          ? parseFloat(result.average_rating).toFixed(1)
          : 0,
        total_ratings: parseInt(result.total_ratings) || 0,
      };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = SupplierRating;
