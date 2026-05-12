/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable("branch_request_items", function (table) {
    table.increments("id").primary();
    table
      .integer("branch_request_id")
      .unsigned()
      .notNullable()
      .comment("Reference to branch request");
    table
      .integer("item_number")
      .notNullable()
      .comment("Item sequence number in request");
    table.string("item_name", 255).notNullable().comment("Name of the item");
    table.integer("item_quantity").notNullable().comment("Quantity requested");
    table
      .string("item_unit", 50)
      .defaultTo("pieces")
      .comment("Unit of measurement");
    table
      .string("item_type", 100)
      .defaultTo("General")
      .comment("Category of item");
    table
      .text("item_notes")
      .nullable()
      .comment("Additional notes for the item");
    table.timestamps(true, true);

    // Foreign key constraints
    table
      .foreign("branch_request_id")
      .references("id")
      .inTable("branch_requests")
      .onDelete("CASCADE");

    // Indexes
    table.index("branch_request_id", "idx_branch_request_items_request_id");
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTable("branch_request_items");
};
