/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable("suppliers", function (table) {
    table.increments("id").primary();
    table.string("name", 255).notNullable().comment("Supplier name");
    table
      .string("contact_person", 255)
      .nullable()
      .comment("Primary contact person");
    table.string("email", 255).nullable().comment("Contact email");
    table.string("phone", 50).nullable().comment("Contact phone");
    table.text("address").nullable().comment("Supplier address");
    table.string("category", 100).nullable().comment("Supplier category");
    table
      .enum("status", ["Active", "Inactive", "Pending"])
      .defaultTo("Active")
      .comment("Supplier status");
    table.timestamps(true, true);

    // Indexes
    table.index("name");
    table.index("category");
    table.index("status");
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTable("suppliers");
};
