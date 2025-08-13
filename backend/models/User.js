const { db } = require("../config/database");
const bcrypt = require("bcryptjs");

class User {
  // Get all users with their roles
  static async getAll(includeDeleted = false) {
    try {
      let query = db("users")
        .leftJoin("user_roles", "users.role_id", "user_roles.role_id")
        .select(
          "users.*",
          "user_roles.role",
          "user_roles.department",
          "user_roles.description as role_description",
          "user_roles.is_active as role_is_active",
          "user_roles.deleted_at as role_deleted_at"
        );

      if (!includeDeleted) {
        query = query.whereNull("users.deleted_at");
      }

      const users = await query.orderBy("users.created_at", "desc");
      return users;
    } catch (error) {
      console.error("Error fetching users:", error);
      throw new Error("Failed to retrieve users from database");
    }
  }

  // Get user by ID with role information
  static async getById(id) {
    try {
      if (!id || isNaN(id)) {
        throw new Error("Invalid user ID provided");
      }

      const user = await db("users")
        .leftJoin("user_roles", "users.role_id", "user_roles.role_id")
        .select(
          "users.*",
          "user_roles.role",
          "user_roles.department",
          "user_roles.description as role_description",
          "user_roles.is_active as role_is_active",
          "user_roles.deleted_at as role_deleted_at"
        )
        .where("users.id", id)
        .first();

      return user;
    } catch (error) {
      console.error("Error fetching user by ID:", error);
      if (error.message === "Invalid user ID provided") {
        throw error;
      }
      throw new Error("Failed to retrieve user information");
    }
  }

  // Get user by email (for authentication) - with role validation
  static async getByEmail(email) {
    try {
      if (!email || !this.isValidEmail(email)) {
        throw new Error("Invalid email address format");
      }

      const user = await db("users")
        .leftJoin("user_roles", "users.role_id", "user_roles.role_id")
        .select(
          "users.*",
          "user_roles.role",
          "user_roles.department",
          "user_roles.description as role_description",
          "user_roles.is_active as role_is_active",
          "user_roles.deleted_at as role_deleted_at"
        )
        .where("users.email", email.toLowerCase().trim())
        .whereNull("users.deleted_at")
        .where("users.is_active", true)
        .first();

      return user;
    } catch (error) {
      console.error("Error fetching user by email:", error);
      if (error.message === "Invalid email address format") {
        throw error;
      }
      throw new Error("Failed to retrieve user account");
    }
  }

