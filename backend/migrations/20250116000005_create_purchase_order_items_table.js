/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable("purchase_order_items", function (table) {
    table.increments("id").primary();
    table
      .integer("purchase_order_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("purchase_orders")
      .onDelete("CASCADE")
      .comment("Reference to purchase order");
    table
      .integer("supply_request_item_id")
      .unsigned()
      .nullable()
      .references("id")
      .inTable("supply_request_items")
      .onDelete("SET NULL")
      .comment("Reference to original supply request item (optional)");
    table.string("item_name", 255).notNullable().comment("Name of the item");
    table.integer("quantity").notNullable().comment("Quantity ordered");
    table.string("unit", 50).notNullable().comment("Unit of measurement");
    table.decimal("unit_price", 12, 2).notNullable().comment("Price per unit");
    table
      .decimal("total_price", 15, 2)
      .notNullable()
      .comment("Total price for this item");
    table.text("description").nullable().comment("Item description");
    table.timestamps(true, true);

    // Indexes
    table.index("purchase_order_id");
    table.index("supply_request_item_id");
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTable("purchase_order_items");
};
