/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  await knex.schema.alterTable("branch_remittances", function (table) {
    table
      .decimal("voided_amount", 15, 2)
      .notNullable()
      .defaultTo(0)
      .after("refunded_amount");
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.schema.alterTable("branch_remittances", function (table) {
    table.dropColumn("voided_amount");
  });
};
