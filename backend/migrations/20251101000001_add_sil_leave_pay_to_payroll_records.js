/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  const hasColumn = await knex.schema.hasColumn(
    "payroll_records",
    "sil_leave_pay"
  );
  if (!hasColumn) {
    await knex.schema.alterTable("payroll_records", (table) => {
      table.decimal("sil_leave_pay", 12, 2).notNullable().defaultTo(0);
    });
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  const hasColumn = await knex.schema.hasColumn(
    "payroll_records",
    "sil_leave_pay"
  );
  if (hasColumn) {
    await knex.schema.alterTable("payroll_records", (table) => {
      table.dropColumn("sil_leave_pay");
    });
  }
};
