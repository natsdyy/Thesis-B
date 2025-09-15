/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.alterTable("branch_distributions", function (table) {
    // Add new fields for partial processing support
    table
      .string("parent_distribution_id")
      .nullable()
      .comment(
        "Reference to original distribution if this is a partial acceptance"
      );
    table
      .string("processed_by")
      .nullable()
      .comment("User who processed the distribution");
    table
      .timestamp("processed_at")
      .nullable()
      .comment("When the distribution was processed");
    table
      .text("processing_notes")
      .nullable()
      .comment("Notes about the processing");

    // Add new status for partially processed distributions
    table
      .string("status", 50)
      .alter()
      .comment("Status: delivered, completed, rejected, partially_processed");
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.alterTable("branch_distributions", function (table) {
    // Remove the added fields
    table.dropColumn("parent_distribution_id");
    table.dropColumn("processed_by");
    table.dropColumn("processed_at");
    table.dropColumn("processing_notes");

    // Revert status column (though this might cause data loss if partially_processed status exists)
    table.string("status", 50).alter();
  });
};
