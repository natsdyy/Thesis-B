/**
 * Increase URL field lengths in announcements table
 * Change VARCHAR(500) to TEXT to support longer URLs
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // Change image_url from VARCHAR(500) to TEXT
  await knex.schema.alterTable("announcements", function (table) {
    table.text("image_url").nullable().alter();
  });

  // Change action_link from VARCHAR(500) to TEXT
  await knex.schema.alterTable("announcements", function (table) {
    table.text("action_link").nullable().alter();
  });

  // Change video_url from VARCHAR(500) to TEXT
  await knex.schema.alterTable("announcements", function (table) {
    table.text("video_url").nullable().alter();
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  // Revert back to VARCHAR(500) - Note: This may truncate data if URLs are longer than 500 chars
  await knex.schema.alterTable("announcements", function (table) {
    table.string("image_url", 500).nullable().alter();
  });

  await knex.schema.alterTable("announcements", function (table) {
    table.string("action_link", 500).nullable().alter();
  });

  await knex.schema.alterTable("announcements", function (table) {
    table.string("video_url", 500).nullable().alter();
  });
};

