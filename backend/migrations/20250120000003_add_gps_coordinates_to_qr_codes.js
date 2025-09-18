/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.alterTable('attendance_qr_codes', function(table) {
    // Add GPS coordinates for QR code locations
    table.decimal('latitude', 10, 8).nullable().comment('QR code latitude coordinate');
    table.decimal('longitude', 11, 8).nullable().comment('QR code longitude coordinate');
    table.decimal('radius_meters', 8, 2).defaultTo(2.0).comment('Allowed radius in meters for attendance');
    table.integer('branch_id').unsigned().nullable().comment('Associated branch ID');
    
    // Add foreign key constraint for branch_id
    table.foreign('branch_id').references('id').inTable('branches').onDelete('SET NULL');
    
    // Add indexes for GPS coordinates and branch association
    table.index(['latitude', 'longitude'], 'idx_qr_codes_gps');
    table.index('branch_id', 'idx_qr_codes_branch');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.alterTable('attendance_qr_codes', function(table) {
    // Drop indexes first
    table.dropIndex(['latitude', 'longitude'], 'idx_qr_codes_gps');
    table.dropIndex('branch_id', 'idx_qr_codes_branch');
    
    // Drop foreign key constraint
    table.dropForeign('branch_id');
    
    // Drop GPS coordinate and branch columns
    table.dropColumn('latitude');
    table.dropColumn('longitude');
    table.dropColumn('radius_meters');
    table.dropColumn('branch_id');
  });
};
