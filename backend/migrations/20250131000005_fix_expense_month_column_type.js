/**
 * Fix expense_month column type from date to string
 * Change from date to varchar(7) to store YYYY-MM format
 */

exports.up = async function (knex) {
  // Fix branch_utilities_remittances table
  await knex.schema.alterTable("branch_utilities_remittances", (table) => {
    table.string("expense_month", 7).notNullable().alter();
  });

  // Fix utilities_expenses table
  await knex.schema.alterTable("utilities_expenses", (table) => {
    table.string("expense_month", 7).notNullable().alter();
  });
};

exports.down = async function (knex) {
  // Revert back to date type (this might cause data loss)
  await knex.schema.alterTable("branch_utilities_remittances", (table) => {
    table.date("expense_month").notNullable().alter();
  });

  await knex.schema.alterTable("utilities_expenses", (table) => {
    table.date("expense_month").notNullable().alter();
  });
};
