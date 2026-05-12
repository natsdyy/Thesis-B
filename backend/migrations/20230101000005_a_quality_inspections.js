/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // Create goods_receipt_notes table
  await knex.schema.createTable("goods_receipt_notes", (table) => {
    table.increments("id").primary();
    table.string("grn_number").notNullable().unique();
    table
      .integer("purchase_order_id")
      .notNullable()
      .references("id")
      .inTable("purchase_orders");
    table
      .integer("supplier_id")
      .notNullable()
      .references("id")
      .inTable("suppliers");
    table
      .integer("received_by")
      .notNullable()
      .references("id")
      .inTable("users");
    table.date("received_date").notNullable();
    table
      .enum(
        "status",
        ["draft", "pending_inspection", "passed", "failed", "completed"],
        {
          useNative: true,
          enumName: "grn_status",
        }
      )
      .notNullable()
      .defaultTo("draft");
    table.text("notes").nullable();
    table.boolean("is_partial").notNullable().defaultTo(false);
    table.timestamps(true, true);
    table.timestamp("deleted_at").nullable();
  });

  // Create grn_items table
  await knex.schema.createTable("grn_items", (table) => {
    table.increments("id").primary();
    table
      .integer("grn_id")
      .notNullable()
      .references("id")
      .inTable("goods_receipt_notes");
    table
      .integer("purchase_order_item_id")
      .notNullable()
      .references("id")
      .inTable("purchase_order_items");
    table
      .integer("item_type_id")
      .nullable()
      .references("id")
      .inTable("inventory_item_types");
    table.decimal("received_quantity", 10, 2).notNullable();
    table.decimal("ordered_quantity", 10, 2).notNullable();
    table.decimal("unit_cost", 10, 2).notNullable();
    table.decimal("total_value", 10, 2).notNullable();
    table.string("batch_number").nullable();
    table.date("expiry_date").nullable();
    table
      .enum("quality_status", ["pending", "passed", "failed", "conditional"], {
        useNative: true,
        enumName: "quality_status",
      })
      .notNullable()
      .defaultTo("pending");
    table.text("quality_notes").nullable();
    table.integer("inspected_by").nullable().references("id").inTable("users");
    table.timestamp("inspected_at").nullable();
    table.timestamps(true, true);
  });

  // Create quality_inspections table
  await knex.schema.createTable("quality_inspections", (table) => {
    table.increments("id").primary();
    table
      .integer("grn_id")
      .notNullable()
      .references("id")
      .inTable("goods_receipt_notes");
    table
      .integer("grn_item_id")
      .notNullable()
      .references("id")
      .inTable("grn_items");
    table
      .integer("inspector_id")
      .notNullable()
      .references("id")
      .inTable("users");
    table
      .enum("result", ["passed", "failed", "conditional"], {
        useNative: true,
        enumName: "inspection_result",
      })
      .notNullable();
    table.text("notes").nullable();
    table.jsonb("inspection_criteria").nullable(); // Store inspection checklist
    table.timestamps(true, true);
  });

  // Add GRN reference to inventory_items
  await knex.schema.alterTable("inventory_items", (table) => {
    table
      .integer("grn_id")
      .nullable()
      .references("id")
      .inTable("goods_receipt_notes");
    table
      .integer("grn_item_id")
      .nullable()
      .references("id")
      .inTable("grn_items");
  });

  // Add approval workflow to inventory_item_types
  await knex.schema.alterTable("inventory_item_types", (table) => {
    table.integer("approved_by").nullable().references("id").inTable("users");
    table.timestamp("approved_at").nullable();
    table.text("approval_notes").nullable();
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  // Remove GRN references from inventory_items
  await knex.schema.alterTable("inventory_items", (table) => {
    table.dropColumn("grn_id");
    table.dropColumn("grn_item_id");
  });

  // Drop tables in reverse order
  await knex.schema.dropTableIfExists("quality_inspections");
  await knex.schema.dropTableIfExists("grn_items");
  await knex.schema.dropTableIfExists("goods_receipt_notes");

  // Remove approval fields from inventory_item_types
  await knex.schema.alterTable("inventory_item_types", (table) => {
    table.dropColumn("approved_by");
    table.dropColumn("approved_at");
    table.dropColumn("approval_notes");
  });

  // Drop enum types
  try {
    await knex.raw("DROP TYPE IF EXISTS grn_status");
    await knex.raw("DROP TYPE IF EXISTS quality_status");
    await knex.raw("DROP TYPE IF EXISTS inspection_result");
  } catch (_) {}
};
