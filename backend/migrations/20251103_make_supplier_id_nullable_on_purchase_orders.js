/**
 * Make purchase_orders.supplier_id nullable to support manual (supplier-less) POs.
 */

exports.up = async function up(knex) {
  // PostgreSQL: DROP NOT NULL
  await knex.schema.raw(
    'ALTER TABLE purchase_orders ALTER COLUMN supplier_id DROP NOT NULL'
  );
};

exports.down = async function down(knex) {
  // Revert: set NOT NULL back (this will fail if nulls exist)
  await knex.schema.raw(
    'ALTER TABLE purchase_orders ALTER COLUMN supplier_id SET NOT NULL'
  );
};


