/**
 * Add status field to order_ratings table
 * This migration adds a status field for tracking the state of order ratings (new, read, replied, archived)
 */

exports.up = async function (knex) {
  await knex.schema.alterTable("order_ratings", (table) => {
    table.string("status").defaultTo("new");
  });

  // Add index for the status field for better query performance
  await knex.schema.alterTable("order_ratings", (table) => {
    table.index("status");
  });
};

exports.down = async function (knex) {
  await knex.schema.alterTable("order_ratings", (table) => {
    table.dropIndex("status");
    table.dropColumn("status");
  });
};
