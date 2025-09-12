/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  //THIS MIGRATION ALREADY EXISTS
  // Add branch_id column with FK in one step
  // await knex.schema.alterTable("employees", function (table) {
  //   table
  //     .integer("branch_id")
  //     .unsigned()
  //     .nullable()
  //     .references("id")
  //     .inTable("branches")
  //     .onDelete("SET NULL")
  //     .comment("Employee assigned branch");
  // });

  // Create index separately (safer)
  // await knex.schema.alterTable("employees", function (table) {
  //   table.index("branch_id", "idx_employees_branch_id");
  // });

  return Promise.resolve();
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  //THIS MIGRATION ALREADY EXISTS
  // await knex.schema.alterTable("employees", function (table) {
  //   table.dropIndex("branch_id", "idx_employees_branch_id");
  //   table.dropForeign("branch_id");
  //   table.dropColumn("branch_id");
  // });

  return Promise.resolve();
};
