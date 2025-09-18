/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.alterTable('branches', function(table) {
    // Add GPS coordinates for branch locations
    table.decimal('latitude', 10, 8).nullable().comment('Branch latitude coordinate');
    table.decimal('longitude', 11, 8).nullable().comment('Branch longitude coordinate');
    table.decimal('radius_meters', 8, 2).defaultTo(2.0).comment('Allowed radius in meters for attendance');
    
    // Add indexes for GPS coordinates
    table.index(['latitude', 'longitude'], 'idx_branches_gps');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.alterTable('branches', function(table) {
    // Drop indexes first
    table.dropIndex(['latitude', 'longitude'], 'idx_branches_gps');
    
    // Drop GPS coordinate columns
    table.dropColumn('latitude');
    table.dropColumn('longitude');
    table.dropColumn('radius_meters');
  });
};
