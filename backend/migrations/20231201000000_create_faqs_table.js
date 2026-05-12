/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  const hasTable = await knex.schema.hasTable("faqs");
  if (hasTable) return;

  await knex.schema.createTable("faqs", (table) => {
    table.increments("id").primary();
    table.text("question").notNullable();
    table.text("answer").notNullable();
    table.string("category", 100).nullable(); // Optional category for grouping FAQs
    table.integer("display_order").defaultTo(0); // Order for display
    table.boolean("is_active").defaultTo(true); // Whether the FAQ is active/visible
    table.integer("created_by")
      .unsigned()
      .nullable(); // Store user/employee ID without foreign key constraint
    table.timestamps(true, true);
    table.timestamp("deleted_at").nullable(); // Soft delete support
  });

  // Create indexes for better query performance
  await knex.schema.table("faqs", (table) => {
    table.index("category");
    table.index("is_active");
    table.index("display_order");
    table.index("created_at");
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.schema.dropTableIfExists("faqs");
};

