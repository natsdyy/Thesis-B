/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable("cash_movements", function (table) {
    table.increments("id").primary();
    table.integer("branch_id").unsigned().notNullable();
    table.enum("movement_type", ["in", "out"]).notNullable();
    table.decimal("amount", 15, 2).notNullable().defaultTo(0);
    table.string("source", 50).nullable(); // 'remittance', 'manual', 'loan', 'expense'
    table.string("reference_id", 50).nullable(); // related record id
    table.string("reference_type", 50).nullable(); // 'branch_remittance', 'budget_release'
    table.text("notes").nullable();
    table.timestamp("occurred_at").notNullable();
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.timestamp("updated_at").defaultTo(knex.fn.now());
    table.timestamp("deleted_at").nullable();

    // Foreign key constraints
    table
      .foreign("branch_id")
      .references("id")
      .inTable("branches")
      .onDelete("CASCADE");

    // Indexes for performance
    table.index(["branch_id", "movement_type"]);
    table.index(["occurred_at"]);
    table.index(["source", "reference_type"]);
    table.index(["deleted_at"]);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTable("cash_movements");
};
