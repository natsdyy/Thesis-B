/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.alterTable("leave_requests", (table) => {
    // Add SIL (Sick Leave) specific fields
    table.string("medical_certificate_url", 500).nullable().comment("URL to medical certificate");
    table.text("medical_notes").nullable().comment("Medical notes or diagnosis");
    table.boolean("requires_medical_certificate").defaultTo(false).comment("Whether medical certificate is required");
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.alterTable("leave_requests", (table) => {
    table.dropColumn("medical_certificate_url");
    table.dropColumn("medical_notes");
    table.dropColumn("requires_medical_certificate");
  });
};

