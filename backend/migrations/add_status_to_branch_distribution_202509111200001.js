/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  return knex.schema.alterTable("branch_distributions", (table) => {
    table
      .enu("status", ["delivered", "completed"], {
        useNative: true,
        enumName: "branch_distribution_status",
      })
      .notNullable()
      .defaultTo("delivered")
      .comment("delivered = sent to branch; completed = accepted by branch");
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  // drop column first
  await knex.schema.alterTable("branch_distributions", (table) => {
    table.dropColumn("status");
  });

  // then drop enum type if exists (important in PostgreSQL)
  await knex.raw(`DROP TYPE IF EXISTS branch_distribution_status`);
};
