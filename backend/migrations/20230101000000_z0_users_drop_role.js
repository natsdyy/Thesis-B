/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  if (await knex.schema.hasColumn("users", "role")) {
    return knex.schema.alterTable("users", (table) => {
      table.dropColumn("role");
    });
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.alterTable("users", (table) => {
    table.string("role").defaultTo("employee");
  });
};
