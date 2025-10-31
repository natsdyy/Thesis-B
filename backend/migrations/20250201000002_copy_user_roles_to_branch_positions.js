/**
 * Migration: Copy user_roles data to branch_positions
 * This creates main branch positions (branch_id = NULL) for all department roles
 * The rate_per_hour from user_roles will be synced to branch_positions
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  console.log('📋 Starting migration: Copy user_roles to branch_positions...');

  // Get all active user_roles with department (excluding System and Admin departments)
  // Only include departments that are valid in branch_positions enum:
  // "Human Resource", "Finance", "SCM", "Production", "CRM", "Branch"
  const validDepartments = ['Human Resource', 'Finance', 'SCM', 'Production', 'CRM', 'Branch'];
  
  const userRoles = await knex('user_roles')
    .where('is_active', true)
    .whereNotNull('department')
    .whereNotIn('department', ['System', 'Admin'])
    .whereIn('department', validDepartments) // Only valid enum values
    .whereNull('deleted_at')
    .select('role_id', 'role', 'department', 'rate_per_hour', 'description');

  console.log(`📊 Found ${userRoles.length} active roles to migrate`);

  // Get or create "Main Branch" entry in branches table
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
  
  const mainBranchId = mainBranch.id;
  
  let insertedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const role of userRoles) {
    try {
      // Check if this position already exists in branch_positions
      const existing = await knex('branch_positions')
        .where('role_id', role.role_id)
        .where('branch_id', mainBranchId) // Main branch positions use Main Branch ID
        .whereNull('deleted_at')
        .first();

      if (existing) {
        console.log(`⏭️  Skipping ${role.role} (${role.department}) - already exists in branch_positions`);
        skippedCount++;
        
        // Update rate_per_hour if it's different
        if (existing.rate_per_hour !== parseFloat(role.rate_per_hour || 0)) {
          await knex('branch_positions')
            .where('id', existing.id)
            .update({
              rate_per_hour: parseFloat(role.rate_per_hour || 0),
              monthly_salary: parseFloat(role.rate_per_hour || 0) * 160,
              updated_at: knex.fn.now()
            });
          console.log(`  ↻ Updated rate_per_hour for ${role.role} (${role.department})`);
        }
        continue;
      }

      // Generate position_code from role and department
      const roleCode = role.role
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .substring(0, 4) || 'ROLE';
      const deptCode = role.department
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .substring(0, 3) || 'DEPT';
      const positionCode = `${roleCode}-${deptCode}-MAIN`;

      // Check if position_code already exists (handle duplicates)
      let finalPositionCode = positionCode;
      let counter = 1;
      while (true) {
        const codeExists = await knex('branch_positions')
          .where('position_code', finalPositionCode)
          .whereNull('deleted_at')
          .first();
        
        if (!codeExists) break;
        finalPositionCode = `${roleCode}-${deptCode}-MAIN-${counter}`;
        counter++;
      }

      // Calculate monthly salary (default 160 hours per month)
      const ratePerHour = parseFloat(role.rate_per_hour || 0);
      const monthlySalary = ratePerHour * 160;

      // Insert into branch_positions
      await knex('branch_positions').insert({
        role_id: role.role_id, // Link to user_roles
        branch_id: mainBranchId, // Main Branch ID (not NULL)
        position_title: role.role,
        position_code: finalPositionCode,
        description: role.description || `${role.role} position in ${role.department}`,
        requirements: null,
        rate_per_hour: ratePerHour,
        hours_per_month: 160,
        monthly_salary: monthlySalary,
        total_slots: 1,
        filled_slots: 0,
        status: 'open',
        job_status: 'open',
        department: role.department,
        position_type: 'Full-time',
        is_active: true,
        created_at: knex.fn.now(),
        updated_at: knex.fn.now()
      });

      console.log(`✅ Created branch position: ${role.role} (${role.department}) - ${finalPositionCode}`);
      insertedCount++;

    } catch (error) {
      console.error(`❌ Error creating position for ${role.role} (${role.department}):`, error.message);
      errorCount++;
    }
  }

  console.log(`\n📊 Migration Summary:`);
  console.log(`   ✅ Inserted: ${insertedCount}`);
  console.log(`   ⏭️  Skipped (already exists): ${skippedCount}`);
  console.log(`   ❌ Errors: ${errorCount}`);
  console.log(`✅ Migration completed!`);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  console.log('🔄 Reverting migration: Removing positions copied from user_roles...');
  
  // Remove all branch_positions that have a role_id (these were copied from user_roles)
  // Find Main Branch ID first
  const mainBranch = await knex('branches')
    .whereRaw("LOWER(name) = LOWER(?)", ['Main Branch'])
    .whereNull('deleted_at')
    .first();
  
  if (mainBranch) {
    const deleted = await knex('branch_positions')
      .whereNotNull('role_id')
      .where('branch_id', mainBranch.id) // Main branch positions
      .del();
    console.log(`✅ Removed ${deleted} positions copied from user_roles`);
  } else {
    console.log('⚠️  Main Branch not found, skipping cleanup');
  }
};

