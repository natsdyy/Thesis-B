exports.up = async function (knex) {
  // Drop the existing check constraint
  await knex.raw(`
    ALTER TABLE employees DROP CONSTRAINT IF EXISTS employees_department_check
  `);

  // Add the new check constraint with 'System' included
  await knex.raw(`
    ALTER TABLE employees ADD CONSTRAINT employees_department_check 
    CHECK (department = ANY (ARRAY['Human Resource'::text, 'Finance'::text, 'SCM'::text, 'Production'::text, 'CRM'::text, 'Branch'::text, 'System'::text]))
  `);
};

exports.down = async function (knex) {
  // Revert to original constraint without 'System'
  await knex.raw(`
    ALTER TABLE employees DROP CONSTRAINT IF EXISTS employees_department_check
  `);

  await knex.raw(`
    ALTER TABLE employees ADD CONSTRAINT employees_department_check 
    CHECK (department = ANY (ARRAY['Human Resource'::text, 'Finance'::text, 'SCM'::text, 'Production'::text, 'CRM'::text, 'Branch'::text]))
  `);
};
