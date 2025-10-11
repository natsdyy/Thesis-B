exports.up = function (knex) {
  return knex.schema.alterTable("payroll_records", function (table) {
    table
      .decimal("night_diff_hours", 8, 2)
      .defaultTo(0)
      .comment("Night differential hours worked (10 PM - 6 AM)");
    table
      .decimal("night_diff_pay", 10, 2)
      .defaultTo(0)
      .comment("Night differential pay amount");
  });
};

exports.down = function (knex) {
  return knex.schema.alterTable("payroll_records", function (table) {
    table.dropColumn("night_diff_hours");
    table.dropColumn("night_diff_pay");
  });
};
