/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable("finance_balances", function (table) {
    table.increments("id").primary();
    table.integer("branch_id").unsigned().notNullable();
    table.decimal("capital", 15, 2).notNullable().defaultTo(0);
    table.decimal("profit", 15, 2).notNullable().defaultTo(0);
    table.decimal("sales_remittances", 15, 2).notNullable().defaultTo(0);
    table.decimal("total_balance", 15, 2).notNullable().defaultTo(0);
    table.timestamp("balance_date").notNullable();
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.timestamp("updated_at").defaultTo(knex.fn.now());
    table.timestamp("deleted_at").nullable();

    // Foreign key constraints
    table
      .foreign("branch_id")
      .references("id")
      .inTable("branches")
      .onDelete("CASCADE");

    // Indexes for performance
    table.index(["branch_id", "balance_date"]);
    table.index(["balance_date"]);
    table.index(["deleted_at"]);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTable("finance_balances");
};
