/**
 * Migration to add password reset fields to suppliers table
 * This enables supplier password recovery functionality
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.table("suppliers", function (table) {
    table.string("reset_token", 255).nullable().comment("Password reset token");
    table
      .timestamp("reset_token_expiry")
      .nullable()
      .comment("Password reset token expiration");
    table.index("reset_token");
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.table("suppliers", function (table) {
    table.dropIndex("reset_token");
    table.dropColumn("reset_token");
    table.dropColumn("reset_token_expiry");
  });
};

