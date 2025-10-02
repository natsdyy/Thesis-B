const express = require("express");
const Employee = require("../models/Employee");
const OTP = require("../models/OTP");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const EmailService = require("../services/emailService");
const { db } = require("../config/database");
const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     LoginRequest:
 *       type: object
 *       required:
 *         - email
 *         - password
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *         password:
 *           type: string
 *     AuthResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         message:
 *           type: string
 *         code:
 *           type: string
 *         data:
 *           type: object
 *           properties:
 *             user:
 *               $ref: '#/components/schemas/User'
 */

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Authenticate user with comprehensive error handling
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login successful
 *       400:
 *         description: Bad request - validation errors
 *       401:
 *         description: Authentication failed
 *       403:
 *         description: Access denied - role issues
 *       500:
 *         description: Server error
 */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Basic input validation
    if (!email && !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
        code: "MISSING_CREDENTIALS",
      });
    }

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email address is required",
        code: "MISSING_EMAIL",
      });
    }

    if (!password) {
      return res.status(400).json({
        success: false,
        message: "Password is required",
        code: "MISSING_PASSWORD",
      });
    }

    // Trim and validate email format
    const trimmedEmail = email.trim();
    if (trimmedEmail.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Email address cannot be empty",
        code: "EMPTY_EMAIL",
      });
    }

    if (password.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Password cannot be empty",
        code: "EMPTY_PASSWORD",
      });
    }

    const authResult = await Employee.authenticate(trimmedEmail, password);

    if (!authResult.success) {
      return res.status(401).json({
        success: false,
        message: authResult.message,
        code: "INVALID_CREDENTIALS",
      });
    }

    const employee = authResult.employee;

    // Generate JWT token
    const token = jwt.sign(
      {
        id: employee.id,
        employee_id: employee.employee_id,
        email: employee.email,
        role_id: employee.role_id,
        role: employee.role,
        department: employee.department,
        first_name: employee.first_name,
        last_name: employee.last_name,
      },
      process.env.JWT_SECRET || "your-secret-key",
      {
        expiresIn: "24h",
      }
    );

    res.json({
      success: true,
      message: "Login successful",
      code: "LOGIN_SUCCESS",
      data: {
        user: {
          id: employee.id,
          employee_id: employee.employee_id,
          first_name: employee.first_name,
          last_name: employee.last_name,
          name: `${employee.first_name} ${employee.last_name}`,
          email: employee.email,
          role_id: employee.role_id,
          role: employee.role,
          department: employee.department,
          branch_id: employee.branch_id,
          photo_url: employee.photo_url || null,
        },
        token: token,
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    // Handle specific error types
    if (
      error.message.includes("Access denied") ||
      error.message.includes("deactivated") ||
      error.message.includes("inactive")
    ) {
      return res.status(403).json({
        success: false,
        message: error.message,
        code: "ACCESS_DENIED",
      });
    }

    if (error.message.includes("not found")) {
      return res.status(404).json({
        success: false,
        message: "User account not found",
        code: "USER_NOT_FOUND",
      });
    }

    res.status(500).json({
      success: false,
      message:
        "Authentication service is temporarily unavailable. Please try again.",
      code: "INTERNAL_SERVER_ERROR",
    });
  }
});

