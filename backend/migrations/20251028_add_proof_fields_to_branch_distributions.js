/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.alterTable('branch_distributions', function(table) {
    table.string('proof_of_delivery', 500).nullable();
    table.string('proof_of_receipt', 500).nullable();
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.alterTable('branch_distributions', function(table) {
    table.dropColumn('proof_of_delivery');
    table.dropColumn('proof_of_receipt');
  });
};

