/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable("employees", (table) => {
    table.increments("id").primary();
    table
      .string("employee_id", 20)
      .unique()
      .notNullable()
      .comment("Generated employee ID (e.g., EMP001234)");

    // Basic Information
    table.string("first_name", 100).notNullable();
    table.string("middle_name", 100).nullable();
    table.string("last_name", 100).notNullable();
    table.string("email", 255).nullable();
    table.string("phone_number", 20).notNullable();
    table.text("address").notNullable();
    table.string("postal_code", 10).notNullable();
    table.enu("civil_status", ["Single", "Married"]).notNullable();
    table.enu("sex", ["Male", "Female"]).notNullable();
    table.date("birthday").notNullable();
    table.integer("age").notNullable();
    table.string("citizenship", 50).notNullable();

    // Professional Information
    table
      .enu("department", [
        "Human Resource",
        "Finance",
        "SCM",
        "Production",
        "CRM",
        "Branch",
      ])
      .notNullable();
    table.string("job_title", 50).notNullable();
    table.enu("employee_type", ["Full-time", "Part-time"]).notNullable();

    // Government Benefits Information
    table.string("pagibig_number", 50).notNullable();
    table.string("sss_number", 50).notNullable();
    table.string("philhealth_number", 50).notNullable();

    // Emergency Contact Information
    table.string("emergency_contact_name", 100).notNullable();
    table.string("emergency_relationship", 50).notNullable();
    table.string("emergency_contact_number", 20).notNullable();
    table.string("alternate_contact_number", 20).nullable();
    table.text("emergency_contact_address").notNullable();
    table.string("emergency_contact_email", 255).nullable();

    // System fields
    table
      .enu("status", ["Active", "Inactive", "Terminated", "On Leave"])
      .defaultTo("Active");
    table.integer("created_by").unsigned().nullable();
    table.integer("updated_by").unsigned().nullable();
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.timestamp("updated_at").defaultTo(knex.fn.now());
    table.timestamp("deleted_at").nullable();

    // Indexes
    table.index("employee_id");
    table.index("department");
    table.index("status");
    table.index("created_at");
    table.index(["deleted_at"]);

    // Foreign key constraints (if users table exists)
    table
      .foreign("created_by")
      .references("id")
      .inTable("users")
      .onDelete("SET NULL");
    table
      .foreign("updated_by")
      .references("id")
      .inTable("users")
      .onDelete("SET NULL");
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists("employees");
};
