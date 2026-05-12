/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // Check if table exists before altering
  const hasTable = await knex.schema.hasTable("sample_productions");
  if (!hasTable) {
    console.log("Table sample_productions does not exist. Skipping migration.");
    return;
  }

  await knex.schema.alterTable("sample_productions", (table) => {
    // Add ingredient_availability_status column if it doesn't exist
    table
      .text("ingredient_availability_status")
      .checkIn(["sufficient", "insufficient", "unknown"])
      .defaultTo("unknown");
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  const hasTable = await knex.schema.hasTable("sample_productions");
  if (!hasTable) return;

  await knex.schema.alterTable("sample_productions", (table) => {
    table.dropColumn("ingredient_availability_status");
  });
};
