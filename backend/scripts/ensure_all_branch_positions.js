/**
 * Script to ensure all active branches have the 5 default positions created
 * Run this with: node scripts/ensure_all_branch_positions.js
 */

require('dotenv').config();
const { db } = require('../config/database');

const defaultPositions = [
  {
    position_title: "Manager",
    position_code: "MGR",
    description: "Branch Manager responsible for overall operations",
    requirements: "Bachelor's degree in Business Administration or related field, 3+ years management experience",
    rate_per_hour: 80.00,
    hours_per_month: 160,
    department: "Branch",
    position_type: "Full-time",
    total_slots: 1,
    filled_slots: 0,
    status: "open",
    job_status: "open",
    is_active: true
  },
  {
    position_title: "Cashier",
    position_code: "CASH",
    description: "Branch Cashier handling customer transactions",
    requirements: "High school diploma, basic math skills, customer service experience preferred",
    rate_per_hour: 50.00,
    hours_per_month: 160,
    department: "Branch",
    position_type: "Full-time",
    total_slots: 2,
    filled_slots: 0,
    status: "open",
    job_status: "open",
    is_active: true
  },
  {
    position_title: "Cook",
    position_code: "COOK",
    description: "Kitchen Cook preparing food items",
    requirements: "Culinary experience, food safety certification preferred",
    rate_per_hour: 60.00,
    hours_per_month: 160,
    department: "Branch",
    position_type: "Full-time",
    total_slots: 2,
    filled_slots: 0,
    status: "open",
    job_status: "open",
    is_active: true
  },
  {
    position_title: "Kitchen Assistant",
    position_code: "KIT-ASST",
    description: "Kitchen Assistant supporting food preparation",
    requirements: "High school diploma, willingness to learn kitchen operations",
    rate_per_hour: 50.00,
    hours_per_month: 160,
    department: "Branch",
    position_type: "Full-time",
    total_slots: 1,
    filled_slots: 0,
    status: "open",
    job_status: "open",
    is_active: true
  },
  {
    position_title: "Waiter",
    position_code: "WAIT",
    description: "Server taking orders and serving customers",
    requirements: "High school diploma, customer service skills, food service experience preferred",
    rate_per_hour: 40.00,
    hours_per_month: 160,
    department: "Branch",
    position_type: "Full-time",
    total_slots: 3,
    filled_slots: 0,
    status: "open",
    job_status: "open",
    is_active: true
  }
];

