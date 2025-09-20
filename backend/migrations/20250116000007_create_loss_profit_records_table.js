/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable("loss_profit_records", function (table) {
    table.increments("id").primary();
    table.integer("order_id").unsigned().notNullable();
    table.string("order_number", 50).notNullable();
    table.integer("branch_id").unsigned().notNullable();
    table.decimal("loss_amount", 10, 2).notNullable();
    table.string("void_reason", 255).notNullable();
    table.integer("voided_by").unsigned().notNullable();
    table.timestamp("recorded_at").notNullable();
    table.timestamps(true, true);

    // Foreign key constraints
    table
      .foreign("order_id")
      .references("id")
      .inTable("pos_sales_orders")
      .onDelete("CASCADE");
    table
      .foreign("branch_id")
      .references("id")
      .inTable("branches")
      .onDelete("CASCADE");
    table
      .foreign("voided_by")
      .references("id")
      .inTable("employees")
      .onDelete("CASCADE");

    // Indexes for better performance
    table.index(["branch_id", "recorded_at"]);
    table.index(["order_id"]);
    table.index(["voided_by"]);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTable("loss_profit_records");
};
