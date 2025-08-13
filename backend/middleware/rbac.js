const Roles = require("../models/Roles");
const RolePermission = require("../models/RolePermission");

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
  requirePermission,
  requireAnyPermission,
  getUserPermissions,
};
