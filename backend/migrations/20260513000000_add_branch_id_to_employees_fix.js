/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  const hasColumn = await knex.schema.hasColumn("employees", "branch_id");
  if (!hasColumn) {
    await knex.schema.alterTable("employees", function (table) {
      table
        .integer("branch_id")
        .unsigned()
        .nullable()
        .references("id")
        .inTable("branches")
        .onDelete("SET NULL")
        .comment("Employee assigned branch");
      
      table.index("branch_id", "idx_employees_branch_id");
    });
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  const hasColumn = await knex.schema.hasColumn("employees", "branch_id");
  if (hasColumn) {
    await knex.schema.alterTable("employees", function (table) {
      table.dropIndex("branch_id", "idx_employees_branch_id");
      table.dropForeign("branch_id");
      table.dropColumn("branch_id");
    });
  }
};
