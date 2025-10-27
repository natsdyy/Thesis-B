/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // Add SIL fields to leave_requests table
  await knex.schema.alterTable("leave_requests", (table) => {
    table
      .boolean("use_sil")
      .defaultTo(false)
      .comment("Whether employee is using SIL credits");
    table
      .decimal("sil_days", 5, 2)
      .defaultTo(0)
      .comment("Number of SIL days used for this leave request");
  });

  // Add index for SIL usage queries
  await knex.raw(`
    CREATE INDEX idx_leave_requests_sil ON leave_requests(use_sil);
  `);
};

exports.down = async function (knex) {
  // Remove SIL fields from leave_requests table
  await knex.schema.alterTable("leave_requests", (table) => {
    table.dropColumn("use_sil");
    table.dropColumn("sil_days");
  });

  // Drop SIL index
  await knex.raw(`
    DROP INDEX IF EXISTS idx_leave_requests_sil;
  `);
};
