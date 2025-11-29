const { db } = require("../config/database");

async function fixBinakayanCode() {
  try {
    console.log("🔧 Fixing Countryside Binakayan branch code...\n");

    // Find the branch with BRNNaN
    const binakayan = await db("branches")
      .where("code", "BRNNaN")
      .orWhere("id", 14)
      .first();

    if (!binakayan) {
      console.log("❌ Branch not found");
      process.exit(1);
    }

    console.log(`Found branch: ${binakayan.name} (ID: ${binakayan.id})`);
    console.log(`Current code: ${binakayan.code}\n`);

    // Get all existing BRN codes to find the next available
    const existingBranches = await db("branches")
      .select("code")
      .whereNotNull("code")
      .where("code", "like", "BRN%");

    // Extract all numeric parts from BRN codes
    const codeNumbers = existingBranches
      .map((branch) => {
        const match = branch.code.match(/^BRN(\d+)$/);
        return match ? parseInt(match[1], 10) : null;
      })
      .filter((num) => num !== null && !isNaN(num))
      .sort((a, b) => a - b);

    console.log("Existing BRN codes:", codeNumbers);
    console.log("");

    // Find the next available number
    let nextNumber = 1;
    for (let i = 1; i <= 1000; i++) {
      if (!codeNumbers.includes(i)) {
        // Check if this code is available
        const code = `BRN${i.toString().padStart(3, "0")}`;
        const exists = await db("branches").where("code", code).first();
        if (!exists) {
          nextNumber = i;
          break;
        }
      }
    }

    const newCode = `BRN${nextNumber.toString().padStart(3, "0")}`;
    console.log(`Assigning new code: ${newCode}\n`);

    // Update the branch
    await db("branches")
      .where("id", binakayan.id)
      .update({
        code: newCode,
        updated_at: new Date(),
      });

    console.log(`✅ Successfully updated branch code to ${newCode}`);
    console.log(`\nBranch: ${binakayan.name}`);
    console.log(`New Code: ${newCode}`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

fixBinakayanCode();

