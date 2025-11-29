/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // Allow supplier_id to be nullable on goods_receipt_notes to support manual POs
  await knex.schema.alterTable("goods_receipt_notes", (table) => {
    table.integer("supplier_id").nullable().alter();
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  // Revert supplier_id to NOT NULL (only safe if all rows have a supplier)
  await knex.schema.alterTable("goods_receipt_notes", (table) => {
    table.integer("supplier_id").notNullable().alter();
  });
};
