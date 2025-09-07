/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // Make sample_production_id nullable to support direct inspections
  await knex.schema.alterTable("menu_quality_inspections", (table) => {
    table.integer("sample_production_id").nullable().alter();
  });

  // Update inspection_type enum to include more types
  await knex.schema.alterTable("menu_quality_inspections", (table) => {
    table.dropColumn("inspection_type");
  });

  await knex.schema.alterTable("menu_quality_inspections", (table) => {
    table
      .enum("inspection_type", [
        "Sample Test",
        "Direct Inspection",
        "Spot Check",
        "Complaint Investigation",
        "Supplier Change",
        "Production Check",
        "Seasonal Check",
      ])
      .defaultTo("Sample Test");
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  // Revert inspection_type enum
  await knex.schema.alterTable("menu_quality_inspections", (table) => {
    table.dropColumn("inspection_type");
  });

  await knex.schema.alterTable("menu_quality_inspections", (table) => {
    table
      .enum("inspection_type", ["Sample Test", "Full Batch", "Reinspection"])
      .defaultTo("Sample Test");
  });

  // Revert sample_production_id to not nullable
  await knex.schema.alterTable("menu_quality_inspections", (table) => {
    table.integer("sample_production_id").notNullable().alter();
  });
};
