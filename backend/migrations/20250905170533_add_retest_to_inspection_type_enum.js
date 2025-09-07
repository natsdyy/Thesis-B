/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // Add "Retest" to the inspection_type enum
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
        "Retest",
      ])
      .defaultTo("Sample Test");
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  // Remove "Retest" from the inspection_type enum
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
