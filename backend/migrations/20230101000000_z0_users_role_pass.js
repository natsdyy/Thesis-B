/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.alterTable("users", (table) => {
    // Add password column
    table
      .string("password", 255)
      .defaultTo(
        "$2b$10$9xEzBkk1sKzSKq1xHXX2PO5/7rJpKOZv.EyJ.vJvF7J6fKGLs2v7G"
      ); // hashed "admin123"

    // Add role_id foreign key
    table.integer("role_id").unsigned().nullable();

    // Add department column
    table.string("department", 100).nullable();

    // Add foreign key constraint
    table
      .foreign("role_id")
      .references("role_id")
      .inTable("user_roles")
      .onDelete("SET NULL");

    // Add index for better performance
    table.index(["role_id"]);
    table.index(["department"]);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.alterTable("users", (table) => {
    table.dropForeign(["role_id"]);
    table.dropIndex(["role_id"]);
    table.dropIndex(["department"]);
    table.dropColumn("password");
    table.dropColumn("role_id");
    table.dropColumn("department");
  });
};
