/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // Create production_quality_inspections table
  await knex.schema.createTable("production_quality_inspections", (table) => {
    table.increments("id").primary();
    table.string("inspection_number").notNullable().unique();
    table
      .integer("production_batch_id")
      .references("id")
      .inTable("production_batches")
      .nullable();
    table
      .integer("work_order_id")
      .references("id")
      .inTable("work_orders")
      .nullable();
    table.string("inspection_type", 50).notNullable(); // e.g., 'Raw Material', 'In Process', 'Final Product'
    table.string("inspection_stage", 50).notNullable(); // e.g., 'Pre-Production', 'During Production', 'Post-Production'
    table
      .integer("inspector_id")
      .notNullable()
      .references("id")
      .inTable("users");
    table.date("inspection_date").notNullable();
    table.text("inspection_criteria").nullable(); // JSON or text description
    table.text("findings").nullable(); // Detailed findings
    table.text("corrective_actions").nullable(); // Actions taken
    table
      .enum(
        "status",
        ["Pending", "In Progress", "Passed", "Failed", "Conditional"],
        {
          useNative: true,
          enumName: "production_inspection_status",
        }
      )
      .notNullable()
      .defaultTo("Pending");
    table.boolean("requires_retest").defaultTo(false);
    table.date("retest_date").nullable();
    table.text("notes").nullable();
    table.timestamps(true, true);
  });

  // Create production_quality_checklist_items table
  await knex.schema.createTable(
    "production_quality_checklist_items",
    (table) => {
      table.increments("id").primary();
      table
        .integer("inspection_id")
        .notNullable()
        .references("id")
        .inTable("production_quality_inspections")
        .onDelete("CASCADE");
      table.string("check_item", 100).notNullable();
      table.text("check_description").nullable();
      table
        .enum("result", ["Pass", "Fail", "N/A"], {
          useNative: true,
          enumName: "checklist_item_result",
        })
        .nullable();
      table.text("notes").nullable();
      table.boolean("is_critical").defaultTo(false);
      table.timestamps(true, true);
    }
  );

  // Add indexes for better performance
  await knex.schema.alterTable("production_quality_inspections", (table) => {
    table.index("inspection_type");
    table.index("inspection_stage");
    table.index("inspection_date");
    table.index("production_batch_id");
    table.index("work_order_id");
    table.index("inspector_id");
    table.index("status");
  });

  await knex.schema.alterTable(
    "production_quality_checklist_items",
    (table) => {
      table.index("inspection_id");
      table.index("is_critical");
      table.index("result");
    }
  );
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  // Drop tables in reverse order
  await knex.schema.dropTableIfExists("production_quality_checklist_items");
  await knex.schema.dropTableIfExists("production_quality_inspections");

  // Drop enum types
  try {
    await knex.raw("DROP TYPE IF EXISTS production_inspection_status");
    await knex.raw("DROP TYPE IF EXISTS checklist_item_result");
  } catch (_) {}
};
