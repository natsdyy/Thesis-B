/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  await knex.schema.alterTable("pos_sales_orders", function (table) {
    table
      .integer("remittance_id")
      .unsigned()
      .nullable()
      .references("id")
      .inTable("branch_remittances")
      .onDelete("SET NULL")
      .index();
    table.timestamp("remitted_at").nullable().index();
  });

  // Helpful covering index for queries fetching unremitted orders by range
  try {
    await knex.raw(
      "CREATE INDEX IF NOT EXISTS idx_pos_orders_unremitted_range ON pos_sales_orders (branch_id, created_at, remittance_id)"
    );
  } catch (e) {
    // Best-effort: ignore if dialect doesn't support IF NOT EXISTS
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.schema.alterTable("pos_sales_orders", function (table) {
    table.dropColumn("remitted_at");
    table.dropColumn("remittance_id");
  });
};
