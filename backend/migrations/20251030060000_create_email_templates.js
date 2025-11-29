/**
 * Migration: Create email_templates table
 * This is a stub migration file - the table may already exist
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  const hasTable = await knex.schema.hasTable('email_templates');
  
  if (!hasTable) {
    await knex.schema.createTable('email_templates', (table) => {
      table.string('key', 100).primary();
      table.string('subject', 255).notNullable();
      table.text('html').nullable();
      table.text('text').nullable();
      table.string('updated_by', 255).nullable();
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    });
    
    console.log('✅ Created email_templates table');
  } else {
    console.log('ℹ️  email_templates table already exists, skipping creation');
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  const hasTable = await knex.schema.hasTable('email_templates');
  
  if (hasTable) {
    await knex.schema.dropTableIfExists('email_templates');
    console.log('✅ Dropped email_templates table');
  }
};

