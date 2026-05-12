/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  const hasTable = await knex.schema.hasTable("sample_productions");
  if (!hasTable) {
    console.log("Table sample_productions does not exist. Skipping migration.");
    return;
  }

  // Data migration to fix existing scheduled_date values
  const samples = await knex("sample_productions")
    .select("id", "scheduled_date")
    .whereNotNull("scheduled_date");

  for (const sample of samples) {
    if (sample.scheduled_date) {
      // Convert datetime to date only (YYYY-MM-DD format)
      const dateOnly = new Date(sample.scheduled_date)
        .toISOString()
        .split("T")[0];

      await knex("sample_productions").where("id", sample.id).update({
        scheduled_date: dateOnly,
      });
    }
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  // No rollback needed as we're just fixing data format
  return Promise.resolve();
};
