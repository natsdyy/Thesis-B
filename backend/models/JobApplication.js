const { db } = require("../config/database");

class JobApplication {
  static async create(applicationData) {
    try {
      const [application] = await db("job_applications")
        .insert({
          full_name: applicationData.fullName,
          email: applicationData.email,
          phone: applicationData.phone,
          date_of_birth: applicationData.dateOfBirth,
          address: applicationData.address,
          position_title: applicationData.positionTitle,
          department: applicationData.department,
          experience_years: applicationData.experienceYears,
          expected_salary: applicationData.expectedSalary,
          skills: applicationData.skills,
          motivation: applicationData.motivation,
          availability: applicationData.availability,
          additional_notes: applicationData.additionalNotes,
          resume_path: applicationData.resumePath,
          additional_documents_path: applicationData.additionalDocumentsPath,
          position_id: applicationData.positionId,
          application_date: applicationData.applicationDate,
          status: applicationData.status || 'new',
          created_at: new Date(),
          updated_at: new Date()
        })
        .returning("*");

      return {
        success: true,
        data: application,
        message: "Job application submitted successfully"
      };
    } catch (error) {
      console.error("Error creating job application:", error);
      return {
        success: false,
        message: "Failed to create job application",
        error: error.message
      };
    }
  }

  static async getAll(filters = {}) {
    try {
      let query = db("job_applications")
        .select("*")
        .orderBy("created_at", "desc");

      // Apply filters
      if (filters.status) {
        query = query.where("status", filters.status);
      }
      if (filters.department) {
        query = query.where("department", filters.department);
      }
      if (filters.positionId) {
        query = query.where("position_id", filters.positionId);
      }

      const applications = await query;

      return {
        success: true,
        data: applications,
        message: "Job applications retrieved successfully"
      };
    } catch (error) {
      console.error("Error retrieving job applications:", error);
      return {
        success: false,
        message: "Failed to retrieve job applications",
        error: error.message
      };
    }
  }

  static async getById(id) {
    try {
      const application = await db("job_applications")
        .select("*")
        .where("id", id)
        .first();

      if (!application) {
        return {
          success: false,
          message: "Job application not found"
        };
      }

      return {
        success: true,
        data: application,
        message: "Job application retrieved successfully"
      };
    } catch (error) {
      console.error("Error retrieving job application:", error);
      return {
        success: false,
        message: "Failed to retrieve job application",
        error: error.message
      };
    }
  }

  static async updateStatus(id, status) {
    try {
      const [application] = await db("job_applications")
        .where("id", id)
        .update({
          status: status,
          updated_at: new Date()
        })
        .returning("*");

      if (!application) {
        return {
          success: false,
          message: "Job application not found"
        };
      }

      return {
        success: true,
        data: application,
        message: "Job application status updated successfully"
      };
    } catch (error) {
      console.error("Error updating job application status:", error);
      return {
        success: false,
        message: "Failed to update job application status",
        error: error.message
      };
    }
  }

  static async delete(id) {
    try {
      const deleted = await db("job_applications")
        .where("id", id)
        .del();

      if (!deleted) {
        return {
          success: false,
          message: "Job application not found"
        };
      }

      return {
        success: true,
        message: "Job application deleted successfully"
      };
    } catch (error) {
      console.error("Error deleting job application:", error);
      return {
        success: false,
        message: "Failed to delete job application",
        error: error.message
      };
    }
  }

  static async getStats() {
    try {
      const stats = await db("job_applications")
        .select("status")
        .count("* as count")
        .groupBy("status");

      const result = {
        total: 0,
        new: 0,
        reviewing: 0,
        shortlisted: 0,
        rejected: 0,
        hired: 0
      };

      stats.forEach(stat => {
        result.total += parseInt(stat.count);
        result[stat.status] = parseInt(stat.count);
      });

      return {
        success: true,
        data: result,
        message: "Job application statistics retrieved successfully"
      };
    } catch (error) {
      console.error("Error retrieving job application stats:", error);
      return {
        success: false,
        message: "Failed to retrieve job application statistics",
        error: error.message
      };
    }
  }
}

module.exports = JobApplication;
