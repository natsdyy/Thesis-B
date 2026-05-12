/**
 * @param { import('knex').Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  await knex.schema.createTable("branch_distribution_rejections", (table) => {
    table.increments("id").primary();
    table
      .integer("distribution_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("branch_distributions")
      .onDelete("CASCADE");
    table
      .integer("distribution_item_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("branch_distribution_items")
      .onDelete("CASCADE");
    table.string("rejected_by", 255).notNullable();
    table.timestamp("rejected_at").notNullable().defaultTo(knex.fn.now());
    table.string("rejection_reason", 255).notNullable();
    table.text("rejection_notes").nullable();
    table.timestamps(true, true);

    // Indexes
    table.index(["distribution_id"]);
    table.index(["distribution_item_id"]);
    table.index(["rejected_at"]);

    // Ensure one rejection per distribution item
    table.unique(["distribution_item_id"]);
  });
};

/**
 * @param { import('knex').Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.schema.dropTableIfExists("branch_distribution_rejections");
};
