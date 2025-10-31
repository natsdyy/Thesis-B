const { db } = require("../config/database");
const bcrypt = require("bcryptjs");

class Employee {
  // Generate unique employee ID
  static async generateEmployeeId() {
    try {
      const lastEmployee = await db("employees")
        .select("employee_id")
        .whereNotNull("employee_id")
        .orderBy("id", "desc")
        .first();

      if (!lastEmployee) {
        return "EMP000001";
      }

      const lastId = lastEmployee.employee_id;
      const numPart = parseInt(lastId.replace("EMP", "")) + 1;
      return `EMP${numPart.toString().padStart(6, "0")}`;
    } catch (error) {
      console.error("Error generating employee ID:", error);
      // Fallback to timestamp-based ID
      return `EMP${Date.now().toString().slice(-6)}`;
    }
  }

  // Get all employees with pagination
  static async getAll(includeDeleted = false, page = 1, limit = 10) {
    try {
      let query = db("employees")
        .leftJoin("user_roles", "employees.role_id", "user_roles.role_id")
        .leftJoin("leave_requests as lr", function () {
          this.on("employees.id", "=", "lr.employee_id")
            .andOn("lr.status", "=", db.raw("'approved_by_hr'"))
            .andOn("lr.from_date", "<=", db.raw("CURRENT_DATE"))
            .andOn("lr.to_date", ">=", db.raw("CURRENT_DATE"));
        })
        .select(
          "employees.*",
          db.raw("user_roles.role as role"),
          db.raw(
            "CASE WHEN lr.id IS NOT NULL THEN 'On Leave' ELSE employees.status END as status"
          ),
          db.raw("lr.leave_type as current_leave_type"),
          db.raw("lr.from_date as leave_from_date"),
          db.raw("lr.to_date as leave_to_date")
        );

      if (!includeDeleted) {
        query = query.whereNull("employees.deleted_at");
      }

      // Exclude System/Super Admin while allowing employees without a role
      query = query.where((qb) => {
        qb.whereNotIn("user_roles.role", [
          "System Admin",
          "Super Admin",
        ]).orWhereNull("user_roles.role");
      });

      // Get total count for pagination (separate query to avoid GROUP BY issues)
      const totalResult = await db("employees")
        .leftJoin("user_roles", "employees.role_id", "user_roles.role_id")
        .where((qb) => {
          if (!includeDeleted) {
            qb.whereNull("employees.deleted_at");
          }
          qb.where((subQb) => {
            subQb
              .whereNotIn("user_roles.role", ["System Admin", "Super Admin"])
              .orWhereNull("user_roles.role");
          });
        })
        .count("* as count")
        .first();
      const total = parseInt(totalResult.count);

      // Apply pagination
      const offset = (page - 1) * limit;
      const employees = await query
        .orderBy("employees.created_at", "desc")
        .limit(limit)
        .offset(offset);

      return {
        data: employees,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1,
        },
      };
    } catch (error) {
      console.error("Error fetching employees:", error);
      throw new Error("Failed to retrieve employees from database");
    }
  }

  // Get employee by ID
  static async getById(id) {
    try {
      if (!id || isNaN(id)) {
        throw new Error("Invalid employee ID provided");
      }

      const employee = await db("employees")
        .select("*")
        .where("id", id)
        .first();

      return employee;
    } catch (error) {
      console.error("Error fetching employee by ID:", error);
      if (error.message === "Invalid employee ID provided") {
        throw error;
      }
      throw new Error("Failed to retrieve employee information");
    }
  }

  // Get employee by employee_id
  static async getByEmployeeId(employeeId) {
    try {
      if (!employeeId) {
        throw new Error("Employee ID is required");
      }

      // Include role name for downstream consumers (e.g., POS manager check)
      const employee = await db("employees")
        .leftJoin("user_roles", "employees.role_id", "user_roles.role_id")
        .select("employees.*", db.raw("user_roles.role as role"))
        .where("employees.employee_id", employeeId)
        .whereNull("employees.deleted_at")
        .first();

      return employee;
    } catch (error) {
      console.error("Error fetching employee by employee ID:", error);
      throw new Error("Failed to retrieve employee information");
    }
  }

  // Get employees by department with pagination
  static async getByDepartment(
    department,
    includeDeleted = false,
    page = 1,
    limit = 10
  ) {
    try {
      if (!department) {
        throw new Error("Department is required");
      }

      let query = db("employees")
        .leftJoin("user_roles", "employees.role_id", "user_roles.role_id")
        .leftJoin("leave_requests as lr", function () {
          this.on("employees.id", "=", "lr.employee_id")
            .andOn("lr.status", "=", db.raw("'approved_by_hr'"))
            .andOn("lr.from_date", "<=", db.raw("CURRENT_DATE"))
            .andOn("lr.to_date", ">=", db.raw("CURRENT_DATE"));
        })
        .select(
          "employees.*",
          db.raw("user_roles.role as role"),
          db.raw(
            "CASE WHEN lr.id IS NOT NULL THEN 'On Leave' ELSE employees.status END as status"
          ),
          db.raw("lr.leave_type as current_leave_type"),
          db.raw("lr.from_date as leave_from_date"),
          db.raw("lr.to_date as leave_to_date")
        )
        .where("employees.department", department);

      if (!includeDeleted) {
        query = query.whereNull("employees.deleted_at");
      }

      query = query.where((qb) => {
        qb.whereNotIn("user_roles.role", [
          "System Admin",
          "Super Admin",
        ]).orWhereNull("user_roles.role");
      });

      // Get total count for pagination (separate query to avoid GROUP BY issues)
      const totalResult = await db("employees")
        .leftJoin("user_roles", "employees.role_id", "user_roles.role_id")
        .where("employees.department", department)
        .where((qb) => {
          if (!includeDeleted) {
            qb.whereNull("employees.deleted_at");
          }
          qb.where((subQb) => {
            subQb
              .whereNotIn("user_roles.role", ["System Admin", "Super Admin"])
              .orWhereNull("user_roles.role");
          });
        })
        .count("* as count")
        .first();
      const total = parseInt(totalResult.count);

      // Apply pagination
      const offset = (page - 1) * limit;
      const employees = await query
        .orderBy("employees.first_name")
        .limit(limit)
        .offset(offset);

      return {
        data: employees,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1,
        },
      };
    } catch (error) {
      console.error("Error fetching employees by department:", error);
      throw new Error("Failed to retrieve department employees");
    }
  }

  // Get employee statistics
  static async getStats() {
    try {
      const stats = await db("employees")
        .select(
          db.raw("COUNT(*) as total_employees"),
          db.raw(
            "COUNT(CASE WHEN status = 'Active' THEN 1 END) as active_employees"
          ),
          db.raw("COUNT(DISTINCT department) as departments"),
          db.raw(
            `COUNT(CASE WHEN created_at >= date_trunc('month', CURRENT_DATE) THEN 1 END) as new_this_month`
          )
        )
        .whereNull("deleted_at")
        .first();

      return {
        total_employees: parseInt(stats.total_employees) || 0,
        active_employees: parseInt(stats.active_employees) || 0,
        departments: parseInt(stats.departments) || 0,
        new_this_month: parseInt(stats.new_this_month) || 0,
      };
    } catch (error) {
      console.error("Error fetching employee stats:", error);
      throw new Error("Failed to retrieve employee statistics");
    }
  }

  // Authentication methods
  static async hashPassword(password) {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
  }

  static async comparePassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  static isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Find employee by email for authentication
  static async findByEmail(email) {
    try {
      const employee = await db("employees")
        .leftJoin("user_roles", "employees.role_id", "user_roles.role_id")
        .select(
          "employees.*",
          "user_roles.role",
          "user_roles.description as role_description"
        )
        .where("employees.email", email)
        .where("employees.status", "Active")
        .where("employees.is_active", true)
        .whereNull("employees.deleted_at")
        .first();

      return employee;
    } catch (error) {
      console.error("Error finding employee by email:", error);
      throw error;
    }
  }

  // Authenticate employee
  static async authenticate(email, password) {
    try {
      const employee = await this.findByEmail(email);

      if (!employee) {
        return { success: false, message: "Invalid email or password" };
      }

      if (!employee.password) {
        return {
          success: false,
          message: "Account not activated. Please contact administrator.",
        };
      }

      const isValidPassword = await this.comparePassword(
        password,
        employee.password
      );

      if (!isValidPassword) {
        return { success: false, message: "Invalid email or password" };
      }

      // Update last login
      await db("employees")
        .where("employee_id", employee.employee_id)
        .update({ last_login: new Date() });

      // Remove password from returned data
      delete employee.password;

      return { success: true, employee };
    } catch (error) {
      console.error("Error authenticating employee:", error);
      return { success: false, message: "Authentication failed" };
    }
  }

  // Set or update employee password
  static async setPassword(employeeId, password) {
    try {
      const hashedPassword = await this.hashPassword(password);
      await db("employees")
        .where("employee_id", employeeId)
        .update({ password: hashedPassword });

      return true;
    } catch (error) {
      console.error("Error setting employee password:", error);
      throw error;
    }
  }

  // Validate employee data for creation
  static validateEmployeeData(data) {
    const errors = [];

    // Required fields validation
    if (!data.first_name?.trim()) errors.push("First name is required");
    if (!data.last_name?.trim()) errors.push("Last name is required");
    if (!data.phone_number?.trim()) errors.push("Phone number is required");
    if (!data.address?.trim()) errors.push("Address is required");
    if (!data.postal_code?.trim()) errors.push("Postal code is required");
    if (!data.civil_status) errors.push("Civil status is required");
    if (!data.sex) errors.push("Sex is required");
    if (!data.birthday) errors.push("Birthday is required");
    if (!data.age) errors.push("Age is required");
    if (!data.citizenship?.trim()) errors.push("Citizenship is required");
    if (!data.department) errors.push("Department is required");
    if (!data.role_id) errors.push("Role is required");
    if (!data.employee_type) errors.push("Employee type is required");
    // Branch assignment: require branch_id when department is Branch
    if (data.department === "Branch" && !data.branch_id) {
      errors.push(
        "Branch assignment is required for Branch department employees"
      );
    }
    if (!data.pagibig_number?.trim())
      errors.push("PAG-IBIG number is required");
    if (!data.sss_number?.trim()) errors.push("SSS number is required");
    if (!data.philhealth_number?.trim())
      errors.push("PhilHealth number is required");
    if (!data.emergency_contact_name?.trim())
      errors.push("Emergency contact name is required");
    if (!data.emergency_relationship?.trim())
      errors.push("Emergency relationship is required");
    if (!data.emergency_contact_number?.trim())
      errors.push("Emergency contact number is required");
    if (!data.emergency_contact_address?.trim())
      errors.push("Emergency contact address is required");

    // Phone number format validation (Philippine mobile): allow 09XXXXXXXXX or +639XXXXXXXXX
    const phLocalRegex = /^09\d{9}$/;
    const phIntlRegex = /^\+639\d{9}$/;
    const isValidPH = (v) => phLocalRegex.test(v) || phIntlRegex.test(v);
    if (data.phone_number && !isValidPH(data.phone_number)) {
      errors.push("Phone number must be 09XXXXXXXXX or +639XXXXXXXXX");
    }
    if (
      data.emergency_contact_number &&
      !isValidPH(data.emergency_contact_number)
    ) {
      errors.push(
        "Emergency contact number must be 09XXXXXXXXX or +639XXXXXXXXX"
      );
    }
    if (
      data.alternate_contact_number &&
      !isValidPH(data.alternate_contact_number)
    ) {
      errors.push(
        "Alternate contact number must be 09XXXXXXXXX or +639XXXXXXXXX"
      );
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (data.email && !emailRegex.test(data.email)) {
      errors.push("Please enter a valid email address");
    }
    if (
      data.emergency_contact_email &&
      !emailRegex.test(data.emergency_contact_email)
    ) {
      errors.push("Please enter a valid emergency contact email address");
    }

    // Age validation
    if (data.age && (parseInt(data.age) < 18 || parseInt(data.age) > 65)) {
      errors.push("Age must be between 18 and 65");
    }

    // Length validations
    if (data.first_name && data.first_name.length > 100)
      errors.push("First name must not exceed 100 characters");
    if (data.middle_name && data.middle_name.length > 100)
      errors.push("Middle name must not exceed 100 characters");
    if (data.last_name && data.last_name.length > 100)
      errors.push("Last name must not exceed 100 characters");
    if (data.postal_code && data.postal_code.length > 10)
      errors.push("Postal code must not exceed 10 characters");

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // Validate employee data for updates (more lenient)
  static validateEmployeeDataForUpdate(data) {
    const errors = [];

    // Only validate fields that are provided and not empty
    if (data.first_name !== undefined && !data.first_name?.trim()) {
      errors.push("First name is required");
    }
    if (data.last_name !== undefined && !data.last_name?.trim()) {
      errors.push("Last name is required");
    }
    if (data.phone_number !== undefined && !data.phone_number?.trim()) {
      errors.push("Phone number is required");
    }
    if (data.address !== undefined && !data.address?.trim()) {
      errors.push("Address is required");
    }
    if (data.postal_code !== undefined && !data.postal_code?.trim()) {
      errors.push("Postal code is required");
    }
    if (data.civil_status !== undefined && !data.civil_status) {
      errors.push("Civil status is required");
    }
    if (data.sex !== undefined && !data.sex) {
      errors.push("Sex is required");
    }
    if (data.birthday !== undefined && !data.birthday) {
      errors.push("Birthday is required");
    }
    if (data.age !== undefined && !data.age) {
      errors.push("Age is required");
    }
    if (data.citizenship !== undefined && !data.citizenship?.trim()) {
      errors.push("Citizenship is required");
    }
    if (data.department !== undefined && !data.department) {
      errors.push("Department is required");
    }
    if (data.role_id !== undefined && !data.role_id) {
      errors.push("Role is required");
    }
    if (data.employee_type !== undefined && !data.employee_type) {
      errors.push("Employee type is required");
    }
    if (data.pagibig_number !== undefined && !data.pagibig_number?.trim()) {
      errors.push("PAG-IBIG number is required");
    }
    if (data.sss_number !== undefined && !data.sss_number?.trim()) {
      errors.push("SSS number is required");
    }
    if (
      data.philhealth_number !== undefined &&
      !data.philhealth_number?.trim()
    ) {
      errors.push("PhilHealth number is required");
    }
    if (
      data.emergency_contact_name !== undefined &&
      !data.emergency_contact_name?.trim()
    ) {
      errors.push("Emergency contact name is required");
    }
    if (
      data.emergency_relationship !== undefined &&
      !data.emergency_relationship?.trim()
    ) {
      errors.push("Emergency relationship is required");
    }
    if (
      data.emergency_contact_number !== undefined &&
      !data.emergency_contact_number?.trim()
    ) {
      errors.push("Emergency contact number is required");
    }
    if (
      data.emergency_contact_address !== undefined &&
      !data.emergency_contact_address?.trim()
    ) {
      errors.push("Emergency contact address is required");
    }

    // Phone number format validation (Philippine mobile): allow 09XXXXXXXXX or +639XXXXXXXXX
    const phLocalRegex = /^09\d{9}$/;
    const phIntlRegex = /^\+639\d{9}$/;
    const isValidPH = (v) => phLocalRegex.test(v) || phIntlRegex.test(v);
    if (data.phone_number && !isValidPH(data.phone_number)) {
      errors.push("Phone number must be 09XXXXXXXXX or +639XXXXXXXXX");
    }
    if (
      data.emergency_contact_number &&
      !isValidPH(data.emergency_contact_number)
    ) {
      errors.push(
        "Emergency contact number must be 09XXXXXXXXX or +639XXXXXXXXX"
      );
    }
    if (
      data.alternate_contact_number &&
      !isValidPH(data.alternate_contact_number)
    ) {
      errors.push(
        "Alternate contact number must be 09XXXXXXXXX or +639XXXXXXXXX"
      );
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (data.email && !emailRegex.test(data.email)) {
      errors.push("Please enter a valid email address");
    }
    if (
      data.emergency_contact_email &&
      !emailRegex.test(data.emergency_contact_email)
    ) {
      errors.push("Please enter a valid emergency contact email address");
    }

    // Age validation
    if (data.age && (parseInt(data.age) < 18 || parseInt(data.age) > 65)) {
      errors.push("Age must be between 18 and 65");
    }

    // Length validations
    if (data.first_name && data.first_name.length > 100)
      errors.push("First name must not exceed 100 characters");
    if (data.middle_name && data.middle_name.length > 100)
      errors.push("Middle name must not exceed 100 characters");
    if (data.last_name && data.last_name.length > 100)
      errors.push("Last name must not exceed 100 characters");
    if (data.postal_code && data.postal_code.length > 10)
      errors.push("Postal code must not exceed 10 characters");

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // Create new employee
  static async create(data, createdBy = null) {
    try {
      // Validate input
      const validation = this.validateEmployeeData(data);
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(", ")}`);
      }

      // Generate employee ID
      const employeeId = await this.generateEmployeeId();

      // Set default password as last name if not provided
      // Determine if account should be active and if password should be set
      // If onboarding_status is 'pending', account starts as inactive and no password set
      // Otherwise (direct employee creation), account is active and password is set
      const isOnboardingPending = data.onboarding_status === 'pending';
      const shouldBeActive = !data.onboarding_status || !isOnboardingPending;
      
      let hashedPassword = null;
      // Only set password if not onboarding pending (password will be set on approval)
      if (!isOnboardingPending) {
        if (data.password) {
          hashedPassword = await this.hashPassword(data.password);
        } else {
          // Use last name as default password
          const defaultPassword = data.last_name.trim();
          hashedPassword = await this.hashPassword(defaultPassword);
        }
      }
      // For onboarding pending: password stays null until approval

      // Validate role exists and is active
      const role = await db("user_roles")
        .where("role_id", data.role_id)
        .whereNull("deleted_at")
        .where("is_active", true)
        .first();

      if (!role) {
        throw new Error("Invalid or inactive role selected");
      }

      // Validate role belongs to the selected department
      if (role.department !== data.department) {
        throw new Error(
          `Role does not belong to ${data.department} department`
        );
      }

      // Check for duplicate government benefit numbers
      const existingEmployee = await db("employees")
        .where(function () {
          this.where("pagibig_number", data.pagibig_number)
            .orWhere("sss_number", data.sss_number)
            .orWhere("philhealth_number", data.philhealth_number);
        })
        .whereNull("deleted_at")
        .first();

      if (existingEmployee) {
        throw new Error(
          "An employee with these government benefit numbers already exists"
        );
      }

      const [employee] = await db("employees")
        .insert({
          employee_id: employeeId,
          first_name: data.first_name.trim(),
          middle_name: data.middle_name?.trim() || null,
          last_name: data.last_name.trim(),
          email: data.email?.trim().toLowerCase() || null,
          password: hashedPassword, // null for onboarding pending, will be set on approval
          is_active: shouldBeActive, // Inactive if pending onboarding, active otherwise
          phone_number: data.phone_number.trim(),
          address: data.address.trim(),
          postal_code: data.postal_code.trim(),
          civil_status: data.civil_status,
          sex: data.sex,
          birthday: data.birthday,
          age: parseInt(data.age),
          citizenship: data.citizenship.trim(),
          department: data.department,
          role_id: data.role_id,
          employee_type: data.employee_type,
          branch_id: data.branch_id || null,
          pagibig_number: data.pagibig_number.trim(),
          sss_number: data.sss_number.trim(),
          philhealth_number: data.philhealth_number.trim(),
          emergency_contact_name: data.emergency_contact_name.trim(),
          emergency_relationship: data.emergency_relationship.trim(),
          emergency_contact_number: data.emergency_contact_number.trim(),
          alternate_contact_number:
            data.alternate_contact_number?.trim() || null,
          emergency_contact_address: data.emergency_contact_address.trim(),
          emergency_contact_email:
            data.emergency_contact_email?.trim().toLowerCase() || null,
          status: shouldBeActive ? "Active" : "Inactive", // Set status based on is_active
          photo_url: data.photo_url || null,
          onboarding_status: data.onboarding_status || null, // Track onboarding review status
          created_by: createdBy,
          created_at: new Date(),
          updated_at: new Date(),
        })
        .returning("*");

      return employee;
    } catch (error) {
      console.error("Error creating employee:", error);

      // Handle specific database errors
      if (error.code === "23505") {
        if (error.constraint === "employees_employee_id_unique") {
          throw new Error("Employee ID conflict. Please try again.");
        }
        throw new Error("An employee with these details already exists");
      }

      if (error.code === "23503") {
        throw new Error("Invalid reference data provided");
      }

      // Re-throw validation errors
      if (
        error.message.includes("Validation failed") ||
        error.message.includes("already exists")
      ) {
        throw error;
      }

      throw new Error("Failed to create employee. Please try again.");
    }
  }

  // Update employee
  static async update(id, data, updatedBy = null) {
    try {
      if (!id || isNaN(id)) {
        throw new Error("Invalid employee ID provided");
      }

      // Validate input using update-specific validation
      const validation = this.validateEmployeeDataForUpdate(data);
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(", ")}`);
      }

      // Check if employee exists
      const existingEmployee = await db("employees").where("id", id).first();
      if (!existingEmployee) {
        throw new Error("Employee not found");
      }

      if (existingEmployee.deleted_at) {
        throw new Error("Cannot update a deleted employee");
      }

      // Validate role exists and is active (only if role_id is being updated)
      if (data.role_id !== undefined) {
        const role = await db("user_roles")
          .where("role_id", data.role_id)
          .whereNull("deleted_at")
          .where("is_active", true)
          .first();

        if (!role) {
          throw new Error("Invalid or inactive role selected");
        }

        // Validate role belongs to the selected department (only if both are being updated)
        if (
          data.department !== undefined &&
          role.department !== data.department
        ) {
          throw new Error(
            `Role does not belong to ${data.department} department`
          );
        }
      }

      // If changing department to Branch, require a branch assignment
      if (
        data.department === "Branch" &&
        (data.branch_id === undefined || data.branch_id === null)
      ) {
        throw new Error(
          "Branch assignment (branch_id) is required for Branch department employees"
        );
      }

      // Check for duplicate government benefit numbers (only for fields being updated)
      if (data.pagibig_number || data.sss_number || data.philhealth_number) {
        const duplicateQuery = db("employees")
          .where("id", "!=", id)
          .whereNull("deleted_at");

        let hasConditions = false;
        if (data.pagibig_number) {
          duplicateQuery.where("pagibig_number", data.pagibig_number);
          hasConditions = true;
        }
        if (data.sss_number) {
          if (hasConditions) {
            duplicateQuery.orWhere("sss_number", data.sss_number);
          } else {
            duplicateQuery.where("sss_number", data.sss_number);
            hasConditions = true;
          }
        }
        if (data.philhealth_number) {
          if (hasConditions) {
            duplicateQuery.orWhere("philhealth_number", data.philhealth_number);
          } else {
            duplicateQuery.where("philhealth_number", data.philhealth_number);
          }
        }

        const duplicateEmployee = await duplicateQuery.first();

        if (duplicateEmployee) {
          throw new Error(
            "Another employee with these government benefit numbers already exists"
          );
        }
      }

      // Build update object with only provided fields
      const updateData = {
        updated_by: updatedBy,
        updated_at: new Date(),
      };

      // Only update fields that are provided in the data
      if (data.first_name !== undefined)
        updateData.first_name = data.first_name.trim();
      if (data.middle_name !== undefined)
        updateData.middle_name = data.middle_name?.trim() || null;
      if (data.last_name !== undefined)
        updateData.last_name = data.last_name.trim();
      if (data.email !== undefined)
        updateData.email = data.email?.trim().toLowerCase() || null;
      if (data.phone_number !== undefined)
        updateData.phone_number = data.phone_number.trim();
      if (data.address !== undefined) updateData.address = data.address.trim();
      if (data.postal_code !== undefined)
        updateData.postal_code = data.postal_code.trim();
      if (data.civil_status !== undefined)
        updateData.civil_status = data.civil_status;
      if (data.sex !== undefined) updateData.sex = data.sex;
      if (data.birthday !== undefined) updateData.birthday = data.birthday;
      if (data.age !== undefined) updateData.age = parseInt(data.age);
      if (data.citizenship !== undefined)
        updateData.citizenship = data.citizenship.trim();
      if (data.department !== undefined)
        updateData.department = data.department;
      if (data.role_id !== undefined) updateData.role_id = data.role_id;
      if (data.employee_type !== undefined)
        updateData.employee_type = data.employee_type;
      if (data.pagibig_number !== undefined)
        updateData.pagibig_number = data.pagibig_number.trim();
      if (data.sss_number !== undefined)
        updateData.sss_number = data.sss_number.trim();
      if (data.philhealth_number !== undefined)
        updateData.philhealth_number = data.philhealth_number.trim();
      if (data.emergency_contact_name !== undefined)
        updateData.emergency_contact_name = data.emergency_contact_name.trim();
      if (data.emergency_relationship !== undefined)
        updateData.emergency_relationship = data.emergency_relationship.trim();
      if (data.emergency_contact_number !== undefined)
        updateData.emergency_contact_number =
          data.emergency_contact_number.trim();
      if (data.alternate_contact_number !== undefined)
        updateData.alternate_contact_number =
          data.alternate_contact_number?.trim() || null;
      if (data.emergency_contact_address !== undefined)
        updateData.emergency_contact_address =
          data.emergency_contact_address.trim();
      if (data.emergency_contact_email !== undefined)
        updateData.emergency_contact_email =
          data.emergency_contact_email?.trim().toLowerCase() || null;
      if (data.photo_url !== undefined) updateData.photo_url = data.photo_url;
      if (data.branch_id !== undefined)
        updateData.branch_id = data.branch_id || null;

      const [employee] = await db("employees")
        .where("id", id)
        .update(updateData)
        .returning("*");

      return employee;
    } catch (error) {
      console.error("Error updating employee:", error);

      // Handle specific database errors
      if (error.code === "23505") {
        throw new Error("Another employee with these details already exists");
      }

      if (error.code === "23503") {
        throw new Error("Invalid reference data provided");
      }

      // Re-throw validation errors
      if (
        error.message.includes("Invalid") ||
        error.message.includes("Validation failed") ||
        error.message.includes("not found") ||
        error.message.includes("already exists") ||
        error.message.includes("Cannot update")
      ) {
        throw error;
      }

      throw new Error("Failed to update employee. Please try again.");
    }
  }

  // Update employee status
  static async updateStatus(id, status, updatedBy = null) {
    try {
      if (!id || isNaN(id)) {
        throw new Error("Invalid employee ID provided");
      }

      const validStatuses = ["Active", "Inactive", "Terminated", "On Leave"];
      if (!validStatuses.includes(status)) {
        throw new Error("Invalid status provided");
      }

      const existingEmployee = await db("employees").where("id", id).first();
      if (!existingEmployee) {
        throw new Error("Employee not found");
      }

      if (existingEmployee.deleted_at) {
        throw new Error("Cannot update status of a deleted employee");
      }

      const [employee] = await db("employees")
        .where("id", id)
        .update({
          status,
          updated_by: updatedBy,
          updated_at: new Date(),
        })
        .returning("*");

      return employee;
    } catch (error) {
      console.error("Error updating employee status:", error);
      if (
        error.message.includes("Invalid") ||
        error.message.includes("not found") ||
        error.message.includes("Cannot update")
      ) {
        throw error;
      }
      throw new Error("Failed to update employee status. Please try again.");
    }
  }

  // Comprehensive employee termination
  static async terminateEmployee(id, terminationData, terminatedBy = null) {
    const trx = await db.transaction();

    try {
      if (!id || isNaN(id)) {
        throw new Error("Invalid employee ID provided");
      }

      // Validate termination data
      const {
        termination_reason,
        last_working_day,
        handover_notes,
        final_payroll_processed,
        system_access_revoked,
      } = terminationData;

      if (!termination_reason) {
        throw new Error("Termination reason is required");
      }

      if (!last_working_day) {
        throw new Error("Last working day is required");
      }

      const validReasons = [
        "Resignation",
        "Performance Issues",
        "Misconduct",
        "End of Contract",
        "Company Restructuring",
        "Health Issues",
        "Other",
      ];
      if (!validReasons.includes(termination_reason)) {
        throw new Error("Invalid termination reason provided");
      }

      // Check if employee exists and is not already terminated
      const existingEmployee = await trx("employees").where("id", id).first();
      if (!existingEmployee) {
        throw new Error("Employee not found");
      }

      if (existingEmployee.deleted_at) {
        throw new Error("Cannot terminate a deleted employee");
      }

      if (existingEmployee.status === "Terminated") {
        throw new Error("Employee is already terminated");
      }

      // Update employee status to Terminated
      const [updatedEmployee] = await trx("employees")
        .where("id", id)
        .update({
          status: "Terminated",
          updated_by: terminatedBy,
          updated_at: new Date(),
        })
        .returning("*");

      // Create termination record
      const [terminationRecord] = await trx("employee_terminations")
        .insert({
          employee_id: id,
          termination_reason,
          last_working_day,
          handover_notes: handover_notes || null,
          final_payroll_processed: final_payroll_processed || false,
          system_access_revoked: system_access_revoked || false,
          terminated_by: terminatedBy,
          terminated_at: new Date(),
          created_at: new Date(),
          updated_at: new Date(),
        })
        .returning("*");

      await trx.commit();

      return {
        employee: updatedEmployee,
        termination: terminationRecord,
      };
    } catch (error) {
      await trx.rollback();
      console.error("Error terminating employee:", error);

      if (
        error.message.includes("Invalid") ||
        error.message.includes("not found") ||
        error.message.includes("Cannot terminate") ||
        error.message.includes("already terminated") ||
        error.message.includes("required")
      ) {
        throw error;
      }

      throw new Error("Failed to terminate employee. Please try again.");
    }
  }

  // Get termination record for an employee
  static async getTerminationRecord(employeeId) {
    try {
      if (!employeeId || isNaN(employeeId)) {
        throw new Error("Invalid employee ID provided");
      }

      const termination = await db("employee_terminations")
        .leftJoin(
          "employees",
          "employee_terminations.employee_id",
          "employees.id"
        )
        .leftJoin(
          "employees",
          "employee_terminations.terminated_by",
          "employees.id"
        )
        .select(
          "employee_terminations.*",
          "employees.first_name",
          "employees.last_name",
          "employees.employee_id as emp_id",
          "employees.first_name as terminated_by_first_name",
          "employees.last_name as terminated_by_last_name"
        )
        .where("employee_terminations.employee_id", employeeId)
        .first();

      return termination;
    } catch (error) {
      console.error("Error fetching termination record:", error);
      if (error.message === "Invalid employee ID provided") {
        throw error;
      }
      throw new Error("Failed to retrieve termination record");
    }
  }

  // Update termination checklist items
  static async updateTerminationChecklist(
    employeeId,
    checklistData,
    updatedBy = null
  ) {
    try {
      if (!employeeId || isNaN(employeeId)) {
        throw new Error("Invalid employee ID provided");
      }

      const { final_payroll_processed, system_access_revoked } = checklistData;

      const [updated] = await db("employee_terminations")
        .where("employee_id", employeeId)
        .update({
          final_payroll_processed:
            final_payroll_processed !== undefined
              ? final_payroll_processed
              : db.raw("final_payroll_processed"),
          system_access_revoked:
            system_access_revoked !== undefined
              ? system_access_revoked
              : db.raw("system_access_revoked"),
          updated_at: new Date(),
        })
        .returning("*");

      if (!updated) {
        throw new Error("Termination record not found");
      }

      return updated;
    } catch (error) {
      console.error("Error updating termination checklist:", error);
      if (
        error.message === "Invalid employee ID provided" ||
        error.message === "Termination record not found"
      ) {
        throw error;
      }
      throw new Error("Failed to update termination checklist");
    }
  }

  // Soft delete employee
  static async delete(id, deletedBy = null) {
    try {
      if (!id || isNaN(id)) {
        throw new Error("Invalid employee ID provided");
      }

      const existingEmployee = await db("employees").where("id", id).first();
      if (!existingEmployee) {
        throw new Error("Employee not found");
      }

      if (existingEmployee.deleted_at) {
        throw new Error("Employee is already deleted");
      }

      const [employee] = await db("employees")
        .where("id", id)
        .update({
          status: "Terminated",
          updated_by: deletedBy,
          deleted_at: new Date(),
          updated_at: new Date(),
        })
        .returning("*");

      return employee;
    } catch (error) {
      console.error("Error deleting employee:", error);
      if (
        error.message.includes("Invalid") ||
        error.message.includes("not found") ||
        error.message.includes("already deleted")
      ) {
        throw error;
      }
      throw new Error("Failed to delete employee. Please try again.");
    }
  }

  // Get roles by department
  static async getRolesByDepartment(department) {
    try {
      if (!department) {
        throw new Error("Department is required");
      }

      const roles = await db("user_roles")
        .select("role_id", "role", "department", "description", "rate_per_hour")
        .where("department", department)
        .whereNull("deleted_at")
        .where("is_active", true)
        .where("role", "!=", "Admin") // Exclude Admin roles
        .orderBy("role");

      return roles;
    } catch (error) {
      console.error("Error fetching roles by department:", error);
      throw new Error("Failed to retrieve department roles");
    }
  }

  // Get all available departments with their roles
  static async getDepartmentsWithRoles() {
    try {
      const departments = await db("user_roles")
        .select("department")
        .whereNull("deleted_at")
        .where("is_active", true)
        .where("department", "!=", "System") // Exclude system roles
        .where("department", "!=", "Admin") // Exclude admin roles
        .groupBy("department")
        .orderBy("department");

      const departmentsWithRoles = {};

      for (const dept of departments) {
        const roles = await this.getRolesByDepartment(dept.department);
        departmentsWithRoles[dept.department] = roles;
      }

      return departmentsWithRoles;
    } catch (error) {
      console.error("Error fetching departments with roles:", error);
      throw new Error("Failed to retrieve departments and roles");
    }
  }

  // Restore deleted employee
  static async restore(id, restoredBy = null) {
    try {
      if (!id || isNaN(id)) {
        throw new Error("Invalid employee ID provided");
      }

      const existingEmployee = await db("employees").where("id", id).first();
      if (!existingEmployee) {
        throw new Error("Employee not found");
      }

      if (!existingEmployee.deleted_at) {
        throw new Error("Employee is not deleted and cannot be restored");
      }

      const [employee] = await db("employees")
        .where("id", id)
        .update({
          status: "Active",
          updated_by: restoredBy,
          deleted_at: null,
          updated_at: new Date(),
        })
        .returning("*");

      return employee;
    } catch (error) {
      console.error("Error restoring employee:", error);
      if (
        error.message.includes("Invalid") ||
        error.message.includes("not found") ||
        error.message.includes("cannot be restored")
      ) {
        throw error;
      }
      throw new Error("Failed to restore employee. Please try again.");
    }
  }

  // Restore terminated employee back to active status
  static async restoreTerminatedEmployee(id, restoredBy = null) {
    const trx = await db.transaction();

    try {
      if (!id || isNaN(id)) {
        throw new Error("Invalid employee ID provided");
      }

      // Check if employee exists and is terminated
      const existingEmployee = await trx("employees").where("id", id).first();
      if (!existingEmployee) {
        throw new Error("Employee not found");
      }

      if (existingEmployee.status !== "Terminated") {
        throw new Error("Employee is not terminated and cannot be restored");
      }

      // Update employee status back to Active
      const [updatedEmployee] = await trx("employees")
        .where("id", id)
        .update({
          status: "Active",
          updated_by: restoredBy,
          updated_at: new Date(),
        })
        .returning("*");

      // Archive the termination record (don't delete for audit purposes)
      await trx("employee_terminations").where("employee_id", id).update({
        restored_at: new Date(),
        restored_by: restoredBy,
        updated_at: new Date(),
      });

      await trx.commit();

      return updatedEmployee;
    } catch (error) {
      await trx.rollback();
      console.error("Error restoring terminated employee:", error);

      if (
        error.message.includes("Invalid") ||
        error.message.includes("not found") ||
        error.message.includes("not terminated") ||
        error.message.includes("cannot be restored")
      ) {
        throw error;
      }
      throw new Error(
        "Failed to restore terminated employee. Please try again."
      );
    }
  }
}

module.exports = Employee;
