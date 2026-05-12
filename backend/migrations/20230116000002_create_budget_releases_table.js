/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable("budget_releases", function (table) {
    table.increments("id").primary();
    table
      .string("release_id", 50)
      .notNullable()
      .unique()
      .comment("Unique release identifier");
    table
      .integer("supply_request_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("supply_requests")
      .onDelete("RESTRICT")
      .onUpdate("CASCADE")
      .comment("Reference to supply request");
    table
      .decimal("released_amount", 15, 2)
      .notNullable()
      .comment("Amount released");
    table
      .string("released_by", 255)
      .notNullable()
      .comment("Finance user who released budget");
    table
      .timestamp("released_at")
      .notNullable()
      .comment("Budget release timestamp");
    table
      .text("release_remarks")
      .nullable()
      .comment("Remarks for budget release");
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
    table.timestamps(true, true);

    // Indexes
    table.index("release_id", "idx_budget_releases_release_id");
    table.index("supply_request_id", "idx_budget_releases_request_id");
    table.index("released_at", "idx_budget_releases_date");
    table.index("receipt_confirmed", "idx_budget_releases_confirmed");
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTable("budget_releases");
};
