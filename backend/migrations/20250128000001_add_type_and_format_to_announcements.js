/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.table("announcements", function (table) {
    table
      .enum("announcement_type", [
        "promotional",
        "new_feature",
        "event",
        "simple_text",
        "promotional_banner",
      ])
      .nullable()
      .comment("Type of announcement");
    table
      .enum("content_format", [
        "all",
        "text_image",
        "video_text",
        "text_only",
        "image_only",
        "video_only",
      ])
      .nullable()
      .comment("Content format type");
    table.string("video_url", 500).nullable().comment("URL to announcement video");
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.table("announcements", function (table) {
    table.dropColumn("announcement_type");
    table.dropColumn("content_format");
    table.dropColumn("video_url");
  });
};

