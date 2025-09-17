/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.alterTable("purchase_order_items", function (table) {
    table
      .decimal("received_quantity", 10, 2)
      .nullable()
      .comment("Quantity actually received");
    table
      .decimal("received_unit_price", 12, 2)
      .nullable()
      .comment("Actual unit price received");
    table
      .decimal("received_total_price", 15, 2)
      .nullable()
      .comment("Total price for received quantity");
    table
      .timestamp("received_at")
      .nullable()
      .comment("When the item was received");
    table
      .string("received_by", 255)
      .nullable()
      .comment("Who received the item");
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.alterTable("purchase_order_items", function (table) {
    table.dropColumn("received_quantity");
    table.dropColumn("received_unit_price");
    table.dropColumn("received_total_price");
    table.dropColumn("received_at");
    table.dropColumn("received_by");
  });
};
