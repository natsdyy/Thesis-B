const { db } = require("../config/database");

class Feedback {
  // Create new feedback
  static async create(feedbackData) {
    try {
      const [feedback] = await db("feedback")
        .insert({
          name: feedbackData.name,
          email: feedbackData.email,
          message: feedbackData.message,
          phone: feedbackData.phone || null,
          rating: feedbackData.rating || null,
          source: feedbackData.source || "Website Contact Form",
          image_filename: feedbackData.imageFilename || null,
          image_path: feedbackData.imagePath || null,
          customer_id: feedbackData.customer_id || null,
        })
        .returning("*");

      return feedback;
    } catch (error) {
      console.error("Error creating feedback:", error);
      throw new Error("Failed to create feedback");
    }
  }

  // Get all feedback with pagination
  static async getAll(filters = {}) {
    try {
      const {
        limit = 20,
        offset = 0,
        search = null,
        rating = null,
        source = null,
        date_from = null,
        date_to = null,
      } = filters;

      let query = db("feedback");

      // Apply filters
      if (search) {
        query = query.where(function () {
          this.where("name", "ilike", `%${search}%`)
            .orWhere("email", "ilike", `%${search}%`)
            .orWhere("message", "ilike", `%${search}%`);
        });
      }

      if (rating) {
        query = query.where("rating", rating);
      }

      if (source) {
        query = query.where("source", source);
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
      const feedback = await query
        .orderBy("created_at", "desc")
        .limit(limit)
        .offset(offset);

      return { feedback, total };
    } catch (error) {
      console.error("Error fetching feedback:", error);
      throw new Error("Failed to fetch feedback");
    }
  }

  // Get feedback by ID
  static async getById(id) {
    try {
      const feedback = await db("feedback").where("id", id).first();
      return feedback;
    } catch (error) {
      console.error("Error fetching feedback by ID:", error);
      throw new Error("Failed to fetch feedback");
    }
  }

  // Update feedback
  static async update(id, updateData) {
    try {
      const [updatedFeedback] = await db("feedback")
        .where("id", id)
        .update({
          ...updateData,
          updated_at: new Date(),
        })
        .returning("*");

      return updatedFeedback;
    } catch (error) {
      console.error("Error updating feedback:", error);
      throw new Error("Failed to update feedback");
    }
  }

  // Delete feedback
  static async delete(id) {
    try {
      const deletedCount = await db("feedback").where("id", id).del();
      return deletedCount > 0;
    } catch (error) {
      console.error("Error deleting feedback:", error);
      throw new Error("Failed to delete feedback");
    }
  }

  // Get feedback statistics
  static async getStats() {
    try {
      const stats = await db("feedback")
        .select(
          db.raw("COUNT(*) as total_feedback"),
          db.raw("AVG(rating) as average_rating"),
          db.raw(
            "COUNT(CASE WHEN rating >= 4 THEN 1 END) as positive_feedback"
          ),
          db.raw(
            "COUNT(CASE WHEN rating <= 2 THEN 1 END) as negative_feedback"
          ),
          db.raw(
            "COUNT(CASE WHEN image_filename IS NOT NULL THEN 1 END) as feedback_with_images"
          )
        )
        .first();

      return {
        total_feedback: parseInt(stats.total_feedback) || 0,
        average_rating: parseFloat(stats.average_rating) || 0,
        positive_feedback: parseInt(stats.positive_feedback) || 0,
        negative_feedback: parseInt(stats.negative_feedback) || 0,
        feedback_with_images: parseInt(stats.feedback_with_images) || 0,
      };
    } catch (error) {
      console.error("Error fetching feedback stats:", error);
      throw new Error("Failed to fetch feedback statistics");
    }
  }

  // Update status of feedback
  static async updateStatus(id, status) {
    try {
      const validStatuses = ["new", "read", "replied", "archived"];
      if (!validStatuses.includes(status)) {
        throw new Error(
          `Invalid status: ${status}. Must be one of: ${validStatuses.join(", ")}`
        );
      }

      const [updatedFeedback] = await db("feedback")
        .where("id", id)
        .update({
          status: status,
          updated_at: new Date(),
        })
        .returning("*");

      return updatedFeedback;
    } catch (error) {
      console.error("Error updating feedback status:", error);
      throw new Error("Failed to update feedback status");
    }
  }

  // Add reply to feedback
  static async addReply(id, replyData) {
    try {
      const { reply_message, reply_internal_note } = replyData;

      if (!reply_message || !reply_message.trim()) {
        throw new Error("Reply message is required");
      }

      const [updatedFeedback] = await db("feedback")
        .where("id", id)
        .update({
          status: "replied",
          reply_message: reply_message.trim(),
          reply_internal_note: reply_internal_note
            ? reply_internal_note.trim()
            : null,
          reply_sent_at: new Date(),
          updated_at: new Date(),
        })
        .returning("*");

      return updatedFeedback;
    } catch (error) {
      console.error("Error adding reply to feedback:", error);
      throw new Error("Failed to add reply to feedback");
    }
  }

  // Get replies statistics
  static async getReplyStats(filters = {}) {
    try {
      const { source = null, date_from = null, date_to = null } = filters;

      let query = db("feedback");

      if (source) {
        query = query.where("source", source);
      }

      if (date_from) {
        query = query.where("created_at", ">=", date_from);
      }

      if (date_to) {
        query = query.where("created_at", "<=", date_to);
      }

      const stats = await query
        .select(
          db.raw("COUNT(*) as total_feedback"),
          db.raw("COUNT(CASE WHEN status = 'new' THEN 1 END) as new_feedback"),
          db.raw(
            "COUNT(CASE WHEN status = 'read' THEN 1 END) as read_feedback"
          ),
          db.raw(
            "COUNT(CASE WHEN status = 'replied' THEN 1 END) as replied_feedback"
          ),
          db.raw(
            "COUNT(CASE WHEN status = 'archived' THEN 1 END) as archived_feedback"
          ),
          db.raw(
            "COUNT(CASE WHEN reply_message IS NOT NULL THEN 1 END) as feedback_with_replies"
          ),
          db.raw(
            "AVG(CASE WHEN reply_sent_at IS NOT NULL THEN EXTRACT(EPOCH FROM (reply_sent_at - created_at))/3600 ELSE NULL END) as avg_reply_time_hours"
          )
        )
        .first();

      return {
        total_feedback: parseInt(stats.total_feedback) || 0,
        new_feedback: parseInt(stats.new_feedback) || 0,
        read_feedback: parseInt(stats.read_feedback) || 0,
        replied_feedback: parseInt(stats.replied_feedback) || 0,
        archived_feedback: parseInt(stats.archived_feedback) || 0,
        feedback_with_replies: parseInt(stats.feedback_with_replies) || 0,
        avg_reply_time_hours: parseFloat(stats.avg_reply_time_hours) || 0,
      };
    } catch (error) {
      console.error("Error fetching feedback reply stats:", error);
      throw new Error("Failed to fetch feedback reply statistics");
    }
  }

  // Get feedback by status
  static async getByStatus(status, filters = {}) {
    try {
      const validStatuses = ["new", "read", "replied", "archived"];
      if (!validStatuses.includes(status)) {
        throw new Error(
          `Invalid status: ${status}. Must be one of: ${validStatuses.join(", ")}`
        );
      }

      const {
        limit = 20,
        offset = 0,
        source = null,
        date_from = null,
        date_to = null,
      } = filters;

      let query = db("feedback").where("status", status);

      if (source) {
        query = query.where("source", source);
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
      const feedback = await query
        .orderBy("created_at", "desc")
        .limit(limit)
        .offset(offset);

      return { feedback, total };
    } catch (error) {
      console.error("Error fetching feedback by status:", error);
      throw new Error("Failed to fetch feedback by status");
    }
  }
}

module.exports = Feedback;
