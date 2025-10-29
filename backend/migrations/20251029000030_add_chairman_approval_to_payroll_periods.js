/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  await knex.schema.alterTable("payroll_periods", (table) => {
    table.integer("chairman_approved_by").unsigned().nullable();
    table.timestamp("chairman_approved_at").nullable();
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.schema.alterTable("payroll_periods", (table) => {
    table.dropColumn("chairman_approved_by");
    table.dropColumn("chairman_approved_at");
  });
};
