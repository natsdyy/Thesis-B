/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // Check if columns already exist before adding them
  const hasLatitude = await knex.schema.hasColumn('attendance_qr_codes', 'latitude');
  const hasLongitude = await knex.schema.hasColumn('attendance_qr_codes', 'longitude');
  const hasRadiusMeters = await knex.schema.hasColumn('attendance_qr_codes', 'radius_meters');
  const hasBranchId = await knex.schema.hasColumn('attendance_qr_codes', 'branch_id');

  // Only add columns that don't exist
  if (!hasLatitude || !hasLongitude || !hasRadiusMeters || !hasBranchId) {
    await knex.schema.alterTable('attendance_qr_codes', function(table) {
      // Add GPS coordinates for QR code locations (only if they don't exist)
      if (!hasLatitude) {
        table.decimal('latitude', 10, 8).nullable().comment('QR code latitude coordinate');
      }
      if (!hasLongitude) {
        table.decimal('longitude', 11, 8).nullable().comment('QR code longitude coordinate');
      }
      if (!hasRadiusMeters) {
        table.decimal('radius_meters', 8, 2).defaultTo(2.0).comment('Allowed radius in meters for attendance');
      }
      if (!hasBranchId) {
        table.integer('branch_id').unsigned().nullable().comment('Associated branch ID');
      }
    });

    // Add foreign key constraint for branch_id (only if column was added)
    if (!hasBranchId) {
      await knex.schema.alterTable('attendance_qr_codes', function(table) {
        table.foreign('branch_id').references('id').inTable('branches').onDelete('SET NULL');
      });
    }

    // Add indexes for GPS coordinates and branch association (only if columns exist)
    if (!hasLatitude || !hasLongitude) {
      await knex.schema.alterTable('attendance_qr_codes', function(table) {
        table.index(['latitude', 'longitude'], 'idx_qr_codes_gps');
      });
    }
    if (!hasBranchId) {
      await knex.schema.alterTable('attendance_qr_codes', function(table) {
        table.index('branch_id', 'idx_qr_codes_branch');
      });
    }
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  // Check if columns exist before trying to drop them
  const hasLatitude = await knex.schema.hasColumn('attendance_qr_codes', 'latitude');
  const hasLongitude = await knex.schema.hasColumn('attendance_qr_codes', 'longitude');
  const hasRadiusMeters = await knex.schema.hasColumn('attendance_qr_codes', 'radius_meters');
  const hasBranchId = await knex.schema.hasColumn('attendance_qr_codes', 'branch_id');

  // Only drop columns that exist
  if (hasLatitude || hasLongitude || hasRadiusMeters || hasBranchId) {
    await knex.schema.alterTable('attendance_qr_codes', function(table) {
      // Drop indexes first (only if they exist)
      if (hasLatitude && hasLongitude) {
        try {
          table.dropIndex(['latitude', 'longitude'], 'idx_qr_codes_gps');
        } catch (error) {
          // Index might not exist, continue
          console.log('Index idx_qr_codes_gps might not exist:', error.message);
        }
      }
      if (hasBranchId) {
        try {
          table.dropIndex('branch_id', 'idx_qr_codes_branch');
        } catch (error) {
          // Index might not exist, continue
          console.log('Index idx_qr_codes_branch might not exist:', error.message);
        }
      }
      
      // Drop foreign key constraint (only if it exists)
      if (hasBranchId) {
        try {
          table.dropForeign('branch_id');
        } catch (error) {
          // Foreign key might not exist, continue
          console.log('Foreign key for branch_id might not exist:', error.message);
        }
      }
      
      // Drop GPS coordinate and branch columns (only if they exist)
      if (hasLatitude) {
        table.dropColumn('latitude');
      }
      if (hasLongitude) {
        table.dropColumn('longitude');
      }
      if (hasRadiusMeters) {
        table.dropColumn('radius_meters');
      }
      if (hasBranchId) {
        table.dropColumn('branch_id');
      }
    });
  }
};
