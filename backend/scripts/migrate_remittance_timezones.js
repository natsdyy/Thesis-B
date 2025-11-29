/**
 * Migration script to convert existing branch_remittances timestamps from UTC to Philippine timezone
 * Run this script once to fix existing data
 */

const { db } = require("../config/database");
const { formatForDatabaseWithTimezone } = require("../utils/timezoneUtils");

async function migrateRemittanceTimezones() {
  console.log(
    "Starting migration of branch_remittances timestamps to Philippine timezone..."
  );

  try {
    // Get all remittance records
    const remittances = await db("branch_remittances")
      .select(
        "id",
        "created_at",
        "updated_at",
        "approved_at",
        "date_from",
        "date_to"
      )
      .whereNull("deleted_at");

    console.log(`Found ${remittances.length} remittance records to migrate`);

    let updatedCount = 0;

    for (const remittance of remittances) {
      const updates = {};

      // Convert each timestamp field if it exists and is in UTC format
      if (
        remittance.created_at &&
        remittance.created_at.toString().endsWith("Z")
      ) {
        updates.created_at = formatForDatabaseWithTimezone(
          new Date(remittance.created_at)
        );
      }

      if (
        remittance.updated_at &&
        remittance.updated_at.toString().endsWith("Z")
      ) {
        updates.updated_at = formatForDatabaseWithTimezone(
          new Date(remittance.updated_at)
        );
      }

      if (
        remittance.approved_at &&
        remittance.approved_at.toString().endsWith("Z")
      ) {
        updates.approved_at = formatForDatabaseWithTimezone(
          new Date(remittance.approved_at)
        );
      }

      if (
        remittance.date_from &&
        remittance.date_from.toString().endsWith("Z")
      ) {
        updates.date_from = formatForDatabaseWithTimezone(
          new Date(remittance.date_from)
        );
      }

      if (remittance.date_to && remittance.date_to.toString().endsWith("Z")) {
        updates.date_to = formatForDatabaseWithTimezone(
          new Date(remittance.date_to)
        );
      }

      // Only update if there are changes
      if (Object.keys(updates).length > 0) {
        await db("branch_remittances")
          .where("id", remittance.id)
          .update(updates);

        updatedCount++;
        console.log(`Updated remittance ID ${remittance.id}`);
      }
    }

    console.log(`Migration completed! Updated ${updatedCount} records.`);
    console.log(
      "All timestamps are now stored in Philippine timezone (+08:00)"
    );
  } catch (error) {
    console.error("Migration failed:", error);
    throw error;
  }
}

// Run migration if this script is executed directly
if (require.main === module) {
  migrateRemittanceTimezones()
    .then(() => {
      console.log("Migration script completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Migration script failed:", error);
      process.exit(1);
    });
}

module.exports = { migrateRemittanceTimezones };
