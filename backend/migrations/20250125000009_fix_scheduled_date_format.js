/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.alterTable("sample_productions", function (table) {
    // First, let's update existing data to remove timezone info from scheduled_date
    // This will be handled in the data migration below
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  // No rollback needed as we're just fixing data format
  return Promise.resolve();
};

// Data migration to fix existing scheduled_date values
exports.seed = async function (knex) {
  // Get all sample productions with datetime scheduled_date
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