/**
 * @swagger
 * /api/auth/validate-session:
 *   post:
 *     summary: Validate user session and role status
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - user_id
 *             properties:
 *               user_id:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Session valid
 *       400:
 *         description: Bad request
 *       401:
 *         description: Session invalid
 *       403:
 *         description: Access denied
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
router.post("/validate-session", async (req, res) => {
  try {
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({
        success: false,
        message: "Employee ID is required",
        code: "MISSING_USER_ID",
      });
    }

    if (isNaN(user_id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid employee ID format",
        code: "INVALID_USER_ID",
      });
    }

    const employee = await Employee.getById(user_id);

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee account not found",
        code: "USER_NOT_FOUND",
      });
    }

    // Check if employee is active
    if (employee.deleted_at) {
      return res.status(403).json({
        success: false,
        message: "Employee account has been deactivated",
        code: "ACCOUNT_DEACTIVATED",
      });
    }

    if (!employee.is_active || employee.status !== "Active") {
      return res.status(403).json({
        success: false,
        message: "Employee account is currently inactive",
        code: "ACCOUNT_INACTIVE",
      });
    }

    // Check if role is active
    if (!employee.role_id) {
      return res.status(403).json({
        success: false,
        message: "No role assigned to your account",
        code: "NO_ROLE_ASSIGNED",
      });
    }

    // Get employee with role information
    const employeeWithRole = await Employee.findByEmail(employee.email);
    res.json({
      success: true,
      message: "Session is valid",
      code: "SESSION_VALID",
      data: {
        user: {
          id: employeeWithRole.id,
          employee_id: employeeWithRole.employee_id,
          first_name: employeeWithRole.first_name,
          last_name: employeeWithRole.last_name,
          name: `${employeeWithRole.first_name} ${employeeWithRole.last_name}`,
          email: employeeWithRole.email,
          role_id: employeeWithRole.role_id,
          role: employeeWithRole.role,
          department: employeeWithRole.department,
          branch_id: employeeWithRole.branch_id,
          photo_url: employeeWithRole.photo_url || null,
        },
      },
    });
  } catch (error) {
    console.error("Session validation error:", error);

    // Handle specific error types
    if (error.message.includes("Invalid user ID")) {
      return res.status(400).json({
        success: false,
        message: error.message,
        code: "INVALID_USER_ID",
      });
    }

    if (error.message.includes("not found")) {
      return res.status(404).json({
        success: false,
        message: "User account not found",
        code: "USER_NOT_FOUND",
      });
    }

    if (
      error.message.includes("Access denied") ||
      error.message.includes("deactivated") ||
      error.message.includes("inactive")
    ) {
      return res.status(403).json({
        success: false,
        message: error.message,
        code: "ACCESS_DENIED",
      });
    }

    res.status(500).json({
      success: false,
      message:
        "Session validation service is temporarily unavailable. Please try again.",
      code: "INTERNAL_SERVER_ERROR",
    });
  }
});

/**
 * @swagger
 * /api/auth/change-password:
 *   put:
 *     summary: Change user password with validation
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - user_id
 *               - new_password
 *             properties:
 *               user_id:
 *                 type: integer
 *               new_password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password updated successfully
 *       400:
 *         description: Bad request
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
router.put("/change-password", async (req, res) => {
  try {
    const { user_id, new_password } = req.body;

    if (!user_id) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
        code: "MISSING_USER_ID",
      });
    }

    if (!new_password) {
      return res.status(400).json({
        success: false,
        message: "New password is required",
        code: "MISSING_PASSWORD",
      });
    }

    if (isNaN(user_id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID format",
        code: "INVALID_USER_ID",
      });
    }

    await Employee.setPassword(user_id, new_password);

    res.json({
      success: true,
      message: "Password updated successfully",
      code: "PASSWORD_UPDATED",
    });
  } catch (error) {
    console.error("Change password error:", error);

    // Handle validation errors
    if (error.message.includes("validation failed")) {
      return res.status(400).json({
        success: false,
        message: error.message,
        code: "PASSWORD_VALIDATION_FAILED",
      });
    }

    if (error.message.includes("Invalid user ID")) {
      return res.status(400).json({
        success: false,
        message: error.message,
        code: "INVALID_USER_ID",
      });
    }

    if (error.message.includes("not found")) {
      return res.status(404).json({
        success: false,
        message: "User account not found",
        code: "USER_NOT_FOUND",
      });
    }

    if (error.message.includes("Cannot update")) {
      return res.status(403).json({
        success: false,
        message: error.message,
        code: "UPDATE_FORBIDDEN",
      });
    }

    res.status(500).json({
      success: false,
      message:
        "Password update service is temporarily unavailable. Please try again.",
      code: "INTERNAL_SERVER_ERROR",
    });
  }
});

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: Request password reset via email
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Password reset email sent
 *       400:
 *         description: Bad request
 *       404:
 *         description: Email not found
 *       500:
 *         description: Server error
 */
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    // Validate email
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email address is required",
        code: "MISSING_EMAIL",
      });
    }

    const trimmedEmail = email.trim().toLowerCase();
    if (trimmedEmail.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Email address cannot be empty",
        code: "EMPTY_EMAIL",
      });
    }

    // Check if user exists
    const employee = await Employee.findByEmail(trimmedEmail);
    if (!employee) {
      // Don't reveal if email exists or not for security
      return res.json({
        success: true,
        message: "If the email exists, a password reset link has been sent",
        code: "RESET_EMAIL_SENT",
      });
    }

    // Check if employee is active
    if (employee.deleted_at || !employee.is_active || employee.status !== "Active") {
      return res.json({
        success: true,
        message: "If the email exists, a password reset link has been sent",
        code: "RESET_EMAIL_SENT",
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now

    // Store reset token in database
    await db('employees')
      .where('id', employee.id)
      .update({
        reset_token: resetToken,
        reset_token_expiry: resetTokenExpiry,
        updated_at: new Date()
      });

    // Send password recovery email
    const emailResult = await EmailService.sendPasswordRecoveryEmail(
      trimmedEmail,
      resetToken,
      `${employee.first_name} ${employee.last_name}`
    );

    if (!emailResult.success) {
      console.error('Failed to send password recovery email:', emailResult.error);
      // Don't reveal email sending failure to user for security
    }

    res.json({
      success: true,
      message: "If the email exists, a password reset link has been sent",
      code: "RESET_EMAIL_SENT",
    });

  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({
      success: false,
      message: "Password reset service is temporarily unavailable. Please try again.",
      code: "INTERNAL_SERVER_ERROR",
    });
  }
});

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: Reset password using token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - new_password
 *             properties:
 *               token:
 *                 type: string
 *               new_password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password reset successfully
 *       400:
 *         description: Bad request - invalid or expired token
 *       404:
 *         description: Invalid reset token
 *       500:
 *         description: Server error
 */
