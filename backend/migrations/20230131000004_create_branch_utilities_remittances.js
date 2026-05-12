/**
 * Create branch_utilities_remittances table for Branch-submitted receipts
 * Branch managers submit monthly utility expenses with receipt uploads
 */

exports.up = async function (knex) {
  await knex.schema.createTable("branch_utilities_remittances", (table) => {
    table.increments("id").primary();
    table
      .integer("branch_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("branches")
      .onDelete("CASCADE");
    table
      .enu("expense_type", ["electricity", "water", "internet", "other"], {
        useNative: true,
        enumName: "branch_utilities_expense_type",
      })
      .notNullable();
    table.text("expense_description").nullable(); // For 'other' type details
    table.decimal("amount", 12, 2).notNullable();
    table.date("expense_month").notNullable(); // Store as YYYY-MM-01 format
    table.string("receipt_url", 500).notNullable(); // Path to uploaded image
    table
      .enu("status", ["pending", "approved", "rejected"], {
        useNative: true,
        enumName: "branch_utilities_status",
      })
      .notNullable()
      .defaultTo("pending");
    table.text("notes").nullable();
    table
      .integer("submitted_by")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("employees")
      .onDelete("CASCADE");
    table
      .integer("approved_by")
      .unsigned()
      .nullable()
      .references("id")
      .inTable("employees")
      .onDelete("SET NULL");
    table.timestamp("approved_at").nullable();
    table
      .integer("rejected_by")
      .unsigned()
      .nullable()
      .references("id")
      .inTable("employees")
      .onDelete("SET NULL");
    table.timestamp("rejected_at").nullable();
    table.text("rejection_reason").nullable();
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.timestamp("updated_at").defaultTo(knex.fn.now());
    table.timestamp("deleted_at").nullable();

    // Indexes for better performance
    table.index(["branch_id"]);
    table.index(["expense_month"]);
    table.index(["status"]);
    table.index(["submitted_by"]);
    table.index(["approved_by"]);
    table.index(["deleted_at"]);
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists("branch_utilities_remittances");

  // Drop enums if supported
  try {
    await knex.raw("DROP TYPE IF EXISTS branch_utilities_expense_type");
  } catch (e) {}
  try {
    await knex.raw("DROP TYPE IF EXISTS branch_utilities_status");
  } catch (e) {}
};
