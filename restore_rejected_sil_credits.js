/**
 * Script to restore SIL credits for all rejected leave requests that used SIL
 * Run this to fix historical data where credits weren't restored on rejection
 *
 * Usage: node restore_rejected_sil_credits.js [employee_id] [year]
 * Example: node restore_rejected_sil_credits.js 31 2025
 */

const { db } = require("./backend/config/database");
const SILCredits = require("./backend/models/SILCredits");

async function restoreRejectedSILCredits(employeeId = null, year = null) {
  try {
    console.log("🔍 Finding rejected leave requests with SIL credits...\n");

    // Build query to find rejected leaves that used SIL
    let query = db("leave_requests as lr")
      .select(
        "lr.id",
        "lr.employee_id",
        "lr.from_date",
        "lr.to_date",
        "lr.use_sil",
        "lr.sil_days",
        "lr.status",
        "lr.rejected_at",
        "e.first_name",
        "e.last_name",
        "e.employee_id as employee_code"
      )
      .leftJoin("employees as e", "lr.employee_id", "e.id")
      .where("lr.status", "rejected")
      .where("lr.use_sil", true)
      .where("lr.sil_days", ">", 0)
      .whereNull("lr.deleted_at");

    if (employeeId) {
      query = query.where("lr.employee_id", employeeId);
    }

    const rejectedLeaves = await query.orderBy("lr.rejected_at", "desc");

    if (rejectedLeaves.length === 0) {
      console.log("✅ No rejected leave requests with SIL credits found.");
      return;
    }

    console.log(
      `📋 Found ${rejectedLeaves.length} rejected leave request(s) with SIL credits:\n`
    );

    let totalRestored = 0;
    const results = [];

    for (const leave of rejectedLeaves) {
      const leaveYear = year || new Date(leave.from_date).getFullYear();
      const silDays = parseFloat(leave.sil_days);

      console.log(`  • Leave ID ${leave.id}:`);
      console.log(
        `    Employee: ${leave.first_name} ${leave.last_name} (${leave.employee_code})`
      );
      console.log(`    Dates: ${leave.from_date} to ${leave.to_date}`);
      console.log(`    SIL Days: ${silDays}`);
      console.log(`    Year: ${leaveYear}`);

      try {
        // Check current SIL credits
        const currentCredits = await SILCredits.getByEmployeeAndYear(
          leave.employee_id,
          leaveYear
        );

        if (!currentCredits) {
          console.log(
            `    ⚠️  Warning: No SIL credits record found for year ${leaveYear}`
          );
          results.push({
            leave_id: leave.id,
            employee_id: leave.employee_id,
            status: "skipped",
            reason: "No SIL credits record found",
          });
          continue;
        }

        console.log(
          `    📊 Current state: Available=${currentCredits.available_credits}, Used=${currentCredits.used_credits}, Total=${currentCredits.total_credits}`
        );

        // Directly update to ensure correct restoration
        // Calculate what the values should be
        const currentUsed = parseFloat(currentCredits.used_credits || 0);
        const currentAvailable = parseFloat(
          currentCredits.available_credits || 0
        );
        const currentTotal = parseFloat(currentCredits.total_credits || 0);

        // Restore: reduce used, increase available
        const newUsedCredits = Math.max(0, currentUsed - silDays);
        const newAvailableCredits = parseFloat(
          (currentAvailable + silDays).toFixed(2)
        );

        // Ensure available doesn't exceed total
        const finalAvailableCredits = Math.min(
          newAvailableCredits,
          currentTotal
        );

        // Use transaction to ensure data consistency
        await db.transaction(async (trx) => {
          // Re-read within transaction to get latest values
          const latestCredits = await trx("employee_sil_credits")
            .where("id", currentCredits.id)
            .first();

          const latestUsed = parseFloat(latestCredits.used_credits || 0);
          const latestAvailable = parseFloat(
            latestCredits.available_credits || 0
          );

          const finalUsed = Math.max(0, latestUsed - silDays);
          const finalAvailable = parseFloat(
            (latestAvailable + silDays).toFixed(2)
          );
          const cappedAvailable = Math.min(
            finalAvailable,
            parseFloat(latestCredits.total_credits || 0)
          );

          await trx("employee_sil_credits")
            .where("id", currentCredits.id)
            .update({
              used_credits: finalUsed.toFixed(2),
              available_credits: cappedAvailable.toFixed(2),
              updated_at: db.fn.now(),
            });
        });

        // Verify restoration - wait a moment to ensure transaction committed
        await new Promise((resolve) => setTimeout(resolve, 100));
        const updatedCredits = await SILCredits.getByEmployeeAndYear(
          leave.employee_id,
          leaveYear
        );

        const actualAvailableChange =
          parseFloat(updatedCredits.available_credits) - currentAvailable;
        const actualUsedChange =
          parseFloat(updatedCredits.used_credits) - currentUsed;

        if (Math.abs(actualAvailableChange - silDays) > 0.01) {
          console.log(
            `    ⚠️  Warning: Expected +${silDays} available, but got +${actualAvailableChange.toFixed(2)}`
          );
        }

        console.log(`    ✅ Restored ${silDays} SIL days`);
        console.log(
          `       Available: ${currentAvailable} → ${updatedCredits.available_credits} (+${actualAvailableChange.toFixed(2)})`
        );
        console.log(
          `       Used: ${currentUsed} → ${updatedCredits.used_credits} (${actualUsedChange >= 0 ? "+" : ""}${actualUsedChange.toFixed(2)})`
        );
        console.log(`       Total: ${currentTotal}\n`);

        totalRestored += silDays;
        results.push({
          leave_id: leave.id,
          employee_id: leave.employee_id,
          sil_days: silDays,
          status: "restored",
          before: {
            available: currentCredits.available_credits,
            used: currentCredits.used_credits,
          },
          after: {
            available: updatedCredits.available_credits,
            used: updatedCredits.used_credits,
          },
        });
      } catch (error) {
        console.log(`    ❌ Error: ${error.message}\n`);
        results.push({
          leave_id: leave.id,
          employee_id: leave.employee_id,
          status: "error",
          error: error.message,
        });
      }
    }

    console.log("\n📊 Summary:");
    console.log(`   Total leave requests processed: ${rejectedLeaves.length}`);
    console.log(`   Total SIL days restored: ${totalRestored}`);
    console.log(
      `   Successful: ${results.filter((r) => r.status === "restored").length}`
    );
    console.log(
      `   Failed: ${results.filter((r) => r.status === "error").length}`
    );
    console.log(
      `   Skipped: ${results.filter((r) => r.status === "skipped").length}`
    );

    return results;
  } catch (error) {
    console.error("❌ Script error:", error);
    throw error;
  } finally {
    await db.destroy();
  }
}

// Run the script
const args = process.argv.slice(2);
const employeeId = args[0] ? parseInt(args[0]) : null;
const year = args[1] ? parseInt(args[1]) : null;

if (employeeId && isNaN(employeeId)) {
  console.error("❌ Invalid employee_id. Must be a number.");
  process.exit(1);
}

if (year && isNaN(year)) {
  console.error("❌ Invalid year. Must be a number.");
  process.exit(1);
}

restoreRejectedSILCredits(employeeId, year)
  .then(() => {
    console.log("\n✅ Script completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Script failed:", error);
    process.exit(1);
  });
