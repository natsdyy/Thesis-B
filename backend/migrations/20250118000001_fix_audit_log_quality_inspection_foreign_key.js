/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // Fix the foreign key constraint for quality_inspection_id in menu_item_audit_log
  // It should reference menu_quality_inspections table, not quality_inspections table

  await knex.schema.alterTable("menu_item_audit_log", (table) => {
    // Drop the existing foreign key constraint
    table.dropForeign(["quality_inspection_id"]);
  });

  // Add the correct foreign key constraint
  await knex.schema.alterTable("menu_item_audit_log", (table) => {
    table
      .foreign("quality_inspection_id")
      .references("id")
      .inTable("menu_quality_inspections")
      .onDelete("SET NULL");
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  // Revert the foreign key constraint back to quality_inspections table
  await knex.schema.alterTable("menu_item_audit_log", (table) => {
    table.dropForeign(["quality_inspection_id"]);
  });

  await knex.schema.alterTable("menu_item_audit_log", (table) => {
    table
      .foreign("quality_inspection_id")
      .references("id")
      .inTable("quality_inspections")
      .onDelete("SET NULL");
  });
};
