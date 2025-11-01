/**
 * Add 'rejection' to branch_inventory_tx_type enum
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // Add 'rejection' value to the enum
  // Check if it already exists to avoid errors on re-run
  const enumExists = await knex.raw(`
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'rejection' 
    AND enumtypid = (
      SELECT oid FROM pg_type WHERE typname = 'branch_inventory_tx_type'
    )
  `);

  if (enumExists.rows.length === 0) {
    await knex.raw(`
      ALTER TYPE branch_inventory_tx_type ADD VALUE 'rejection';
    `);
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  // Note: PostgreSQL does not support removing enum values directly
  // This is a one-way migration - to remove the value, you would need to:
  // 1. Drop and recreate the enum with only the desired values
  // 2. Update all tables using the enum
  // For now, we'll leave it as a no-op
};
