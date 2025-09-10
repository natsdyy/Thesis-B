/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  const exists = await knex.schema.hasColumn("branches", "deleted_at");
  if (!exists) {
    await knex.schema.alterTable("branches", function (table) {
      table.timestamp("deleted_at").nullable().comment("Soft delete timestamp");
      table.index("deleted_at");
    });
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  const exists = await knex.schema.hasColumn("branches", "deleted_at");
  if (exists) {
    await knex.schema.alterTable("branches", function (table) {
      table.dropIndex("deleted_at");
      table.dropColumn("deleted_at");
    });
  }
};
