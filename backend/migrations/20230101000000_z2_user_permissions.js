/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable("user_permissions", (table) => {
    table.increments("permission_id").primary();
    table.string("permission_name", 255).notNullable().unique();
    table.string("permission_key", 255).notNullable().unique(); // e.g., 'users:view'
    table.string("module", 100).notNullable(); // e.g., 'users', 'hr', 'finance'
    table.string("description", 500);
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.timestamp("updated_at").defaultTo(knex.fn.now());
    table.boolean("is_active").defaultTo(true);
    table.timestamp("deleted_at").nullable();

    // Indexes for better performance
    table.index(["module"]);
    table.index(["permission_key"]);
    table.index(["is_active"]);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists("user_permissions");
};
