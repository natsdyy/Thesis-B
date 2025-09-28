/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.alterTable("user_roles", (table) => {
    table.decimal("rate_per_hour", 8, 2).defaultTo(0.0);
  });
};

exports.down = function (knex) {
  return knex.schema.alterTable("user_roles", (table) => {
    table.dropColumn("rate_per_hour");
  });
};
