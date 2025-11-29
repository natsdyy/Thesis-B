/**
 * Create employee_documents table to store onboarding documents
 */
exports.up = function(knex) {
  return knex.schema.createTable('employee_documents', (table) => {
    table.increments('id').primary();
    table.integer('employee_id').unsigned().notNullable();
    table.foreign('employee_id').references('id').inTable('employees').onDelete('CASCADE');
    table.string('document_type', 50).notNullable().comment('valid_id, medical_cert, clearance');
    table.string('filename', 255).notNullable();
    table.string('original_filename', 255).notNullable();
    table.string('file_path', 500).notNullable();
    table.string('mime_type', 100).nullable();
    table.integer('file_size').nullable().comment('File size in bytes');
    table.timestamp('uploaded_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();
    
    // Index for faster queries
    table.index(['employee_id', 'document_type']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('employee_documents');
};

