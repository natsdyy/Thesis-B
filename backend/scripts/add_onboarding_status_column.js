/**
 * Direct script to add onboarding_status column to employees table
 */

const { db } = require("../config/database");

async function addOnboardingStatusColumn() {
  try {
    console.log("Checking if onboarding_status column exists...");
    
    // Check if column exists
    const columnExists = await db.raw(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='employees' 
      AND column_name='onboarding_status'
    `);

    if (columnExists.rows.length > 0) {
      console.log("✅ Column 'onboarding_status' already exists!");
      return;
    }

    console.log("Adding onboarding_status column...");
    
    await db.raw(`
      ALTER TABLE employees 
      ADD COLUMN onboarding_status VARCHAR(50) NULL DEFAULT NULL
    `);

    console.log("✅ Successfully added onboarding_status column!");
    process.exit(0);
  } catch (error) {
    if (error.message.includes('already exists') || error.code === '42701') {
      console.log("✅ Column already exists (or was just created)!");
      process.exit(0);
    }
    console.error("❌ Error adding column:", error);
    process.exit(1);
  }
}

addOnboardingStatusColumn();

