/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.alterTable("user_roles", (table) => {
    table.renameColumn("role_name", "role");
  });
};

exports.down = function (knex) {
  return knex.schema.alterTable("user_roles", (table) => {
    table.renameColumn("role", "role_name");
  });
};
