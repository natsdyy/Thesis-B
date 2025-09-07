/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // Add menu_item_id and assigned_to columns to production_batches table
  await knex.schema.alterTable("production_batches", (table) => {
    // Add menu_item_id column to support direct production execution
    table
      .integer("menu_item_id")
      .nullable()
      .references("id")
      .inTable("menu_items")
      .after("production_order_id");

    // Add assigned_to column for production staff assignment
    table
      .integer("assigned_to")
      .nullable()
      .references("id")
      .inTable("users")
      .after("produced_by");

    // Add production_date for scheduling
    table.date("production_date").nullable().after("end_time");

    // Add index for better performance
    table.index("menu_item_id");
    table.index("assigned_to");
    table.index("production_date");
  });

  // Make production_order_id nullable since we can now create batches directly from menu items
  await knex.schema.alterTable("production_batches", (table) => {
    table.integer("production_order_id").nullable().alter();
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.schema.alterTable("production_batches", (table) => {
    table.dropColumn("menu_item_id");
    table.dropColumn("assigned_to");
    table.dropColumn("production_date");
  });

  // Restore production_order_id as not nullable
  await knex.schema.alterTable("production_batches", (table) => {
    table.integer("production_order_id").notNullable().alter();
  });
};
