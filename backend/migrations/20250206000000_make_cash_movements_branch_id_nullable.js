/**
 * Make branch_id nullable in cash_movements table
 * This allows recording cash movements for non-branch entities like SCM/HQ
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // Check if table exists
  const hasTable = await knex.schema.hasTable("cash_movements");
  if (!hasTable) {
    console.log("cash_movements table does not exist, skipping migration");
    return;
  }

  // Drop the foreign key constraint first
  await knex.schema.alterTable("cash_movements", function (table) {
    table.dropForeign("branch_id");
  });

  // Make branch_id nullable
  await knex.schema.alterTable("cash_movements", function (table) {
    table.integer("branch_id").unsigned().nullable().alter();
  });

  // Re-add the foreign key constraint
  await knex.schema.alterTable("cash_movements", function (table) {
    table
      .foreign("branch_id")
      .references("id")
      .inTable("branches")
      .onDelete("CASCADE");
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  const hasTable = await knex.schema.hasTable("cash_movements");
  if (!hasTable) {
    return;
  }

  // Drop the foreign key constraint
  await knex.schema.alterTable("cash_movements", function (table) {
    table.dropForeign("branch_id");
  });

  // Make branch_id NOT NULL again
  await knex.schema.alterTable("cash_movements", function (table) {
    table.integer("branch_id").unsigned().notNullable().alter();
  });

  // Re-add the foreign key constraint
  await knex.schema.alterTable("cash_movements", function (table) {
    table
      .foreign("branch_id")
      .references("id")
      .inTable("branches")
      .onDelete("CASCADE");
  });
};
