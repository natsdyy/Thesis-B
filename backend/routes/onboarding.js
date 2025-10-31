const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const JobApplication = require("../models/JobApplication");
const Employee = require("../models/Employee");
const { db } = require("../config/database");
const { authenticateToken } = require("../middleware/rbac");

const JWT_SECRET =
  process.env.JWT_SECRET || "your-secret-key-change-in-production";

/**
 * Generate onboarding token for a job application
 */
router.post("/generate-token", async (req, res) => {
  try {
    const { application_id } = req.body;

    if (!application_id) {
      return res.status(400).json({
        success: false,
        message: "Application ID is required",
      });
    }

    // Verify application exists and is hired
    const appResult = await JobApplication.getById(application_id);
    if (!appResult.success || !appResult.data) {
      return res.status(404).json({
        success: false,
        message: "Application not found",
      });
    }

    const app = appResult.data;
    if (app.status !== "hired") {
      return res.status(400).json({
        success: false,
        message:
          "Application must be in 'hired' status to generate onboarding link",
      });
    }

    // Generate token (expires in 30 days)
    const token = jwt.sign(
      {
        application_id: application_id,
        email: app.email || app.applicant_email,
        type: "onboarding",
      },
      JWT_SECRET,
      { expiresIn: "30d" }
    );

    res.json({
      success: true,
      token: token,
      expiresIn: "30d",
    });
  } catch (error) {
    console.error("Error generating onboarding token:", error);
    res.status(500).json({
      success: false,
      message: "Error generating onboarding token",
      error: error.message,
    });
  }
});

/**
 * Verify onboarding token and get application details
 */
