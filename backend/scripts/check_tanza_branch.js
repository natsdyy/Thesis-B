const { db } = require("../config/database");

async function checkTanzaBranches() {
  try {
    console.log("🔍 Checking for Tanza branches...\n");

    // Check by name (case-insensitive)
    const tanzaByName = await db("branches")
      .whereRaw("LOWER(name) LIKE ?", ["%tanza%"])
      .select("*");

    console.log(`Found ${tanzaByName.length} branch(es) with "Tanza" in name:`);
    tanzaByName.forEach((branch) => {
      console.log(`  - ID: ${branch.id}`);
      console.log(`    Name: ${branch.name}`);
      console.log(`    Code: ${branch.code || "(no code)"}`);
      console.log(`    Address: ${branch.address}`);
      console.log(`    Active: ${branch.is_active}`);
      console.log("");
    });

    // Check all branches to see what codes exist
    console.log("\n📋 All existing branch codes:");
    const allBranches = await db("branches")
      .select("id", "name", "code")
      .orderBy("id", "asc");
    
    allBranches.forEach((branch) => {
      console.log(`  ${branch.code} - ${branch.name} (ID: ${branch.id})`);
    });

    // Check what the next code would be
    const lastBranch = await db("branches")
      .select("code")
      .whereNotNull("code")
      .orderBy("id", "desc")
      .first();

    if (lastBranch) {
      const lastCode = lastBranch.code;
      const numPart = parseInt(lastCode.replace("BRN", "")) + 1;
      const nextCode = `BRN${numPart.toString().padStart(3, "0")}`;
      console.log(`\n🔮 Next code that would be generated: ${nextCode}`);
      
      // Check if this code already exists
      const codeExists = await db("branches")
        .where("code", nextCode)
        .first();
      
      if (codeExists) {
        console.log(`⚠️  WARNING: Code ${nextCode} already exists!`);
        console.log(`   Existing branch: ${codeExists.name} (ID: ${codeExists.id})`);
      } else {
        console.log(`✓ Code ${nextCode} is available`);
      }
    } else {
      console.log("\n🔮 Next code that would be generated: BRN001");
    }

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

checkTanzaBranches();

