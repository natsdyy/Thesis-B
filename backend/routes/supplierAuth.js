const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const Supplier = require("../models/Supplier");
const crypto = require("crypto");
const EmailService = require("../services/emailService");
const { db } = require("../config/database");

// Middleware to authenticate supplier JWT token
function authenticateSupplierToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Access token required",
      code: "TOKEN_REQUIRED",
    });
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "your-secret-key"
    );

    // Check if this is a supplier token
    if (decoded.type !== "supplier") {
      return res.status(403).json({
        success: false,
        message: "Invalid token type for supplier access",
        code: "INVALID_TOKEN_TYPE",
      });
    }

    req.supplier = decoded;
    next();
  } catch (error) {
    return res.status(403).json({
      success: false,
      message: "Invalid or expired token",
      code: "INVALID_TOKEN",
    });
  }
}

/**
 * @swagger
 * tags:
 *   name: Supplier Auth
 *   description: Supplier authentication endpoints
 */

/**
 * @swagger
 * /api/supplier-auth/login:
 *   post:
 *     summary: Supplier login
 *     tags: [Supplier Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
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

    // Authenticate supplier
    const authResult = await Supplier.authenticate(trimmedEmail, password);

    if (!authResult.success) {
      return res.status(401).json({
        success: false,
        message: authResult.message,
        code: authResult.code,
      });
    }

    const supplier = authResult.supplier;

    // Generate JWT token
    const token = jwt.sign(
      {
        id: supplier.id,
        email: supplier.email,
        name: supplier.name,
        type: "supplier", // Important: mark this as a supplier token
        category: supplier.category,
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
        supplier: {
          id: supplier.id,
          name: supplier.name,
          email: supplier.email,
          contact_person: supplier.contact_person,
          phone: supplier.phone,
          address: supplier.address,
          category: supplier.category,
          status: supplier.status,
        },
        token: token,
      },
    });
  } catch (error) {
    console.error("Supplier login error:", error);

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
 * /api/supplier-auth/validate-session:
 *   post:
 *     summary: Validate supplier session
 *     tags: [Supplier Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - supplier_id
 *             properties:
 *               supplier_id:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Session valid
 *       401:
 *         description: Session invalid
 *       500:
 *         description: Server error
 */
router.post("/validate-session", async (req, res) => {
  try {
    const { supplier_id } = req.body;

    if (!supplier_id) {
      return res.status(400).json({
        success: false,
        message: "Supplier ID is required",
        code: "MISSING_SUPPLIER_ID",
      });
    }

    // Get supplier details
    const supplier = await Supplier.getById(supplier_id);

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: "Supplier not found",
        code: "SUPPLIER_NOT_FOUND",
      });
    }

    // Check if supplier is active
    if (supplier.deleted_at) {
      return res.status(403).json({
        success: false,
        message: "Supplier account has been deactivated",
        code: "ACCOUNT_DEACTIVATED",
      });
    }

    if (!supplier.is_active) {
      return res.status(403).json({
        success: false,
        message: "Supplier account is currently inactive",
        code: "ACCOUNT_INACTIVE",
      });
    }

    if (supplier.status !== "Active") {
      return res.status(403).json({
        success: false,
        message: "Supplier account is not active",
        code: "ACCOUNT_NOT_ACTIVE",
      });
    }

    // Remove password from response
    const { password: _, ...supplierWithoutPassword } = supplier;

    res.json({
      success: true,
      message: "Session is valid",
      code: "SESSION_VALID",
      data: {
        supplier: supplierWithoutPassword,
      },
    });
  } catch (error) {
    console.error("Supplier session validation error:", error);

    res.status(500).json({
      success: false,
      message: "Session validation failed. Please try again.",
      code: "INTERNAL_SERVER_ERROR",
    });
  }
});

