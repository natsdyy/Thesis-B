/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // Remove production-related columns from quality_inspections table
  // This table should only be used for GRN quality inspections
  await knex.schema.alterTable("quality_inspections", (table) => {
    // Remove production-related columns
    table.dropColumn("production_batch_id");
    table.dropColumn("work_order_id");
    table.dropColumn("inspection_type");
    table.dropColumn("inspection_stage");
    table.dropColumn("inspection_date");
    table.dropColumn("findings");
    table.dropColumn("corrective_actions");
    table.dropColumn("requires_retest");
    table.dropColumn("retest_date");
  });

  // Add the missing result column for GRN quality inspections
  await knex.schema.alterTable("quality_inspections", (table) => {
    table
      .enum("result", ["passed", "failed", "conditional"], {
        useNative: true,
        enumName: "grn_inspection_result",
      })
      .notNullable()
      .defaultTo("passed")
      .after("inspector_id");
  });

  // Remove the status column (it was conflicting with result)
  await knex.schema.alterTable("quality_inspections", (table) => {
    table.dropColumn("status");
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  // Revert the changes if needed
  await knex.schema.alterTable("quality_inspections", (table) => {
    // Re-add status column first
    table
      .enum("status", ["pending", "in_progress", "completed", "failed"], {
        useNative: true,
        enumName: "inspection_status",
      })
      .notNullable()
      .defaultTo("pending");
  });

  // Remove the result column
  await knex.schema.alterTable("quality_inspections", (table) => {
    table.dropColumn("result");
  });

  // Re-add production-related columns (if needed for rollback)
  await knex.schema.alterTable("quality_inspections", (table) => {
    table.integer("production_batch_id").nullable();
    table.integer("work_order_id").nullable();
    table.string("inspection_type").nullable();
    table.string("inspection_stage").nullable();
    table.date("inspection_date").nullable();
    table.text("findings").nullable();
    table.text("corrective_actions").nullable();
    table.boolean("requires_retest").nullable().defaultTo(false);
    table.date("retest_date").nullable();
  });

  // Drop the enum type
  try {
    await knex.raw("DROP TYPE IF EXISTS grn_inspection_result");
  } catch (_) {}
};
