/**
 * Migration: Assign Main Branch to positions with NULL branch_id
 * This updates any existing positions with branch_id = NULL to use Main Branch ID
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  console.log('📋 Starting migration: Assign Main Branch to NULL positions...');

  // Find or create Main Branch
  let mainBranch = await knex('branches')
    .whereRaw("LOWER(name) = LOWER(?)", ['Main Branch'])
    .whereNull('deleted_at')
    .first();
  
  if (!mainBranch) {
    // Create Main Branch if it doesn't exist
    console.log('📌 Creating Main Branch entry...');
    [mainBranch] = await knex('branches')
      .insert({
        name: 'Main Branch',
        code: 'MAIN',
        address: 'Main Office',
        is_active: true,
        created_at: knex.fn.now(),
        updated_at: knex.fn.now()
      })
      .returning('*');
    console.log(`✅ Created Main Branch with ID: ${mainBranch.id}`);
  } else {
    console.log(`✅ Found existing Main Branch with ID: ${mainBranch.id}`);
  }

  // Update all positions with NULL branch_id to use Main Branch ID
  const updated = await knex('branch_positions')
    .whereNull('branch_id')
    .whereNull('deleted_at')
    .update({
      branch_id: mainBranch.id,
      updated_at: knex.fn.now()
    });

  console.log(`✅ Updated ${updated} positions to use Main Branch (ID: ${mainBranch.id})`);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  console.log('🔄 Reverting migration: Setting Main Branch positions to NULL...');
  
  // Find Main Branch
  const mainBranch = await knex('branches')
    .whereRaw("LOWER(name) = LOWER(?)", ['Main Branch'])
    .whereNull('deleted_at')
    .first();
  
  if (mainBranch) {
    // Set positions with Main Branch ID back to NULL
    const updated = await knex('branch_positions')
      .where('branch_id', mainBranch.id)
      .whereNotNull('role_id') // Only those that were migrated from user_roles
      .update({
        branch_id: null,
        updated_at: knex.fn.now()
      });
    console.log(`✅ Reverted ${updated} positions back to NULL branch_id`);
  } else {
    console.log('⚠️  Main Branch not found, nothing to revert');
  }
};

