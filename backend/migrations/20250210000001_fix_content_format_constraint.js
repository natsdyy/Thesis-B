/**
 * Fix content_format check constraint to include all valid enum values
 * The constraint is missing 'all' and 'text_only' values
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // Drop the existing constraint
  await knex.raw(`
    ALTER TABLE announcements
    DROP CONSTRAINT IF EXISTS announcements_content_format_check;
  `);

  // Add the new constraint with all valid values
  await knex.raw(`
    ALTER TABLE announcements
    ADD CONSTRAINT announcements_content_format_check
    CHECK (content_format IS NULL OR content_format = ANY (ARRAY[
      'all'::text,
      'text_image'::text,
      'video_text'::text,
      'text_only'::text,
      'image_only'::text,
      'video_only'::text
    ]));
  `);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  // Drop the new constraint
  await knex.raw(`
    ALTER TABLE announcements
    DROP CONSTRAINT IF EXISTS announcements_content_format_check;
  `);

  // Recreate the old constraint (without 'all' and 'text_only')
  await knex.raw(`
    ALTER TABLE announcements
    ADD CONSTRAINT announcements_content_format_check
    CHECK (content_format = ANY (ARRAY['text_image'::text, 'video_text'::text, 'image_only'::text, 'video_only'::text]));
  `);
};

