/**
 * Create tables for branch return requests and items
 * Supports SCM and Production returns with approval workflow
 */

exports.up = async function (knex) {
  const hasBranchReturns = await knex.schema.hasTable("branch_returns");
  if (!hasBranchReturns) {
    await knex.schema.createTable("branch_returns", (table) => {
      table.increments("id").primary();
      table
        .integer("branch_id")
        .unsigned()
        .notNullable()
        .references("id")
        .inTable("branches");
      table
        .enu("return_type", ["scm", "production"], {
          useNative: true,
          enumName: "branch_return_type",
        })
        .notNullable();
      table
        .enu("status", ["Pending", "Approved", "Rejected"], {
          useNative: true,
          enumName: "branch_return_status",
        })
        .notNullable()
        .defaultTo("Pending");
      table.text("notes");
      table
        .integer("created_by")
        .unsigned()
        .references("id")
        .inTable("employees")
        .index();
      table
        .integer("approved_by")
        .unsigned()
        .references("id")
        .inTable("employees");
      table.timestamp("approved_at");
      table
        .integer("rejected_by")
        .unsigned()
        .references("id")
        .inTable("employees");
      table.timestamp("rejected_at");
      table.text("rejection_reason");
      table.timestamp("created_at").defaultTo(knex.fn.now());
      table.timestamp("updated_at").defaultTo(knex.fn.now());
      table.timestamp("deleted_at");
    });
  }

  const hasReturnItems = await knex.schema.hasTable("branch_return_items");
  if (!hasReturnItems) {
    await knex.schema.createTable("branch_return_items", (table) => {
      table.increments("id").primary();
      table
        .integer("branch_return_id")
        .unsigned()
        .notNullable()
        .references("id")
        .inTable("branch_returns")
        .onDelete("CASCADE");
      table
        .integer("branch_inventory_item_id")
        .unsigned()
        .notNullable()
        .references("id")
        .inTable("branch_inventory");
      // For production returns, map directly to menu item
      table
        .integer("menu_item_id")
        .unsigned()
        .references("id")
        .inTable("menu_items");
      table.string("item_name").notNullable();
      table.string("unit").nullable();
      table.decimal("quantity", 14, 3).notNullable();
      // Optional mapping to main inventory item (for SCM) to credit on approval
      table
        .integer("main_inventory_item_id")
        .unsigned()
        .references("id")
        .inTable("inventory_items");
      table.text("notes");
      table.timestamp("created_at").defaultTo(knex.fn.now());
      table.timestamp("updated_at").defaultTo(knex.fn.now());
      table.timestamp("deleted_at");
    });
  }
};

exports.down = async function (knex) {
  const hasReturnItems = await knex.schema.hasTable("branch_return_items");
  if (hasReturnItems) {
    await knex.schema.dropTableIfExists("branch_return_items");
  }
  const hasBranchReturns = await knex.schema.hasTable("branch_returns");
  if (hasBranchReturns) {
    await knex.schema.dropTableIfExists("branch_returns");
  }
  // Drop enums if created natively (Postgres)
  try {
    await knex.raw("DROP TYPE IF EXISTS branch_return_type");
    await knex.raw("DROP TYPE IF EXISTS branch_return_status");
  } catch (e) {}
};
