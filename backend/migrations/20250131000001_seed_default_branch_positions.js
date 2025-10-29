/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // Get all active branches
  const branches = await knex("branches").where("is_active", true);
  
  if (branches.length === 0) {
    console.log("No active branches found. Skipping position seeding.");
    return;
  }
  
  // Default positions for each branch
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
  
  // Insert positions for each branch
  for (const branch of branches) {
    console.log(`Creating positions for branch: ${branch.name}`);
    
    for (const position of defaultPositions) {
      const monthlySalary = position.rate_per_hour * position.hours_per_month;
      
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
        job_status: position.status, // Set job_status same as status
        is_active: true,
        created_at: knex.fn.now(),
        updated_at: knex.fn.now()
      });
    }
  }
  
  console.log(`✅ Created ${defaultPositions.length} positions for ${branches.length} branches`);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  // Remove all seeded positions
  await knex("branch_positions").del();
  console.log("Removed all seeded branch positions");
};