/**
 * @swagger
 * /api/supplier-auth/change-password:
 *   post:
 *     summary: Change supplier password
 *     tags: [Supplier Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - supplier_id
 *               - old_password
 *               - new_password
 *             properties:
 *               supplier_id:
 *                 type: integer
 *               old_password:
 *                 type: string
 *               new_password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Invalid old password
 *       500:
 *         description: Server error
 */
router.post("/change-password", async (req, res) => {
  try {
    const { supplier_id, old_password, new_password } = req.body;

    // Validation
    if (!supplier_id || !old_password || !new_password) {
      return res.status(400).json({
        success: false,
        message: "Supplier ID, old password, and new password are required",
        code: "MISSING_FIELDS",
      });
    }

    if (new_password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 6 characters long",
        code: "INVALID_PASSWORD",
      });
    }

    // Get supplier
    const supplier = await Supplier.getById(supplier_id);

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: "Supplier not found",
        code: "SUPPLIER_NOT_FOUND",
      });
    }

    // Verify old password
    const isValidPassword = await Supplier.verifyPassword(
      old_password,
      supplier.password
    );

    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect",
        code: "INVALID_OLD_PASSWORD",
      });
    }

    // Update password
    await Supplier.updatePassword(supplier_id, new_password);

    res.json({
      success: true,
      message: "Password changed successfully",
      code: "PASSWORD_CHANGED",
    });
  } catch (error) {
    console.error("Supplier password change error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to change password. Please try again.",
      code: "INTERNAL_SERVER_ERROR",
    });
  }
});

/**
 * @swagger
 * /api/supplier-auth/profile:
 *   get:
 *     summary: Get supplier profile
 *     tags: [Supplier Auth]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: supplier_id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Supplier profile retrieved successfully
 *       404:
 *         description: Supplier not found
 *       500:
 *         description: Server error
 */
router.get("/profile", async (req, res) => {
  try {
    const { supplier_id } = req.query;

    if (!supplier_id) {
      return res.status(400).json({
        success: false,
        message: "Supplier ID is required",
        code: "MISSING_SUPPLIER_ID",
      });
    }

    const supplier = await Supplier.getById(supplier_id);

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: "Supplier not found",
        code: "SUPPLIER_NOT_FOUND",
      });
    }

    // Remove password from response
    const { password: _, ...supplierWithoutPassword } = supplier;

    res.json({
      success: true,
      message: "Supplier profile retrieved successfully",
      code: "PROFILE_RETRIEVED",
      data: {
        supplier: supplierWithoutPassword,
      },
    });
  } catch (error) {
    console.error("Supplier profile retrieval error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to retrieve profile. Please try again.",
      code: "INTERNAL_SERVER_ERROR",
    });
  }
});

/**
 * @swagger
 * /api/supplier-auth/profile:
 *   put:
 *     summary: Update supplier profile
 *     tags: [Supplier Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - supplier_id
 *               - name
 *               - contact_person
 *               - email
 *               - phone
 *             properties:
 *               supplier_id:
 *                 type: integer
 *               name:
 *                 type: string
 *               contact_person:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               phone:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: Supplier not found
 *       500:
 *         description: Server error
 */
router.put("/profile", authenticateSupplierToken, async (req, res) => {
  try {
    const { supplier_id, name, contact_person, email, phone } = req.body;

    // Validation
    if (!supplier_id) {
      return res.status(400).json({
        success: false,
        message: "Supplier ID is required",
        code: "MISSING_SUPPLIER_ID",
      });
    }

    // Security check: Ensure supplier can only update their own profile
    if (parseInt(supplier_id) !== parseInt(req.supplier.id)) {
      return res.status(403).json({
        success: false,
        message: "Access denied: You can only update your own profile",
        code: "ACCESS_DENIED",
      });
    }

    if (!name || !contact_person || !email || !phone) {
      return res.status(400).json({
        success: false,
        message: "Name, contact person, email, and phone are required",
        code: "MISSING_REQUIRED_FIELDS",
      });
    }

    // Validate email format
    if (!Supplier.isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email address format",
        code: "INVALID_EMAIL",
      });
    }

    // Update profile
    const updatedSupplier = await Supplier.updateProfile(supplier_id, {
      name,
      contact_person,
      email,
      phone,
    });

    res.json({
      success: true,
      message: "Profile updated successfully",
      code: "PROFILE_UPDATED",
      data: {
        supplier: updatedSupplier,
      },
    });
  } catch (error) {
    console.error("Supplier profile update error:", error);

    // Handle specific validation errors
    if (
      error.message.includes("required") ||
      error.message.includes("Invalid email") ||
      error.message.includes("already in use")
    ) {
      return res.status(400).json({
        success: false,
        message: error.message,
        code: "VALIDATION_ERROR",
      });
    }

    if (error.message.includes("not found")) {
      return res.status(404).json({
        success: false,
        message: error.message,
        code: "SUPPLIER_NOT_FOUND",
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to update profile. Please try again.",
      code: "INTERNAL_SERVER_ERROR",
    });
  }
});

