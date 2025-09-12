/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.alterTable("branch_distribution_items", (table) => {
    table
      .string("category", 100)
      .nullable()
      .comment("Item category from source inventory");
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.alterTable("branch_distribution_items", (table) => {
    table.dropColumn("category");
  });
};
