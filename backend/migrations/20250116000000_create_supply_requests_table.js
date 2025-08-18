/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable("supply_requests", function (table) {
    table.increments("id").primary();
    table
      .bigInteger("request_id")
      .notNullable()
      .unique()
      .comment("Unique request identifier");
    table
      .string("request_type", 100)
      .notNullable()
      .comment("Type of request (Equipment, Materials, etc.)");
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
      .string("department", 50)
      .notNullable()
      .comment("Requesting department");
    table
      .string("requested_by", 255)
      .notNullable()
      .comment("Person who made the request");
    table
      .enum("request_status", [
        "To Request",
        "Pending",
        "Approved",
        "Rejected",
        "Cancelled",
        "Budget Released",
        "Completed",
      ])
      .defaultTo("To Request")
      .comment("Current status of request");
    table
      .decimal("total_amount", 15, 2)
      .defaultTo(0)
      .comment("Total amount of the request");
    table
      .integer("item_count")
      .defaultTo(0)
      .comment("Number of items in request");
    table
      .text("finance_remarks")
      .nullable()
      .comment("Finance department remarks");
    table
      .string("approved_by", 255)
      .nullable()
      .comment("Finance user who approved");
    table.timestamp("approved_at").nullable().comment("Approval timestamp");
    table
      .string("rejected_by", 255)
      .nullable()
      .comment("Finance user who rejected");
    table.timestamp("rejected_at").nullable().comment("Rejection timestamp");
    table.string("cancelled_by", 255).nullable().comment("User who cancelled");
    table
      .timestamp("cancelled_at")
      .nullable()
      .comment("Cancellation timestamp");
    table
      .string("sent_back_by", 255)
      .nullable()
      .comment("Finance user who sent back");
    table.timestamp("sent_back_at").nullable().comment("Sent back timestamp");
    table
      .string("released_by", 255)
      .nullable()
      .comment("Finance user who released budget");
    table
      .timestamp("released_at")
      .nullable()
      .comment("Budget release timestamp");
    table.string("release_id", 50).nullable().comment("Budget release ID");
    table
      .boolean("receipt_confirmed")
      .defaultTo(false)
      .comment("SCM confirmed receipt");
    table
      .string("receipt_confirmed_by", 255)
      .nullable()
      .comment("SCM user who confirmed");
    table
      .timestamp("receipt_confirmed_at")
      .nullable()
      .comment("Receipt confirmation timestamp");
    table
      .integer("revision_count")
      .defaultTo(0)
      .comment("Number of times sent back for revision");
    table.timestamps(true, true);

    // Indexes
    table.index("request_id", "idx_supply_requests_request_id");
    table.index("request_status", "idx_supply_requests_status");
    table.index("department", "idx_supply_requests_department");
    table.index("request_date", "idx_supply_requests_date");
    table.index("priority", "idx_supply_requests_priority");
    table.index(
      ["request_status", "request_date"],
      "idx_supply_requests_status_date"
    );
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTable("supply_requests");
};
