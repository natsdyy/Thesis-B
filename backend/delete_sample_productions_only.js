const { db } = require("./config/database");

async function deleteSampleProductionsOnly() {
  const trx = await db.transaction();

  try {
    console.log("🔍 Finding all sample productions...");

    // Find ALL sample productions (both active and already deleted)
    const allSampleProductions = await trx("sample_productions")
      .select("*")
      .orderBy("scheduled_date", "desc");

    console.log(
      `📊 Found ${allSampleProductions.length} total sample productions`
    );
    const activeProductions = allSampleProductions.filter(
      (sp) => !sp.deleted_at
    );
    const deletedProductions = allSampleProductions.filter(
      (sp) => sp.deleted_at
    );

    console.log(`  Active: ${activeProductions.length}`);
    console.log(`  Already deleted: ${deletedProductions.length}`);

    if (allSampleProductions.length === 0) {
      console.log("✅ No sample productions found in the database");
      await trx.rollback();
      return;
    }

    // Group by date for reporting
    const byDate = {};
    allSampleProductions.forEach((sp) => {
      const date = sp.scheduled_date.toISOString().split("T")[0];
      byDate[date] = (byDate[date] || 0) + 1;
    });

    console.log("\n📅 Sample productions by date:");
    Object.keys(byDate)
      .sort()
      .forEach((date) => {
        console.log(`  ${date}: ${byDate[date]} records`);
      });

    // Get ALL sample production IDs (including already deleted ones)
    const allSampleProductionIds = allSampleProductions.map((sp) => sp.id);
    console.log("\nSample production IDs to process:", allSampleProductionIds);

    // Delete related records from menu_item_audit_log (required due to foreign key constraint)
    const auditLogDeleted = await trx("menu_item_audit_log")
      .whereIn("sample_production_id", allSampleProductionIds)
      .del();

    console.log(
      `🗑️ Deleted ${auditLogDeleted} audit log records (required for foreign key constraint)`
    );

    // Hard delete ALL sample productions (remove completely from database)
    const sampleProductionsHardDeleted = await trx("sample_productions").del();

    console.log(
      `🗑️ Hard deleted ${sampleProductionsHardDeleted} sample production records`
    );

    // Show details of what was deleted
    console.log("\n📋 Sample Production Records Deleted:");
    allSampleProductions.forEach((sp, index) => {
      const status = sp.deleted_at ? "WAS DELETED" : "WAS ACTIVE";
      console.log(
        `  ${index + 1}. ID: ${sp.id}, Batch: ${sp.sample_batch_number}, Date: ${sp.scheduled_date}, Status: ${status}`
      );
    });

    await trx.commit();
    console.log(
      "\n✅ Successfully deleted ALL sample production records from the sample_productions table only"
    );
  } catch (error) {
    await trx.rollback();
    console.error("❌ Error deleting sample productions:", error);
    throw error;
  }
}

// Run the script
if (require.main === module) {
  console.log(
    "🗑️ This will delete ALL sample production records from the sample_productions table"
  );
  console.log(
    "🗑️ Related audit log entries will also be deleted (required due to foreign key constraints)"
  );
  console.log(
    "⚠️ Other related data (quality inspections, production orders, etc.) will NOT be deleted"
  );
  console.log("⚠️ This action cannot be undone!\n");

  deleteSampleProductionsOnly()
    .then(() => {
      console.log("\n🎉 Script completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n💥 Script failed:", error);
      process.exit(1);
    });
}

module.exports = { deleteSampleProductionsOnly };
