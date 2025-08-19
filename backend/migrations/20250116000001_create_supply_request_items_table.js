/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
<<<<<<< HEAD
exports.up = function (knex) {
  return knex.schema.createTable("supply_request_items", function (table) {
    table.increments("id").primary();
    table
      .integer("supply_request_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("supply_requests")
      .onDelete("CASCADE")
      .onUpdate("CASCADE")
      .comment("Reference to supply request");
    table
      .integer("item_number")
      .notNullable()
      .comment("Item sequence number in request");
    table.string("item_name", 255).notNullable().comment("Name of the item");
    table.integer("item_quantity").notNullable().comment("Quantity requested");
    table
      .string("item_unit", 50)
      .notNullable()
      .comment("Unit of measurement (PC, KG, L, etc.)");
    table.string("item_type", 100).notNullable().comment("Category of item");
    table
      .decimal("item_unit_price", 12, 2)
      .notNullable()
      .comment("Price per unit");
    table
      .decimal("item_amount", 15, 2)
      .notNullable()
      .comment("Total amount (quantity * unit_price)");
    table
      .text("item_notes")
      .nullable()
      .comment("Additional notes for the item");
    table.timestamps(true, true);

    // Indexes
    table.index("supply_request_id", "idx_supply_request_items_request_id");
    table.index("item_type", "idx_supply_request_items_type");
    table.unique(
      ["supply_request_id", "item_number"],
      "unique_request_item_number"
    );
=======
exports.up = function(knex) {
  return knex.schema.createTable('supply_request_items', function(table) {
    table.increments('id').primary();
    table.integer('supply_request_id').unsigned().references('id').inTable('supply_requests').onDelete('CASCADE');
    table.string('item_name').notNullable();
    table.integer('item_quantity').notNullable();
    table.string('item_unit').notNullable();
    table.string('item_type').notNullable();
    table.decimal('item_unit_price', 10, 2).notNullable();
    table.decimal('item_amount', 10, 2).notNullable();
    table.timestamps(true, true);
>>>>>>> f9b8338ccee227920f0d00d7c674d084059303a3
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
<<<<<<< HEAD
exports.down = function (knex) {
  return knex.schema.dropTable("supply_request_items");
};
=======
exports.down = function(knex) {
  return knex.schema.dropTable('supply_request_items');
};

>>>>>>> f9b8338ccee227920f0d00d7c674d084059303a3
