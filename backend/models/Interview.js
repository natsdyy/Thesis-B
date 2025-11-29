const { db } = require("../config/database");

class Interview {
  static async create(interviewData) {
    try {
      // Ensure duration satisfies NOT NULL constraint when client omits it
      const safeDuration = Number.isFinite(parseInt(interviewData.duration))
        ? parseInt(interviewData.duration)
        : 30; // default 30 minutes

      const [interview] = await db("job_interviews")
        .insert({
          application_id: interviewData.applicationId,
          interview_date: interviewData.interviewDate,
          interview_time: interviewData.interviewTime,
          interview_type: interviewData.interviewType,
          duration: safeDuration,
          location: interviewData.location,
          meeting_link: interviewData.meetingLink,
          notes: interviewData.notes,
          status: interviewData.status || 'scheduled',
          created_at: new Date(),
          updated_at: new Date()
        })
        .returning("*");

      return {
        success: true,
        data: interview,
        message: "Interview scheduled successfully"
      };
    } catch (error) {
      console.error("Error creating interview:", error);
      return {
        success: false,
        message: "Failed to create interview",
        error: error.message
      };
    }
  }

  static async getAll(filters = {}) {
    try {
      let query = db("job_interviews")
        .select(
          "job_interviews.*",
          "job_applications.full_name as applicant_name",
          "job_applications.position_title",
          "job_applications.department"
        )
        .leftJoin("job_applications", "job_interviews.application_id", "job_applications.id")
        .orderBy("job_interviews.interview_date", "asc")
        .orderBy("job_interviews.interview_time", "asc");

      // Apply filters
      if (filters.status) {
        query = query.where("job_interviews.status", filters.status);
      }
      if (filters.interviewDate) {
        query = query.where("job_interviews.interview_date", filters.interviewDate);
      }
      if (filters.interviewerEmail) {
        query = query.where("job_interviews.interviewer_email", filters.interviewerEmail);
      }

      const interviews = await query;

      return {
        success: true,
        data: interviews,
        message: "Interviews retrieved successfully"
      };
    } catch (error) {
      console.error("Error retrieving interviews:", error);
      return {
        success: false,
        message: "Failed to retrieve interviews",
        error: error.message
      };
    }
  }

  static async getById(id) {
    try {
      const interview = await db("job_interviews")
        .select(
          "job_interviews.*",
          "job_applications.full_name as applicant_name",
          "job_applications.position_title",
          "job_applications.department",
          "job_applications.email as applicant_email",
          "job_applications.phone as applicant_phone"
        )
        .leftJoin("job_applications", "job_interviews.application_id", "job_applications.id")
        .where("job_interviews.id", id)
        .first();

      if (!interview) {
        return {
          success: false,
          message: "Interview not found"
        };
      }

      return {
        success: true,
        data: interview,
        message: "Interview retrieved successfully"
      };
    } catch (error) {
      console.error("Error retrieving interview:", error);
      return {
        success: false,
        message: "Failed to retrieve interview",
        error: error.message
      };
    }
  }

  static async updateStatus(id, status, result = null) {
    try {
      const updateData = {
        status: status,
        updated_at: new Date()
      };

      // Add result field if provided
      if (result) {
        updateData.result = result;
      }

      const [interview] = await db("job_interviews")
        .where("id", id)
        .update(updateData)
        .returning("*");

      if (!interview) {
        return {
          success: false,
          message: "Interview not found"
        };
      }

      return {
        success: true,
        data: interview,
        message: "Interview status updated successfully"
      };
    } catch (error) {
      console.error("Error updating interview status:", error);
      return {
        success: false,
        message: "Failed to update interview status",
        error: error.message
      };
    }
  }

  static async update(id, updateData) {
    try {
      const [interview] = await db("job_interviews")
        .where("id", id)
        .update({
          ...updateData,
          updated_at: new Date()
        })
        .returning("*");

      if (!interview) {
        return {
          success: false,
          message: "Interview not found"
        };
      }

      return {
        success: true,
        data: interview,
        message: "Interview updated successfully"
      };
    } catch (error) {
      console.error("Error updating interview:", error);
      return {
        success: false,
        message: "Failed to update interview",
        error: error.message
      };
    }
  }

  static async delete(id) {
    try {
      const deleted = await db("job_interviews")
        .where("id", id)
        .del();

      if (!deleted) {
        return {
          success: false,
          message: "Interview not found"
        };
      }

      return {
        success: true,
        message: "Interview deleted successfully"
      };
    } catch (error) {
      console.error("Error deleting interview:", error);
      return {
        success: false,
        message: "Failed to delete interview",
        error: error.message
      };
    }
  }

  static async getUpcoming() {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const interviews = await db("job_interviews")
        .select(
          "job_interviews.*",
          "job_applications.full_name as applicant_name",
          "job_applications.position_title",
          "job_applications.department"
        )
        .leftJoin("job_applications", "job_interviews.application_id", "job_applications.id")
        .where("job_interviews.interview_date", ">=", today)
        .where("job_interviews.status", "scheduled")
        .orderBy("job_interviews.interview_date", "asc")
        .orderBy("job_interviews.interview_time", "asc");

      return {
        success: true,
        data: interviews,
        message: "Upcoming interviews retrieved successfully"
      };
    } catch (error) {
      console.error("Error retrieving upcoming interviews:", error);
      return {
        success: false,
        message: "Failed to retrieve upcoming interviews",
        error: error.message
      };
    }
  }
}

module.exports = Interview;
