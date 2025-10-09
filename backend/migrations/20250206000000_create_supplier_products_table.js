/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable("supplier_products", function (table) {
    table.increments("id").primary();
    table
      .integer("supplier_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("suppliers")
      .onDelete("CASCADE");
    table.string("product_name", 255).notNullable();
    table.text("description").nullable();
    table
      .integer("item_type_id")
      .unsigned()
      .nullable()
      .references("id")
      .inTable("inventory_item_types")
      .onDelete("SET NULL");
    table.string("unit", 50).notNullable().defaultTo("pcs"); // kg, pcs, liters, etc.
    table.decimal("unit_price", 15, 2).notNullable();
    table.integer("minimum_order_quantity").defaultTo(1);
    table.boolean("is_available").defaultTo(true);
    table.string("sku", 100).nullable(); // Stock Keeping Unit
    table.string("image_url", 500).nullable();
    table.timestamps(true, true);
    table.timestamp("deleted_at").nullable();

    // Indexes
    table.index("supplier_id");
    table.index("item_type_id");
    table.index("is_available");
    table.index(["supplier_id", "is_available"]);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTable("supplier_products");
};
