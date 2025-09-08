const { db } = require("../config/database");

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

  // Get all employees
  static async getAll(includeDeleted = false) {
    try {
      let query = db("employees").select("*");

      if (!includeDeleted) {
        query = query.whereNull("deleted_at");
      }

      const employees = await query.orderBy("created_at", "desc");
      return employees;
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

      const employee = await db("employees")
        .select("*")
        .where("employee_id", employeeId)
        .whereNull("deleted_at")
        .first();

      return employee;
    } catch (error) {
      console.error("Error fetching employee by employee ID:", error);
      throw new Error("Failed to retrieve employee information");
    }
  }

  // Get employees by department
  static async getByDepartment(department) {
    try {
      if (!department) {
        throw new Error("Department is required");
      }

      const employees = await db("employees")
        .select("*")
        .where("department", department)
        .whereNull("deleted_at")
        .orderBy("first_name");

      return employees;
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

  // Validate employee data
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
    if (!data.job_title?.trim()) errors.push("Job title is required");
    if (!data.employee_type) errors.push("Employee type is required");
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

    // Phone number format validation (Philippine format)
    const phoneRegex = /^\+63\s\d{3}\s\d{3}\s\d{4}$/;
    if (data.phone_number && !phoneRegex.test(data.phone_number)) {
      errors.push("Phone number must be in format: +63 900 000 0000");
    }
    if (
      data.emergency_contact_number &&
      !phoneRegex.test(data.emergency_contact_number)
    ) {
      errors.push(
        "Emergency contact number must be in format: +63 900 000 0000"
      );
    }
    if (
      data.alternate_contact_number &&
      !phoneRegex.test(data.alternate_contact_number)
    ) {
      errors.push(
        "Alternate contact number must be in format: +63 900 000 0000"
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
          phone_number: data.phone_number.trim(),
          address: data.address.trim(),
          postal_code: data.postal_code.trim(),
          civil_status: data.civil_status,
          sex: data.sex,
          birthday: data.birthday,
          age: parseInt(data.age),
          citizenship: data.citizenship.trim(),
          department: data.department,
          job_title: data.job_title.trim(),
          employee_type: data.employee_type,
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
          status: "Active",
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

      // Validate input
      const validation = this.validateEmployeeData(data);
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

      // Check for duplicate government benefit numbers (excluding current employee)
      const duplicateEmployee = await db("employees")
        .where(function () {
          this.where("pagibig_number", data.pagibig_number)
            .orWhere("sss_number", data.sss_number)
            .orWhere("philhealth_number", data.philhealth_number);
        })
        .where("id", "!=", id)
        .whereNull("deleted_at")
        .first();

      if (duplicateEmployee) {
        throw new Error(
          "Another employee with these government benefit numbers already exists"
        );
      }

      const [employee] = await db("employees")
        .where("id", id)
        .update({
          first_name: data.first_name.trim(),
          middle_name: data.middle_name?.trim() || null,
          last_name: data.last_name.trim(),
          email: data.email?.trim().toLowerCase() || null,
          phone_number: data.phone_number.trim(),
          address: data.address.trim(),
          postal_code: data.postal_code.trim(),
          civil_status: data.civil_status,
          sex: data.sex,
          birthday: data.birthday,
          age: parseInt(data.age),
          citizenship: data.citizenship.trim(),
          department: data.department,
          job_title: data.job_title.trim(),
          employee_type: data.employee_type,
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
          updated_by: updatedBy,
          updated_at: new Date(),
        })
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
}

module.exports = Employee;
