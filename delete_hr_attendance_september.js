const { db } = require("./backend/config/database");

/**
 * Script to delete all attendance records for Human Resource department employees
 * for September 2025
 */

async function deleteHRAttendanceSeptember() {
  try {
    console.log(
      "🚀 Starting deletion of HR Department attendance for September 2025..."
    );

    // Get all Human Resource employees
    const hrEmployees = await db("employees")
      .select("id", "employee_id", "first_name", "last_name")
      .where("department", "Human Resource")
      .where("status", "Active")
      .whereNull("deleted_at");

    if (!hrEmployees.length) {
      console.log("⚠️  No HR employees found!");
      return;
    }

    console.log(`✅ Found ${hrEmployees.length} HR employees:`);
    hrEmployees.forEach((emp, index) => {
      console.log(
        `   ${index + 1}. ${emp.employee_id} - ${emp.first_name} ${emp.last_name}`
      );
    });

    const employeeIds = hrEmployees.map((emp) => emp.id);

    // Find all attendance records for HR employees in September 2025
    const attendanceRecords = await db("attendance_records")
      .whereIn("employee_id", employeeIds)
      .whereBetween("created_at", [
        new Date("2025-09-01T00:00:00"),
        new Date("2025-09-30T23:59:59"),
      ]);

    if (!attendanceRecords.length) {
      console.log("\n✅ No attendance records found for September 2025!");
      return;
    }

    console.log(
      `\n📊 Found ${attendanceRecords.length} attendance records to delete`
    );

    // Group records by employee for summary
    const recordsByEmployee = {};
    attendanceRecords.forEach((record) => {
      if (!recordsByEmployee[record.employee_id]) {
        recordsByEmployee[record.employee_id] = [];
      }
      recordsByEmployee[record.employee_id].push(record);
    });

    console.log("\n📋 Records breakdown by employee:");
    for (const empId in recordsByEmployee) {
      const employee = hrEmployees.find((e) => e.id === parseInt(empId));
      if (employee) {
        console.log(
          `   ${employee.employee_id} - ${employee.first_name} ${employee.last_name}: ${recordsByEmployee[empId].length} records`
        );
      }
    }

    // Ask for confirmation (in a real scenario, you might want to use readline)
    console.log("\n⚠️  WARNING: This will permanently delete these records!");
    console.log("   Press Ctrl+C within 3 seconds to cancel...");

    // Wait 3 seconds before proceeding
    await new Promise((resolve) => setTimeout(resolve, 3000));

    console.log("\n🗑️  Proceeding with deletion...");

    // Delete the records
    const deletedCount = await db("attendance_records")
      .whereIn("employee_id", employeeIds)
      .whereBetween("created_at", [
        new Date("2025-09-01T00:00:00"),
        new Date("2025-09-30T23:59:59"),
      ])
      .del();

    console.log(
      `\n✅ Successfully deleted ${deletedCount} attendance records!`
    );

    console.log("\n📊 DELETION SUMMARY:");
    console.log("=".repeat(60));
    console.log(`📅 Period: September 1-30, 2025`);
    console.log(`🏢 Department: Human Resource`);
    console.log(
      `👥 Employees Affected: ${Object.keys(recordsByEmployee).length}`
    );
    console.log(`📈 Total Records Deleted: ${deletedCount}`);
    console.log("=".repeat(60));

    console.log("\n🎉 Deletion completed successfully!");
    console.log("💡 You can now run the attendance generation script again.");
  } catch (error) {
    console.error("❌ Error deleting attendance records:", error);
    throw error;
  } finally {
    await db.destroy();
  }
}

// Run the script
if (require.main === module) {
  deleteHRAttendanceSeptember()
    .then(() => {
      console.log("✅ Script completed successfully!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Script failed:", error.message);
      process.exit(1);
    });
}

module.exports = { deleteHRAttendanceSeptember };