router.get("/verify/:token", async (req, res) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Token is required",
      });
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token",
      });
    }

    if (decoded.type !== "onboarding") {
      return res.status(401).json({
        success: false,
        message: "Invalid token type",
      });
    }

    // Get application details
    const appResult = await JobApplication.getById(decoded.application_id);
    if (!appResult.success || !appResult.data) {
      return res.status(404).json({
        success: false,
        message: "Application not found",
      });
    }

    const app = appResult.data;

    // Handle resubmission - get existing employee data to pre-fill
    if (decoded.resubmission && decoded.employee_id) {
      const existingEmployee = await db("employees")
        .where("id", decoded.employee_id)
        .whereNull("deleted_at")
        .first();

      // Allow resubmission if status is rejected OR pending (in case of re-review)
      if (
        existingEmployee &&
        (existingEmployee.onboarding_status === "rejected" ||
          existingEmployee.onboarding_status === "pending")
      ) {
        // Pre-fill with employee's existing data
        const department =
          existingEmployee.department ||
          app.department ||
          app.department_name ||
          "";
        const roleName = existingEmployee.role_id
          ? (
              await db("user_roles")
                .where("role_id", existingEmployee.role_id)
                .whereNull("deleted_at")
                .first()
            )?.role ||
            app.position_title ||
            app.role ||
            app.role_name ||
            ""
          : app.position_title || app.role || app.role_name || "";

        // Get role details
        let roleId = existingEmployee.role_id;
        let ratePerHour = null;
        if (roleId) {
          const role = await db("user_roles")
            .where("role_id", roleId)
            .whereNull("deleted_at")
            .first();
          if (role) {
            ratePerHour = parseFloat(role.rate_per_hour || 0);
          }
        }

        // Get branch information
        let branchId = existingEmployee.branch_id;
        let branchName = null;
        if (branchId) {
          const branch = await db("branches")
            .where("id", branchId)
            .whereNull("deleted_at")
            .first();
          if (branch) {
            branchName = branch.name;
          }
        }

        // Default to Main Branch if no branch specified
        if (!branchId) {
          const mainBranch = await db("branches")
            .whereRaw("LOWER(name) = LOWER(?)", ["Main Branch"])
            .whereNull("deleted_at")
            .first();
          if (mainBranch) {
            branchId = mainBranch.id;
            branchName = mainBranch.name;
          }
        }

        return res.json({
          success: true,
          data: {
            application_id: app.id,
            email: existingEmployee.email,
            full_name: `${existingEmployee.first_name} ${existingEmployee.last_name}`,
            department: department,
            role_name: roleName,
            role_id: roleId,
            rate_per_hour: ratePerHour,
            branch_id: branchId,
            branch_name: branchName || "Main Branch",
            employee_type: existingEmployee.employee_type || "Full-time",
            position_applied: app.position_title || app.role || "",
            // Pre-fill employee data
            first_name: existingEmployee.first_name,
            last_name: existingEmployee.last_name,
            middle_name: existingEmployee.middle_name || "",
            phone_number: existingEmployee.phone_number,
            address: existingEmployee.address,
            postal_code: existingEmployee.postal_code,
            civil_status: existingEmployee.civil_status,
            sex: existingEmployee.sex,
            birthday: existingEmployee.birthday,
            age: existingEmployee.age,
            citizenship: existingEmployee.citizenship,
            sss_number: existingEmployee.sss_number,
            pagibig_number: existingEmployee.pagibig_number,
            philhealth_number: existingEmployee.philhealth_number,
            emergency_contact_name: existingEmployee.emergency_contact_name,
            emergency_relationship: existingEmployee.emergency_relationship,
            emergency_contact_number: existingEmployee.emergency_contact_number,
            emergency_contact_address:
              existingEmployee.emergency_contact_address,
          },
          isResubmission: true,
          alreadyOnboarded: false,
        });
      }
    }

    // Check if already onboarded (for new submissions, not resubmissions)
    // Only block if onboarding is approved (already completed)
    if (!decoded.resubmission) {
      const existingEmployee = await db("employees")
        .where("email", app.email || app.applicant_email)
        .whereNull("deleted_at")
        .first();

      if (
        existingEmployee &&
        existingEmployee.onboarding_status === "approved"
      ) {
        return res.json({
          success: true,
          alreadyOnboarded: true,
          message: "You have already completed onboarding",
        });
      }
    }

    // Get department, role, and branch details
    const department = app.department || app.department_name || "";
    const roleName = app.position_title || app.role || app.role_name || "";

    // Find role_id and rate_per_hour from user_roles
    let roleId = null;
    let ratePerHour = null;
    if (department && roleName) {
      const role = await db("user_roles")
        .where("department", department)
        .where("role", roleName)
        .whereNull("deleted_at")
        .first();
      if (role) {
        roleId = role.role_id;
        ratePerHour = parseFloat(role.rate_per_hour || 0);
      }
    }

    // Get branch information
    let branchId = null;
    let branchName = null;
    if (app.branch_id) {
      const branch = await db("branches")
        .where("id", app.branch_id)
        .whereNull("deleted_at")
        .first();
      if (branch) {
        branchId = branch.id;
        branchName = branch.name;
      }
    }

    // Default to Main Branch if no branch specified
    if (!branchId) {
      const mainBranch = await db("branches")
        .whereRaw("LOWER(name) = LOWER(?)", ["Main Branch"])
        .whereNull("deleted_at")
        .first();
      if (mainBranch) {
        branchId = mainBranch.id;
        branchName = mainBranch.name;
      }
    }

    res.json({
      success: true,
      data: {
        application_id: app.id,
        email: app.email || app.applicant_email,
        full_name: app.full_name || app.applicant_name || "",
        department: department,
        role_name: roleName,
        role_id: roleId,
        rate_per_hour: ratePerHour,
        branch_id: branchId,
        branch_name: branchName,
        employee_type: "Full-time", // Default for new hires
        position_applied: app.position_title || app.role || "",
        birthday: app.date_of_birth || null, // Pre-fill birthday from job application
        phone_number: app.phone || null, // Pre-fill phone from job application
        address: app.address || null, // Pre-fill address from job application
      },
      alreadyOnboarded: false,
    });
  } catch (error) {
    console.error("Error verifying onboarding token:", error);
    res.status(500).json({
      success: false,
      message: "Error verifying token",
      error: error.message,
    });
  }
});

