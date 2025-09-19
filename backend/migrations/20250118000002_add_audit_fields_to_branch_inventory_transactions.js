/**
 * Add audit fields to branch_inventory_transactions table
 * This ensures proper audit trails for all inventory movements
 */

exports.up = async function (knex) {
  const hasTable = await knex.schema.hasTable("branch_inventory_transactions");

  if (!hasTable) {
    console.log(
      "branch_inventory_transactions table does not exist, skipping migration"
    );
    return;
  }

  // Add audit fields to branch_inventory_transactions
  await knex.schema.alterTable("branch_inventory_transactions", (table) => {
    // Add reason field for audit trail
    table.text("reason").nullable().after("notes");

    // Add cost tracking fields
    table.decimal("unit_cost", 12, 2).nullable().after("reason");
    table.decimal("total_value", 12, 2).nullable().after("unit_cost");

    // Add transaction date field (separate from created_at for business logic)
    table.timestamp("transaction_date").nullable().after("total_value");

    // Add index for better query performance
    table.index(["transaction_date"]);
    table.index(["reason"]);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  const hasTable = await knex.schema.hasTable("branch_inventory_transactions");

  if (!hasTable) {
    console.log(
      "branch_inventory_transactions table does not exist, skipping rollback"
    );
    return;
  }

  // Remove the added fields
  await knex.schema.alterTable("branch_inventory_transactions", (table) => {
    table.dropColumn("reason");
    table.dropColumn("unit_cost");
    table.dropColumn("total_value");
    table.dropColumn("transaction_date");
  });
};
