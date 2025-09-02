/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return (
    knex.schema
      // Inventory Categories Table
      .createTable("inventory_categories", function (table) {
        table.increments("id").primary();
        table.string("name", 100).notNullable().unique();
        table.string("description", 255);
        table.boolean("is_active").defaultTo(true);
        table.timestamps(true, true);
        table.timestamp("deleted_at").nullable();
      })

      // Inventory Item Types Table
      .createTable("inventory_item_types", function (table) {
        table.increments("id").primary();
        table.integer("category_id").unsigned().notNullable();
        table.string("name", 100).notNullable();
        table.string("description", 255);
        table.string("unit_of_measure", 50).notNullable(); // kg, pieces, liters, etc.
        table.boolean("requires_expiry").defaultTo(false);
        table.boolean("requires_batch").defaultTo(false);
        table.boolean("is_active").defaultTo(true);
        table.timestamps(true, true);
        table.timestamp("deleted_at").nullable();

        table
          .foreign("category_id")
          .references("id")
          .inTable("inventory_categories");
        table.unique(["category_id", "name"]);
      })

      // Main Inventory Table
      .createTable("inventory_items", function (table) {
        table.increments("id").primary();
        table.integer("item_type_id").unsigned().notNullable();
        table.integer("supplier_id").unsigned().nullable();
        table.integer("purchase_order_id").unsigned().nullable();
        table.string("batch_number", 100).nullable();
        table.decimal("quantity", 12, 3).notNullable().defaultTo(0);
        table.decimal("unit_cost", 12, 2).notNullable().defaultTo(0);
        table.decimal("total_value", 12, 2).notNullable().defaultTo(0);
        table.date("expiry_date").nullable();
        table.date("received_date").notNullable();
        table
          .enum("status", [
            "available",
            "reserved",
            "expired",
            "damaged",
            "consumed",
          ])
          .defaultTo("available");
        table.text("notes").nullable();
        table.string("received_by", 100).notNullable();
        table.timestamps(true, true);
        table.timestamp("deleted_at").nullable();

        table
          .foreign("item_type_id")
          .references("id")
          .inTable("inventory_item_types");
        table.foreign("supplier_id").references("id").inTable("suppliers");
        table
          .foreign("purchase_order_id")
          .references("id")
          .inTable("purchase_orders");

        table.index(["item_type_id", "status"]);
        table.index(["expiry_date"]);
        table.index(["received_date"]);
      })

      // Inventory Transactions Table (for tracking usage, adjustments, etc.)
      .createTable("inventory_transactions", function (table) {
        table.increments("id").primary();
        table.integer("inventory_item_id").unsigned().notNullable();
        table
          .enum("transaction_type", [
            "receipt",
            "consumption",
            "adjustment",
            "return",
            "transfer",
            "expiry",
            "damage",
          ])
          .notNullable();
        table.decimal("quantity", 12, 3).notNullable();
        table.decimal("unit_cost", 12, 2).notNullable();
        table.decimal("total_value", 12, 2).notNullable();
        table.string("reference_number", 100).nullable(); // PO number, usage reference, etc.
        table.text("reason").nullable();
        table.text("notes").nullable();
        table.string("performed_by", 100).notNullable();
        table.timestamp("transaction_date").notNullable();
        table.timestamps(true, true);

        table
          .foreign("inventory_item_id")
          .references("id")
          .inTable("inventory_items");
        table.index(["inventory_item_id", "transaction_type"]);
        table.index(["transaction_date"]);
      })

      // Inventory Alerts Table
      .createTable("inventory_alerts", function (table) {
        table.increments("id").primary();
        table.integer("item_type_id").unsigned().notNullable();
        table.decimal("min_stock_level", 12, 3).notNullable().defaultTo(0);
        table.decimal("max_stock_level", 12, 3).nullable();
        table.integer("expiry_warning_days").defaultTo(7); // Alert X days before expiry
        table.boolean("is_active").defaultTo(true);
        table.timestamps(true, true);

        table
          .foreign("item_type_id")
          .references("id")
          .inTable("inventory_item_types");
        table.unique(["item_type_id"]);
      })

      // Stock Audit Table
      .createTable("stock_audits", function (table) {
        table.increments("id").primary();
        table.string("audit_number", 100).notNullable().unique();
        table.date("audit_date").notNullable();
        table
          .enum("status", ["planned", "in_progress", "completed", "cancelled"])
          .defaultTo("planned");
        table.text("notes").nullable();
        table.string("conducted_by", 100).notNullable();
        table.timestamp("started_at").nullable();
        table.timestamp("completed_at").nullable();
        table.timestamps(true, true);
      })

      // Stock Audit Items Table
      .createTable("stock_audit_items", function (table) {
        table.increments("id").primary();
        table.integer("audit_id").unsigned().notNullable();
        table.integer("inventory_item_id").unsigned().notNullable();
        table.decimal("system_quantity", 12, 3).notNullable();
        table.decimal("physical_quantity", 12, 3).nullable();
        table.decimal("variance", 12, 3).nullable();
        table.text("variance_reason").nullable();
        table.text("notes").nullable();
        table.boolean("is_reconciled").defaultTo(false);
        table.timestamps(true, true);

        table.foreign("audit_id").references("id").inTable("stock_audits");
        table
          .foreign("inventory_item_id")
          .references("id")
          .inTable("inventory_items");
        table.unique(["audit_id", "inventory_item_id"]);
      })
  );
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema
    .dropTableIfExists("stock_audit_items")
    .dropTableIfExists("stock_audits")
    .dropTableIfExists("inventory_alerts")
    .dropTableIfExists("inventory_transactions")
    .dropTableIfExists("inventory_items")
    .dropTableIfExists("inventory_item_types")
    .dropTableIfExists("inventory_categories");
};
