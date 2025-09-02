/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  await knex.schema.alterTable("inventory_transactions", (table) => {
    table.string("adjustment_type", 50).nullable(); // e.g., set_quantity, add_quantity, reduce_quantity, mark_expired, mark_damaged
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.schema.alterTable("inventory_transactions", (table) => {
    table.dropColumn("adjustment_type");
  });
};
