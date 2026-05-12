/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  await knex.schema.createTable("branch_remittances", function (table) {
    table.increments("id").primary();
    table
      .integer("branch_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("branches")
      .onDelete("RESTRICT");
    table
      .integer("submitted_by")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("employees")
      .onDelete("RESTRICT");
    table
      .enu("period_type", ["today", "week", "month", "year"]) // aligns with UI
      .notNullable();
    table.timestamp("date_from").notNullable();
    table.timestamp("date_to").notNullable();
    table.decimal("gross_sales", 15, 2).notNullable().defaultTo(0);
    table.decimal("net_sales", 15, 2).notNullable().defaultTo(0);
    table.decimal("refunded_amount", 15, 2).notNullable().defaultTo(0);
    table.integer("disposed").notNullable().defaultTo(0);
    table.decimal("remitted_amount", 15, 2).notNullable().defaultTo(0);
    table
      .enu("status", ["pending", "approved", "rejected"]) // soft workflow
      .notNullable()
      .defaultTo("pending");
    table
      .integer("approved_by")
      .unsigned()
      .nullable()
      .references("id")
      .inTable("employees")
      .onDelete("SET NULL");
    table.timestamp("approved_at").nullable();
    table.text("notes").nullable();
    table.timestamp("deleted_at").nullable(); // soft delete
    table.timestamps(true, true);

    table.index(["branch_id", "status"]);
    table.index(["date_from", "date_to"]);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.schema.dropTableIfExists("branch_remittances");
};
