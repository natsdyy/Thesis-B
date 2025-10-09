// backend/migrations/20250131000002_remove_branch_id_from_finance_balances.js
exports.up = function (knex) {
  return knex.schema.alterTable("finance_balances", function (table) {
    // Drop foreign key constraint first
    table.dropForeign("branch_id");
    // Drop the branch_id column
    table.dropColumn("branch_id");
  });
};

exports.down = function (knex) {
  return knex.schema.alterTable("finance_balances", function (table) {
    // Add branch_id column back
    table.integer("branch_id").unsigned().notNullable();
    // Add foreign key constraint back
    table
      .foreign("branch_id")
      .references("id")
      .inTable("branches")
      .onDelete("CASCADE");
  });
};
