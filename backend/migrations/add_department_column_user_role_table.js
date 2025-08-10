// add department column to user_roles table

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.alterTable("user_roles", (table) => {
    table.string("department").nullable();
  });
};

exports.down = function (knex) {
  return knex.schema.alterTable("user_roles", (table) => {
    table.dropColumn("department");
  });
};
