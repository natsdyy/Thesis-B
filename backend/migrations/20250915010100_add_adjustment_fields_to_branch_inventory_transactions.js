/**
 * Add adjustment_type and new_expiry_date to branch_inventory_transactions
 */

exports.up = async function (knex) {
  const hasTable = await knex.schema.hasTable("branch_inventory_transactions");
  if (!hasTable) return;

  const hasAdjustmentType = await knex.schema.hasColumn(
    "branch_inventory_transactions",
    "adjustment_type"
  );
  const hasNewExpiry = await knex.schema.hasColumn(
    "branch_inventory_transactions",
    "new_expiry_date"
  );

  return knex.schema.alterTable("branch_inventory_transactions", (table) => {
    if (!hasAdjustmentType) table.string("adjustment_type", 50).nullable();
    if (!hasNewExpiry) table.date("new_expiry_date").nullable();
  });
};

exports.down = async function (knex) {
  const hasTable = await knex.schema.hasTable("branch_inventory_transactions");
  if (!hasTable) return;

  return knex.schema.alterTable("branch_inventory_transactions", (table) => {
    table.dropColumn("adjustment_type");
    table.dropColumn("new_expiry_date");
  });
};
