const { db } = require("../config/database");
const Supplier = require("../models/Supplier");

async function setSupplierPasswords() {
  try {
    console.log("🔐 Setting default passwords for suppliers...\n");

    // Get all active suppliers without passwords
    const suppliers = await db("suppliers")
      .whereNull("deleted_at")
      .where("status", "Active");

    if (suppliers.length === 0) {
      console.log(
        "✅ No suppliers found or all suppliers already have passwords."
      );
      process.exit(0);
    }

    console.log(`Found ${suppliers.length} supplier(s) to process.\n`);

    let successCount = 0;
    let errorCount = 0;

    for (const supplier of suppliers) {
      try {
        // Check if supplier already has a password
        if (supplier.password) {
          console.log(`⏭️  Skipping ${supplier.name} - already has password`);
          continue;
        }

        // Set default password
        await Supplier.setDefaultPassword(supplier.id, "supplier123");

        console.log(
          `✅ Set password for: ${supplier.name} (${supplier.email})`
        );
        console.log(`   Default Password: supplier123\n`);

        successCount++;
      } catch (error) {
        console.error(
          `❌ Error setting password for ${supplier.name}:`,
          error.message
        );
        errorCount++;
      }
    }

    console.log("\n" + "=".repeat(60));
    console.log("📊 SUMMARY");
    console.log("=".repeat(60));
    console.log(`✅ Successfully set passwords: ${successCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`📧 Total suppliers processed: ${suppliers.length}`);
    console.log("\n🔑 Default Password: supplier123");
    console.log("⚠️  Suppliers should change their password on first login.\n");

    process.exit(0);
  } catch (error) {
    console.error("❌ Fatal error:", error);
    process.exit(1);
  }
}

// Run the script
setSupplierPasswords();
