/**
 * Migration to add authentication fields to suppliers table
 * This allows suppliers to have login access to their portal
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.table("suppliers", function (table) {
    // Authentication fields
    table
      .string("password", 255)
      .nullable()
      .comment("Hashed password for supplier login");
    table
      .boolean("is_active")
      .defaultTo(true)
      .comment("Whether supplier account is active");
    table.timestamp("last_login_at").nullable().comment("Last login timestamp");
    table.text("notes").nullable().comment("Additional notes about supplier");

    // Indexes for better performance
    table.index("email");
    table.index("is_active");
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.table("suppliers", function (table) {
    table.dropColumn("password");
    table.dropColumn("is_active");
    table.dropColumn("last_login_at");
    table.dropColumn("notes");
    table.dropIndex("email");
    table.dropIndex("is_active");
  });
};
