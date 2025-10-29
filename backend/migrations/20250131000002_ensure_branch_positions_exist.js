/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // Use transaction to ensure atomicity, but catch errors per branch
  const branches = await knex("branches").where("is_active", true).whereNull("deleted_at");
  
  if (branches.length === 0) {
    console.log("No active branches found. Skipping position seeding.");
    return;
  }
  
  // Default positions for each branch (same as seed file)
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
      job_status: "open"
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
      job_status: "open"
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
      job_status: "open"
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
      job_status: "open"
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
      job_status: "open"
    }
  ];
  
  // For each branch, check if positions exist, if not create them
  // Process each branch and position separately to avoid transaction abort issues
  let totalCreated = 0;
  
  for (const branch of branches) {
    console.log(`Checking positions for branch: ${branch.name} (ID: ${branch.id})`);
    
    // Get existing positions for this branch (including deleted to avoid conflicts)
    const existingPositions = await knex("branch_positions")
      .where("branch_id", branch.id)
      .select("position_code");
    
    const existingCodes = new Set(existingPositions.map(p => p.position_code));
    
    for (const position of defaultPositions) {
      // Check if this position already exists for this branch (even if deleted)
      if (existingCodes.has(position.position_code)) {
        console.log(`  ⏭️  Position ${position.position_code} already exists for branch ${branch.name}`);
        
        // Update existing position to ensure job_status is set (only if not deleted)
        try {
          const updated = await knex("branch_positions")
            .where("branch_id", branch.id)
            .where("position_code", position.position_code)
            .whereNull("deleted_at")
            .update({
              job_status: position.job_status || "open",
              updated_at: knex.fn.now()
            });
          if (updated > 0) {
            console.log(`  ✅ Updated job_status for ${position.position_code}`);
          }
        } catch (updateError) {
          // Ignore update errors
          console.log(`  ⚠️  Could not update job_status for ${position.position_code}`);
        }
        continue;
      }
      
      // Calculate monthly salary
      const monthlySalary = position.rate_per_hour * position.hours_per_month;
      
      try {
        await knex("branch_positions").insert({
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
          is_active: true,
          created_at: knex.fn.now(),
          updated_at: knex.fn.now()
        });
        
        console.log(`  ✅ Created position ${position.position_code} (${position.position_title}) for branch ${branch.name}`);
        totalCreated++;
      } catch (error) {
        // If it's a duplicate key error, skip it
        if (error.code === '23505' || error.message.includes('duplicate')) {
          console.log(`  ⏭️  Position ${position.position_code} already exists for branch ${branch.name} (duplicate key)`);
          
          // Try to update job_status for existing position
          try {
            await knex("branch_positions")
              .where("branch_id", branch.id)
              .where("position_code", position.position_code)
              .whereNull("deleted_at")
              .update({
                job_status: position.job_status || "open",
                updated_at: knex.fn.now()
              });
          } catch (updateError) {
            // Ignore
          }
        } else {
          console.error(`  ❌ Error creating position ${position.position_code} for branch ${branch.name}:`, error.message);
        }
      }
    }
  }
  
  console.log(`✅ Migration completed. Created ${totalCreated} new positions across ${branches.length} branches`);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  // This migration only adds missing positions, so we don't need to remove them in down
  // The down migration can be a no-op or you can optionally remove positions created by this migration
  console.log("Down migration: Skipping position removal (positions should remain)");
};

