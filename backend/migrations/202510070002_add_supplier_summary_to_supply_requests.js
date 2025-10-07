/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  const hasSupplierId = await knex.schema.hasColumn(
    "supply_requests",
    "supplier_id"
  );
  if (!hasSupplierId) {
    await knex.schema.alterTable("supply_requests", (table) => {
      table
        .integer("supplier_id")
        .nullable()
        .comment(
          "Optional: single supplier when all items are from same supplier"
        );
      table
        .boolean("is_supplier_sourced")
        .notNullable()
        .defaultTo(false)
        .comment("True if at least one item is sourced from a supplier");
      table
        .integer("supplier_item_count")
        .notNullable()
        .defaultTo(0)
        .comment("Number of items sourced from a supplier");
      table.index(
        "is_supplier_sourced",
        "idx_supply_requests_is_supplier_sourced"
      );
      table.index("supplier_id", "idx_supply_requests_supplier_id");
    });
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  const hasSupplierId = await knex.schema.hasColumn(
    "supply_requests",
    "supplier_id"
  );
  if (hasSupplierId) {
    await knex.schema.alterTable("supply_requests", (table) => {
      table.dropIndex(
        "is_supplier_sourced",
        "idx_supply_requests_is_supplier_sourced"
      );
      table.dropIndex("supplier_id", "idx_supply_requests_supplier_id");
      table.dropColumn("supplier_id");
      table.dropColumn("is_supplier_sourced");
      table.dropColumn("supplier_item_count");
    });
  }
};