/**
 * Submit onboarding form
 */
router.post("/submit", async (req, res) => {
  try {
    const { token, ...employeeData } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Token is required",
      });
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token",
      });
    }

    if (decoded.type !== "onboarding") {
      return res.status(401).json({
        success: false,
        message: "Invalid token type",
      });
    }

    // Get application to verify
    const appResult = await JobApplication.getById(decoded.application_id);
    if (!appResult.success || !appResult.data) {
      return res.status(404).json({
        success: false,
        message: "Application not found",
      });
    }

    const app = appResult.data;

    // Handle resubmission - update existing employee instead of creating new one
    if (decoded.resubmission && decoded.employee_id) {
      const existingEmployee = await db("employees")
        .where("id", decoded.employee_id)
        .whereNull("deleted_at")
        .first();

      if (
        existingEmployee &&
        existingEmployee.onboarding_status === "rejected"
      ) {
        // Update existing employee record
        // Keep account inactive during resubmission (is_active remains false)
        await db("employees")
          .where("id", decoded.employee_id)
          .update({
            ...employeeData,
            onboarding_status: "pending", // Reset to pending for review
            is_active: false, // Ensure account remains inactive during resubmission
            status: "Inactive", // Set status to Inactive
            updated_at: db.fn.now(),
          });

        // Update application timestamp
        await db("job_applications")
          .where("id", decoded.application_id)
          .update({
            updated_at: db.fn.now(),
          });

        const updatedEmployee = await db("employees")
          .where("id", decoded.employee_id)
          .first();

        return res.status(200).json({
          success: true,
          data: updatedEmployee,
          message: "Onboarding form resubmitted successfully",
        });
      }
    }

    // Check if already onboarded (for new submissions)
    const existingEmployee = await db("employees")
      .where("email", app.email || app.applicant_email)
      .whereNull("deleted_at")
      .first();

    if (existingEmployee && existingEmployee.onboarding_status !== "rejected") {
      return res.status(400).json({
        success: false,
        message: "You have already completed onboarding",
      });
    }

    // Validate required fields
    const requiredFields = [
      "first_name",
      "last_name",
      "email",
      "phone_number",
      "address",
      "civil_status",
      "sex",
      "birthday",
      "department",
      "role_id",
      "branch_id",
      "employee_type",
      "sss_number",
      "pagibig_number",
      "philhealth_number",
      "emergency_contact_name",
      "emergency_relationship",
      "emergency_contact_number",
      "emergency_contact_address",
    ];

    for (const field of requiredFields) {
      if (!employeeData[field] && employeeData[field] !== 0) {
        return res.status(400).json({
          success: false,
          message: `${field.replace(/_/g, " ")} is required`,
        });
      }
    }

    // Ensure email matches application
    if (employeeData.email !== (app.email || app.applicant_email)) {
      return res.status(400).json({
        success: false,
        message: "Email does not match the application",
      });
    }

    // Create employee using the Employee model
    // Add onboarding_status field to track review status
    const employeeWithStatus = {
      ...employeeData,
      onboarding_status: "pending", // Set as pending for HR review
    };

    console.log(
      "Creating employee with data:",
      JSON.stringify(employeeWithStatus, null, 2)
    );

    let newEmployee;
    try {
      newEmployee = await Employee.create(employeeWithStatus, null);
    } catch (createError) {
      console.error("Employee.create() error:", createError);
      console.error("Error stack:", createError.stack);
      throw createError;
    }

    // Update application status - keep as 'hired' since onboarding is complete
    // Note: The status 'hired' is already correct, so we just update the timestamp
    await db("job_applications").where("id", decoded.application_id).update({
      updated_at: db.fn.now(),
    });

    res.status(201).json({
      success: true,
      data: newEmployee,
      message: "Employee onboarded successfully",
    });
  } catch (error) {
    console.error("Error submitting onboarding form:", error);
    console.error("Error stack:", error.stack);
    console.error("Error details:", {
      message: error.message,
      name: error.name,
      code: error.code,
    });
    res.status(500).json({
      success: false,
      message: "Error submitting onboarding form",
      error: error.message,
      details: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
});

/**
 * Get all onboarding submissions for review (HR only)
 */
router.get("/submissions", authenticateToken, async (req, res) => {
  try {
    const { status, branch_id } = req.query;

    // Query employees created through onboarding (have onboarding_status)
    let query = db("employees as e")
      .leftJoin("branches as b", function () {
        this.on("e.branch_id", "=", "b.id").andOnNull("b.deleted_at");
      })
      .leftJoin("user_roles as ur", function () {
        this.on("e.role_id", "=", "ur.role_id").andOnNull("ur.deleted_at");
      })
      .whereNotNull("e.onboarding_status")
      .whereNull("e.deleted_at")
      .select(
        "e.id",
        "e.employee_id",
        "e.first_name",
        "e.middle_name",
        "e.last_name",
        "e.email",
        "e.department",
        "e.branch_id",
        "e.onboarding_status as status",
        "e.created_at as submitted_at",
        "b.name as branch_name",
        "ur.role as role_name"
      )
      .orderBy("e.created_at", "desc");

    // Filter by status
    if (status && status !== "all") {
      query = query.where("e.onboarding_status", status);
    }

    // Filter by branch
    if (branch_id && branch_id !== "all") {
      query = query.where("e.branch_id", branch_id);
    }

    const submissions = await query;

    // Format the response
    const formattedSubmissions = submissions.map((sub) => ({
      id: sub.id,
      application_id: sub.id, // Fallback for compatibility
      employee_id: sub.employee_id,
      full_name:
        `${sub.first_name || ""} ${sub.middle_name || ""} ${sub.last_name || ""}`.trim(),
      first_name: sub.first_name,
      middle_name: sub.middle_name,
      last_name: sub.last_name,
      name: `${sub.first_name || ""} ${sub.last_name || ""}`.trim(),
      email: sub.email,
      department: sub.department,
      role_name: sub.role_name,
      branch_id: sub.branch_id,
      branch_name: sub.branch_name || "Main Branch",
      status: sub.status || "pending",
      submitted_at: sub.submitted_at,
      created_at: sub.submitted_at,
    }));

    res.json({
      success: true,
      data: formattedSubmissions,
    });
  } catch (error) {
    console.error("Error fetching onboarding submissions:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching onboarding submissions",
      error: error.message,
    });
  }
});

