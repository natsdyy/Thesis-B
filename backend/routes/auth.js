const express = require("express");
const User = require("../models/User");
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

    const authResult = await User.authenticate(trimmedEmail, password);

    if (!authResult.success) {
      let statusCode;
      
      switch (authResult.code) {
        case "MISSING_CREDENTIALS":
        case "INVALID_EMAIL_FORMAT":
          statusCode = 400;
          break;
        case "INVALID_CREDENTIALS":
          statusCode = 401;
          break;
        case "ACCOUNT_DEACTIVATED":
        case "ACCOUNT_INACTIVE":
        case "NO_ROLE_ASSIGNED":
        case "ROLE_DELETED":
        case "ROLE_DEACTIVATED":
          statusCode = 403;
          break;
        case "AUTHENTICATION_ERROR":
        case "ROLE_VALIDATION_ERROR":
          statusCode = 500;
          break;
        default:
          statusCode = 401;
      }

      return res.status(statusCode).json({
        success: false,
        message: authResult.message,
        code: authResult.code,
      });
    }

    // Get user with permissions
    const userWithPermissions = await User.getWithPermissions(authResult.user.id);

    res.json({
      success: true,
      message: authResult.message,
      code: authResult.code,
      data: {
        user: userWithPermissions,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    
    // Handle specific error types
    if (error.message.includes("Access denied") || 
        error.message.includes("deactivated") ||
        error.message.includes("inactive")) {
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
      message: "Authentication service is temporarily unavailable. Please try again.",
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
        message: "User ID is required",
        code: "MISSING_USER_ID",
      });
    }

    if (isNaN(user_id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID format",
        code: "INVALID_USER_ID",
      });
    }

    const user = await User.getById(user_id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User account not found",
        code: "USER_NOT_FOUND",
      });
    }

    // Check if user is active
    if (user.deleted_at) {
      return res.status(403).json({
        success: false,
        message: "User account has been deactivated",
        code: "ACCOUNT_DEACTIVATED",
      });
    }

    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: "User account is currently inactive",
        code: "ACCOUNT_INACTIVE",
      });
    }

    // Validate user role
    const roleValidation = await User.validateUserRole(user);
    if (!roleValidation.valid) {
      let message;
      switch (roleValidation.code) {
        case "NO_ROLE_ASSIGNED":
          message = "No role has been assigned to your account. Please contact your administrator.";
          break;
        case "ROLE_DELETED":
          message = "Your assigned role has been removed. Please contact your administrator for role reassignment.";
          break;
        case "ROLE_DEACTIVATED":
          message = "Your assigned role has been temporarily deactivated. Please contact your administrator.";
          break;
        case "ROLE_VALIDATION_ERROR":
          message = "Unable to verify your role permissions. Please try again or contact your administrator.";
          break;
        default:
          message = `Access denied: ${roleValidation.reason}. Please contact your administrator.`;
      }

      return res.status(403).json({
        success: false,
        message,
        code: roleValidation.code,
      });
    }

    // Get updated user with permissions
    const userWithPermissions = await User.getWithPermissions(user_id);

    res.json({
      success: true,
      message: "Session is valid",
      code: "SESSION_VALID",
      data: {
        user: userWithPermissions,
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

    if (error.message.includes("Access denied") || 
        error.message.includes("deactivated") ||
        error.message.includes("inactive")) {
      return res.status(403).json({
        success: false,
        message: error.message,
        code: "ACCESS_DENIED",
      });
    }

    res.status(500).json({
      success: false,
      message: "Session validation service is temporarily unavailable. Please try again.",
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

    const user = await User.updatePassword(user_id, new_password);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
        code: "USER_NOT_FOUND",
      });
    }

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
      message: "Password update service is temporarily unavailable. Please try again.",
      code: "INTERNAL_SERVER_ERROR",
    });
  }
});

module.exports = router;
