/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  await knex.schema.alterTable("sample_productions", (table) => {
    table
      .enum("ingredient_availability_status", [
        "sufficient",
        "insufficient",
        "unknown",
      ])
      .defaultTo("unknown")
      .after("production_notes");
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.schema.alterTable("sample_productions", (table) => {
    table.dropColumn("ingredient_availability_status");
  });
};
