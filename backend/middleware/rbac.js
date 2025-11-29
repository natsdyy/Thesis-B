const Roles = require("../models/Roles");
const RolePermission = require("../models/RolePermission");
const Employee = require("../models/Employee");
const jwt = require("jsonwebtoken");

// Middleware to authenticate JWT token
function authenticateToken(req, res, next) {
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
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({
      success: false,
      message: "Invalid or expired token",
      code: "INVALID_TOKEN",
    });
  }
}

// Middleware to check if user has required permission
function requirePermission(permissionName) {
  return async (req, res, next) => {
    try {
      // Assuming you'll have user authentication middleware that sets req.user
      const { user } = req;

      if (!user) {
        return res.status(401).json({
          success: false,
          message: "Authentication required",
          code: "AUTHENTICATION_REQUIRED",
        });
      }

      // Always allow Super Admin and Board Members
      if (user.role === "Super Admin" || user.role_id === 1) {
        return next();
      }

      // Allow Board Members (Chairman of the Board, Board of Directors)
      const isBoardMember =
        user.user_type === "board_member" ||
        user.board_id ||
        user.position?.includes("Board") ||
        user.position?.includes("Chairman") ||
        user.position === "Chairman of the Board";

      if (isBoardMember) {
        return next();
      }

      if (!user.role_id) {
        return res.status(403).json({
          success: false,
          message: "User has no role assigned",
          code: "NO_ROLE_ASSIGNED",
        });
      }

      // Check if user's role has the required permission
      const hasPermission = await Roles.hasPermission(
        user.role_id,
        permissionName
      );

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: "Insufficient permissions",
          code: "INSUFFICIENT_PERMISSIONS",
          required_permission: permissionName,
        });
      }

      // User has permission, continue
      next();
    } catch (error) {
      console.error("Error checking permission:", error);
      res.status(500).json({
        success: false,
        message: "Error checking permissions",
        error: error.message,
      });
    }
  };
}

// Middleware to check if user has any of the required permissions
function requireAnyPermission(permissionNames) {
  return async (req, res, next) => {
    try {
      const { user } = req;

      if (!user) {
        return res.status(401).json({
          success: false,
          message: "Authentication required",
          code: "AUTHENTICATION_REQUIRED",
        });
      }

      // Always allow Super Admin and Board Members
      if (user.role === "Super Admin" || user.role_id === 1) {
        return next();
      }

      // Allow Board Members (Chairman of the Board, Board of Directors)
      const isBoardMember =
        user.user_type === "board_member" ||
        user.board_id ||
        user.position?.includes("Board") ||
        user.position?.includes("Chairman") ||
        user.position === "Chairman of the Board";

      if (isBoardMember) {
        return next();
      }

      if (!user.role_id) {
        return res.status(403).json({
          success: false,
          message: "User has no role assigned",
          code: "NO_ROLE_ASSIGNED",
        });
      }

      // Check if user's role has any of the required permissions
      let hasAnyPermission = false;
      for (const permissionName of permissionNames) {
        const hasPermission = await Roles.hasPermission(
          user.role_id,
          permissionName
        );
        if (hasPermission) {
          hasAnyPermission = true;
          break;
        }
      }

      if (!hasAnyPermission) {
        return res.status(403).json({
          success: false,
          message: "Insufficient permissions",
          code: "INSUFFICIENT_PERMISSIONS",
          required_permissions: permissionNames,
        });
      }

      // User has at least one required permission, continue
      next();
    } catch (error) {
      console.error("Error checking permissions:", error);
      res.status(500).json({
        success: false,
        message: "Error checking permissions",
        error: error.message,
      });
    }
  };
}

// Helper function to get user permissions (for frontend use)
async function getUserPermissions(roleId) {
  try {
    const permissions = await RolePermission.getPermissionsByRole(roleId);
    return permissions.map((perm) => perm.permission_name);
  } catch (error) {
    console.error("Error getting user permissions:", error);
    return [];
  }
}

module.exports = {
  authenticateToken,
  requirePermission,
  requireAnyPermission,
  getUserPermissions,
};
