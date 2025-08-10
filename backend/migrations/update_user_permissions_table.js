/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */

exports.up = function (knex) {
  return knex.schema.alterTable("user_permissions", (table) => {
    table.dropColumn("permission_key");
    table.dropColumn("module");
    table.dropColumn("description");
    table.dropColumn("created_at");
    table.dropColumn("updated_at");
    table.dropColumn("is_active");
    table.dropColumn("deleted_at");
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.alterTable("user_permissions", (table) => {
    table.string("permission_key", 255).notNullable().unique();
    table.string("module", 100).notNullable();
    table.string("description", 500).nullable();
    table.timestamp("created_at").defaultTo(knex.fn.now()).nullable();
    table.timestamp("updated_at").defaultTo(knex.fn.now()).nullable();
    table.boolean("is_active").defaultTo(true).nullable();
    table.timestamp("deleted_at").nullable().defaultTo(null);
  });
};
