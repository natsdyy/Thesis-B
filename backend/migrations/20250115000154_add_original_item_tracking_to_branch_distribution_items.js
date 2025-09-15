/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.alterTable("branch_distribution_items", function (table) {
    // Add field to track original item ID for partial processing
    table
      .integer("original_item_id")
      .nullable()
      .comment(
        "Reference to original distribution item if this is from a partial acceptance"
      );

    // Add index for better performance (distribution_id index already exists)
    table.index("original_item_id");
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.alterTable("branch_distribution_items", function (table) {
    // Drop the index first
    table.dropIndex("original_item_id");

    // Drop the column
    table.dropColumn("original_item_id");
  });
};
