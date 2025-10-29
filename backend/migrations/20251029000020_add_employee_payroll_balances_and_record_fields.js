/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // Employee running payroll balances (negative means employee owes company)
  await knex.schema.createTable("employee_payroll_balances", (table) => {
    table.increments("id").primary();
    table
      .integer("employee_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("employees")
      .onDelete("CASCADE");
    table.decimal("balance", 12, 2).notNullable().defaultTo(0);
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.timestamp("updated_at").defaultTo(knex.fn.now());
    table.unique(["employee_id"]);
    table.index(["employee_id"]);
  });

  // Track balance application per payroll record
  await knex.schema.alterTable("payroll_records", (table) => {
    table.decimal("previous_balance_applied", 12, 2).notNullable().defaultTo(0);
    table.decimal("new_balance_carryover", 12, 2).notNullable().defaultTo(0);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.schema.alterTable("payroll_records", (table) => {
    table.dropColumn("previous_balance_applied");
    table.dropColumn("new_balance_carryover");
  });
  await knex.schema.dropTableIfExists("employee_payroll_balances");
};
