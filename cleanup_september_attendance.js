const { db } = require("./backend/config/database");

/**
 * Script to clean up September 2025 attendance records for EMP000013
 * This will delete all attendance records for the employee in September 2025
 */

async function cleanupSeptemberAttendance() {
  try {
    console.log(
      "🧹 Starting cleanup of September 2025 attendance for EMP000013..."
    );

    // First, get the employee's database ID
    const employee = await db("employees")
      .where("employee_id", "EMP000013")
      .first();

    if (!employee) {
      throw new Error("Employee EMP000013 not found!");
    }

    console.log(
      `✅ Found employee: ${employee.first_name} ${employee.last_name} (ID: ${employee.id})`
    );

    // Count existing records
    const existingRecords = await db("attendance_records")
      .where("employee_id", employee.id)
      .whereBetween("created_at", [
        new Date("2025-09-01T00:00:00"),
        new Date("2025-09-30T23:59:59"),
      ]);

    console.log(
      `📊 Found ${existingRecords.length} existing attendance records for September 2025`
    );

    if (existingRecords.length === 0) {
      console.log("✅ No records to delete. Cleanup complete!");
      return;
    }

    // Show some sample records that will be deleted
    console.log("\n📝 Records to be deleted:");
    console.log("========================");
    existingRecords.slice(0, 5).forEach((record, index) => {
      const date = new Date(record.created_at).toLocaleDateString();
      const timeIn = record.time_in
        ? new Date(record.time_in).toLocaleTimeString()
        : "N/A";
      const timeOut = record.time_out
        ? new Date(record.time_out).toLocaleTimeString()
        : "N/A";
      console.log(
        `${index + 1}. ${date}: ${timeIn} - ${timeOut} (${record.status}, ${record.hours_worked}h)`
      );
    });

    if (existingRecords.length > 5) {
      console.log(`... and ${existingRecords.length - 5} more records`);
    }

    // Delete the records
    console.log("\n🗑️ Deleting attendance records...");
    const deletedCount = await db("attendance_records")
      .where("employee_id", employee.id)
      .whereBetween("created_at", [
        new Date("2025-09-01T00:00:00"),
        new Date("2025-09-30T23:59:59"),
      ])
      .del();

    console.log(`✅ Successfully deleted ${deletedCount} attendance records`);
    console.log("🎉 Cleanup completed successfully!");
  } catch (error) {
    console.error("❌ Error during cleanup:", error);
    throw error;
  } finally {
    await db.destroy();
  }
}

// Run the script
if (require.main === module) {
  cleanupSeptemberAttendance()
    .then(() => {
      console.log("✅ Cleanup script completed successfully!");
      console.log("💡 You can now run the attendance generation script again:");
      console.log("   node generate_september_attendance_emp000013.js");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Cleanup script failed:", error.message);
      process.exit(1);
    });
}

module.exports = { cleanupSeptemberAttendance };
