/**
 * @param { import('knex').Knex } knex
 */

exports.up = async function up(knex) {
  await knex.schema.createTable("branch_distributions", (table) => {
    table.increments("id").primary();
    table.string("reference", 50).notNullable().unique();
    table
      .integer("branch_id")
      .unsigned()
      .references("id")
      .inTable("branches")
      .onDelete("SET NULL");
    table.string("prepared_by", 255).nullable();
    table.decimal("total_amount", 14, 2).notNullable().defaultTo(0);
    table.text("notes").nullable();
    table
      .enu("status", ["delivered", "completed"], {
        useNative: true,
        enumName: "branch_distribution_status",
      })
      .notNullable()
      .defaultTo("delivered")
      .comment("delivered = sent to branch; completed = accepted by branch");
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.timestamp("updated_at").defaultTo(knex.fn.now());
    table.index(["branch_id"]);
  });

  await knex.schema.createTable("branch_distribution_items", (table) => {
    table.increments("id").primary();
    table
      .integer("distribution_id")
      .unsigned()
      .references("id")
      .inTable("branch_distributions")
      .onDelete("CASCADE");
    table.enu("source", ["scm", "production"]).notNullable();
    table.integer("item_ref_id").notNullable();
    table.string("name", 255).notNullable();
    table.string("unit", 50).notNullable();
    table.decimal("qty", 14, 3).notNullable();
    table.decimal("unit_price", 14, 2).notNullable();
    table.decimal("amount", 14, 2).notNullable();
    table.text("notes").nullable();
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.index(["distribution_id"]);
  });
};

/**
 * @param { import('knex').Knex } knex
 */

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists("branch_distribution_items");
  await knex.schema.dropTableIfExists("branch_distributions");
};
