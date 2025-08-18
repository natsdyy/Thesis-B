exports.up = async function(knex) {
  // Drop the old constraint (Postgres auto-generates a check constraint for enums)
  await knex.raw(`
    ALTER TABLE supply_requests
    ALTER COLUMN request_status DROP DEFAULT;
  `);
  await knex.raw(`
    ALTER TABLE supply_requests
    DROP CONSTRAINT IF EXISTS supply_requests_request_status_check;
  `);
  // Add the new constraint with "Sent Back"
  await knex.raw(`
    ALTER TABLE supply_requests
    ADD CONSTRAINT supply_requests_request_status_check
    CHECK (request_status IN (
      'To Request', 'Pending', 'Approved', 'Rejected', 'Cancelled', 'Budget Released', 'Completed', 'Sent Back'
    ));
  `);
  // Restore the default
  await knex.raw(`
    ALTER TABLE supply_requests
    ALTER COLUMN request_status SET DEFAULT 'To Request';
  `);
};

exports.down = async function(knex) {
  // Revert to the old constraint (without "Sent Back")
  await knex.raw(`
    ALTER TABLE supply_requests
    ALTER COLUMN request_status DROP DEFAULT;
  `);
  await knex.raw(`
    ALTER TABLE supply_requests
    DROP CONSTRAINT IF EXISTS supply_requests_request_status_check;
  `);
  await knex.raw(`
    ALTER TABLE supply_requests
    ADD CONSTRAINT supply_requests_request_status_check
    CHECK (request_status IN (
      'To Request', 'Pending', 'Approved', 'Rejected', 'Cancelled', 'Budget Released', 'Completed'
    ));
  `);
  await knex.raw(`
    ALTER TABLE supply_requests
    ALTER COLUMN request_status SET DEFAULT 'To Request';
  `);
};