router.post("/reset-password", async (req, res) => {
  try {
    const { token, new_password } = req.body;

    // Validate input
    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Reset token is required",
        code: "MISSING_TOKEN",
      });
    }

    if (!new_password) {
      return res.status(400).json({
        success: false,
        message: "New password is required",
        code: "MISSING_PASSWORD",
      });
    }

    // Find employee with valid reset token
    const employee = await db('employees')
      .where('reset_token', token)
      .where('reset_token_expiry', '>', new Date())
      .whereNull('deleted_at')
      .where('is_active', true)
      .where('status', 'Active')
      .first();

    if (!employee) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset token",
        code: "INVALID_TOKEN",
      });
    }

    // Update password and clear reset token
    await Employee.setPassword(employee.id, new_password);
    
    await db('employees')
      .where('id', employee.id)
      .update({
        reset_token: null,
        reset_token_expiry: null,
        updated_at: new Date()
      });

    res.json({
      success: true,
      message: "Password has been reset successfully",
      code: "PASSWORD_RESET_SUCCESS",
    });

  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({
      success: false,
      message: "Password reset service is temporarily unavailable. Please try again.",
      code: "INTERNAL_SERVER_ERROR",
    });
  }
});

/**
 * @swagger
 * /api/auth/validate-reset-token:
 *   post:
 *     summary: Validate password reset token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *     responses:
 *       200:
 *         description: Token is valid
 *       400:
 *         description: Invalid or expired token
 *       500:
 *         description: Server error
 */
router.post("/validate-reset-token", async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Reset token is required",
        code: "MISSING_TOKEN",
      });
    }

    // Check if token exists and is not expired
    const employee = await db('employees')
      .where('reset_token', token)
      .where('reset_token_expiry', '>', new Date())
      .whereNull('deleted_at')
      .where('is_active', true)
      .where('status', 'Active')
      .first();

    if (!employee) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset token",
        code: "INVALID_TOKEN",
      });
    }

    res.json({
      success: true,
      message: "Reset token is valid",
      code: "TOKEN_VALID",
      data: {
        email: employee.email,
        name: `${employee.first_name} ${employee.last_name}`
      }
    });

  } catch (error) {
    console.error("Validate reset token error:", error);
    res.status(500).json({
      success: false,
      message: "Token validation service is temporarily unavailable. Please try again.",
      code: "INTERNAL_SERVER_ERROR",
    });
  }
});

/**
 * @swagger
 * /api/auth/send-otp:
 *   post:
 *     summary: Send OTP code for password recovery
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: OTP sent successfully
 *       400:
 *         description: Bad request
 *       404:
 *         description: Email not found
 *       429:
 *         description: Too many requests - rate limited
 *       500:
 *         description: Server error
 */
