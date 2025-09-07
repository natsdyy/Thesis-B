const { db } = require("./config/database");

async function deleteSampleProductionsSept4to5() {
  const trx = await db.transaction();

  try {
    console.log("🔍 Finding sample productions from September 4-5, 2025...");

    // Find sample productions in the date range
    const sampleProductions = await trx("sample_productions")
      .where("scheduled_date", ">=", "2025-09-04")
      .where("scheduled_date", "<=", "2025-09-05")
      .whereNull("deleted_at");

    console.log(
      `📊 Found ${sampleProductions.length} sample productions in the date range`
    );

    if (sampleProductions.length === 0) {
      console.log("✅ No sample productions found in the specified date range");
      await trx.rollback();
      return;
    }

    // Get IDs for deletion
    const sampleProductionIds = sampleProductions.map((sp) => sp.id);
    console.log("Sample production IDs to delete:", sampleProductionIds);

    // Delete related records from menu_quality_inspections
    const menuInspectionDeleted = await trx("menu_quality_inspections")
      .whereIn("sample_production_id", sampleProductionIds)
      .del();

    console.log(
      `🗑️ Deleted ${menuInspectionDeleted} menu quality inspection records`
    );

    // Delete related records from menu_item_audit_log
    const auditLogDeleted = await trx("menu_item_audit_log")
      .whereIn("sample_production_id", sampleProductionIds)
      .del();

    console.log(`🗑️ Deleted ${auditLogDeleted} audit log records`);

    // Soft delete the sample productions
    const sampleProductionsDeleted = await trx("sample_productions")
      .whereIn("id", sampleProductionIds)
      .update({
        deleted_at: trx.fn.now(),
        updated_at: trx.fn.now(),
      });

    console.log(
      `🗑️ Soft deleted ${sampleProductionsDeleted} sample production records`
    );

    // Show details of what was deleted
    console.log("\n📋 Deleted Sample Productions:");
    sampleProductions.forEach((sp) => {
      console.log(
        `  - ID: ${sp.id}, Batch: ${sp.sample_batch_number}, Date: ${sp.scheduled_date}`
      );
    });

    await trx.commit();
    console.log(
      "\n✅ Successfully deleted all sample production data from September 4-5, 2025"
    );
  } catch (error) {
    await trx.rollback();
    console.error("❌ Error deleting sample productions:", error);
    throw error;
  }
}

// Run the script
if (require.main === module) {
  deleteSampleProductionsSept4to5()
    .then(() => {
      console.log("Script completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Script failed:", error);
      process.exit(1);
    });
}

module.exports = { deleteSampleProductionsSept4to5 };
