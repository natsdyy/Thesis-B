/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable("supplier_ratings", function (table) {
    table.increments("id").primary();
    table.integer("supplier_id").unsigned().notNullable();
    table.integer("purchase_order_id").unsigned().notNullable();
    table.integer("rating").unsigned().notNullable().checkBetween([1, 5]);
    table.text("comment").nullable();
    table.string("rated_by").notNullable();
    table.timestamps(true, true);

    // Foreign key constraints
    table.foreign("supplier_id").references("id").inTable("suppliers");
    table
      .foreign("purchase_order_id")
      .references("id")
      .inTable("purchase_orders");

    // Ensure one rating per purchase order
    table.unique(["purchase_order_id"]);

    // Indexes for better performance
    table.index(["supplier_id"]);
    table.index(["purchase_order_id"]);
    table.index(["rating"]);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists("supplier_ratings");
};
