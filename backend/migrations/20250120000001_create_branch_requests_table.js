/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable("branch_requests", function (table) {
    table.increments("id").primary();
    table
      .string("request_id", 50)
      .notNullable()
      .unique()
      .comment("Unique request identifier (e.g., BR-20240120-001)");
    table
      .string("request_type", 100)
      .notNullable()
      .comment("Type of request (Regular, Emergency, Rush)");
    table
      .text("request_description")
      .notNullable()
      .comment("Request description");
    table.date("request_date").notNullable().comment("Date for the request");
    table
      .enum("priority", ["Low", "Normal", "High", "Urgent"])
      .defaultTo("Normal")
      .comment("Request priority");
    table
      .integer("branch_id")
      .unsigned()
      .notNullable()
      .comment("Branch that made the request");
    table
      .string("requested_by", 255)
      .notNullable()
      .comment("Person who made the request");
    table
      .enum("source_type", ["scm", "production"])
      .defaultTo("scm")
      .comment("Source inventory type for the request");
    table
      .enum("status", [
        "Draft",
        "Sent",
        "Acknowledged",
        "In Progress",
        "Completed",
        "Cancelled",
      ])
      .defaultTo("Draft")
      .comment("Current status of the request");
    table
      .text("main_office_notes")
      .nullable()
      .comment("Notes from main office");
    table
      .string("acknowledged_by", 255)
      .nullable()
      .comment("Main office user who acknowledged");
    table
      .timestamp("acknowledged_at")
      .nullable()
      .comment("Acknowledgment timestamp");
    table
      .string("completed_by", 255)
      .nullable()
      .comment("Main office user who completed");
    table.timestamp("completed_at").nullable().comment("Completion timestamp");
    table
      .string("cancelled_by", 255)
      .nullable()
      .comment("User who cancelled the request");
    table
      .timestamp("cancelled_at")
      .nullable()
      .comment("Cancellation timestamp");
    table.timestamps(true, true);
    table.timestamp("deleted_at").nullable().comment("Soft delete timestamp");

    // Foreign key constraints
    table
      .foreign("branch_id")
      .references("id")
      .inTable("branches")
      .onDelete("CASCADE");

    // Indexes
    table.index("branch_id", "idx_branch_requests_branch_id");
    table.index("status", "idx_branch_requests_status");
    table.index("request_date", "idx_branch_requests_date");
    table.index("source_type", "idx_branch_requests_source_type");
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTable("branch_requests");
};
