/**
 * Add receipt_url column to utilities_expenses table
 */

exports.up = async function (knex) {
  await knex.schema.alterTable("utilities_expenses", (table) => {
    table.string("receipt_url", 500).nullable(); // Path to uploaded receipt image
  });
};

exports.down = async function (knex) {
  await knex.schema.alterTable("utilities_expenses", (table) => {
    table.dropColumn("receipt_url");
  });
};
