/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.alterTable("payroll_records", function (table) {
    // Add government benefit numbers for compliance and documentation
    table.string("sss_number", 50).nullable().comment("Employee's SSS number");
    table
      .string("philhealth_number", 50)
      .nullable()
      .comment("Employee's PhilHealth number");
    table
      .string("pagibig_number", 50)
      .nullable()
      .comment("Employee's Pag-IBIG number");
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.alterTable("payroll_records", function (table) {
    table.dropColumn("sss_number");
    table.dropColumn("philhealth_number");
    table.dropColumn("pagibig_number");
  });
};
