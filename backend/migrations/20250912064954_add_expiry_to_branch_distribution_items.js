/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.alterTable("branch_distribution_items", (table) => {
    table
      .date("expiry_date")
      .nullable()
      .comment("Optional expiry date from source inventory");
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.alterTable("branch_distribution_items", (table) => {
    table.dropColumn("expiry_date");
  });
};
