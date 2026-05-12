/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable("announcements", function (table) {
    table.increments("id").primary();
    table.string("title", 255).notNullable().comment("Announcement title");
    table.string("subtitle", 255).nullable().comment("Announcement subtitle");
    table.text("description").nullable().comment("Short description of the announcement");
    table.text("content").nullable().comment("Full HTML content of the announcement");
    table.string("image_url", 500).nullable().comment("URL to announcement image");
    table.text("promo_details").nullable().comment("Promotion details if applicable");
    table.timestamp("valid_from").defaultTo(knex.fn.now()).comment("Date when announcement becomes active");
    table.timestamp("valid_until").nullable().comment("Date when announcement expires (null = no expiration)");
    table.string("action_link", 500).nullable().comment("Optional link for action button");
    table.string("action_text", 100).nullable().comment("Text for action button");
    table.boolean("is_active").defaultTo(true).comment("Whether announcement is active");
    table.integer("display_order").defaultTo(0).comment("Order for display (lower numbers appear first)");
    table.integer("created_by").nullable().comment("ID of user who created the announcement");
    table.timestamps(true, true);
    table.timestamp("deleted_at").nullable().comment("Soft delete timestamp");
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTable("announcements");
};

