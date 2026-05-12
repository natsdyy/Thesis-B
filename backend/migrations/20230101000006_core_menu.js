/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // 1. Menus Table - organizes menu items by category
  await knex.schema.createTable("menus", (table) => {
    table.increments("id").primary();
    table.string("menu_code").notNullable().unique();
    table.string("menu_name").notNullable();
    table.text("description").nullable();
    table.string("category", 100).notNullable(); // Breakfast, Lunch, Dinner, etc.
    table.boolean("is_active").defaultTo(true);
    table.integer("created_by").notNullable().references("id").inTable("users");
    table.timestamps(true, true);
    table.timestamp("deleted_at").nullable();
  });

  // 2. Menu Items Table - actual menu items created from recipes
  await knex.schema.createTable("menu_items", (table) => {
    table.increments("id").primary();
    table.string("menu_code").notNullable().unique();
    table.string("menu_item_name").notNullable();
    table
      .integer("menu_id")
      .notNullable()
      .references("id")
      .inTable("menus")
      .onDelete("CASCADE");
    table
      .integer("recipe_id")
      .notNullable()
      .references("id")
      .inTable("recipes");
    table.text("description").nullable();
    table.string("category", 100).nullable(); // Inherits from recipe but can be overridden
    table.decimal("selling_price", 15, 2).defaultTo(0);
    table.decimal("cost_price", 15, 2).defaultTo(0); // Calculated from recipe cost
    table.decimal("profit_margin", 5, 2).defaultTo(0); // Percentage
    table.integer("preparation_time_minutes").defaultTo(0);
    table.integer("serving_size").defaultTo(1);
    table.string("serving_unit", 50).defaultTo("serving");
    table.boolean("is_available").defaultTo(false); // Only available after quality approval
    table.boolean("is_featured").defaultTo(false);
    table.string("tags").nullable(); // Comma-separated tags
    table.integer("sequence_order").defaultTo(1); // For menu display order
    table.integer("created_by").notNullable().references("id").inTable("users");
    table.timestamps(true, true);
    table.timestamp("deleted_at").nullable();
  });

  // 3. Sample Productions Table - for planning small-batch test productions
  await knex.schema.createTable("sample_productions", (table) => {
    table.increments("id").primary();
    table.string("sample_batch_number").notNullable().unique();
    table
      .integer("menu_item_id")
      .notNullable()
      .references("id")
      .inTable("menu_items");
    table
      .integer("recipe_id")
      .notNullable()
      .references("id")
      .inTable("recipes");
    table.integer("batch_size").notNullable(); // Small batch for testing
    table.string("batch_unit", 50).notNullable();
    table.date("scheduled_date").notNullable();
    table.time("scheduled_time").nullable();
    table.integer("assigned_to").references("id").inTable("users");
    table.integer("created_by").notNullable().references("id").inTable("users");
    table
      .enum("status", [
        "Planned",
        "In Progress",
        "Completed",
        "Failed",
        "Cancelled",
      ])
      .defaultTo("Planned");
    table.datetime("actual_start_date").nullable();
    table.datetime("actual_end_date").nullable();
    table.integer("quantity_produced").defaultTo(0);
    table.decimal("production_cost", 15, 2).defaultTo(0);
    table.text("production_notes").nullable();
    table.timestamps(true, true);
    table.timestamp("deleted_at").nullable();
  });

  // 4. Menu Quality Inspections Table - for sample testing results
  await knex.schema.createTable("menu_quality_inspections", (table) => {
    table.increments("id").primary();
    table.string("inspection_number").notNullable().unique();
    table
      .integer("sample_production_id")
      .notNullable()
      .references("id")
      .inTable("sample_productions");
    table
      .integer("menu_item_id")
      .notNullable()
      .references("id")
      .inTable("menu_items");
    table
      .integer("inspector_id")
      .notNullable()
      .references("id")
      .inTable("users");
    table.date("inspection_date").notNullable();
    table.time("inspection_time").nullable();
    table
      .enum("inspection_type", ["Sample Test", "Full Batch", "Reinspection"])
      .defaultTo("Sample Test");
    table
      .enum("result", ["Pass", "Fail", "Pending", "Retest Required"])
      .defaultTo("Pending");

    // Quality Criteria
    table.integer("taste_score").nullable(); // 1-10 scale
    table.integer("appearance_score").nullable(); // 1-10 scale
    table.integer("texture_score").nullable(); // 1-10 scale
    table.integer("overall_quality_score").nullable(); // 1-10 scale

    // Findings and Actions
    table.text("findings").nullable();
    table.text("corrective_actions").nullable();
    table.text("recommendations").nullable();
    table.boolean("requires_retest").defaultTo(false);
    table.date("retest_date").nullable();

    // Approval
    table.boolean("approved_for_production").defaultTo(false);
    table.integer("approved_by").nullable().references("id").inTable("users");
    table.datetime("approved_at").nullable();

    table.timestamps(true, true);
    table.timestamp("deleted_at").nullable();
  });

  // 5. Production Inventory Table - for approved menu items ready for production
  await knex.schema.createTable("production_inventory", (table) => {
    table.increments("id").primary();
    table
      .integer("menu_item_id")
      .notNullable()
      .references("id")
      .inTable("menu_items");
    table
      .integer("recipe_id")
      .notNullable()
      .references("id")
      .inTable("recipes");

    // Stock Information
    table.integer("available_quantity").defaultTo(0);
    table.string("unit_of_measure", 50).notNullable();
    table.decimal("unit_cost", 15, 2).defaultTo(0);
    table.decimal("selling_price", 15, 2).defaultTo(0);

    // Production Details
    table.date("last_produced_date").nullable();
    table.integer("last_batch_size").defaultTo(0);
    table.decimal("production_cost_per_unit", 15, 2).defaultTo(0);
    table.decimal("profit_margin_percent", 5, 2).defaultTo(0);

    // Quality & Status
    table.boolean("is_active").defaultTo(true);
    table.string("quality_status", 50).defaultTo("Approved"); // Approved, Under Review, Discontinued
    table.date("next_quality_check_date").nullable();

    // Tracking
    table.integer("total_produced").defaultTo(0); // Cumulative production
    table.integer("total_sold").defaultTo(0); // If tracking sales
    table.integer("reorder_point").defaultTo(0); // Minimum stock level
    table.integer("maximum_stock").defaultTo(0); // Maximum stock level

    table.integer("created_by").notNullable().references("id").inTable("users");
    table.timestamps(true, true);
    table.timestamp("deleted_at").nullable();

    // Ensure one record per menu item
    table.unique("menu_item_id");
  });

  // 6. Menu Item Audit Log Table - for tracking all changes
  await knex.schema.createTable("menu_item_audit_log", (table) => {
    table.increments("id").primary();
    table
      .integer("menu_item_id")
      .references("id")
      .inTable("menu_items")
      .onDelete("CASCADE");
    table
      .integer("sample_production_id")
      .nullable()
      .references("id")
      .inTable("sample_productions");
    table
      .integer("quality_inspection_id")
      .nullable()
      .references("id")
      .inTable("quality_inspections");
    table.integer("user_id").notNullable().references("id").inTable("users");

    table
      .enum("action_type", [
        "CREATED",
        "UPDATED",
        "SAMPLE_PLANNED",
        "SAMPLE_STARTED",
        "SAMPLE_COMPLETED",
        "QUALITY_INSPECTION",
        "QUALITY_PASSED",
        "QUALITY_FAILED",
        "APPROVED_FOR_PRODUCTION",
        "ADDED_TO_INVENTORY",
        "INVENTORY_UPDATED",
        "DELETED",
      ])
      .notNullable();

    table.text("action_details").nullable(); // JSON string with specific details
    table.text("notes").nullable();
    table.timestamps(true, true);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.schema.dropTableIfExists("menu_item_audit_log");
  await knex.schema.dropTableIfExists("production_inventory");
  await knex.schema.dropTableIfExists("quality_inspections");
  await knex.schema.dropTableIfExists("sample_productions");
  await knex.schema.dropTableIfExists("menu_items");
  await knex.schema.dropTableIfExists("menus");
};
