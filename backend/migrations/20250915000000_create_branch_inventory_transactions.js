/**
 * Create table: branch_inventory_transactions
 */

exports.up = async function (knex) {
  const exists = await knex.schema.hasTable("branch_inventory_transactions");
  if (exists) return;

  await knex.schema.createTable("branch_inventory_transactions", (table) => {
    table.increments("id").primary();
    table.integer("branch_id").notNullable().index();
    table.integer("inventory_item_id").nullable().index();
    table.string("item_name").notNullable();
    table
      .enu("item_type", ["scm", "production"], {
        useNative: true,
        enumName: "branch_item_type",
      })
      .notNullable();
    table
      .enu(
        "transaction_type",
        ["distribution", "consumption", "adjustment", "disposal"],
        { useNative: true, enumName: "branch_inventory_tx_type" }
      )
      .notNullable();
    table.decimal("quantity", 14, 3).notNullable().defaultTo(0);
    table.string("unit_of_measure").notNullable();
    table.string("reference_number").nullable();
    table.text("notes").nullable();
    table.integer("performed_by").nullable().index();
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.timestamp("updated_at").defaultTo(knex.fn.now());
    table.timestamp("deleted_at").nullable();
  });
};

exports.down = async function (knex) {
  const hasTable = await knex.schema.hasTable("branch_inventory_transactions");
  if (hasTable) {
    await knex.schema.dropTable("branch_inventory_transactions");
  }
  // Best effort: drop enums if supported
  try {
    await knex.raw("DROP TYPE IF EXISTS branch_inventory_tx_type");
  } catch (e) {}
  try {
    await knex.raw("DROP TYPE IF EXISTS branch_item_type");
  } catch (e) {}
};
