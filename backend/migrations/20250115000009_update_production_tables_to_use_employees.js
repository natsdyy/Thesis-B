/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // Update sample_productions table
  await knex.schema.alterTable("sample_productions", (table) => {
    // Drop existing foreign key constraints
    table.dropForeign(["assigned_to"]);
    table.dropForeign(["created_by"]);

    // Update foreign key references to employees table
    table
      .foreign("assigned_to")
      .references("id")
      .inTable("employees")
      .onDelete("SET NULL");
    table
      .foreign("created_by")
      .references("id")
      .inTable("employees")
      .onDelete("SET NULL");
  });

  // Update menu_quality_inspections table
  await knex.schema.alterTable("menu_quality_inspections", (table) => {
    // Drop existing foreign key constraints
    table.dropForeign(["inspector_id"]);
    table.dropForeign(["approved_by"]);

    // Update foreign key references to employees table
    table
      .foreign("inspector_id")
      .references("id")
      .inTable("employees")
      .onDelete("SET NULL");
    table
      .foreign("approved_by")
      .references("id")
      .inTable("employees")
      .onDelete("SET NULL");
  });

  // Update production_inventory table
  await knex.schema.alterTable("production_inventory", (table) => {
    // Drop existing foreign key constraint
    table.dropForeign(["created_by"]);

    // Update foreign key reference to employees table
    table
      .foreign("created_by")
      .references("id")
      .inTable("employees")
      .onDelete("SET NULL");
  });

  // Update menu_item_audit_log table - rename user_id to employee_id
  await knex.schema.alterTable("menu_item_audit_log", (table) => {
    // Drop existing foreign key constraint if it exists
    try {
      table.dropForeign(["user_id"]);
    } catch (error) {
      // Ignore if constraint doesn't exist
    }

    // Rename user_id column to employee_id
    table.renameColumn("user_id", "employee_id");
  });

  // Add foreign key constraint for the renamed column
  await knex.schema.alterTable("menu_item_audit_log", (table) => {
    table
      .foreign("employee_id")
      .references("id")
      .inTable("employees")
      .onDelete("SET NULL");
  });

  // Update menus table
  await knex.schema.alterTable("menus", (table) => {
    // Drop existing foreign key constraint
    table.dropForeign(["created_by"]);

    // Update foreign key reference to employees table
    table
      .foreign("created_by")
      .references("id")
      .inTable("employees")
      .onDelete("SET NULL");
  });

  // Update menu_items table
  await knex.schema.alterTable("menu_items", (table) => {
    // Drop existing foreign key constraint
    table.dropForeign(["created_by"]);

    // Update foreign key reference to employees table
    table
      .foreign("created_by")
      .references("id")
      .inTable("employees")
      .onDelete("SET NULL");
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  // Revert sample_productions table
  await knex.schema.alterTable("sample_productions", (table) => {
    table.dropForeign(["assigned_to"]);
    table.dropForeign(["created_by"]);
    table
      .foreign("assigned_to")
      .references("id")
      .inTable("users")
      .onDelete("SET NULL");
    table
      .foreign("created_by")
      .references("id")
      .inTable("users")
      .onDelete("SET NULL");
  });

  // Revert menu_quality_inspections table
  await knex.schema.alterTable("menu_quality_inspections", (table) => {
    table.dropForeign(["inspector_id"]);
    table.dropForeign(["approved_by"]);
    table
      .foreign("inspector_id")
      .references("id")
      .inTable("users")
      .onDelete("SET NULL");
    table
      .foreign("approved_by")
      .references("id")
      .inTable("users")
      .onDelete("SET NULL");
  });

  // Revert production_inventory table
  await knex.schema.alterTable("production_inventory", (table) => {
    table.dropForeign(["created_by"]);
    table
      .foreign("created_by")
      .references("id")
      .inTable("users")
      .onDelete("SET NULL");
  });

  // Revert menu_item_audit_log table
  await knex.schema.alterTable("menu_item_audit_log", (table) => {
    table.dropForeign(["employee_id"]);
    table.renameColumn("employee_id", "user_id");
  });

  await knex.schema.alterTable("menu_item_audit_log", (table) => {
    table
      .foreign("user_id")
      .references("id")
      .inTable("users")
      .onDelete("SET NULL");
  });

  // Revert menus table
  await knex.schema.alterTable("menus", (table) => {
    table.dropForeign(["created_by"]);
    table
      .foreign("created_by")
      .references("id")
      .inTable("users")
      .onDelete("SET NULL");
  });

  // Revert menu_items table
  await knex.schema.alterTable("menu_items", (table) => {
    table.dropForeign(["created_by"]);
    table
      .foreign("created_by")
      .references("id")
      .inTable("users")
      .onDelete("SET NULL");
  });
};
