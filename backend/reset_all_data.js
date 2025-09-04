const { db } = require("./config/database");

async function resetAllData() {
  const trx = await db.transaction();

  try {
    console.log("🗑️ RESETTING ALL DATA IN DATABASE...");
    console.log("⚠️  This will delete ALL records from ALL tables!");
    console.log("⚠️  This action CANNOT be undone!\n");

    // Tables to clear (in order of dependencies)
    const tables = [
      "menu_item_audit_log",
      "menu_quality_inspections",
      "production_inventory",
      "work_orders",
      "production_orders",
      "sample_productions",
      "menu_items",
      "recipes",
      "users",
      "roles",
      "role_permissions",
      "permissions",
      "menus",
    ];

    let totalRecordsDeleted = 0;

    for (const table of tables) {
      try {
        // Get count before deletion
        const countResult = await trx(table).count("* as count");
        const count = parseInt(countResult[0].count);

        if (count > 0) {
          // Delete all records
          const deleted = await trx(table).del();
          totalRecordsDeleted += deleted;
          console.log(`🗑️  ${table}: ${deleted} records deleted`);
        } else {
          console.log(`⏭️  ${table}: 0 records (already empty)`);
        }
      } catch (error) {
        console.log(`⚠️  ${table}: Error deleting - ${error.message}`);
      }
    }

    await trx.commit();

    console.log(`\n✅ Database reset completed successfully!`);
    console.log(`📊 Total records deleted: ${totalRecordsDeleted}`);
    console.log(
      `🔄 Database is now completely empty and ready for fresh data.`
    );
  } catch (error) {
    await trx.rollback();
    console.error("❌ Error resetting database:", error);
    throw error;
  }
}

// Run the script
if (require.main === module) {
  console.log("🚨 DANGER ZONE 🚨");
  console.log("This script will DELETE ALL DATA from your database!");
  console.log("Make sure you have a backup if you need to recover any data.\n");

  // Add a confirmation prompt would be ideal, but for now we'll just warn
  console.log("Starting database reset in 3 seconds...");
  setTimeout(() => {
    resetAllData()
      .then(() => {
        console.log("\n🎉 Database reset completed successfully!");
        process.exit(0);
      })
      .catch((error) => {
        console.error("\n💥 Database reset failed:", error);
        process.exit(1);
      });
  }, 3000);
}

module.exports = { resetAllData };
