/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.table("announcements", function (table) {
    // Store multiple images as JSON array
    table.text("images").nullable().comment("JSON array of image URLs");
    // Image display type: single or carousel
    table
      .enum("image_display_type", ["single", "carousel"])
      .nullable()
      .defaultTo("single")
      .comment("How to display images: single image or carousel");
    // Promotional details position
    table
      .enum("promo_position", ["above", "below"])
      .nullable()
      .defaultTo("below")
      .comment("Position of promotional details: above or below content");
    // Content display order (JSON array: description, images, video)
    table.text("content_order").nullable().comment("JSON array defining display order of content elements");
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.table("announcements", function (table) {
    table.dropColumn("images");
    table.dropColumn("image_display_type");
    table.dropColumn("promo_position");
    table.dropColumn("content_order");
  });
};

