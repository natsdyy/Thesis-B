/**
 * Remove Sample Production System
 *
 * This migration removes the sample production functionality:
 * - Drops sample_productions table
 * - Makes sample_production_id nullable in menu_quality_inspections
 * - Cleans up related audit logs
 */

exports.up = async function (knex) {
  // First, drop foreign key constraints that reference sample_productions
  await knex.schema.alterTable("menu_quality_inspections", (table) => {
    table.dropForeign(["sample_production_id"]);
    table.integer("sample_production_id").nullable().alter();
  });

  await knex.schema.alterTable("menu_item_audit_log", (table) => {
    table.dropForeign(["sample_production_id"]);
  });

  // Drop the sample_productions table
  await knex.schema.dropTableIfExists("sample_productions");
};

exports.down = async function (knex) {
  // Recreate sample_productions table
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
    table.integer("batch_size").notNullable();
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
    table.string("ingredient_availability_status", 50).defaultTo("unknown");
    table.timestamps(true, true);
    table.timestamp("deleted_at").nullable();
  });

  // Recreate foreign key constraints and make sample_production_id not nullable again
  await knex.schema.alterTable("menu_quality_inspections", (table) => {
    table.integer("sample_production_id").notNullable().alter();
    table
      .foreign("sample_production_id")
      .references("id")
      .inTable("sample_productions");
  });

  await knex.schema.alterTable("menu_item_audit_log", (table) => {
    table
      .foreign("sample_production_id")
      .references("id")
      .inTable("sample_productions");
  });
};
