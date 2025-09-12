/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // Step 1: Drop old foreign key
  await knex.schema.alterTable("branches", function (table) {
    // explicitly drop by column name (Knex infers "_foreign" suffix)
    table.dropForeign("manager_id", "branches_manager_id_foreign");
  });

  // Step 2: Add new foreign key to employees
  await knex.schema.alterTable("branches", function (table) {
    table
      .foreign("manager_id", "branches_manager_id_foreign")
      .references("id")
      .inTable("employees")
      .onDelete("SET NULL");
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  // Step 1: Drop foreign key referencing employees
  await knex.schema.alterTable("branches", function (table) {
    table.dropForeign("manager_id", "branches_manager_id_foreign");
  });

  // Step 2: Restore foreign key to users
  await knex.schema.alterTable("branches", function (table) {
    table
      .foreign("manager_id", "branches_manager_id_foreign")
      .references("id")
      .inTable("users")
      .onDelete("SET NULL");
  });
};
