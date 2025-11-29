/**
 * Add 'job_hiring' to announcement_type
 * Since knex enum() creates a CHECK constraint (not a PostgreSQL enum type),
 * we need to drop and recreate the constraint with the new value
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // Drop the existing constraint
  await knex.raw(`
    ALTER TABLE announcements
    DROP CONSTRAINT IF EXISTS announcements_announcement_type_check;
  `);

  // Add the new constraint with job_hiring included
  await knex.raw(`
    ALTER TABLE announcements
    ADD CONSTRAINT announcements_announcement_type_check
    CHECK (announcement_type IN ('promotional', 'new_feature', 'event', 'job_hiring', 'simple_text', 'promotional_banner') OR announcement_type IS NULL);
  `);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  // Set any job_hiring values to NULL first
  await knex.raw(`
    UPDATE announcements 
    SET announcement_type = NULL 
    WHERE announcement_type = 'job_hiring';
  `);

  // Drop the constraint
  await knex.raw(`
    ALTER TABLE announcements
    DROP CONSTRAINT IF EXISTS announcements_announcement_type_check;
  `);

  // Recreate the old constraint without job_hiring
  await knex.raw(`
    ALTER TABLE announcements
    ADD CONSTRAINT announcements_announcement_type_check
    CHECK (announcement_type IN ('promotional', 'new_feature', 'event', 'simple_text', 'promotional_banner') OR announcement_type IS NULL);
  `);
};

