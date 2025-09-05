/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.alterTable("sample_productions", function (table) {
    // Add failure tracking fields
    table
      .string("failure_reason", 100)
      .nullable()
      .comment("Categorized reason for production failure");
    table
      .decimal("quantity_lost", 10, 2)
      .nullable()
      .comment("Quantity lost during failed production");

    // Add index for failure analysis
    table.index("failure_reason", "idx_sample_productions_failure_reason");
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.alterTable("sample_productions", function (table) {
    // Remove failure tracking fields
    table.dropIndex("failure_reason", "idx_sample_productions_failure_reason");
    table.dropColumn("failure_reason");
    table.dropColumn("quantity_lost");
  });
};