router.post("/send-otp", async (req, res) => {
  try {
    const { email } = req.body;

    // Validate email
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email address is required",
        code: "MISSING_EMAIL",
      });
    }

    const trimmedEmail = email.trim().toLowerCase();
    if (trimmedEmail.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Email address cannot be empty",
        code: "EMPTY_EMAIL",
      });
    }

    // Check if user exists
    const employee = await Employee.findByEmail(trimmedEmail);
    if (!employee) {
      // Don't reveal if email exists or not for security
      return res.json({
        success: true,
        message: "If the email exists, an OTP code has been sent",
        code: "OTP_SENT",
      });
    }

    // Check if employee is active
    if (employee.deleted_at || !employee.is_active || employee.status !== "Active") {
      return res.json({
        success: true,
        message: "If the email exists, an OTP code has been sent",
        code: "OTP_SENT",
      });
    }

    // Check if there's already a valid OTP (rate limiting)
    const hasValidOTP = await OTP.hasValidOTP(trimmedEmail);
    if (hasValidOTP.success && hasValidOTP.hasValidOTP) {
      return res.status(429).json({
        success: false,
        message: "An OTP has already been sent. Please wait before requesting another one.",
        code: "OTP_ALREADY_SENT",
      });
    }

    // Generate and store OTP
    const otpResult = await OTP.create(trimmedEmail);
    if (!otpResult.success) {
      console.error('Failed to create OTP:', otpResult.error);
      return res.status(500).json({
        success: false,
        message: "Failed to generate OTP. Please try again.",
        code: "OTP_GENERATION_FAILED",
      });
    }

    // Send OTP email
    const emailResult = await EmailService.sendOTPEmail(
      trimmedEmail,
      otpResult.data.otp_code,
      `${employee.first_name} ${employee.last_name}`
    );

    if (!emailResult.success) {
      console.error('Failed to send OTP email:', emailResult.error);
      // Don't reveal email sending failure to user for security
    }

    res.json({
      success: true,
      message: "If the email exists, an OTP code has been sent",
      code: "OTP_SENT",
    });

  } catch (error) {
    console.error("Send OTP error:", error);
    res.status(500).json({
      success: false,
      message: "OTP service is temporarily unavailable. Please try again.",
      code: "INTERNAL_SERVER_ERROR",
    });
  }
});

/**
 * @swagger
 * /api/auth/verify-otp:
 *   post:
 *     summary: Verify OTP code for password recovery
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - otp_code
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               otp_code:
 *                 type: string
 *                 pattern: '^[0-9]{6}$'
 *     responses:
 *       200:
 *         description: OTP verified successfully
 *       400:
 *         description: Bad request - invalid or expired OTP
 *       500:
 *         description: Server error
 */
router.post("/verify-otp", async (req, res) => {
  try {
    const { email, otp_code } = req.body;

    // Validate input
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email address is required",
        code: "MISSING_EMAIL",
      });
    }

    if (!otp_code) {
      return res.status(400).json({
        success: false,
        message: "OTP code is required",
        code: "MISSING_OTP",
      });
    }

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedOTP = otp_code.trim();

    // Validate OTP format (6 digits)
    if (!/^[0-9]{6}$/.test(trimmedOTP)) {
      return res.status(400).json({
        success: false,
        message: "OTP code must be 6 digits",
        code: "INVALID_OTP_FORMAT",
      });
    }

    // Verify OTP
    const verifyResult = await OTP.verify(trimmedEmail, trimmedOTP);
    if (!verifyResult.success) {
      return res.status(400).json({
        success: false,
        message: verifyResult.message,
        code: verifyResult.code || "INVALID_OTP",
      });
    }

    res.json({
      success: true,
      message: "OTP verified successfully",
      code: "OTP_VERIFIED",
    });

  } catch (error) {
    console.error("Verify OTP error:", error);
    res.status(500).json({
      success: false,
      message: "OTP verification service is temporarily unavailable. Please try again.",
      code: "INTERNAL_SERVER_ERROR",
    });
  }
});

