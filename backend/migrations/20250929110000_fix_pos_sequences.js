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
        max_id bigint;
      BEGIN
        SELECT pg_get_serial_sequence('pos_sales_orders', 'id') INTO seq_name;
        IF seq_name IS NOT NULL THEN
          SELECT MAX(id) FROM pos_sales_orders INTO max_id;
          IF max_id IS NOT NULL THEN
            EXECUTE format('SELECT setval(%L, %s, true)', seq_name, max_id);
          ELSE
            EXECUTE format('SELECT setval(%L, 1, false)', seq_name);
          END IF;
        END IF;
      END
      $$;
    `);

    // pos_order_items.id sequence (defensive)
    await trx.raw(`
      DO $$
      DECLARE
        seq_name text;
        max_id bigint;
      BEGIN
        SELECT pg_get_serial_sequence('pos_order_items', 'id') INTO seq_name;
        IF seq_name IS NOT NULL THEN
          SELECT MAX(id) FROM pos_order_items INTO max_id;
          IF max_id IS NOT NULL THEN
            EXECUTE format('SELECT setval(%L, %s, true)', seq_name, max_id);
          ELSE
            EXECUTE format('SELECT setval(%L, 1, false)', seq_name);
          END IF;
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