  // Email validation helper
  static isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Password validation helper
  static validatePassword(password) {
    const errors = [];

    if (!password) {
      errors.push("Password is required");
    } else {
      if (password.length < 6) {
        errors.push("Password must be at least 6 characters long");
      }
      if (password.length > 100) {
        errors.push("Password must not exceed 100 characters");
      }
      if (!/[a-zA-Z]/.test(password)) {
        errors.push("Password must contain at least one letter");
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // Check if user has valid role for authentication
  static async validateUserRole(user) {
    try {
      if (!user) {
        return {
          valid: false,
          reason: "User account not found",
          code: "USER_NOT_FOUND",
        };
      }

      if (!user.role_id) {
        return {
          valid: false,
          reason: "No role assigned to your account",
          code: "NO_ROLE_ASSIGNED",
        };
      }

      // Check if role is deleted
      if (user.role_deleted_at) {
        return {
          valid: false,
          reason: "Your assigned role has been removed",
          code: "ROLE_DELETED",
        };
      }

      // Check if role is active
      if (user.role_is_active === false) {
        return {
          valid: false,
          reason: "Your assigned role has been deactivated",
          code: "ROLE_DEACTIVATED",
        };
      }

      return { valid: true, reason: null, code: "VALID" };
    } catch (error) {
      console.error("Error validating user role:", error);
      return {
        valid: false,
        reason: "Unable to verify role permissions",
        code: "ROLE_VALIDATION_ERROR",
      };
    }
  }

  // Create new user
  static async create({
    name,
    email,
    password = "admin123",
    role_id = null,
    department = null,
  }) {
    try {
      // Validate input
      if (!name || name.trim().length === 0) {
        throw new Error("Name is required and cannot be empty");
      }

      if (!email || !this.isValidEmail(email)) {
        throw new Error("Valid email address is required");
      }

      const passwordValidation = this.validatePassword(password);
      if (!passwordValidation.isValid) {
        throw new Error(
          `Password validation failed: ${passwordValidation.errors.join(", ")}`
        );
      }

      if (name.trim().length > 255) {
        throw new Error("Name must not exceed 255 characters");
      }

      // Check if email already exists
      const existingUser = await db("users")
        .where("email", email.toLowerCase().trim())
        .whereNull("deleted_at")
        .first();

      if (existingUser) {
        throw new Error("An account with this email address already exists");
      }

      // Validate role if provided
      if (role_id) {
        const role = await db("user_roles").where("role_id", role_id).first();
        if (!role) {
          throw new Error("Invalid role selected");
        }
        if (role.deleted_at) {
          throw new Error("Cannot assign a deleted role");
        }
        if (!role.is_active) {
          throw new Error("Cannot assign an inactive role");
        }
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      const [user] = await db("users")
        .insert({
          name: name.trim(),
          email: email.toLowerCase().trim(),
          password: hashedPassword,
          role_id,
          department: department ? department.trim() : null,
          created_at: new Date(),
          updated_at: new Date(),
        })
        .returning("*");

      return user;
    } catch (error) {
      console.error("Error creating user:", error);

      // Handle specific database errors
      if (error.code === "23505" && error.constraint === "users_email_unique") {
        throw new Error("An account with this email address already exists");
      }

      if (error.code === "23503") {
        throw new Error("Invalid role or department selected");
      }

      // Re-throw validation errors
      if (
        error.message.includes("validation failed") ||
        error.message.includes("is required") ||
        error.message.includes("already exists") ||
        error.message.includes("Invalid role") ||
        error.message.includes("Cannot assign")
      ) {
        throw error;
      }

      throw new Error("Failed to create user account. Please try again.");
    }
  }

  // Update user
  static async update(id, { name, email, role_id, department }) {
    try {
      if (!id || isNaN(id)) {
        throw new Error("Invalid user ID provided");
      }

      // Validate input
      if (!name || name.trim().length === 0) {
        throw new Error("Name is required and cannot be empty");
      }

      if (!email || !this.isValidEmail(email)) {
        throw new Error("Valid email address is required");
      }

      if (name.trim().length > 255) {
        throw new Error("Name must not exceed 255 characters");
      }

      // Check if user exists
      const existingUser = await db("users").where("id", id).first();
      if (!existingUser) {
        throw new Error("User not found");
      }

      if (existingUser.deleted_at) {
        throw new Error("Cannot update a deleted user account");
      }

      // Check if email is already taken by another user
      const emailConflict = await db("users")
        .where("email", email.toLowerCase().trim())
        .where("id", "!=", id)
        .whereNull("deleted_at")
        .first();

      if (emailConflict) {
        throw new Error("Another account is already using this email address");
      }

      // Validate role if provided
      if (role_id) {
        const role = await db("user_roles").where("role_id", role_id).first();
        if (!role) {
          throw new Error("Invalid role selected");
        }
        if (role.deleted_at) {
          throw new Error("Cannot assign a deleted role");
        }
        if (!role.is_active) {
          throw new Error("Cannot assign an inactive role");
        }
      }

      const [user] = await db("users")
        .where("id", id)
        .update({
          name: name.trim(),
          email: email.toLowerCase().trim(),
          role_id,
          department: department ? department.trim() : null,
          updated_at: new Date(),
        })
        .returning("*");

      return user;
    } catch (error) {
      console.error("Error updating user:", error);

      // Handle specific database errors
      if (error.code === "23505" && error.constraint === "users_email_unique") {
        throw new Error("Another account is already using this email address");
      }

      if (error.code === "23503") {
        throw new Error("Invalid role or department selected");
      }

      // Re-throw validation errors
      if (
        error.message.includes("Invalid") ||
        error.message.includes("is required") ||
        error.message.includes("not found") ||
        error.message.includes("already using") ||
        error.message.includes("Cannot")
      ) {
        throw error;
      }

      throw new Error("Failed to update user account. Please try again.");
    }
  }

  // Update user password
  static async updatePassword(id, newPassword) {
    try {
      if (!id || isNaN(id)) {
        throw new Error("Invalid user ID provided");
      }

      const passwordValidation = this.validatePassword(newPassword);
      if (!passwordValidation.isValid) {
        throw new Error(
          `Password validation failed: ${passwordValidation.errors.join(", ")}`
        );
      }

      // Check if user exists
      const existingUser = await db("users").where("id", id).first();
      if (!existingUser) {
        throw new Error("User account not found");
      }

      if (existingUser.deleted_at) {
        throw new Error("Cannot update password for a deleted user account");
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);

      const [user] = await db("users")
        .where("id", id)
        .update({
          password: hashedPassword,
          updated_at: new Date(),
        })
        .returning("*");

      return user;
    } catch (error) {
      console.error("Error updating password:", error);

      // Re-throw validation errors
      if (
        error.message.includes("Invalid") ||
        error.message.includes("validation failed") ||
        error.message.includes("not found") ||
        error.message.includes("Cannot update")
      ) {
        throw error;
      }

      throw new Error("Failed to update password. Please try again.");
    }
  }

  // Verify user password
  static async verifyPassword(plainPassword, hashedPassword) {
    try {
      if (!plainPassword || !hashedPassword) {
        throw new Error(
          "Password verification requires both plain and hashed passwords"
        );
      }

      return await bcrypt.compare(plainPassword, hashedPassword);
    } catch (error) {
      console.error("Error verifying password:", error);
      if (error.message.includes("Password verification requires")) {
        throw error;
      }
      throw new Error("Password verification failed");
    }
  }

  // Authenticate user with role validation
  static async authenticate(email, password) {
    try {
      if (!email || !password) {
        return {
          success: false,
          message: "Email and password are required",
          code: "MISSING_CREDENTIALS",
        };
      }

      if (!this.isValidEmail(email)) {
        return {
          success: false,
          message: "Please enter a valid email address",
          code: "INVALID_EMAIL_FORMAT",
        };
      }

      const user = await this.getByEmail(email);

      if (!user) {
        return {
          success: false,
          message: "Invalid email or password",
          code: "INVALID_CREDENTIALS",
        };
      }

      // Check if user account is active
      if (user.deleted_at) {
        return {
          success: false,
          message:
            "Your account has been deactivated. Please contact your administrator.",
          code: "ACCOUNT_DEACTIVATED",
        };
      }

      if (!user.is_active) {
        return {
          success: false,
          message:
            "Your account is currently inactive. Please contact your administrator.",
          code: "ACCOUNT_INACTIVE",
        };
      }

      const isValidPassword = await this.verifyPassword(
        password,
        user.password
      );

      if (!isValidPassword) {
        return {
          success: false,
          message: "Invalid email or password",
          code: "INVALID_CREDENTIALS",
        };
      }

      // Validate user role
      const roleValidation = await this.validateUserRole(user);
      if (!roleValidation.valid) {
        let message;
        switch (roleValidation.code) {
          case "NO_ROLE_ASSIGNED":
            message =
              "No role has been assigned to your account. Please contact your administrator.";
            break;
          case "ROLE_DELETED":
            message =
              "Your assigned role has been removed. Please contact your administrator for role reassignment.";
            break;
          case "ROLE_DEACTIVATED":
            message =
              "Your assigned role has been temporarily deactivated. Please contact your administrator.";
            break;
          case "ROLE_VALIDATION_ERROR":
            message =
              "Unable to verify your role permissions. Please try again or contact your administrator.";
            break;
          default:
            message = `Access denied: ${roleValidation.reason}. Please contact your administrator.`;
        }

        return {
          success: false,
          message,
          code: roleValidation.code,
        };
      }

      // Remove password from returned user object
      const { password: _, ...userWithoutPassword } = user;
      return {
        success: true,
        user: userWithoutPassword,
        message: "Login successful",
        code: "LOGIN_SUCCESS",
      };
    } catch (error) {
      console.error("Error authenticating user:", error);

      if (error.message === "Invalid email address format") {
        return {
          success: false,
          message: "Please enter a valid email address",
          code: "INVALID_EMAIL_FORMAT",
        };
      }

      return {
        success: false,
        message:
          "Authentication service is temporarily unavailable. Please try again.",
        code: "AUTHENTICATION_ERROR",
      };
    }
  }

  // Get user with permissions (simplified for your table structure)
  static async getWithPermissions(id) {
    try {
      if (!id || isNaN(id)) {
        throw new Error("Invalid user ID provided");
      }

      const user = await this.getById(id);

      if (!user) {
        throw new Error("User account not found");
      }

      if (user.deleted_at) {
        throw new Error("User account has been deactivated");
      }

      if (!user.is_active) {
        throw new Error("User account is currently inactive");
      }

      if (!user.role_id) {
        return user; // Return user without permissions if no role assigned
      }

      // Validate user role before returning permissions
      const roleValidation = await this.validateUserRole(user);
      if (!roleValidation.valid) {
        let message;
        switch (roleValidation.code) {
          case "ROLE_DELETED":
            message = "Your assigned role has been removed. Access denied.";
            break;
          case "ROLE_DEACTIVATED":
            message = "Your assigned role has been deactivated. Access denied.";
            break;
          default:
            message = `Access denied: ${roleValidation.reason}`;
        }
        throw new Error(message);
      }

      // Get role permissions - simplified query for your table structure
      const permissions = await db("role_permissions")
        .join(
          "user_permissions",
          "role_permissions.permission_id",
          "user_permissions.permission_id"
        )
        .select("user_permissions.*")
        .where("role_permissions.role_id", user.role_id);

      return {
        ...user,
        permissions,
      };
    } catch (error) {
      console.error("Error fetching user with permissions:", error);

      // Re-throw specific errors
      if (
        error.message.includes("Invalid user ID") ||
        error.message.includes("not found") ||
        error.message.includes("deactivated") ||
        error.message.includes("inactive") ||
        error.message.includes("Access denied")
      ) {
        throw error;
      }

      throw new Error("Failed to retrieve user permissions");
    }
  }

  // Soft delete user
  static async delete(id) {
    try {
      if (!id || isNaN(id)) {
        throw new Error("Invalid user ID provided");
      }

      const existingUser = await db("users").where("id", id).first();
      if (!existingUser) {
        throw new Error("User not found");
      }

      if (existingUser.deleted_at) {
        throw new Error("User is already deleted");
      }

      const [user] = await db("users")
        .where("id", id)
        .update({
          deleted_at: new Date(),
          is_active: false,
        })
        .returning("*");

      return user;
    } catch (error) {
      console.error("Error deleting user:", error);

      // Re-throw validation errors
      if (
        error.message.includes("Invalid") ||
        error.message.includes("not found") ||
        error.message.includes("already deleted")
      ) {
        throw error;
      }

      throw new Error("Failed to delete user account. Please try again.");
    }
  }

  // Restore deleted user
  static async restore(id) {
    try {
      if (!id || isNaN(id)) {
        throw new Error("Invalid user ID provided");
      }

      const existingUser = await db("users").where("id", id).first();
      if (!existingUser) {
        throw new Error("User not found");
      }

      if (!existingUser.deleted_at) {
        throw new Error("User is not deleted and cannot be restored");
      }

      const [user] = await db("users")
        .where("id", id)
        .update({
          deleted_at: null,
          is_active: true,
          updated_at: new Date(),
        })
        .returning("*");

      return user;
    } catch (error) {
      console.error("Error restoring user:", error);

      // Re-throw validation errors
      if (
        error.message.includes("Invalid") ||
        error.message.includes("not found") ||
        error.message.includes("cannot be restored")
      ) {
        throw error;
      }

      throw new Error("Failed to restore user account. Please try again.");
    }
  }
}

module.exports = User;
