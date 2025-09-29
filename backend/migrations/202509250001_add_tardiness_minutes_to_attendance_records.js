/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  const hasColumn = await knex.schema.hasColumn(
    "attendance_records",
    "tardiness_minutes"
  );
  if (!hasColumn) {
    await knex.schema.alterTable("attendance_records", (table) => {
      table.integer("tardiness_minutes").notNullable().defaultTo(0);
    });
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  const hasColumn = await knex.schema.hasColumn(
    "attendance_records",
    "tardiness_minutes"
  );
  if (hasColumn) {
    await knex.schema.alterTable("attendance_records", (table) => {
      table.dropColumn("tardiness_minutes");
    });
  }
};
