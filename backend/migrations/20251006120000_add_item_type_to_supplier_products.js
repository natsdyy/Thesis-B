/**
 * @param { import('knex').Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function up(knex) {
  // Set conservative timeouts to avoid hanging on locked schema
  try {
    await knex.raw("SET lock_timeout = '5s'");
    await knex.raw("SET statement_timeout = '30s'");
  } catch (_) {
    // ignore if not supported
  }

  try {
    await knex.schema.alterTable("supplier_products", (table) => {
      table
        .integer("item_type_id")
        .unsigned()
        .nullable()
        .references("id")
        .inTable("inventory_item_types")
        .onDelete("SET NULL");
      table.index("item_type_id");
    });
  } catch (err) {
    // If column already exists, ignore (Postgres duplicate_column: 42701)
    if (
      err &&
      (err.code === "42701" || /column .* already exists/i.test(err.message))
    ) {
      return;
    }
    throw err;
  }
};

/**
 * @param { import('knex').Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function down(knex) {
  try {
    await knex.schema.alterTable("supplier_products", (table) => {
      table.dropIndex(["item_type_id"]);
      table.dropColumn("item_type_id");
    });
  } catch (err) {
    // If column doesn't exist, ignore
    if (
      err &&
      (/column .* does not exist/i.test(err.message) || err.code === "42703")
    ) {
      return;
    }
    throw err;
  }
};
