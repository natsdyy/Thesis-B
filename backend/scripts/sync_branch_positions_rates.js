/**
 * Script to sync all branch_positions rates with user_roles rates
 * Run this to ensure all Branch department positions have matching rates
 * Usage: node scripts/sync_branch_positions_rates.js
 */

require('dotenv').config();
const { db } = require('../config/database');

async function syncBranchPositionsRates() {
  try {
    console.log('🔄 Starting branch positions rate synchronization...\n');
    
    // Get all Branch department roles from user_roles
    const branchRoles = await db('user_roles')
      .where('department', 'Branch')
      .whereNull('deleted_at')
      .select('role_id', 'role', 'rate_per_hour');
    
    console.log(`📋 Found ${branchRoles.length} Branch roles in user_roles:`);
    branchRoles.forEach(r => {
      console.log(`   - ${r.role}: ₱${r.rate_per_hour}/hour`);
    });
    console.log('');
    
    let totalUpdated = 0;
    let totalSkipped = 0;
    
    // For each role, update matching branch positions
    for (const role of branchRoles) {
      const matchingBranchPositions = await db('branch_positions')
        .whereRaw('LOWER(TRIM(position_title)) = LOWER(TRIM(?))', [role.role])
        .whereNull('deleted_at')
        .select('id', 'position_title', 'rate_per_hour', 'hours_per_month', 'branch_id');
      
      if (matchingBranchPositions.length === 0) {
        console.log(`⚠️  No branch positions found for "${role.role}"`);
        totalSkipped++;
        continue;
      }
      
      console.log(`\n🔄 Syncing "${role.role}" (₱${role.rate_per_hour}/hr):`);
      console.log(`   Found ${matchingBranchPositions.length} branch position(s)`);
      
      let updatedInThisRole = 0;
      for (const branchPos of matchingBranchPositions) {
        const hoursPerMonth = branchPos.hours_per_month || 160;
        const monthlySalary = role.rate_per_hour * hoursPerMonth;
        
        // Only update if rate is different
        if (parseFloat(branchPos.rate_per_hour) !== parseFloat(role.rate_per_hour)) {
          await db('branch_positions')
            .where('id', branchPos.id)
            .update({
              rate_per_hour: role.rate_per_hour,
              monthly_salary: monthlySalary,
              updated_at: db.fn.now()
            });
          
          console.log(`   ✓ Updated ID ${branchPos.id}: ₱${branchPos.rate_per_hour} → ₱${role.rate_per_hour}/hr`);
          updatedInThisRole++;
          totalUpdated++;
        } else {
          console.log(`   - ID ${branchPos.id}: Already synced (₱${branchPos.rate_per_hour}/hr)`);
          totalSkipped++;
        }
      }
      
      if (updatedInThisRole === 0) {
        console.log(`   ℹ️  All positions already have matching rates`);
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 SUMMARY:');
    console.log(`   Total roles processed: ${branchRoles.length}`);
    console.log(`   Branch positions updated: ${totalUpdated}`);
    console.log(`   Already in sync: ${totalSkipped}`);
    console.log('='.repeat(60));
    
    console.log('\n✅ Synchronization complete!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

// Run the sync
syncBranchPositionsRates();

