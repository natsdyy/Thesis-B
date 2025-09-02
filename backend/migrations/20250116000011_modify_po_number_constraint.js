/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema
    .alterTable("purchase_orders", function (table) {
      // Drop the existing unique constraint
      table.dropUnique(["po_number"]);
    })
    .then(() => {
      // Add a partial unique index that only applies to non-cancelled POs
      return knex.raw(`
      CREATE UNIQUE INDEX purchase_orders_po_number_unique 
      ON purchase_orders (po_number) 
      WHERE status != 'Cancelled'
    `);
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex
    .raw(`DROP INDEX IF EXISTS purchase_orders_po_number_unique`)
    .then(() => {
      return knex.schema.alterTable("purchase_orders", function (table) {
        // Restore the original unique constraint
        table.unique(["po_number"]);
      });
    });
};
