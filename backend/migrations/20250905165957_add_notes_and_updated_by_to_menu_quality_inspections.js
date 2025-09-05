/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  await knex.schema.alterTable("menu_quality_inspections", (table) => {
    // Add notes column for general notes/comments
    table.text("notes").nullable();

    // Add updated_by column to track who made the update
    table.integer("updated_by").nullable().references("id").inTable("users");
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.schema.alterTable("menu_quality_inspections", (table) => {
    table.dropColumn("notes");
    table.dropColumn("updated_by");
  });
};
