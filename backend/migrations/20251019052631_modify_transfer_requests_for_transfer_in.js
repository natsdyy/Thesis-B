/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.alterTable("employee_transfer_requests", function (table) {
    // Make employee_id nullable (it was created as notNullable)
    table.integer("employee_id").nullable().alter();

    // Make from_branch_id nullable (it was created as notNullable)
    table.integer("from_branch_id").nullable().alter();
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.alterTable("employee_transfer_requests", function (table) {
    // Revert employee_id to notNullable
    table.integer("employee_id").notNullable().alter();

    // Revert from_branch_id to notNullable
    table.integer("from_branch_id").notNullable().alter();
  });
};
