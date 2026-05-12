/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // 1. Recipes Table
  await knex.schema.createTable("recipes", (table) => {
    table.increments("id").primary();
    table.string("recipe_code").notNullable().unique();
    table.string("recipe_name").notNullable();
    table.text("description").nullable();
    table.string("category", 100).notNullable();
    table.integer("batch_size").notNullable();
    table.string("batch_unit", 50).notNullable();
    table.text("instructions").nullable();
    table.integer("prep_time_minutes").defaultTo(0);
    table.integer("cooking_time_minutes").defaultTo(0);
    table.integer("total_time_minutes").defaultTo(0);
    table.decimal("cost_per_batch", 15, 2).defaultTo(0);
    table.boolean("is_active").defaultTo(true);
    table.string("difficulty_level", 20).defaultTo("Medium");
    table.integer("created_by").notNullable().references("id").inTable("users");
    table.timestamps(true, true);
    table.timestamp("deleted_at").nullable();
  });

  // 2. Recipe Ingredients Table
  await knex.schema.createTable("recipe_ingredients", (table) => {
    table.increments("id").primary();
    table
      .integer("recipe_id")
      .notNullable()
      .references("id")
      .inTable("recipes")
      .onDelete("CASCADE");
    table
      .integer("inventory_item_type_id")
      .notNullable()
      .references("id")
      .inTable("inventory_item_types");
    table.decimal("quantity_required", 10, 3).notNullable();
    table.string("unit", 50).notNullable();
    table.decimal("cost_per_unit", 15, 2).defaultTo(0);
    table.text("preparation_notes").nullable();
    table.boolean("is_optional").defaultTo(false);
    table.integer("sequence_order").defaultTo(1);
    table.timestamps(true, true);
  });

  // 3. Production Orders Table
  await knex.schema.createTable("production_orders", (table) => {
    table.increments("id").primary();
    table.string("order_number").notNullable().unique();
    table.string("product_name").notNullable();
    table.integer("recipe_id").references("id").inTable("recipes");
    table.integer("quantity_planned").notNullable();
    table.integer("quantity_produced").defaultTo(0);
    table.string("unit_of_measure", 50).notNullable();
    table
      .enum("priority", ["Low", "Normal", "High", "Urgent"])
      .defaultTo("Normal");
    table
      .enum("status", [
        "Draft",
        "Scheduled",
        "In Progress",
        "Completed",
        "Cancelled",
      ])
      .defaultTo("Draft");
    table.date("planned_start_date").notNullable();
    table.date("planned_end_date").notNullable();
    table.datetime("actual_start_date").nullable();
    table.datetime("actual_end_date").nullable();
    table.integer("assigned_to").references("id").inTable("users");
    table.integer("created_by").notNullable().references("id").inTable("users");
    table.text("notes").nullable();
    table.decimal("estimated_cost", 15, 2).defaultTo(0);
    table.decimal("actual_cost", 15, 2).defaultTo(0);
    table.timestamps(true, true);
    table.timestamp("deleted_at").nullable();
  });

  // 4. Production Batches Table
  await knex.schema.createTable("production_batches", (table) => {
    table.increments("id").primary();
    table.string("batch_number").notNullable().unique();
    table
      .integer("production_order_id")
      .notNullable()
      .references("id")
      .inTable("production_orders");
    table
      .integer("recipe_id")
      .notNullable()
      .references("id")
      .inTable("recipes");
    table.integer("batch_size").notNullable();
    table.integer("quantity_produced").defaultTo(0);
    table
      .enum("status", [
        "Planned",
        "In Progress",
        "Quality Check",
        "Completed",
        "Failed",
      ])
      .defaultTo("Planned");
    table.datetime("start_time").nullable();
    table.datetime("end_time").nullable();
    table.integer("produced_by").references("id").inTable("users");
    table.text("production_notes").nullable();
    table.decimal("actual_cost", 15, 2).defaultTo(0);
    table.timestamps(true, true);
  });

  // 5. Work Orders Table
  await knex.schema.createTable("work_orders", (table) => {
    table.increments("id").primary();
    table.string("work_order_number").notNullable().unique();
    table
      .integer("production_order_id")
      .references("id")
      .inTable("production_orders");
    table.string("task_name").notNullable();
    table.text("task_description").nullable();
    table
      .enum("task_type", [
        "Preparation",
        "Cooking",
        "Assembly",
        "Packaging",
        "Quality Check",
        "Cleanup",
      ])
      .notNullable();
    table.integer("assigned_to").references("id").inTable("users");
    table
      .enum("status", [
        "Pending",
        "In Progress",
        "Completed",
        "On Hold",
        "Cancelled",
      ])
      .defaultTo("Pending");
    table
      .enum("priority", ["Low", "Normal", "High", "Urgent"])
      .defaultTo("Normal");
    table.datetime("scheduled_start").notNullable();
    table.datetime("scheduled_end").notNullable();
    table.datetime("actual_start").nullable();
    table.datetime("actual_end").nullable();
    table.integer("estimated_duration_minutes").notNullable();
    table.integer("actual_duration_minutes").nullable();
    table.text("completion_notes").nullable();
    table.integer("created_by").notNullable().references("id").inTable("users");
    table.timestamps(true, true);
  });

  // 6. Equipment Table
  await knex.schema.createTable("equipment", (table) => {
    table.increments("id").primary();
    table.string("equipment_code").notNullable().unique();
    table.string("equipment_name").notNullable();
    table.text("description").nullable();
    table.string("category", 100).notNullable();
    table.string("location", 100).nullable();
    table.date("purchase_date").nullable();
    table.decimal("purchase_cost", 15, 2).defaultTo(0);
    table
      .enum("status", ["Active", "Maintenance", "Broken", "Retired"])
      .defaultTo("Active");
    table.string("manufacturer", 100).nullable();
    table.string("model", 100).nullable();
    table.string("serial_number", 100).nullable();
    table.text("specifications").nullable();
    table.integer("created_by").notNullable().references("id").inTable("users");
    table.timestamps(true, true);
    table.timestamp("deleted_at").nullable();
  });

  // 7. Maintenance Schedules Table
  await knex.schema.createTable("maintenance_schedules", (table) => {
    table.increments("id").primary();
    table
      .integer("equipment_id")
      .notNullable()
      .references("id")
      .inTable("equipment");
    table.string("maintenance_type", 50).notNullable();
    table.string("task_name").notNullable();
    table.text("task_description").nullable();
    table.integer("frequency_days").notNullable();
    table.date("last_performed").nullable();
    table.date("next_due_date").notNullable();
    table.boolean("is_active").defaultTo(true);
    table.integer("estimated_duration_minutes").defaultTo(60);
    table.integer("assigned_to").references("id").inTable("users");
    table.timestamps(true, true);
  });

  // 8. Maintenance Records Table
  await knex.schema.createTable("maintenance_records", (table) => {
    table.increments("id").primary();
    table.string("record_number").notNullable().unique();
    table
      .integer("equipment_id")
      .notNullable()
      .references("id")
      .inTable("equipment");
    table
      .integer("schedule_id")
      .references("id")
      .inTable("maintenance_schedules")
      .nullable();
    table.string("maintenance_type", 50).notNullable();
    table.text("work_performed").notNullable();
    table.date("maintenance_date").notNullable();
    table
      .integer("performed_by")
      .notNullable()
      .references("id")
      .inTable("users");
    table.integer("duration_minutes").nullable();
    table.decimal("cost", 15, 2).defaultTo(0);
    table.text("parts_used").nullable();
    table.text("notes").nullable();
    table
      .enum("status", ["Completed", "Incomplete", "Deferred"])
      .defaultTo("Completed");
    table.timestamps(true, true);
  });

  // 9. Production Waste Table
  await knex.schema.createTable("production_waste", (table) => {
    table.increments("id").primary();
    table.string("waste_record_number").notNullable().unique();
    table
      .integer("production_batch_id")
      .references("id")
      .inTable("production_batches")
      .nullable();
    table
      .integer("inventory_item_type_id")
      .references("id")
      .inTable("inventory_item_types")
      .nullable();
    table.string("waste_type", 50).notNullable();
    table.decimal("quantity_wasted", 10, 3).notNullable();
    table.string("unit", 50).notNullable();
    table.decimal("estimated_cost", 15, 2).defaultTo(0);
    table.text("reason").nullable();
    table.text("prevention_notes").nullable();
    table.date("waste_date").notNullable();
    table
      .integer("reported_by")
      .notNullable()
      .references("id")
      .inTable("users");
    table.boolean("is_preventable").defaultTo(true);
    table.timestamps(true, true);
  });

  // 10. Production Metrics Table
  await knex.schema.createTable("production_metrics", (table) => {
    table.increments("id").primary();
    table.date("metric_date").notNullable();
    table.string("metric_type", 50).notNullable();
    table.string("metric_name").notNullable();
    table.decimal("metric_value", 15, 4).notNullable();
    table.string("unit", 50).nullable();
    table
      .integer("production_order_id")
      .references("id")
      .inTable("production_orders")
      .nullable();
    table
      .integer("production_batch_id")
      .references("id")
      .inTable("production_batches")
      .nullable();
    table.text("notes").nullable();
    table.timestamps(true, true);
  });

  // 11. Production Schedules Table
  await knex.schema.createTable("production_schedules", (table) => {
    table.increments("id").primary();
    table.date("schedule_date").notNullable();
    table
      .integer("production_order_id")
      .notNullable()
      .references("id")
      .inTable("production_orders");
    table
      .integer("equipment_id")
      .references("id")
      .inTable("equipment")
      .nullable();
    table.time("start_time").notNullable();
    table.time("end_time").notNullable();
    table.integer("assigned_team_lead").references("id").inTable("users");
    table.text("special_instructions").nullable();
    table
      .enum("status", ["Scheduled", "In Progress", "Completed", "Cancelled"])
      .defaultTo("Scheduled");
    table.timestamps(true, true);
  });

  // Add indexes for better performance
  await knex.schema.alterTable("production_orders", (table) => {
    table.index("status");
    table.index("planned_start_date");
    table.index("created_by");
  });

  await knex.schema.alterTable("production_batches", (table) => {
    table.index("status");
    table.index("production_order_id");
  });

  await knex.schema.alterTable("work_orders", (table) => {
    table.index("status");
    table.index("assigned_to");
    table.index("scheduled_start");
  });

  await knex.schema.alterTable("maintenance_schedules", (table) => {
    table.index("next_due_date");
    table.index("equipment_id");
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  // Drop tables in reverse order to handle foreign key constraints
  await knex.schema.dropTableIfExists("production_schedules");
  await knex.schema.dropTableIfExists("production_metrics");
  await knex.schema.dropTableIfExists("production_waste");
  await knex.schema.dropTableIfExists("maintenance_records");
  await knex.schema.dropTableIfExists("maintenance_schedules");
  await knex.schema.dropTableIfExists("equipment");
  await knex.schema.dropTableIfExists("work_orders");
  await knex.schema.dropTableIfExists("production_batches");
  await knex.schema.dropTableIfExists("recipe_ingredients");
  await knex.schema.dropTableIfExists("recipes");
  await knex.schema.dropTableIfExists("production_orders");
};
