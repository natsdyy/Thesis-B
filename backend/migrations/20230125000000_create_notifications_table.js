/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable("notifications", function (table) {
    table.increments("id").primary();
    table
      .integer("employee_id")
      .unsigned()
      .nullable()
      .comment(
        "FK to employees.id (nullable for department-wide notifications)"
      );
    table
      .string("department", 50)
      .notNullable()
      .comment(
        "Target department (Human Resource, Finance, SCM, Production, CRM, Branch, Administration)"
      );
    table
      .string("role_filter", 100)
      .nullable()
      .comment(
        "Role filter if only specific roles should see (e.g., 'Manager', 'Admin')"
      );
    table
      .enum("notification_type", [
        "supply_request",
        "payroll",
        "purchase_order",
        "remittance",
        "overtime",
        "leave",
        "branch_request",
        "branch_return",
        "budget_release",
        "distribution",
      ])
      .notNullable()
      .comment("Type of notification");
    table.string("title", 255).notNullable().comment("Notification heading");
    table.text("message").notNullable().comment("Notification body");
    table
      .integer("reference_id")
      .unsigned()
      .nullable()
      .comment("ID of the related record");
    table
      .string("reference_table", 100)
      .nullable()
      .comment(
        "Which table (supply_requests, purchase_orders, payroll_periods, etc.)"
      );
    table
      .string("action_url", 500)
      .nullable()
      .comment("Where to redirect when clicked");
    table
      .boolean("is_read")
      .defaultTo(false)
      .comment("Whether notification has been read");
    table.timestamps(true, true);
    table.timestamp("deleted_at").nullable().comment("Soft delete timestamp");

    // Indexes for performance
    table.index("employee_id");
    table.index("department");
    table.index("is_read");
    table.index("notification_type");
    table.index("created_at");
    table.index(["department", "is_read"]);
    table.index(["employee_id", "is_read"]);
    table.index(["notification_type", "created_at"]);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTable("notifications");
};
