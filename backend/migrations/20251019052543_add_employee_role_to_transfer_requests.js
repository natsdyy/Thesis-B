/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.alterTable("employee_transfer_requests", function (table) {
    table
      .string("employee_role")
      .nullable()
      .comment("Role requested for transfer_in requests");
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.alterTable("employee_transfer_requests", function (table) {
    table.dropColumn("employee_role");
  });
};
