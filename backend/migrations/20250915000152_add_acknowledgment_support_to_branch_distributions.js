/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.alterTable("branch_distributions", (table) => {
    // Acknowledgment details
    table
      .string("acknowledged_by", 255)
      .nullable()
      .comment("User who acknowledged the rejection");
    table
      .timestamp("acknowledged_at")
      .nullable()
      .comment("Timestamp when rejection was acknowledged");
    table
      .text("acknowledgment_notes")
      .nullable()
      .comment("Optional notes about the acknowledgment");
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.alterTable("branch_distributions", (table) => {
    table.dropColumn("acknowledged_by");
    table.dropColumn("acknowledged_at");
    table.dropColumn("acknowledgment_notes");
  });
};
