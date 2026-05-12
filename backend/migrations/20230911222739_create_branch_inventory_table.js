/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable("branch_inventory", (table) => {
    table.increments("id").primary();
    table.integer("branch_id").unsigned().notNullable();
    table.string("item_name").notNullable();
    table.string("item_type").notNullable(); // 'scm' or 'production'
    table.string("category").nullable();
    table.decimal("quantity", 10, 2).notNullable().defaultTo(0);
    table.string("unit").notNullable();
    table.decimal("unit_cost", 10, 2).notNullable().defaultTo(0);
    table.decimal("selling_price", 10, 2).nullable();
    table.decimal("total_value", 10, 2).notNullable().defaultTo(0);
    table.decimal("minimum_stock", 10, 2).nullable();
    table.string("status").notNullable().defaultTo("available"); // available, low_stock, out_of_stock, expired
    table.date("expiry_date").nullable();
    table.string("supplier_name").nullable();
    table.string("distribution_reference").nullable(); // Reference to the distribution that added this item
    table.timestamp("last_updated").defaultTo(knex.fn.now());
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.timestamp("updated_at").defaultTo(knex.fn.now());
    table.timestamp("deleted_at").nullable();

    // Foreign key constraints
    table
      .foreign("branch_id")
      .references("id")
      .inTable("branches")
      .onDelete("CASCADE");

    // Indexes for better performance
    table.index(["branch_id", "item_type"]);
    table.index(["branch_id", "status"]);
    table.index(["branch_id", "category"]);
    table.index("expiry_date");
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTable("branch_inventory");
};