/**
 * @swagger
 * /api/auth/reset-password-with-otp:
 *   post:
 *     summary: Reset password using OTP verification
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - otp_code
 *               - new_password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               otp_code:
 *                 type: string
 *                 pattern: '^[0-9]{6}$'
 *               new_password:
 *                 type: string
 *                 minLength: 6
 *     responses:
 *       200:
 *         description: Password reset successfully
 *       400:
 *         description: Bad request - invalid OTP or weak password
 *       500:
 *         description: Server error
 */
router.post("/reset-password-with-otp", async (req, res) => {
  try {
    const { email, otp_code, new_password } = req.body;

    // Validate input
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email address is required",
        code: "MISSING_EMAIL",
      });
    }

    if (!otp_code) {
      return res.status(400).json({
        success: false,
        message: "OTP code is required",
        code: "MISSING_OTP",
      });
    }

    if (!new_password) {
      return res.status(400).json({
        success: false,
        message: "New password is required",
        code: "MISSING_PASSWORD",
      });
    }

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedOTP = otp_code.trim();

    // Validate OTP format (6 digits)
    if (!/^[0-9]{6}$/.test(trimmedOTP)) {
      return res.status(400).json({
        success: false,
        message: "OTP code must be 6 digits",
        code: "INVALID_OTP_FORMAT",
      });
    }

    // Validate password strength
    if (new_password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long",
        code: "WEAK_PASSWORD",
      });
    }

    // Verify OTP first
    const verifyResult = await OTP.verify(trimmedEmail, trimmedOTP);
    if (!verifyResult.success) {
      return res.status(400).json({
        success: false,
        message: verifyResult.message,
        code: verifyResult.code || "INVALID_OTP",
      });
    }

    // Get employee details
    const employee = await Employee.findByEmail(trimmedEmail);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "User account not found",
        code: "USER_NOT_FOUND",
      });
    }

    // Update password
    await Employee.setPassword(employee.id, new_password);

    res.json({
      success: true,
      message: "Password has been reset successfully",
      code: "PASSWORD_RESET_SUCCESS",
    });

  } catch (error) {
    console.error("Reset password with OTP error:", error);
    res.status(500).json({
      success: false,
      message: "Password reset service is temporarily unavailable. Please try again.",
      code: "INTERNAL_SERVER_ERROR",
    });
  }
});

/**
 * @swagger
 * /api/auth/otp-stats:
 *   get:
 *     summary: Get OTP statistics (admin only)
 *     tags: [Authentication]
 *     responses:
 *       200:
 *         description: OTP statistics retrieved
 *       500:
 *         description: Server error
 */
router.get("/otp-stats", async (req, res) => {
  try {
    const statsResult = await OTP.getStats();
    if (!statsResult.success) {
      return res.status(500).json({
        success: false,
        message: "Failed to retrieve OTP statistics",
        code: "STATS_RETRIEVAL_FAILED",
      });
    }

    res.json({
      success: true,
      message: "OTP statistics retrieved successfully",
      code: "STATS_RETRIEVED",
      data: statsResult.data,
    });

  } catch (error) {
    console.error("OTP stats error:", error);
    res.status(500).json({
      success: false,
      message: "Statistics service is temporarily unavailable",
      code: "INTERNAL_SERVER_ERROR",
    });
  }
});

/**
 * @swagger
 * /api/auth/cleanup-otp:
 *   post:
 *     summary: Clean up expired OTPs (admin only)
 *     tags: [Authentication]
 *     responses:
 *       200:
 *         description: Expired OTPs cleaned up
 *       500:
 *         description: Server error
 */
router.post("/cleanup-otp", async (req, res) => {
  try {
    const cleanupResult = await OTP.cleanupExpiredOTPs();
    if (!cleanupResult.success) {
      return res.status(500).json({
        success: false,
        message: "Failed to cleanup expired OTPs",
        code: "CLEANUP_FAILED",
      });
    }

    res.json({
      success: true,
      message: cleanupResult.message,
      code: "CLEANUP_SUCCESS",
      data: {
        deletedCount: cleanupResult.deletedCount,
      },
    });

  } catch (error) {
    console.error("OTP cleanup error:", error);
    res.status(500).json({
      success: false,
      message: "Cleanup service is temporarily unavailable",
      code: "INTERNAL_SERVER_ERROR",
    });
  }
});

module.exports = router;
