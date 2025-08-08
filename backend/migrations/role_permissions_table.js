/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable("role_permissions", (table) => {
    table.increments("id").primary();
    table.integer("role_id").unsigned().notNullable();
    table.integer("permission_id").unsigned().notNullable();
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.timestamp("updated_at").defaultTo(knex.fn.now());
    table.boolean("is_active").defaultTo(true);
    table.timestamp("deleted_at").nullable();

    // Foreign key constraints
    table
      .foreign("role_id")
      .references("role_id")
      .inTable("user_roles")
      .onDelete("CASCADE");
    table
      .foreign("permission_id")
      .references("permission_id")
      .inTable("user_permissions")
      .onDelete("CASCADE");

    // Unique constraint to prevent duplicate role-permission assignments
    table.unique(["role_id", "permission_id"], "unique_role_permission");

    // Indexes for better performance
    table.index(["role_id"]);
    table.index(["permission_id"]);
    table.index(["is_active"]);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists("role_permissions");
};
