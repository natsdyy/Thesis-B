/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable("item_returns", function (table) {
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
      .integer("purchase_order_item_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("purchase_order_items")
      .onDelete("CASCADE")
      .comment("Reference to specific item being returned");
    table
      .integer("return_quantity")
      .notNullable()
      .comment("Quantity being returned");
    table
      .enum("return_reason", [
        "Back Order",
        "Defective",
        "Wrong Item",
        "Poor Quality",
        "Damaged in Transit",
        "Other",
      ])
      .notNullable()
      .comment("Reason for return");
    table.text("notes").nullable().comment("Additional notes about the return");
    table
      .enum("status", ["Pending", "Processed", "Completed"])
      .defaultTo("Pending")
      .comment("Return processing status");
    table
      .string("logged_by", 255)
      .notNullable()
      .comment("User who logged the return");
    table
      .timestamp("processed_at")
      .nullable()
      .comment("When return was processed");
    table
      .string("processed_by", 255)
      .nullable()
      .comment("User who processed the return");
    table.timestamps(true, true);

    // Indexes
    table.index("purchase_order_id");
    table.index("purchase_order_item_id");
    table.index("return_reason");
    table.index("status");
    table.index("logged_by");
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTable("item_returns");
};
