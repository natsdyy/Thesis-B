/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable("purchase_orders", function (table) {
    table.increments("id").primary();
    table
      .string("po_number", 50)
      .notNullable()
      .unique()
      .comment("Purchase Order number");
    table
      .integer("supplier_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("suppliers")
      .onDelete("RESTRICT")
      .comment("Reference to supplier");
    table
      .integer("supply_request_id")
      .unsigned()
      .nullable()
      .references("id")
      .inTable("supply_requests")
      .onDelete("SET NULL")
      .comment("Reference to original supply request (optional)");
    table
      .enum("status", [
        "Draft",
        "Sent",
        "Confirmed",
        "In Progress",
        "Delivered",
        "Completed",
        "Cancelled",
      ])
      .defaultTo("Draft")
      .comment("Purchase order status");
    table
      .decimal("total_amount", 15, 2)
      .notNullable()
      .comment("Total order amount");
    table.date("order_date").notNullable().comment("Date order was placed");
    table
      .date("expected_delivery")
      .nullable()
      .comment("Expected delivery date");
    table.date("actual_delivery").nullable().comment("Actual delivery date");
    table.text("notes").nullable().comment("Additional notes");
    table
      .string("created_by", 255)
      .notNullable()
      .comment("User who created the PO");
    table.timestamps(true, true);

    // Indexes
    table.index("po_number");
    table.index("supplier_id");
    table.index("supply_request_id");
    table.index("status");
    table.index("order_date");
    table.index(["status", "order_date"]);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTable("purchase_orders");
};