/**
 * Approve onboarding submission
 */
router.post("/approve", authenticateToken, async (req, res) => {
  try {
    const { employee_id } = req.body;

    if (!employee_id) {
      return res.status(400).json({
        success: false,
        message: "Employee ID is required",
      });
    }

    // Get employee data
    const employee = await db("employees")
      .where("id", employee_id)
      .whereNull("deleted_at")
      .first();

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    // Create user account if it doesn't exist (if no password set)
    let emailStatus = { sent: false, error: null };
    let defaultPassword = null;

    if (!employee.password && employee.email) {
      try {
        const bcrypt = require("bcryptjs");
        // Default password is last_name (same as AddEmployee.vue)
        defaultPassword = employee.last_name || "password123";
        const hashedPassword = await bcrypt.hash(defaultPassword, 12);

        // Set password in employees table
        await db("employees").where("id", employee_id).update({
          password: hashedPassword,
        });
      } catch (pwdError) {
        console.error("❌ Error setting password:", pwdError);
        // Continue with approval even if password setting fails
      }
    }

    // Update employee onboarding status to approved AND activate account
    await db("employees").where("id", employee_id).update({
      onboarding_status: "approved",
      is_active: true, // Activate account when approved
      status: "Active", // Set status to Active when approved
      updated_at: db.fn.now(),
    });

    if (employee.email) {
      try {
        // Send welcome email with credentials (use existing password or new one)
        const EmailService = require("../services/emailService");
        const employeeName = `${employee.first_name} ${employee.last_name}`;
        const frontendUrl =
          process.env.FRONTEND_URL ||
          (process.env.NODE_ENV === "production"
            ? "https://www.countryside-steakhouse.site"
            : "http://localhost:8080");
        const loginUrl = `${frontendUrl}/login`;

        // Use the password we just set, or if account already exists, send email with existing credentials info
        const passwordForEmail =
          defaultPassword || (employee.password ? employee.last_name : null);

        if (passwordForEmail) {
          const emailResult = await EmailService.sendEmployeeWelcomeEmail(
            employee.email,
            employeeName,
            employee.email,
            passwordForEmail,
            loginUrl
          );

          if (emailResult.success) {
            console.log(`✅ Welcome email sent to ${employee.email}`);
            emailStatus.sent = true;
          } else {
            console.error(
              `❌ Failed to send welcome email to ${employee.email}:`,
              emailResult.error
            );
            emailStatus.error = emailResult.error;
          }
        }
      } catch (emailError) {
        console.error("❌ Error sending email:", emailError);
        emailStatus.error = emailError.message;
        // Don't fail the approval if email fails
      }
    } else if (employee.password) {
      // Employee already has an account and password, but we activated it
      console.log(
        `ℹ️ Employee ${employee.email} already has an account - account activated`
      );
    }

    res.json({
      success: true,
      message: "Onboarding approved successfully",
      emailStatus: emailStatus,
      accountCreated: !!defaultPassword,
    });
  } catch (error) {
    console.error("Error approving onboarding:", error);
    res.status(500).json({
      success: false,
      message: "Error approving onboarding",
      error: error.message,
    });
  }
});

