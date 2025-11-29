const bcrypt = require("bcryptjs");
const { db } = require("../config/database");

class BoardMember {
  // Generate unique board member ID
  static async generateBoardId() {
    try {
      const lastMember = await db("board_members")
        .select("board_id")
        .orderBy("id", "desc")
        .first();

      if (!lastMember) {
        return "BD001";
      }

      const lastNumber = parseInt(lastMember.board_id.replace("BD", ""));
      const nextNumber = lastNumber + 1;
      return `BD${nextNumber.toString().padStart(3, "0")}`;
    } catch (error) {
      console.error("Error generating board ID:", error);
      throw new Error("Failed to generate board member ID");
    }
  }

  // Hash password
  static async hashPassword(password) {
    return await bcrypt.hash(password, 10);
  }

  // Compare password
  static async comparePassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  // Validate email format
  static isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Find board member by email
  static async findByEmail(email) {
    try {
      const member = await db("board_members")
        .select("*")
        .where("email", email)
        .where("is_active", true)
        .whereNull("deleted_at")
        .first();

      return member;
    } catch (error) {
      console.error("Error finding board member by email:", error);
      throw error;
    }
  }

  // Authenticate board member
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

      // Fetch the account by email WITHOUT status filters so we can return
      // accurate messages for deactivated/deleted accounts
      const member = await db("board_members")
        .select("*")
        .where({ email })
        .first();

      if (!member) {
        return {
          success: false,
          message: "Invalid email or password",
          code: "INVALID_CREDENTIALS",
        };
      }

      // Deleted (soft-deactivated)
      if (member.deleted_at) {
        return {
          success: false,
          message: "Your board member account has been deactivated.",
          code: "ACCOUNT_DEACTIVATED",
        };
      }

      // Explicitly inactive
      if (!member.is_active) {
        return {
          success: false,
          message:
            "Your board account is currently inactive. Please contact administration.",
          code: "ACCOUNT_INACTIVE",
        };
      }

      const isValidPassword = await this.comparePassword(
        password,
        member.password
      );

      if (!isValidPassword) {
        return {
          success: false,
          message: "Invalid email or password",
          code: "INVALID_CREDENTIALS",
        };
      }

      return {
        success: true,
        member: {
          id: member.id,
          board_id: member.board_id,
          first_name: member.first_name,
          middle_name: member.middle_name,
          last_name: member.last_name,
          email: member.email,
          phone_number: member.phone_number,
          position: member.position,
          department: member.department,
          is_active: member.is_active,
        },
      };
    } catch (error) {
      console.error("Error authenticating board member:", error);
      return {
        success: false,
        message: "Authentication failed. Please try again.",
        code: "AUTH_ERROR",
      };
    }
  }

  // Get all board members
  static async getAll(includeDeleted = false) {
    try {
      let query = db("board_members").select("*");

      if (!includeDeleted) {
        query = query.whereNull("deleted_at");
      }

      return await query.orderBy("created_at", "desc");
    } catch (error) {
      console.error("Error getting board members:", error);
      throw error;
    }
  }

  // Get board member by ID
  static async getById(id) {
    try {
      const member = await db("board_members")
        .select("*")
        .where("id", id)
        .whereNull("deleted_at")
        .first();

      return member;
    } catch (error) {
      console.error("Error getting board member by ID:", error);
      throw error;
    }
  }

  // Create new board member
  static async create(memberData) {
    try {
      const boardId = await this.generateBoardId();
      const hashedPassword = await this.hashPassword(memberData.password);

      const [newMember] = await db("board_members")
        .insert({
          board_id: boardId,
          first_name: memberData.first_name,
          middle_name: memberData.middle_name || null,
          last_name: memberData.last_name,
          email: memberData.email,
          phone_number: memberData.phone_number || null,
          position: memberData.position,
          department: memberData.department || "Administration",
          password: hashedPassword,
          is_active:
            memberData.is_active !== undefined ? memberData.is_active : true,
        })
        .returning("*");

      // Remove password from response
      delete newMember.password;
      return newMember;
    } catch (error) {
      console.error("Error creating board member:", error);
      throw error;
    }
  }

  // Update board member
  static async update(id, updateData) {
    try {
      const updates = { ...updateData };

      // Hash password if provided
      if (updateData.password) {
        updates.password = await this.hashPassword(updateData.password);
      }

      const [updatedMember] = await db("board_members")
        .where("id", id)
        .whereNull("deleted_at")
        .update({
          ...updates,
          updated_at: db.fn.now(),
        })
        .returning("*");

      if (!updatedMember) {
        return null;
      }

      // Remove password from response
      delete updatedMember.password;
      return updatedMember;
    } catch (error) {
      console.error("Error updating board member:", error);
      throw error;
    }
  }

  // Soft delete board member
  static async delete(id, reason = null) {
    try {
      const tryUpdate = async () =>
        db("board_members")
          .where("id", id)
          .whereNull("deleted_at")
          .update(
            {
              deleted_at: db.fn.now(),
              is_active: false,
              deactivation_reason: reason || db.raw("deactivation_reason"),
              updated_at: db.fn.now(),
            },
            "*"
          );

      let deletedRows;
      try {
        deletedRows = await tryUpdate();
      } catch (err) {
        // If deactivation_reason column is missing, add it then retry
        if (
          String(err?.code) === "42703" ||
          /deactivation_reason/.test(err?.message || "")
        ) {
          await db.schema.alterTable("board_members", (table) => {
            table.text("deactivation_reason").nullable();
          });
          deletedRows = await tryUpdate();
        } else {
          throw err;
        }
      }

      const deletedMember = deletedRows?.[0] || null;
      return deletedMember;
    } catch (error) {
      console.error("Error deleting board member:", error);
      throw error;
    }
  }
}

module.exports = BoardMember;
