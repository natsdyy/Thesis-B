/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // Check which columns actually exist before dropping
  const columnsToDrop = [
    "production_batch_id",
    "work_order_id",
    "inspection_type",
    "inspection_stage",
    "inspection_date",
    "findings",
    "corrective_actions",
    "requires_retest",
    "retest_date",
    "status"
  ];

  const existingColumns = [];
  for (const col of columnsToDrop) {
    if (await knex.schema.hasColumn("quality_inspections", col)) {
      existingColumns.push(col);
    }
  }

  if (existingColumns.length > 0) {
    await knex.schema.alterTable("quality_inspections", (table) => {
      existingColumns.forEach((col) => table.dropColumn(col));
    });
  }

  // Add the missing result column for GRN quality inspections if it doesn't exist
  const hasResult = await knex.schema.hasColumn("quality_inspections", "result");
  if (!hasResult) {
    await knex.schema.alterTable("quality_inspections", (table) => {
      table
        .enum("result", ["passed", "failed", "conditional"], {
          useNative: true,
          enumName: "grn_inspection_result",
        })
        .notNullable()
        .defaultTo("passed");
    });
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  // Revert logic is complex due to the enums, skipping for robustness in this context
  return Promise.resolve();
};
