/**
 * Create utilities_expenses table for Finance-managed expenses
 * Supports both branch and department expenses
 */

exports.up = async function (knex) {
  await knex.schema.createTable("utilities_expenses", (table) => {
    table.increments("id").primary();
    table
      .enu("entity_type", ["branch", "department"], {
        useNative: true,
        enumName: "utilities_entity_type",
      })
      .notNullable();
    table
      .integer("entity_id")
      .unsigned()
      .nullable()
      .references("id")
      .inTable("branches")
      .onDelete("CASCADE");
    table.string("department", 50).nullable(); // 'HR', 'SCM', 'Production', 'Finance', 'Administration'
    table.string("entity_name", 255).notNullable(); // For display purposes
    table
      .enu("expense_type", ["electricity", "water", "internet", "other"], {
        useNative: true,
        enumName: "utilities_expense_type",
      })
      .notNullable();
    table.text("expense_description").nullable(); // For 'other' type details
    table.decimal("amount", 12, 2).notNullable();
    table.date("expense_month").notNullable(); // Store as YYYY-MM-01 format
    table.text("notes").nullable();
    table
      .integer("recorded_by")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("employees")
      .onDelete("CASCADE");
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.timestamp("updated_at").defaultTo(knex.fn.now());
    table.timestamp("deleted_at").nullable();

    // Indexes for better performance
    table.index(["entity_type"]);
    table.index(["entity_id"]);
    table.index(["department"]);
    table.index(["expense_month"]);
    table.index(["recorded_by"]);
    table.index(["deleted_at"]);

    // Check constraint: if entity_type='branch' then entity_id NOT NULL, if entity_type='department' then department NOT NULL
    table.check(
      "??",
      [
        knex.raw(
          "(entity_type = 'branch' AND entity_id IS NOT NULL) OR (entity_type = 'department' AND department IS NOT NULL)"
        ),
      ],
      "utilities_expenses_entity_check"
    );
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists("utilities_expenses");
  
  // Drop enums if supported
  try {
    await knex.raw("DROP TYPE IF EXISTS utilities_entity_type");
  } catch (e) {}
  try {
    await knex.raw("DROP TYPE IF EXISTS utilities_expense_type");
  } catch (e) {}
};
