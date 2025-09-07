/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.alterTable("sample_productions", (table) => {
    // Add priority field with enum values
    table
      .enum("priority", ["Low", "Normal", "High", "Urgent"])
      .defaultTo("Normal")
      .comment("Priority level for the sample production");

    // Add category field
    table
      .string("category", 100)
      .nullable()
      .comment("Category of the sample production");

    // Add estimated_cost field (rename from production_cost if needed)
    table
      .decimal("estimated_cost", 10, 2)
      .nullable()
      .comment("Estimated cost for the sample production");
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.alterTable("sample_productions", (table) => {
    table.dropColumn("priority");
    table.dropColumn("category");
    table.dropColumn("estimated_cost");
  });
};
