const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const Supplier = require("../models/Supplier");

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

module.exports = router;
