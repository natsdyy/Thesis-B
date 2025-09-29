/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function up(knex) {
  // Ensure sequences for serial id columns are aligned to max(id)
  // This addresses cases where manual inserts or data restores desynced sequences
  await knex.transaction(async (trx) => {
    // pos_sales_orders.id sequence
    await trx.raw(`
      DO $$
      DECLARE
        seq_name text;
      BEGIN
        -- Find the sequence attached to pos_sales_orders.id dynamically
        SELECT pg_get_serial_sequence('pos_sales_orders', 'id') INTO seq_name;

        IF seq_name IS NOT NULL THEN
          PERFORM setval(seq_name, COALESCE((SELECT MAX(id) FROM pos_sales_orders), 0));
        END IF;
      END
      $$;
    `);

    // pos_order_items.id sequence (defensive)
    await trx.raw(`
      DO $$
      DECLARE
        seq_name text;
      BEGIN
        SELECT pg_get_serial_sequence('pos_order_items', 'id') INTO seq_name;

        IF seq_name IS NOT NULL THEN
          PERFORM setval(seq_name, COALESCE((SELECT MAX(id) FROM pos_order_items), 0));
        END IF;
      END
      $$;
    `);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function down(knex) {
  // No-op safe down; sequence positions are not easily reversible
};
