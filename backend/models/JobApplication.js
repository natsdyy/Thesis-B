const { db } = require("../config/database");

class JobApplication {
  static async create(applicationData) {
    try {
      // If branchId is provided, we can store it via position lookup or add it to the table
      // For now, we'll derive branch info from position_id when fetching
      // But if branchId is provided separately, try to get it from branch_positions first
      let actualBranchId = applicationData.branchId;
      
      // If we have positionId but no branchId, try to get branch_id from branch_positions
      if (applicationData.positionId && !actualBranchId) {
        const branchPosition = await db("branch_positions")
          .select("branch_id")
          .where("id", applicationData.positionId)
          .first();
        if (branchPosition) {
          actualBranchId = branchPosition.branch_id;
        }
      }

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

      // Add branch_id to the returned data if we have it
      if (actualBranchId) {
        application.branch_id = actualBranchId;
      }

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
      // Join with branch_positions to get branch_id and branch_name
      // Use leftJoin to include applications that may not have branch positions (department roles)
      let query = db("job_applications as ja")
        .leftJoin("branch_positions as bp", "ja.position_id", "bp.id")
        .leftJoin("branches as b", "bp.branch_id", "b.id")
        .select(
          "ja.*",
          "bp.branch_id",
          "b.name as branch_name"
        )
        .orderBy("ja.created_at", "desc");

      // Apply filters
      if (filters.status) {
        query = query.where("ja.status", filters.status);
      }
      if (filters.department) {
        query = query.where("ja.department", filters.department);
      }
      if (filters.positionId) {
        query = query.where("ja.position_id", filters.positionId);
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
      const application = await db("job_applications as ja")
        .leftJoin("branch_positions as bp", "ja.position_id", "bp.id")
        .leftJoin("branches as b", "bp.branch_id", "b.id")
        .select(
          "ja.*",
          "bp.branch_id",
          "b.name as branch_name"
        )
        .where("ja.id", id)
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
