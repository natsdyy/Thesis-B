/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.alterTable("purchase_order_items", function (table) {
    table
      .integer("supplier_product_id")
      .unsigned()
      .nullable()
      .references("id")
      .inTable("supplier_products")
      .onDelete("SET NULL")
      .comment(
        "Reference to supplier product if sourced from supplier catalog"
      );
    table
      .string("item_sku", 100)
      .nullable()
      .comment("SKU from supplier product");

    // Add index for supplier_product_id
    table.index("supplier_product_id");
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.alterTable("purchase_order_items", function (table) {
    table.dropIndex("supplier_product_id");
    table.dropColumn("supplier_product_id");
    table.dropColumn("item_sku");
  });
};
