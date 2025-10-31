const { db } = require("../config/database");

async function addBranchPositionsToAllBranches() {
  try {
    console.log("🔄 Starting: Adding Branch department positions to all branches...\n");

    // Get all active branches
    const branches = await db("branches")
      .whereNull("deleted_at")
      .where("is_active", true)
      .select("id", "name", "code")
      .orderBy("name");

    console.log(`📍 Found ${branches.length} active branches\n`);

    // Define the positions to add (with role_id from user_roles)
    const roles = [
      { role_id: 29, role: "Staff", rate: 50 },
      { role_id: 15, role: "Cashier", rate: 55 },
      { role_id: 14, role: "Kitchen Assistant", rate: 55 },
      { role_id: 16, role: "Waiter", rate: 40 },
      { role_id: 12, role: "Manager", rate: 80 },
      { role_id: 13, role: "Cook", rate: 58 },
    ];

    let created = 0;
    let skipped = 0;
    let updated = 0;

    for (const branch of branches) {
      console.log(`\n📌 Processing branch: ${branch.name} (${branch.code || branch.id})`);

      for (const role of roles) {
        // Check if position already exists
        const existing = await db("branch_positions")
          .where("branch_id", branch.id)
          .where("position_title", role.role)
          .where("department", "Branch")
          .whereNull("deleted_at")
          .first();

        if (existing) {
          // If exists but inactive/closed, update it
          if (!existing.is_active || existing.status !== "open") {
            await db("branch_positions")
              .where("id", existing.id)
              .update({
                is_active: true,
                status: "open",
                job_status: "open",
                rate_per_hour: parseFloat(role.rate),
                monthly_salary: parseFloat(role.rate) * 160,
                updated_at: db.fn.now(),
              });
            updated++;
            console.log(`  ↻ Updated: ${role.role} (₱${role.rate}/hr)`);
          } else {
            skipped++;
            console.log(`  ⏭️  Skipped: ${role.role} (already active)`);
          }
        } else {
          // Create new position
          const roleCode = role.role
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, "")
            .substring(0, 4) || "ROLE";
          const positionCode = `${roleCode}-${branch.code || branch.id}`;

          await db("branch_positions").insert({
            branch_id: branch.id,
            role_id: role.role_id,
            position_title: role.role,
            position_code: positionCode,
            department: "Branch",
            rate_per_hour: parseFloat(role.rate),
            monthly_salary: parseFloat(role.rate) * 160,
            hours_per_month: 160,
            total_slots: 1,
            filled_slots: 0,
            status: "open",
            job_status: "open",
            position_type: "Full-time",
            is_active: true,
            created_at: db.fn.now(),
            updated_at: db.fn.now(),
          });
          created++;
          console.log(`  ✅ Created: ${role.role} (₱${role.rate}/hr)`);
        }
      }
    }

    console.log(`\n\n📊 Summary:`);
    console.log(`   ✅ Created: ${created} positions`);
    console.log(`   ↻ Updated: ${updated} positions`);
    console.log(`   ⏭️  Skipped: ${skipped} positions`);
    console.log(`\n✅ All Branch department positions have been added to all branches!`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

addBranchPositionsToAllBranches();

