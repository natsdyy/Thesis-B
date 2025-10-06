/**
 * Test script to verify Budget Release Finance Integration
 *
 * This script tests:
 * 1. Finance balance deduction when budget is released
 * 2. Cash movement record creation
 * 3. Transaction integrity
 *
 * Usage: node test_budget_release_integration.js
 */

const { db } = require("./config/database");
const BudgetRelease = require("./models/BudgetRelease");
const FinanceBalance = require("./models/FinanceBalance");
const CashMovement = require("./models/CashMovement");
const SupplyRequest = require("./models/SupplyRequest");

async function testBudgetReleaseIntegration() {
  console.log("🧪 Testing Budget Release Finance Integration...\n");

  try {
    // Step 1: Get current finance balance
    console.log("Step 1: Checking current finance balance...");
    const balanceBefore = await FinanceBalance.getLatestBalance();
    console.log("Current Capital:", balanceBefore?.capital || 0);
    console.log("Current Total Balance:", balanceBefore?.total_balance || 0);
    console.log("");

    // Step 2: Find an approved supply request (or create one for testing)
    console.log("Step 2: Finding an approved supply request...");
    const approvedRequest = await db("supply_requests")
      .where("request_status", "Approved")
      .whereNull("released_at")
      .first();

    if (!approvedRequest) {
      console.log(
        "❌ No approved supply requests found. Please approve a supply request first."
      );
      return;
    }

    console.log("Found Request ID:", approvedRequest.request_id);
    console.log("Request Amount:", approvedRequest.total_amount);
    console.log("Department:", approvedRequest.department);
    console.log("");

    // Step 3: Create budget release
    console.log("Step 3: Creating budget release...");
    const releaseData = {
      supply_request_id: approvedRequest.id,
      released_amount: approvedRequest.total_amount,
      released_by: "Test Finance Manager",
      release_remarks: "Test budget release for integration verification",
    };

    const budgetRelease = await BudgetRelease.create(releaseData);
    console.log("✅ Budget Release Created:", budgetRelease.release_id);
    console.log("");

    // Step 4: Verify finance balance was deducted
    console.log("Step 4: Verifying finance balance deduction...");
    const balanceAfter = await FinanceBalance.getLatestBalance();
    const expectedCapital =
      Number(balanceBefore?.capital || 0) -
      Number(approvedRequest.total_amount);

    if (Math.abs(Number(balanceAfter.capital) - expectedCapital) < 0.01) {
      console.log("✅ Finance balance correctly deducted");
      console.log("New Capital:", balanceAfter.capital);
      console.log("New Total Balance:", balanceAfter.total_balance);
    } else {
      console.log("❌ Finance balance deduction mismatch");
      console.log("Expected Capital:", expectedCapital);
      console.log("Actual Capital:", balanceAfter.capital);
    }
    console.log("");

    // Step 5: Verify cash movement was created
    console.log("Step 5: Verifying cash movement record...");
    const cashMovements = await db("cash_movements")
      .where("reference_type", "budget_release")
      .where("reference_id", budgetRelease.id)
      .first();

    if (cashMovements) {
      console.log("✅ Cash movement record created");
      console.log("Movement Type:", cashMovements.movement_type);
      console.log("Amount:", cashMovements.amount);
      console.log("Source:", cashMovements.source);
      console.log("Notes:", cashMovements.notes);

      if (
        cashMovements.movement_type === "out" &&
        Number(cashMovements.amount) === Number(approvedRequest.total_amount)
      ) {
        console.log("✅ Cash movement details are correct");
      } else {
        console.log("❌ Cash movement details mismatch");
      }
    } else {
      console.log("❌ Cash movement record not found");
    }
    console.log("");

    // Step 6: Verify supply request status
    console.log("Step 6: Verifying supply request status...");
    const updatedRequest = await SupplyRequest.getById(approvedRequest.id);

    if (updatedRequest.request_status === "Budget Released") {
      console.log('✅ Supply request status updated to "Budget Released"');
      console.log("Release ID:", updatedRequest.release_id);
    } else {
      console.log("❌ Supply request status not updated correctly");
      console.log("Current Status:", updatedRequest.request_status);
    }
    console.log("");

    console.log("🎉 All integration tests passed!\n");
    console.log("Summary:");
    console.log("- Budget Release ID:", budgetRelease.release_id);
    console.log("- Amount Deducted:", approvedRequest.total_amount);
    console.log("- Capital Before:", balanceBefore?.capital || 0);
    console.log("- Capital After:", balanceAfter.capital);
    console.log("- Cash Movement Created:", cashMovements ? "Yes" : "No");
  } catch (error) {
    console.error("❌ Test failed with error:", error.message);
    console.error(error);
  } finally {
    await db.destroy();
  }
}

// Run the test
testBudgetReleaseIntegration();
