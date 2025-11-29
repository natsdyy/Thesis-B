const { db } = require("../config/database");

class FAQ {
  // Create new FAQ
  static async create(faqData) {
    try {
      const insertData = {
        question: faqData.question.trim(),
        answer: faqData.answer.trim(),
        category: faqData.category && faqData.category.trim() ? faqData.category.trim() : null,
        display_order: faqData.display_order || 0,
        is_active: faqData.is_active !== undefined ? faqData.is_active : true,
        created_by: faqData.created_by || null,
      };

      const [faq] = await db("faqs")
        .insert(insertData)
        .returning("*");

      return faq;
    } catch (error) {
      console.error("Error creating FAQ:", error);
      console.error("Error details:", {
        message: error.message,
        code: error.code,
        constraint: error.constraint,
        detail: error.detail,
        stack: error.stack,
      });
      
      // Re-throw with more details in development
      if (process.env.NODE_ENV === "development") {
        throw new Error(`Failed to create FAQ: ${error.message}`);
      }
      throw new Error("Failed to create FAQ");
    }
  }

  // Get all FAQs with filters and pagination
  static async getAll(filters = {}) {
    try {
      const {
        limit = null,
        offset = 0,
        search = null,
        category = null,
        is_active = null,
        include_deleted = false,
      } = filters;

      let query = db("faqs");

      // Apply soft delete filter
      if (!include_deleted) {
        query = query.whereNull("deleted_at");
      }

      // Apply search filter
      if (search) {
        query = query.where(function () {
          this.where("question", "ilike", `%${search}%`).orWhere(
            "answer",
            "ilike",
            `%${search}%`
          );
        });
      }

      // Apply category filter
      if (category) {
        query = query.where("category", category);
      }

      // Apply active status filter
      if (is_active !== null) {
        query = query.where("is_active", is_active);
      }

      // Get total count
      const countQuery = query.clone().clearSelect().count({ total: "id" });
      const [countRow] = await countQuery;
      const total = parseInt(countRow?.total || 0, 10);

      // Apply ordering and pagination
      query = query.orderBy("display_order", "asc").orderBy("created_at", "desc");

      if (limit) {
        query = query.limit(limit).offset(offset);
      }

      const faqs = await query;

      return { faqs, total };
    } catch (error) {
      console.error("Error fetching FAQs:", error);
      throw new Error("Failed to fetch FAQs");
    }
  }

  // Get active FAQs for public display
  static async getActive(category = null) {
    try {
      let query = db("faqs")
        .where("is_active", true)
        .whereNull("deleted_at")
        .orderBy("display_order", "asc")
        .orderBy("created_at", "desc");

      if (category) {
        query = query.where("category", category);
      }

      const faqs = await query;
      return faqs;
    } catch (error) {
      console.error("Error fetching active FAQs:", error);
      throw new Error("Failed to fetch active FAQs");
    }
  }

  // Get FAQ by ID
  static async getById(id) {
    try {
      const faq = await db("faqs")
        .where("id", id)
        .whereNull("deleted_at")
        .first();
      return faq;
    } catch (error) {
      console.error("Error fetching FAQ by ID:", error);
      throw new Error("Failed to fetch FAQ");
    }
  }

  // Update FAQ
  static async update(id, updateData) {
    try {
      const updateFields = {};
      
      if (updateData.question !== undefined) {
        updateFields.question = updateData.question.trim();
      }
      if (updateData.answer !== undefined) {
        updateFields.answer = updateData.answer.trim();
      }
      if (updateData.category !== undefined) {
        updateFields.category = updateData.category ? updateData.category.trim() : null;
      }
      if (updateData.display_order !== undefined) {
        updateFields.display_order = updateData.display_order;
      }
      if (updateData.is_active !== undefined) {
        updateFields.is_active = updateData.is_active;
      }

      updateFields.updated_at = new Date();

      const [updatedFAQ] = await db("faqs")
        .where("id", id)
        .whereNull("deleted_at")
        .update(updateFields)
        .returning("*");

      if (!updatedFAQ) {
        throw new Error("FAQ not found");
      }

      return updatedFAQ;
    } catch (error) {
      console.error("Error updating FAQ:", error);
      if (error.message === "FAQ not found") {
        throw error;
      }
      throw new Error("Failed to update FAQ");
    }
  }

  // Delete FAQ (soft delete)
  static async delete(id) {
    try {
      const [deletedFAQ] = await db("faqs")
        .where("id", id)
        .whereNull("deleted_at")
        .update({
          deleted_at: new Date(),
          updated_at: new Date(),
        })
        .returning("*");

      if (!deletedFAQ) {
        throw new Error("FAQ not found");
      }

      return deletedFAQ;
    } catch (error) {
      console.error("Error deleting FAQ:", error);
      if (error.message === "FAQ not found") {
        throw error;
      }
      throw new Error("Failed to delete FAQ");
    }
  }

  // Hard delete FAQ (permanent)
  static async hardDelete(id) {
    try {
      const deletedCount = await db("faqs").where("id", id).del();
      return deletedCount > 0;
    } catch (error) {
      console.error("Error hard deleting FAQ:", error);
      throw new Error("Failed to delete FAQ");
    }
  }

  // Restore soft-deleted FAQ
  static async restore(id) {
    try {
      const [restoredFAQ] = await db("faqs")
        .where("id", id)
        .whereNotNull("deleted_at")
        .update({
          deleted_at: null,
          updated_at: new Date(),
        })
        .returning("*");

      if (!restoredFAQ) {
        throw new Error("FAQ not found or not deleted");
      }

      return restoredFAQ;
    } catch (error) {
      console.error("Error restoring FAQ:", error);
      if (error.message === "FAQ not found or not deleted") {
        throw error;
      }
      throw new Error("Failed to restore FAQ");
    }
  }

  // Get FAQs by category
  static async getByCategory(category) {
    try {
      const faqs = await db("faqs")
        .where("category", category)
        .where("is_active", true)
        .whereNull("deleted_at")
        .orderBy("display_order", "asc")
        .orderBy("created_at", "desc");

      return faqs;
    } catch (error) {
      console.error("Error fetching FAQs by category:", error);
      throw new Error("Failed to fetch FAQs by category");
    }
  }

  // Get all unique categories
  static async getCategories() {
    try {
      const categories = await db("faqs")
        .select("category")
        .whereNotNull("category")
        .where("is_active", true)
        .whereNull("deleted_at")
        .groupBy("category")
        .orderBy("category", "asc");

      return categories.map((cat) => cat.category);
    } catch (error) {
      console.error("Error fetching FAQ categories:", error);
      throw new Error("Failed to fetch FAQ categories");
    }
  }

  // Get FAQ statistics
  static async getStats() {
    try {
      const stats = await db("faqs")
        .whereNull("deleted_at")
        .select(
          db.raw("COUNT(*) as total_faqs"),
          db.raw("COUNT(CASE WHEN is_active = true THEN 1 END) as active_faqs"),
          db.raw("COUNT(CASE WHEN is_active = false THEN 1 END) as inactive_faqs"),
          db.raw("COUNT(DISTINCT category) as total_categories")
        )
        .first();

      return {
        total_faqs: parseInt(stats.total_faqs) || 0,
        active_faqs: parseInt(stats.active_faqs) || 0,
        inactive_faqs: parseInt(stats.inactive_faqs) || 0,
        total_categories: parseInt(stats.total_categories) || 0,
      };
    } catch (error) {
      console.error("Error fetching FAQ stats:", error);
      throw new Error("Failed to fetch FAQ statistics");
    }
  }
}

module.exports = FAQ;

