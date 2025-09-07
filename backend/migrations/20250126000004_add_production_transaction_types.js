/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // Add production transaction types to the enum
  await knex.raw(`
    ALTER TABLE inventory_transactions 
    DROP CONSTRAINT IF EXISTS inventory_transactions_transaction_type_check;
  `);

  await knex.raw(`
    ALTER TABLE inventory_transactions 
    ADD CONSTRAINT inventory_transactions_transaction_type_check 
    CHECK (transaction_type IN (
      'receipt', 
      'consumption', 
      'adjustment', 
      'return', 
      'transfer', 
      'expiry', 
      'damage',
      'production_consumption',
      'production_output'
    ));
  `);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  // Remove production transaction types from the enum
  await knex.raw(`
    ALTER TABLE inventory_transactions 
    DROP CONSTRAINT IF EXISTS inventory_transactions_transaction_type_check;
  `);

  await knex.raw(`
    ALTER TABLE inventory_transactions 
    ADD CONSTRAINT inventory_transactions_transaction_type_check 
    CHECK (transaction_type IN (
      'receipt', 
      'consumption', 
      'adjustment', 
      'return', 
      'transfer', 
      'expiry', 
      'damage'
    ));
  `);
};
