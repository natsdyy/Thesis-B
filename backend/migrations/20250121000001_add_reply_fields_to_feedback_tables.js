/**
 * Add reply fields to feedback and order_ratings tables
 * This migration adds fields for storing reply messages, internal notes, and reply timestamps
 */

exports.up = async function (knex) {
  // Add reply fields to order_ratings table only (feedback table already has them)
  await knex.schema.alterTable("order_ratings", (table) => {
    table.text("reply_message").nullable();
    table.text("reply_internal_note").nullable();
    table.timestamp("reply_sent_at").nullable();
  });
};

exports.down = async function (knex) {
  // Remove reply fields from order_ratings table only (feedback table keeps them)
  await knex.schema.alterTable("order_ratings", (table) => {
    table.dropColumn("reply_sent_at");
    table.dropColumn("reply_internal_note");
    table.dropColumn("reply_message");
  });
};
