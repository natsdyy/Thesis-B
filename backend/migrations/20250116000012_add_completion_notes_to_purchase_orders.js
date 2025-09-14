/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.alterTable("purchase_orders", function (table) {
    table
      .text("completion_notes")
      .nullable()
      .comment("Notes added during PO completion");
    table
      .timestamp("completed_at")
      .nullable()
      .comment("When the PO was completed");
    table
      .string("completed_by", 255)
      .nullable()
      .comment("Who completed the PO");
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.alterTable("purchase_orders", function (table) {
    table.dropColumn("completion_notes");
    table.dropColumn("completed_at");
    table.dropColumn("completed_by");
  });
};
