/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable(
    "employee_transfer_requests",
    function (table) {
      table.increments("id").primary();
      table
        .integer("employee_id")
        .unsigned()
        .nullable()
        .comment("Employee being transferred (null for transfer_in requests)");
      table
        .integer("requested_by")
        .unsigned()
        .notNullable()
        .comment("Manager who requested the transfer");
      table
        .enum("transfer_type", ["transfer_in", "transfer_out"])
        .notNullable()
        .comment("Type of transfer");
      table
        .integer("from_branch_id")
        .unsigned()
        .nullable()
        .comment("Source branch (null for transfer_in requests)");
      table
        .integer("to_branch_id")
        .unsigned()
        .notNullable()
        .comment("Destination branch");
      table.text("reason").notNullable().comment("Reason for transfer");
      table
        .enum("status", ["pending", "approved", "rejected"])
        .defaultTo("pending")
        .comment("Request status");
      table
        .integer("approved_by")
        .unsigned()
        .nullable()
        .comment("HR who approved/rejected");
      table.text("approval_notes").nullable().comment("HR notes on decision");
      table
        .timestamp("approved_at")
        .nullable()
        .comment("When request was approved/rejected");
      table
        .timestamp("completed_at")
        .nullable()
        .comment("When transfer was completed");
      table.timestamps(true, true);
      table.timestamp("deleted_at").nullable();

      // Foreign key constraints
      table
        .foreign("employee_id")
        .references("id")
        .inTable("employees")
        .onDelete("CASCADE");
      table
        .foreign("requested_by")
        .references("id")
        .inTable("employees")
        .onDelete("CASCADE");
      table
        .foreign("from_branch_id")
        .references("id")
        .inTable("branches")
        .onDelete("CASCADE");
      table
        .foreign("to_branch_id")
        .references("id")
        .inTable("branches")
        .onDelete("CASCADE");
      table
        .foreign("approved_by")
        .references("id")
        .inTable("employees")
        .onDelete("SET NULL");

      // Indexes for performance
      table.index("employee_id", "idx_transfer_requests_employee_id");
      table.index("status", "idx_transfer_requests_status");
      table.index("from_branch_id", "idx_transfer_requests_from_branch");
      table.index("to_branch_id", "idx_transfer_requests_to_branch");
      table.index("requested_by", "idx_transfer_requests_requested_by");
      table.index(
        ["employee_id", "status"],
        "idx_transfer_requests_employee_status"
      );
    }
  );
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTable("employee_transfer_requests");
};