async function ensureAllBranchPositions() {
  try {
    console.log('🚀 Starting branch positions check...\n');
    
    // Get all active branches
    const branches = await db('branches')
      .where('is_active', true)
      .whereNull('deleted_at')
      .orderBy('id');
    
    if (branches.length === 0) {
      console.log('❌ No active branches found.');
      process.exit(1);
    }
    
    console.log(`📋 Found ${branches.length} active branches:\n`);
    branches.forEach(b => {
      console.log(`   - ${b.name} (ID: ${b.id}, Code: ${b.code})`);
    });
    console.log('');
    
    let totalCreated = 0;
    let totalUpdated = 0;
    let totalSkipped = 0;
    
    // Process each branch
    for (const branch of branches) {
      console.log(`\n🏢 Processing branch: ${branch.name} (ID: ${branch.id})`);
      
      // Get existing positions for this branch (non-deleted only)
      const existingPositions = await db('branch_positions')
        .where('branch_id', branch.id)
        .whereNull('deleted_at')
        .select('position_code', 'position_title', 'is_active', 'status', 'job_status');
      
      const existingCodes = new Set(existingPositions.map(p => p.position_code));
      console.log(`   Found ${existingPositions.length} existing positions: ${Array.from(existingCodes).join(', ') || 'none'}`);
      
      // Check which positions are missing
      const missingPositions = defaultPositions.filter(p => !existingCodes.has(p.position_code));
      
      if (missingPositions.length === 0) {
        console.log(`   ✅ All positions exist for ${branch.name}`);
        
        // Update existing positions to ensure job_status is set
        for (const pos of existingPositions) {
          const defaultPos = defaultPositions.find(p => p.position_code === pos.position_code);
          if (defaultPos && pos.job_status !== defaultPos.job_status) {
            await db('branch_positions')
              .where('branch_id', branch.id)
              .where('position_code', pos.position_code)
              .whereNull('deleted_at')
              .update({
                job_status: defaultPos.job_status,
                updated_at: db.fn.now()
              });
            totalUpdated++;
            console.log(`   🔄 Updated job_status for ${pos.position_code}`);
          }
        }
        totalSkipped += defaultPositions.length;
        continue;
      }
      
      console.log(`   ⚠️  Missing ${missingPositions.length} positions: ${missingPositions.map(p => p.position_code).join(', ')}`);
      
      // Create missing positions or restore soft-deleted ones
      for (const position of missingPositions) {
        try {
          // First check if position exists but is soft-deleted
          const deletedPosition = await db('branch_positions')
            .where('branch_id', branch.id)
            .where('position_code', position.position_code)
            .whereNotNull('deleted_at')
            .first();
          
          if (deletedPosition) {
            // Restore the soft-deleted position
            const monthlySalary = position.rate_per_hour * position.hours_per_month;
            
            await db('branch_positions')
              .where('id', deletedPosition.id)
              .update({
                position_title: position.position_title,
                description: position.description,
                requirements: position.requirements,
                rate_per_hour: position.rate_per_hour,
                hours_per_month: position.hours_per_month,
                monthly_salary: monthlySalary,
                department: position.department,
                position_type: position.position_type,
                total_slots: position.total_slots,
                filled_slots: position.filled_slots,
                status: position.status,
                job_status: position.job_status,
                is_active: position.is_active,
                deleted_at: null, // Restore by removing deleted_at
                updated_at: db.fn.now()
              });
            
            console.log(`   🔄 Restored ${position.position_code} (${position.position_title})`);
            totalCreated++; // Count restored as created
          } else {
            // Create new position
            const monthlySalary = position.rate_per_hour * position.hours_per_month;
            
            await db('branch_positions').insert({
              branch_id: branch.id,
              position_title: position.position_title,
              position_code: position.position_code,
              description: position.description,
              requirements: position.requirements,
              rate_per_hour: position.rate_per_hour,
              hours_per_month: position.hours_per_month,
              monthly_salary: monthlySalary,
              department: position.department,
              position_type: position.position_type,
              total_slots: position.total_slots,
              filled_slots: position.filled_slots,
              status: position.status,
              job_status: position.job_status,
              is_active: position.is_active,
              created_at: db.fn.now(),
              updated_at: db.fn.now()
            });
            
            console.log(`   ✅ Created ${position.position_code} (${position.position_title})`);
            totalCreated++;
          }
        } catch (error) {
          if (error.code === '23505' || error.message.includes('duplicate') || error.message.includes('unique')) {
            console.log(`   ⚠️  Position ${position.position_code} has constraint conflict - trying to restore...`);
            
            // Try to restore if it exists
            try {
              const existing = await db('branch_positions')
                .where('branch_id', branch.id)
                .where('position_code', position.position_code)
                .first();
              
              if (existing && existing.deleted_at) {
                const monthlySalary = position.rate_per_hour * position.hours_per_month;
                await db('branch_positions')
                  .where('id', existing.id)
                  .update({
                    deleted_at: null,
                    job_status: position.job_status,
                    is_active: position.is_active,
                    updated_at: db.fn.now()
                  });
                console.log(`   🔄 Restored ${position.position_code} from soft-delete`);
                totalCreated++;
              } else {
                totalSkipped++;
              }
            } catch (restoreError) {
              console.error(`   ❌ Could not restore ${position.position_code}:`, restoreError.message);
              totalSkipped++;
            }
          } else {
            console.error(`   ❌ Error creating ${position.position_code}:`, error.message);
            throw error;
          }
        }
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 SUMMARY:');
    console.log(`   Total branches processed: ${branches.length}`);
    console.log(`   Positions created: ${totalCreated}`);
    console.log(`   Positions updated: ${totalUpdated}`);
    console.log(`   Positions skipped (already exist): ${totalSkipped}`);
    console.log(`   Expected total positions: ${branches.length * defaultPositions.length}`);
    console.log('='.repeat(60));
    
    // Verify final state
    console.log('\n🔍 Verifying final state...');
    const allPositions = await db('branch_positions')
      .whereNull('deleted_at')
      .count('* as total')
      .first();
    
    const positionsByBranch = await db('branch_positions as bp')
      .leftJoin('branches as b', 'bp.branch_id', 'b.id')
      .whereNull('bp.deleted_at')
      .select('b.name as branch_name', db.raw('COUNT(*) as count'))
      .groupBy('b.name')
      .orderBy('b.name');
    
    console.log(`\n📈 Final state:`);
    console.log(`   Total positions in database: ${allPositions.total}`);
    console.log(`   Positions by branch:`);
    positionsByBranch.forEach(item => {
      console.log(`      - ${item.branch_name || 'Unknown'}: ${item.count} positions`);
    });
    
    console.log('\n✅ Script completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

// Run the script
ensureAllBranchPositions();