/**
 * Request resubmission - generates new link with pre-filled data and sends email
 */
router.post("/request-resubmission", authenticateToken, async (req, res) => {
  try {
    const { employee_id, feedback } = req.body;

    if (!employee_id) {
      return res.status(400).json({
        success: false,
        message: "Employee ID is required",
      });
    }

    if (!feedback || !feedback.trim()) {
      return res.status(400).json({
        success: false,
        message: "Feedback is required",
      });
    }

    // Get employee data
    const employee = await db("employees")
      .where("id", employee_id)
      .whereNull("deleted_at")
      .first();

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    // Find the original job application
    const application = await db("job_applications")
      .where("email", employee.email)
      .orWhere("applicant_email", employee.email)
      .orderBy("created_at", "desc")
      .first();

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Original job application not found",
      });
    }

    // Update onboarding status to rejected
    await db("employees").where("id", employee_id).update({
      onboarding_status: "rejected",
      updated_at: db.fn.now(),
    });

    // Generate new onboarding token with employee's data pre-filled
    const token = jwt.sign(
      {
        application_id: application.id,
        email: employee.email,
        type: "onboarding",
        resubmission: true,
        employee_id: employee_id, // Include employee ID for pre-filling
      },
      JWT_SECRET,
      { expiresIn: "30d" }
    );

    const frontendUrl =
      process.env.FRONTEND_URL ||
      (process.env.NODE_ENV === "production"
        ? "https://www.countryside-steakhouse.site"
        : "http://localhost:8080");

    const resubmissionLink = `${frontendUrl}/onboard?token=${token}`;

    // Send resubmission email
    const EmailService = require("../services/emailService");
    await EmailService.sendResubmissionRequestEmail(employee.email, {
      applicantName: `${employee.first_name} ${employee.last_name}`,
      positionTitle: application.position_title || application.role || "",
      feedback: feedback.trim(),
      resubmissionLink: resubmissionLink,
    });

    res.json({
      success: true,
      message: "Resubmission request sent successfully",
      data: {
        resubmission_link: resubmissionLink,
      },
    });
  } catch (error) {
    console.error("Error requesting resubmission:", error);
    res.status(500).json({
      success: false,
      message: "Error requesting resubmission",
      error: error.message,
    });
  }
});

module.exports = router;
