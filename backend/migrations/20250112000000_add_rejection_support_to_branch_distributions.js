/**
 * @param { import('knex').Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // Add 'rejected' to the existing enum
  await knex.raw(`
    ALTER TYPE branch_distribution_status ADD VALUE 'rejected';
  `);

  // Add rejection-related columns to branch_distributions table
  await knex.schema.alterTable("branch_distributions", (table) => {
    // Rejection details
    table
      .string("rejected_by", 255)
      .nullable()
      .comment("User who rejected the distribution");
    table
      .timestamp("rejected_at")
      .nullable()
      .comment("Timestamp when distribution was rejected");
    table.text("rejection_reason").nullable().comment("Reason for rejection");
    table
      .text("rejection_notes")
      .nullable()
      .comment("Additional notes about the rejection");

    // Completion details (for consistency)
    table
      .string("completed_by", 255)
      .nullable()
      .comment("User who completed the distribution");
    table
      .timestamp("completed_at")
      .nullable()
      .comment("Timestamp when distribution was completed");
  });

  // Add index for better query performance
  await knex.schema.alterTable("branch_distributions", (table) => {
    table.index(["status"]);
    table.index(["rejected_at"]);
    table.index(["completed_at"]);
  });
};

/**
 * @param { import('knex').Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  // Remove the added columns
  await knex.schema.alterTable("branch_distributions", (table) => {
    table.dropIndex(["completed_at"]);
    table.dropIndex(["rejected_at"]);
    table.dropIndex(["status"]);

    table.dropColumn("completed_at");
    table.dropColumn("completed_by");
    table.dropColumn("rejection_notes");
    table.dropColumn("rejection_reason");
    table.dropColumn("rejected_at");
    table.dropColumn("rejected_by");
  });

  // Note: We cannot easily remove 'rejected' from the enum in PostgreSQL
  // The enum value will remain but won't be used
  console.log(
    'Warning: Cannot remove "rejected" from branch_distribution_status enum in PostgreSQL'
  );
};
