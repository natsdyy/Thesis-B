/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  //THIS MIGRATION ALREADY EXISTS
  // return knex.schema.alterTable("employee_terminations", function (table) {
  //   // Add restore fields (for when terminated employee is restored)
  //   table
  //     .integer("restored_by")
  //     .unsigned()
  //     .nullable()
  //     .references("id")
  //     .inTable("users")
  //     .onDelete("RESTRICT")
  //     .comment("User who restored the employee");

  //   table
  //     .timestamp("restored_at")
  //     .nullable()
  //     .comment("When the employee was restored");
  // });

  return Promise.resolve();
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  //THIS MIGRATION ALREADY EXISTS
  // return knex.schema.alterTable("employee_terminations", function (table) {
  //   table.dropColumn("restored_by");
  //   table.dropColumn("restored_at");
  // });

  return Promise.resolve();
};
