/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  const hasColumn = await knex.schema.hasColumn("supply_requests", "branch_id");
  if (!hasColumn) {
    await knex.schema.alterTable("supply_requests", (table) => {
      table
        .integer("branch_id")
        .unsigned()
        .nullable()
        .comment("Branch for department=Branch requests");
      table
        .foreign("branch_id")
        .references("id")
        .inTable("branches")
        .onDelete("SET NULL");
      table.index("branch_id", "idx_supply_requests_branch_id");
    });
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  const hasColumn = await knex.schema.hasColumn("supply_requests", "branch_id");
  if (hasColumn) {
    await knex.schema.alterTable("supply_requests", (table) => {
      table.dropIndex("branch_id", "idx_supply_requests_branch_id");
      table.dropColumn("branch_id");
    });
  }
};
