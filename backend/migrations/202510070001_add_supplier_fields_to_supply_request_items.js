/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  const hasSupplierId = await knex.schema.hasColumn(
    "supply_request_items",
    "supplier_id"
  );
  if (!hasSupplierId) {
    await knex.schema.alterTable("supply_request_items", (table) => {
      table
        .integer("supplier_id")
        .nullable()
        .comment("Optional: linked supplier ID when item comes from supplier");
      table
        .integer("supplier_product_id")
        .nullable()
        .comment("Optional: linked supplier product ID");
      table
        .string("item_sku", 255)
        .nullable()
        .comment("Optional supplier SKU/reference");
      table
        .string("source", 50)
        .nullable()
        .comment("Origin of item: 'supplier' | 'manual' | other tag");

      table.index(
        "supplier_product_id",
        "idx_supply_request_items_supplier_product_id"
      );
      table.index("supplier_id", "idx_supply_request_items_supplier_id");
    });
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  const hasSupplierId = await knex.schema.hasColumn(
    "supply_request_items",
    "supplier_id"
  );
  if (hasSupplierId) {
    await knex.schema.alterTable("supply_request_items", (table) => {
      table.dropIndex(
        "supplier_product_id",
        "idx_supply_request_items_supplier_product_id"
      );
      table.dropIndex("supplier_id", "idx_supply_request_items_supplier_id");
      table.dropColumn("supplier_id");
      table.dropColumn("supplier_product_id");
      table.dropColumn("item_sku");
      table.dropColumn("source");
    });
  }
};
