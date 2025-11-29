/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.alterTable("job_interviews", function (table) {
    table.string("result", 20).nullable().comment("Interview result: passed, failed");
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.alterTable("job_interviews", function (table) {
    table.dropColumn("result");
  });
};
