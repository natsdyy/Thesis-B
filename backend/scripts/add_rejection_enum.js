/**
 * Script to add 'rejection' to branch_inventory_tx_type enum
 * Run with: node scripts/add_rejection_enum.js
 */
const { db } = require("../config/database");
require("dotenv").config();

async function addRejectionEnum() {
  try {
    console.log(
      'Checking if "rejection" already exists in branch_inventory_tx_type enum...'
    );

    // Check if it already exists
    const enumExists = await db.raw(`
      SELECT 1 FROM pg_enum 
      WHERE enumlabel = 'rejection' 
      AND enumtypid = (
        SELECT oid FROM pg_type WHERE typname = 'branch_inventory_tx_type'
      )
    `);

    if (enumExists.rows.length > 0) {
      console.log(
        '✅ "rejection" already exists in the enum. No changes needed.'
      );
      process.exit(0);
    }

    console.log('Adding "rejection" to branch_inventory_tx_type enum...');
    await db.raw(`
      ALTER TYPE branch_inventory_tx_type ADD VALUE 'rejection';
    `);

    console.log(
      '✅ Successfully added "rejection" to branch_inventory_tx_type enum!'
    );
    process.exit(0);
  } catch (error) {
    console.error("❌ Error adding enum value:", error.message);
    process.exit(1);
  } finally {
    await db.destroy();
  }
}

addRejectionEnum();
