/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // Drop the existing check constraint
  await knex.raw(`
    ALTER TABLE employees DROP CONSTRAINT IF EXISTS employees_department_check
  `);

  // Add a broadened check constraint to support all variations used in seeders and migrations
  await knex.raw(`
    ALTER TABLE employees ADD CONSTRAINT employees_department_check 
    CHECK (department = ANY (ARRAY[
      'Human Resource'::text, 
      'Finance'::text, 
      'SCM'::text, 
      'Supply Chain'::text,
      'Production'::text, 
      'CRM'::text, 
      'Customer Relationship'::text,
      'Branch'::text, 
      'System'::text,
      'Admin'::text
    ]))
  `);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.raw(`
    ALTER TABLE employees DROP CONSTRAINT IF EXISTS employees_department_check
  `);

  // Revert to the last known set
  await knex.raw(`
    ALTER TABLE employees ADD CONSTRAINT employees_department_check 
    CHECK (department = ANY (ARRAY['Human Resource'::text, 'Finance'::text, 'SCM'::text, 'Production'::text, 'CRM'::text, 'Branch'::text, 'System'::text]))
  `);
};
