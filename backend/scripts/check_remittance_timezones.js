/**
 * Diagnostic script to check the current timezone format of branch_remittances timestamps
 */

const { db } = require("../config/database");

async function checkRemittanceTimezones() {
  console.log(
    "Checking current timezone format of branch_remittances timestamps...\n"
  );

  try {
    // Get all remittance records with their timestamps
    const remittances = await db("branch_remittances")
      .select(
        "id",
        "created_at",
        "updated_at",
        "approved_at",
        "date_from",
        "date_to",
        "status"
      )
      .whereNull("deleted_at");

    console.log(`Found ${remittances.length} remittance records:\n`);

    if (remittances.length === 0) {
      console.log("No remittance records found in the database.");
      return;
    }

    // Analyze each record
    remittances.forEach((remittance, index) => {
      console.log(
        `--- Record ${index + 1} (ID: ${remittance.id}, Status: ${remittance.status}) ---`
      );

      const timestampFields = [
        "created_at",
        "updated_at",
        "approved_at",
        "date_from",
        "date_to",
      ];

      timestampFields.forEach((field) => {
        const value = remittance[field];
        if (value) {
          const timestampStr = value.toString();
          const format = timestampStr.endsWith("Z")
            ? "UTC (Z)"
            : timestampStr.includes("+08:00")
              ? "Philippine (+08:00)"
              : timestampStr.includes("+0800")
                ? "Philippine (+0800)"
                : "Unknown format";

          console.log(`  ${field}: ${timestampStr} (${format})`);
        } else {
          console.log(`  ${field}: null`);
        }
      });
      console.log();
    });

    // Summary statistics
    const utcCount = remittances.filter((r) =>
      Object.values(r).some((v) => v && v.toString().endsWith("Z"))
    ).length;

    const phCount = remittances.filter((r) =>
      Object.values(r).some(
        (v) =>
          v &&
          (v.toString().includes("+08:00") || v.toString().includes("+0800"))
      )
    ).length;

    console.log("=== SUMMARY ===");
    console.log(`Total records: ${remittances.length}`);
    console.log(`Records with UTC timestamps (Z): ${utcCount}`);
    console.log(`Records with Philippine timestamps (+08:00): ${phCount}`);
    console.log(`Records needing migration: ${utcCount}`);

    if (utcCount === 0) {
      console.log(
        "\n✅ All timestamps appear to be in Philippine timezone format!"
      );
    } else {
      console.log(
        `\n⚠️  ${utcCount} records still have UTC timestamps and need migration.`
      );
    }
  } catch (error) {
    console.error("Error checking timestamps:", error);
    throw error;
  }
}

// Run diagnostic if this script is executed directly
if (require.main === module) {
  checkRemittanceTimezones()
    .then(() => {
      console.log("\nDiagnostic completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Diagnostic failed:", error);
      process.exit(1);
    });
}

module.exports = { checkRemittanceTimezones };
