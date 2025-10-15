const express = require("express");
const BoardMember = require("../models/BoardMember");
const jwt = require("jsonwebtoken");
const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     BoardLoginRequest:
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
 *     BoardAuthResponse:
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
 *               type: object
 *             token:
 *               type: string
 */

/**
 * @swagger
 * /api/board-auth/login:
 *   post:
 *     summary: Authenticate board member
 *     tags: [Board Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BoardLoginRequest'
 *     responses:
 *       200:
 *         description: Login successful
 *       400:
 *         description: Bad request - validation errors
 *       401:
 *         description: Authentication failed
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

    const authResult = await BoardMember.authenticate(trimmedEmail, password);

    if (!authResult.success) {
      return res.status(401).json({
        success: false,
        message: authResult.message,
        code: authResult.code || "INVALID_CREDENTIALS",
      });
    }

    const member = authResult.member;

    // Generate JWT token
    const token = jwt.sign(
      {
        id: member.id,
        board_id: member.board_id,
        email: member.email,
        position: member.position,
        department: member.department,
        first_name: member.first_name,
        last_name: member.last_name,
        user_type: "board_member", // Distinguish from employee tokens
      },
      process.env.JWT_SECRET || "your-secret-key",
      {
        expiresIn: "24h",
      }
    );

    res.json({
      success: true,
      message: "Board login successful",
      data: {
        user: member,
        token: token,
      },
    });
  } catch (error) {
    console.error("Board login error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error during login",
      code: "LOGIN_ERROR",
    });
  }
});

/**
 * @swagger
 * /api/board-auth/validate-session:
 *   post:
 *     summary: Validate board member session
 *     tags: [Board Authentication]
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
        message: "Board member ID is required",
        code: "MISSING_USER_ID",
      });
    }

    if (isNaN(user_id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid board member ID format",
        code: "INVALID_USER_ID",
      });
    }

    const member = await BoardMember.getById(user_id);

    if (!member) {
      return res.status(404).json({
        success: false,
        message: "Board member account not found",
        code: "USER_NOT_FOUND",
      });
    }

    // Check if member is active
    if (member.deleted_at) {
      return res.status(403).json({
        success: false,
        message: "Board member account has been deactivated",
        code: "ACCOUNT_DEACTIVATED",
      });
    }

    if (!member.is_active) {
      return res.status(403).json({
        success: false,
        message: "Board member account is currently inactive",
        code: "ACCOUNT_INACTIVE",
      });
    }

    // Return member data without password
    const { password, ...memberData } = member;

    res.json({
      success: true,
      message: "Session is valid",
      data: {
        user: memberData,
      },
    });
  } catch (error) {
    console.error("Board session validation error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error during session validation",
      code: "SESSION_VALIDATION_ERROR",
    });
  }
});

/**
 * @swagger
 * /api/board-auth/logout:
 *   post:
 *     summary: Logout board member
 *     tags: [Board Authentication]
 *     responses:
 *       200:
 *         description: Logout successful
 */
router.post("/logout", async (req, res) => {
  try {
    // For JWT tokens, logout is handled client-side by removing the token
    // We could implement token blacklisting here if needed
    res.json({
      success: true,
      message: "Board logout successful",
    });
  } catch (error) {
    console.error("Board logout error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error during logout",
      code: "LOGOUT_ERROR",
    });
  }
});

module.exports = router;