/**
 * @swagger
 * /api/supplier-auth/forgot-password:
 *   post:
 *     summary: Request password reset via email for suppliers
 *     tags: [Supplier Auth]
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

    // Check if supplier exists
    const supplier = await Supplier.findByEmail(trimmedEmail);
    if (!supplier) {
      // Don't reveal if email exists or not for security
      return res.json({
        success: true,
        message: "If the email exists, a password reset link has been sent",
        code: "RESET_EMAIL_SENT",
      });
    }

    // Check if supplier is active
    if (supplier.deleted_at || !supplier.is_active || supplier.status !== "Active") {
      return res.json({
        success: true,
        message: "If the email exists, a password reset link has been sent",
        code: "RESET_EMAIL_SENT",
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now

    // Store reset token in database
    await db("suppliers").where("id", supplier.id).update({
      reset_token: resetToken,
      reset_token_expiry: resetTokenExpiry,
      updated_at: new Date(),
    });

    // Send password recovery email with timeout
    try {
      // Use supplier-specific reset URL
      const frontendUrl =
        process.env.FRONTEND_URL ||
        (process.env.NODE_ENV === "production"
          ? "https://www.countryside-steakhouse.site"
          : "http://localhost:8080");
      const resetUrl = `${frontendUrl}/supplier/reset-password?token=${resetToken}`;

      // Send email directly with custom reset URL
      const emailData = {
        to: trimmedEmail,
        subject: "Password Recovery - Countryside Steak House",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #2c3e50; margin-bottom: 10px;">Countryside Steak House</h1>
              <h2 style="color: #e74c3c; margin: 0;">Ang Paborito ng Bayan</h2>
            </div>
            
            <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px; margin-bottom: 20px;">
              <h3 style="color: #2c3e50; margin-top: 0;">Password Recovery Request</h3>
              
              <p style="color: #555; font-size: 16px; line-height: 1.6;">
                Hello ${supplier.contact_person || supplier.name},
              </p>
              
              <p style="color: #555; font-size: 16px; line-height: 1.6;">
                We received a request to reset your password for your Countryside Steak House Supplier Portal account. 
                If you made this request, click the button below to reset your password:
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${resetUrl}" 
                   style="background-color: #e74c3c; color: white; padding: 15px 30px; 
                          text-decoration: none; border-radius: 5px; font-weight: bold; 
                          display: inline-block; font-size: 16px;">
                  Reset My Password
                </a>
              </div>
              
              <p style="color: #666; font-size: 14px; line-height: 1.5;">
                If the button doesn't work, copy and paste this link into your browser:<br>
                <a href="${resetUrl}" style="color: #e74c3c; word-break: break-all;">${resetUrl}</a>
              </p>
              
              <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; 
                          padding: 15px; border-radius: 5px; margin-top: 20px;">
                <p style="color: #856404; margin: 0; font-size: 14px;">
                  <strong>Security Note:</strong> This link will expire in 1 hour for your security. 
                  If you didn't request this password reset, please ignore this email.
                </p>
              </div>
            </div>
            
            <div style="text-align: center; color: #666; font-size: 12px; margin-top: 20px;">
              <p>© 2025 Countryside Steak House. All rights reserved.</p>
              <p>This is an automated message, please do not reply to this email.</p>
            </div>
          </div>
        `,
        text: `
          Password Recovery - Countryside Steak House
            
          Hello ${supplier.contact_person || supplier.name},
            
          We received a request to reset your password for your Countryside Steak House Supplier Portal account.
          If you made this request, click the link below to reset your password:
            
          ${resetUrl}
            
          This link will expire in 1 hour for your security.
          If you didn't request this password reset, please ignore this email.
            
          © 2025 Countryside Steak House. All rights reserved.
        `,
      };

      const emailPromise = EmailService.sendEmailWithFallback(emailData);

      // Add 30-second timeout for email sending
      const emailResult = await Promise.race([
        emailPromise,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Email sending timeout")), 30000)
        ),
      ]);

      if (!emailResult.success) {
        console.error(
          "Failed to send password recovery email:",
          emailResult.error
        );
        // Don't reveal email sending failure to user for security
      }
    } catch (emailError) {
      console.error("Email sending failed or timed out:", emailError.message);
      // Don't reveal email sending failure to user for security
    }

    res.json({
      success: true,
      message: "If the email exists, a password reset link has been sent",
      code: "RESET_EMAIL_SENT",
    });
  } catch (error) {
    console.error("Supplier forgot password error:", error);
    res.status(500).json({
      success: false,
      message:
        "Password reset service is temporarily unavailable. Please try again.",
      code: "INTERNAL_SERVER_ERROR",
    });
  }
});

/**
 * @swagger
 * /api/supplier-auth/validate-reset-token:
 *   post:
 *     summary: Validate supplier password reset token
 *     tags: [Supplier Auth]
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
 *         description: Bad request - invalid or expired token
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

    // Find supplier with valid reset token
    const supplier = await db("suppliers")
      .where("reset_token", token)
      .where("reset_token_expiry", ">", new Date())
      .whereNull("deleted_at")
      .where("is_active", true)
      .where("status", "Active")
      .first();

    if (!supplier) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset token",
        code: "INVALID_TOKEN",
      });
    }

    // Remove password and token from response for security
    const { password: _, reset_token: __, ...supplierData } = supplier;

    res.json({
      success: true,
      message: "Reset token is valid",
      code: "TOKEN_VALID",
      data: {
        email: supplierData.email,
        name: supplierData.name,
      },
    });
  } catch (error) {
    console.error("Supplier validate reset token error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to validate reset token. Please try again.",
      code: "INTERNAL_SERVER_ERROR",
    });
  }
});

/**
 * @swagger
 * /api/supplier-auth/reset-password:
 *   post:
 *     summary: Reset supplier password using token
 *     tags: [Supplier Auth]
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

    if (new_password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 6 characters long",
        code: "INVALID_PASSWORD",
      });
    }

    // Find supplier with valid reset token
    const supplier = await db("suppliers")
      .where("reset_token", token)
      .where("reset_token_expiry", ">", new Date())
      .whereNull("deleted_at")
      .where("is_active", true)
      .where("status", "Active")
      .first();

    if (!supplier) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset token",
        code: "INVALID_TOKEN",
      });
    }

    // Update password and clear reset token
    await Supplier.updatePassword(supplier.id, new_password);

    await db("suppliers").where("id", supplier.id).update({
      reset_token: null,
      reset_token_expiry: null,
      updated_at: new Date(),
    });

    res.json({
      success: true,
      message: "Password has been reset successfully",
      code: "PASSWORD_RESET_SUCCESS",
    });
  } catch (error) {
    console.error("Supplier reset password error:", error);
    res.status(500).json({
      success: false,
      message:
        "Password reset service is temporarily unavailable. Please try again.",
      code: "INTERNAL_SERVER_ERROR",
    });
  }
});

module.exports = router;
