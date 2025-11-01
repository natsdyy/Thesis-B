const express = require("express");
const router = express.Router();
const Employee = require("../models/Employee");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { authenticateToken } = require("../middleware/rbac");
const EmailService = require("../services/emailService");
const SendGridService = require("../services/sendGridService");
const { db } = require("../config/database");

/**
 * @swagger
 * /api/employees:
 *   get:
 *     summary: Get all employees
 *     tags: [Employees]
 *     parameters:
 *       - in: query
 *         name: includeDeleted
 *         schema:
 *           type: boolean
 *         description: Include deleted employees
 *       - in: query
 *         name: department
 *         schema:
 *           type: string
 *         description: Filter by department
 *     responses:
 *       200:
 *         description: Employees retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Employee'
 *                 count:
 *                   type: integer
 */
router.get("/", async (req, res) => {
  try {
    const { includeDeleted, department, page = 1, limit = 10 } = req.query;

    let result;
    if (department) {
      result = await Employee.getByDepartment(
        department,
        includeDeleted === "true",
        parseInt(page),
        parseInt(limit)
      );
    } else {
      result = await Employee.getAll(
        includeDeleted === "true",
        parseInt(page),
        parseInt(limit)
      );
    }

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
      count: result.data.length,
    });
  } catch (error) {
    console.error("Error fetching employees:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching employees",
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/employees/me:
 *   get:
 *     summary: Get current user's profile
 *     tags: [Employees]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user profile retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Employee not found
 */
router.get("/me", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const employee = await Employee.getById(userId);

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    // Get role information by joining with user_roles table
    const employeeWithRole = await db("employees")
      .leftJoin("user_roles", "employees.role_id", "user_roles.role_id")
      .select(
        "employees.*",
        "user_roles.role",
        "user_roles.description as role_description"
      )
      .where("employees.id", userId)
      .whereNull("employees.deleted_at")
      .first();

    res.json({
      success: true,
      data: employeeWithRole,
    });
  } catch (error) {
    console.error("Error fetching current user profile:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching profile",
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/employees/me:
 *   put:
 *     summary: Update current user's profile
 *     tags: [Employees]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               first_name:
 *                 type: string
 *               last_name:
 *                 type: string
 *               phone_number:
 *                 type: string
 *               address:
 *                 type: string
 *               postal_code:
 *                 type: string
 *               emergency_contact_name:
 *                 type: string
 *               emergency_contact_number:
 *                 type: string
 *               emergency_contact_address:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Employee not found
 */
router.put("/me", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const profileData = req.body;

    // Only allow updating certain fields for profile
    const allowedFields = {
      first_name: profileData.first_name,
      last_name: profileData.last_name,
      phone_number: profileData.phone_number,
      address: profileData.address,
      postal_code: profileData.postal_code,
      emergency_contact_name: profileData.emergency_contact_name,
      emergency_contact_number: profileData.emergency_contact_number,
      emergency_contact_address: profileData.emergency_contact_address,
      alternate_contact_number: profileData.alternate_contact_number,
      emergency_contact_email: profileData.emergency_contact_email,
    };

    // Remove undefined values
    Object.keys(allowedFields).forEach((key) => {
      if (allowedFields[key] === undefined) {
        delete allowedFields[key];
      }
    });

    const updatedEmployee = await Employee.update(
      userId,
      allowedFields,
      userId
    );

    if (!updatedEmployee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    res.json({
      success: true,
      data: updatedEmployee,
      message: "Profile updated successfully",
    });
  } catch (error) {
    console.error("Error updating profile:", error);

    if (
      error.message.includes("Validation failed") ||
      error.message.includes("already exists")
    ) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: "Error updating profile",
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/employees/me/change-password:
 *   put:
 *     summary: Change current user's password
 *     tags: [Employees]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - current_password
 *               - new_password
 *             properties:
 *               current_password:
 *                 type: string
 *               new_password:
 *                 type: string
 *                 minLength: 8
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       400:
 *         description: Validation error or invalid current password
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Employee not found
 */
router.put("/me/change-password", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      return res.status(400).json({
        success: false,
        message: "Current password and new password are required",
      });
    }

    if (new_password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 8 characters long",
      });
    }

    // Get employee with password
    const employee = await Employee.getById(userId);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    // Verify current password
    const isValidPassword = await Employee.comparePassword(
      current_password,
      employee.password
    );

    if (!isValidPassword) {
      return res.status(400).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    // Update password
    await Employee.setPassword(employee.employee_id, new_password);

    res.json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("Error changing password:", error);
    res.status(500).json({
      success: false,
      message: "Error changing password",
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/employees/stats:
 *   get:
 *     summary: Get employee statistics
 *     tags: [Employees]
 *     responses:
 *       200:
 *         description: Employee statistics retrieved successfully
 */
router.get("/stats", async (req, res) => {
  try {
    const stats = await Employee.getStats();
    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Error fetching employee stats:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching employee statistics",
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/employees/departments-with-roles:
 *   get:
 *     summary: Get all departments with their available roles
 *     tags: [Employees]
 *     responses:
 *       200:
 *         description: Departments with roles retrieved successfully
 */
router.get("/departments-with-roles", async (req, res) => {
  try {
    const departmentsWithRoles = await Employee.getDepartmentsWithRoles();
    res.json({
      success: true,
      data: departmentsWithRoles,
    });
  } catch (error) {
    console.error("Error fetching departments with roles:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching departments with roles",
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/employees/roles/{department}:
 *   get:
 *     summary: Get roles for a specific department
 *     tags: [Employees]
 *     parameters:
 *       - in: path
 *         name: department
 *         required: true
 *         schema:
 *           type: string
 *         description: Department name
 *     responses:
 *       200:
 *         description: Department roles retrieved successfully
 */
router.get("/roles/:department", async (req, res) => {
  try {
    const { department } = req.params;
    const roles = await Employee.getRolesByDepartment(department);
    res.json({
      success: true,
      data: roles,
    });
  } catch (error) {
    console.error("Error fetching department roles:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching department roles",
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/employees/{id}:
 *   get:
 *     summary: Get employee by ID
 *     tags: [Employees]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Employee ID
 *     responses:
 *       200:
 *         description: Employee retrieved successfully
 *       404:
 *         description: Employee not found
 */
// Get employee documents (MUST come before /:id route)
// Serve document file with proper inline headers (bypasses download managers)
router.get("/:id/documents/:documentId/view", async (req, res) => {
  try {
    const { id, documentId } = req.params;

    // Get document from database
    const document = await db("employee_documents")
      .where("id", documentId)
      .where("employee_id", id)
      .whereNull("deleted_at")
      .first();

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found",
      });
    }

    // Construct file path
    const filePath = require("path").join(
      __dirname,
      "..",
      "uploads",
      "employee-documents",
      document.filename
    );

    // Check if file exists
    if (!require("fs").existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: "File not found on server",
      });
    }

    // Set headers to force inline display
    res.setHeader("Content-Type", document.mime_type || "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${document.original_filename}"`
    );
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cache-Control", "public, max-age=3600");

    // Stream the file
    res.sendFile(filePath);
  } catch (error) {
    console.error("Error serving document:", error);
    res.status(500).json({
      success: false,
      message: "Error serving document",
      error: error.message,
    });
  }
});

router.get("/:id/documents", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Verify employee exists
    const employee = await db("employees")
      .where("id", id)
      .whereNull("deleted_at")
      .first();
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    // Fetch all documents for this employee
    const documents = await db("employee_documents")
      .where("employee_id", id)
      .whereNull("deleted_at")
      .orderBy("uploaded_at", "desc")
      .select("*");

    res.json({
      success: true,
      data: documents,
    });
  } catch (error) {
    console.error("Error fetching documents:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching documents",
      error: error.message,
    });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const employee = await Employee.getById(id);

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    res.json({
      success: true,
      data: employee,
    });
  } catch (error) {
    console.error("Error fetching employee:", error);

    if (error.message === "Invalid employee ID provided") {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: "Error fetching employee",
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/employees/employee-id/{employeeId}:
 *   get:
 *     summary: Get employee by employee ID
 *     tags: [Employees]
 *     parameters:
 *       - in: path
 *         name: employeeId
 *         required: true
 *         schema:
 *           type: string
 *         description: Employee ID (e.g., EMP000001)
 *     responses:
 *       200:
 *         description: Employee retrieved successfully
 *       404:
 *         description: Employee not found
 */
router.get("/employee-id/:employeeId", async (req, res) => {
  try {
    const { employeeId } = req.params;
    const employee = await Employee.getByEmployeeId(employeeId);

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    res.json({
      success: true,
      data: employee,
    });
  } catch (error) {
    console.error("Error fetching employee by employee ID:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching employee",
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/employees:
 *   post:
 *     summary: Create new employee
 *     tags: [Employees]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/EmployeeInput'
 *     responses:
 *       201:
 *         description: Employee created successfully
 *       400:
 *         description: Validation error
 */
router.post("/", authenticateToken, async (req, res) => {
  try {
    const employeeData = req.body;

    // Get current user ID from request (assuming authentication middleware sets req.user)
    const createdBy = req.user?.id || null;

    const newEmployee = await Employee.create(employeeData, createdBy);

    // Send welcome email to employee if email is provided
    let emailStatus = { sent: false, error: null };
    if (newEmployee.email) {
      try {
        const employeeName = `${newEmployee.first_name} ${newEmployee.last_name}`;
        const defaultPassword = employeeData.password || newEmployee.last_name;

        const emailResult = await EmailService.sendEmployeeWelcomeEmail(
          newEmployee.email,
          employeeName,
          newEmployee.email,
          defaultPassword
        );

        if (emailResult.success) {
          console.log(`✅ Welcome email sent to ${newEmployee.email}`);
          emailStatus.sent = true;
        } else {
          console.error(
            `❌ Failed to send welcome email to ${newEmployee.email}:`,
            emailResult.error
          );
          emailStatus.error = emailResult.error;

          // Check if it's a production warning (SMTP blocked)
          if (emailResult.productionWarning) {
            console.log(
              `⚠️ [PRODUCTION] Email service unavailable - employee created successfully`
            );
          }
        }
      } catch (emailError) {
        console.error("❌ Error sending welcome email:", emailError);
        emailStatus.error = emailError.message;
        // Don't fail the employee creation if email fails
      }
    }

    res.status(201).json({
      success: true,
      data: newEmployee,
      message: "Employee created successfully",
      emailStatus: emailStatus, // Include email status in response
    });
  } catch (error) {
    console.error("Error creating employee:", error);

    if (
      error.message.includes("Validation failed") ||
      error.message.includes("already exists")
    ) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: "Error creating employee",
      error: error.message,
    });
  }
});

// =================== PHOTO UPLOAD (similar to menu upload) ===================
const uploadsDir = path.join(__dirname, "..", "uploads", "employee-photos");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    const base = path
      .basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9_-]/g, "");
    cb(null, `employee-${timestamp}-${base}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image uploads are allowed"));
    }
    cb(null, true);
  },
});

// Document upload storage (for onboarding documents)
const documentsDir = path.join(
  __dirname,
  "..",
  "uploads",
  "employee-documents"
);
if (!fs.existsSync(documentsDir)) {
  fs.mkdirSync(documentsDir, { recursive: true });
}

const documentStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, documentsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname) || ".pdf"; // Default to .pdf if no extension
    // Preserve original extension, sanitize fieldname
    const sanitizedFieldname = file.fieldname.replace(/[^a-zA-Z0-9_-]/g, "_");
    const filename = `${sanitizedFieldname}-${uniqueSuffix}${ext}`;
    console.log(
      `Document upload: original='${file.originalname}', ext='${ext}', generated='${filename}'`
    );
    cb(null, filename);
  },
});

const documentUpload = multer({
  storage: documentStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      "application/pdf",
      "image/jpeg",
      "image/jpg",
      "image/png",
    ];
    if (allowedMimes.includes(file.mimetype)) {
      return cb(null, true);
    }
    return cb(new Error("Only PDF and image files are allowed"));
  },
});

// Upload photo and create employee in one request
router.post(
  "/upload",
  authenticateToken,
  upload.single("photo"),
  async (req, res) => {
    try {
      const photoUrl = req.file
        ? `/uploads/employee-photos/${req.file.filename}`
        : null;

      const payload = req.body || {};
      const createdBy = req.user?.id || null;

      const employee = await Employee.create(
        { ...payload, photo_url: photoUrl },
        createdBy
      );

      // Send welcome email to employee if email is provided
      let emailStatus = { sent: false, error: null };
      if (employee.email) {
        try {
          const employeeName = `${employee.first_name} ${employee.last_name}`;
          const defaultPassword = payload.password || employee.last_name;

          const emailResult = await EmailService.sendEmployeeWelcomeEmail(
            employee.email,
            employeeName,
            employee.email,
            defaultPassword
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

            // Check if it's a production warning (SMTP blocked)
            if (emailResult.productionWarning) {
              console.log(
                `⚠️ [PRODUCTION] Email service unavailable - employee created successfully`
              );
            }
          }
        } catch (emailError) {
          console.error("❌ Error sending welcome email:", emailError);
          emailStatus.error = emailError.message;
          // Don't fail the employee creation if email fails
        }
      }

      res.status(201).json({
        success: true,
        data: employee,
        message: "Employee created with photo successfully",
        emailStatus: emailStatus, // Include email status in response
      });
    } catch (error) {
      console.error("Error uploading photo or creating employee:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to upload photo/create employee",
      });
    }
  }
);

/**
 * @swagger
 * /api/employees/{id}:
 *   put:
 *     summary: Update employee
 *     tags: [Employees]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Employee ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/EmployeeInput'
 *     responses:
 *       200:
 *         description: Employee updated successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: Employee not found
 */
router.put("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const employeeData = req.body;

    // Get current user ID from request
    const updatedBy = req.user?.id || null;

    // Get current employee data before update to check for branch changes
    const currentEmployee = await Employee.getById(id);
    if (!currentEmployee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    const updatedEmployee = await Employee.update(id, employeeData, updatedBy);

    if (!updatedEmployee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    // Check if branch_id, role, or department has changed and send email notification
    const hasBranchChanged =
      employeeData.branch_id !== undefined &&
      currentEmployee.branch_id !== updatedEmployee.branch_id;

    const hasRoleChanged =
      employeeData.role_id !== undefined &&
      currentEmployee.role_id !== updatedEmployee.role_id;

    const hasDepartmentChanged =
      employeeData.department !== undefined &&
      currentEmployee.department !== updatedEmployee.department;

    const shouldSendEmail =
      (hasBranchChanged || hasRoleChanged || hasDepartmentChanged) &&
      updatedEmployee.email;

    if (shouldSendEmail) {
      try {
        // Get branch names from database (if branch changed)
        let fromBranchName = "Unassigned";
        let toBranchName = "Unassigned";

        if (hasBranchChanged) {
          const branches = await db("branches")
            .whereIn("id", [
              currentEmployee.branch_id,
              updatedEmployee.branch_id,
            ])
            .whereNull("deleted_at")
            .select("id", "name", "code");

          const fromBranch = branches.find(
            (b) => b.id === currentEmployee.branch_id
          );
          const toBranch = branches.find(
            (b) => b.id === updatedEmployee.branch_id
          );

          fromBranchName = fromBranch ? fromBranch.name : "Unassigned";
          toBranchName = toBranch ? toBranch.name : "Unassigned";
        } else {
          // If no branch change but role/department changed, keep current branch info
          if (updatedEmployee.branch_id) {
            const currentBranch = await db("branches")
              .where("id", updatedEmployee.branch_id)
              .whereNull("deleted_at")
              .select("name", "code")
              .first();

            if (currentBranch) {
              fromBranchName = toBranchName = currentBranch.name;
            }
          }
        }

        // Get role information (if role changed)
        let fromRoleName = currentEmployee.role || "Current Role";
        let toRoleName = updatedEmployee.role || "New Role";

        if (hasRoleChanged) {
          const roles = await db("user_roles")
            .whereIn("role_id", [
              currentEmployee.role_id,
              updatedEmployee.role_id,
            ])
            .whereNull("deleted_at")
            .select("role_id", "role");

          const fromRole = roles.find(
            (r) => r.role_id === currentEmployee.role_id
          );
          const toRole = roles.find(
            (r) => r.role_id === updatedEmployee.role_id
          );

          fromRoleName = fromRole ? fromRole.role : fromRoleName;
          toRoleName = toRole ? toRole.role : toRoleName;
        }

        // Get department names
        const fromDeptName = currentEmployee.department || "Current Department";
        const toDeptName = updatedEmployee.department || "New Department";

        // Get manager name who made the change
        const manager =
          updatedBy &&
          (await db("employees")
            .where("id", updatedBy)
            .select("first_name", "last_name")
            .first());
        const managerName = manager
          ? `${manager.first_name} ${manager.last_name}`
          : "System Administrator";

        const employeeName = `${updatedEmployee.first_name} ${updatedEmployee.last_name}`;
        const transferDate = new Date();

        // Create a descriptive transfer message based on what changed
        let transferSubject = "Employee Role/Department Update";
        let transferMessage = "";

        if (hasBranchChanged) {
          transferSubject = "Branch Transfer Notification";
          transferMessage = `Your branch assignment has been updated from ${fromBranchName} to ${toBranchName}.`;
          if (hasRoleChanged || hasDepartmentChanged) {
            transferMessage += ` Additionally, `;
          }
        }

        if (hasDepartmentChanged) {
          transferSubject = "Department Transfer Notification";
          if (!transferMessage) {
            transferMessage = `Your department assignment has been updated from ${fromDeptName} to ${toDeptName}.`;
          } else {
            transferMessage += `your department has been updated from ${fromDeptName} to ${toDeptName}.`;
          }
          if (hasRoleChanged) {
            transferMessage += ` Additionally, `;
          }
        }

        if (hasRoleChanged) {
          if (!transferMessage) {
            transferMessage = `Your role has been updated from ${fromRoleName} to ${toRoleName}.`;
          } else {
            transferMessage += `your role has been updated from ${fromRoleName} to ${toRoleName}.`;
          }
        }

        // Send transfer notification email
        const emailResult =
          await SendGridService.sendEmployeeTransferNotification(
            updatedEmployee.email,
            employeeName,
            fromBranchName,
            toBranchName,
            transferDate,
            managerName,
            transferMessage,
            transferSubject,
            {
              hasBranchChanged,
              hasDeptChanged: hasDepartmentChanged,
              hasRoleChanged,
              fromDept: fromDeptName,
              toDept: toDeptName,
            }
          );

        if (emailResult.success) {
          console.log(
            `✅ Transfer notification email sent to ${updatedEmployee.email}`
          );
        } else {
          console.error(
            `❌ Failed to send transfer notification email:`,
            emailResult.error
          );
        }
      } catch (emailError) {
        console.error(
          "❌ Error sending transfer notification email:",
          emailError
        );
        // Don't fail the update if email fails
      }
    }

    res.json({
      success: true,
      data: updatedEmployee,
      message: "Employee updated successfully",
    });
  } catch (error) {
    console.error("Error updating employee:", error);

    if (
      error.message.includes("Invalid employee ID") ||
      error.message === "Employee not found"
    ) {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }

    if (
      error.message.includes("Validation failed") ||
      error.message.includes("already exists") ||
      error.message.includes("Cannot update")
    ) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: "Error updating employee",
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/employees/{id}/status:
 *   patch:
 *     summary: Update employee status
 *     tags: [Employees]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Employee ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [Active, Inactive, Terminated, On Leave]
 *     responses:
 *       200:
 *         description: Employee status updated successfully
 *       400:
 *         description: Invalid status
 *       404:
 *         description: Employee not found
 */
router.patch("/:id/status", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Status is required",
      });
    }

    const updatedBy = req.user?.id || null;
    const employee = await Employee.updateStatus(id, status, updatedBy);

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    res.json({
      success: true,
      data: employee,
      message: "Employee status updated successfully",
    });
  } catch (error) {
    console.error("Error updating employee status:", error);

    if (
      error.message.includes("Invalid") ||
      error.message === "Employee not found"
    ) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: "Error updating employee status",
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/employees/{id}:
 *   delete:
 *     summary: Soft delete employee
 *     tags: [Employees]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Employee ID
 *     responses:
 *       200:
 *         description: Employee deleted successfully
 *       404:
 *         description: Employee not found
 */
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const deletedBy = req.user?.id || null;
    const employee = await Employee.delete(id, deletedBy);

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    res.json({
      success: true,
      data: employee,
      message: "Employee deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting employee:", error);

    if (
      error.message.includes("Invalid") ||
      error.message === "Employee not found" ||
      error.message.includes("already deleted")
    ) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: "Error deleting employee",
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/employees/{id}/restore:
 *   patch:
 *     summary: Restore soft deleted employee
 *     tags: [Employees]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Employee ID
 *     responses:
 *       200:
 *         description: Employee restored successfully
 *       400:
 *         description: Employee cannot be restored
 *       404:
 *         description: Employee not found
 */
router.patch("/:id/restore", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const restoredBy = req.user?.id || null;
    const employee = await Employee.restore(id, restoredBy);

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    res.json({
      success: true,
      data: employee,
      message: "Employee restored successfully",
    });
  } catch (error) {
    console.error("Error restoring employee:", error);

    if (
      error.message.includes("Invalid") ||
      error.message === "Employee not found" ||
      error.message.includes("cannot be restored")
    ) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: "Error restoring employee",
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/employees/{id}/terminate:
 *   post:
 *     summary: Terminate employee with comprehensive details
 *     tags: [Employees]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Employee ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - termination_reason
 *               - last_working_day
 *             properties:
 *               termination_reason:
 *                 type: string
 *                 enum: [Resignation, Performance Issues, Misconduct, End of Contract, Company Restructuring, Health Issues, Other]
 *               last_working_day:
 *                 type: string
 *                 format: date
 *               handover_notes:
 *                 type: string
 *               final_payroll_processed:
 *                 type: boolean
 *                 default: false
 *               system_access_revoked:
 *                 type: boolean
 *                 default: false
 *     responses:
 *       200:
 *         description: Employee terminated successfully
 *       400:
 *         description: Validation error or employee already terminated
 *       404:
 *         description: Employee not found
 */
router.post("/:id/terminate", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const terminationData = req.body;
    const terminatedBy = req.user?.id || null;

    const result = await Employee.terminateEmployee(
      id,
      terminationData,
      terminatedBy
    );

    res.json({
      success: true,
      data: result,
      message: "Employee terminated successfully",
    });
  } catch (error) {
    console.error("Error terminating employee:", error);

    if (
      error.message.includes("Invalid") ||
      error.message === "Employee not found" ||
      error.message.includes("already terminated") ||
      error.message.includes("Cannot terminate") ||
      error.message.includes("required")
    ) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: "Error terminating employee",
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/employees/{id}/termination:
 *   get:
 *     summary: Get termination record for an employee
 *     tags: [Employees]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Employee ID
 *     responses:
 *       200:
 *         description: Termination record retrieved successfully
 *       404:
 *         description: Termination record not found
 */
router.get("/:id/termination", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const termination = await Employee.getTerminationRecord(id);

    if (!termination) {
      return res.status(404).json({
        success: false,
        message: "Termination record not found",
      });
    }

    res.json({
      success: true,
      data: termination,
    });
  } catch (error) {
    console.error("Error fetching termination record:", error);

    if (error.message === "Invalid employee ID provided") {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: "Error fetching termination record",
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/employees/{id}/termination/checklist:
 *   patch:
 *     summary: Update termination checklist items
 *     tags: [Employees]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Employee ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               final_payroll_processed:
 *                 type: boolean
 *               system_access_revoked:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Termination checklist updated successfully
 *       404:
 *         description: Termination record not found
 */
router.patch(
  "/:id/termination/checklist",
  authenticateToken,
  async (req, res) => {
    try {
      const { id } = req.params;
      const checklistData = req.body;
      const updatedBy = req.user?.id || null;

      const updated = await Employee.updateTerminationChecklist(
        id,
        checklistData,
        updatedBy
      );

      res.json({
        success: true,
        data: updated,
        message: "Termination checklist updated successfully",
      });
    } catch (error) {
      console.error("Error updating termination checklist:", error);

      if (
        error.message === "Invalid employee ID provided" ||
        error.message === "Termination record not found"
      ) {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }

      res.status(500).json({
        success: false,
        message: "Error updating termination checklist",
        error: error.message,
      });
    }
  }
);

/**
 * @swagger
 * /api/employees/{id}/restore-terminated:
 *   patch:
 *     summary: Restore terminated employee back to active status
 *     tags: [Employees]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Employee ID
 *     responses:
 *       200:
 *         description: Terminated employee restored successfully
 *       400:
 *         description: Employee cannot be restored (not terminated)
 *       404:
 *         description: Employee not found
 */
router.patch("/:id/restore-terminated", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const restoredBy = req.user?.id || null;
    const employee = await Employee.restoreTerminatedEmployee(id, restoredBy);

    res.json({
      success: true,
      data: employee,
      message: "Terminated employee restored successfully",
    });
  } catch (error) {
    console.error("Error restoring terminated employee:", error);

    if (
      error.message.includes("Invalid") ||
      error.message === "Employee not found" ||
      error.message.includes("not terminated") ||
      error.message.includes("cannot be restored")
    ) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: "Error restoring terminated employee",
      error: error.message,
    });
  }
});

// Upload employee documents (for onboarding)
router.post(
  "/:id/documents",
  documentUpload.single("document"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { document_type } = req.body;

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "No document file uploaded",
        });
      }

      if (!document_type) {
        return res.status(400).json({
          success: false,
          message: "Document type is required",
        });
      }

      // Verify employee exists
      const employee = await db("employees")
        .where("id", id)
        .whereNull("deleted_at")
        .first();
      if (!employee) {
        return res.status(404).json({
          success: false,
          message: "Employee not found",
        });
      }

      const documentUrl = `/uploads/employee-documents/${req.file.filename}`;

      // Check if a document of this type already exists for this employee
      const existingDoc = await db("employee_documents")
        .where("employee_id", id)
        .where("document_type", document_type)
        .whereNull("deleted_at")
        .first();

      let document;
      if (existingDoc) {
        // Update existing document
        [document] = await db("employee_documents")
          .where("id", existingDoc.id)
          .update({
            filename: req.file.filename,
            original_filename: req.file.originalname,
            file_path: documentUrl,
            mime_type: req.file.mimetype,
            file_size: req.file.size,
            uploaded_at: new Date(),
            deleted_at: null,
          })
          .returning("*");
      } else {
        // Create new document record
        [document] = await db("employee_documents")
          .insert({
            employee_id: id,
            document_type: document_type,
            filename: req.file.filename,
            original_filename: req.file.originalname,
            file_path: documentUrl,
            mime_type: req.file.mimetype,
            file_size: req.file.size,
            uploaded_at: new Date(),
          })
          .returning("*");
      }

      res.json({
        success: true,
        message: "Document uploaded successfully",
        data: {
          id: document.id,
          document_type: document_type,
          document_url: documentUrl,
          filename: req.file.filename,
          original_filename: req.file.originalname,
        },
      });
    } catch (error) {
      console.error("Error uploading document:", error);
      res.status(500).json({
        success: false,
        message: "Error uploading document",
        error: error.message,
      });
    }
  }
);

// Upload profile picture endpoint
router.post(
  "/me/upload-photo",
  authenticateToken,
  upload.single("photo"),
  async (req, res) => {
    try {
      const userId = req.user.id;

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "No photo file uploaded",
        });
      }

      const photoUrl = `/uploads/employee-photos/${req.file.filename}`;

      // Update employee record with new photo URL
      await db("employees").where("id", userId).update({
        photo_url: photoUrl,
        updated_at: new Date(),
      });

      res.json({
        success: true,
        message: "Profile photo updated successfully",
        data: {
          photo_url: photoUrl,
        },
      });
    } catch (error) {
      console.error("Error uploading profile photo:", error);
      res.status(500).json({
        success: false,
        message: "Error uploading profile photo",
        error: error.message,
      });
    }
  }
);

module.exports = router;
