/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // Create production_inventory_distributions table
  await knex.schema.createTable(
    "production_inventory_distributions",
    (table) => {
      table.increments("id").primary();
      table
        .integer("production_inventory_id")
        .notNullable()
        .references("id")
        .inTable("production_inventory");
      table
        .integer("menu_item_id")
        .notNullable()
        .references("id")
        .inTable("menu_items");
      table
        .integer("branch_id")
        .notNullable()
        .references("id")
        .inTable("branches");

      // Distribution Details
      table.integer("quantity_distributed").notNullable();
      table.decimal("unit_cost", 15, 2).defaultTo(0);
      table.decimal("total_cost", 15, 2).defaultTo(0);
      table.decimal("transfer_price", 15, 2).defaultTo(0);

      // Tracking
      table.datetime("distribution_date").notNullable();
      table
        .integer("distributed_by")
        .notNullable()
        .references("id")
        .inTable("users");
      table.text("notes").nullable();

      // Status
      table
        .enum("status", ["pending", "completed", "cancelled"])
        .defaultTo("completed");

      table.timestamps(true, true);
      table.timestamp("deleted_at").nullable();

      // Indexes
      table.index(["production_inventory_id"]);
      table.index(["menu_item_id"]);
      table.index(["branch_id"]);
      table.index(["distribution_date"]);
      table.index(["distributed_by"]);
    }
  );

  // Add total_distributed column to production_inventory table
  await knex.schema.alterTable("production_inventory", (table) => {
    table.integer("total_distributed").defaultTo(0);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  // Drop production_inventory_distributions table
  await knex.schema.dropTableIfExists("production_inventory_distributions");

  // Remove total_distributed column from production_inventory table
  await knex.schema.alterTable("production_inventory", (table) => {
    table.dropColumn("total_distributed");
  });
};
