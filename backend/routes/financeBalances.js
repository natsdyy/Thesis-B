const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/rbac");
const FinanceBalance = require("../models/FinanceBalance");

// GET /api/finance-balances - get latest company balance
router.get("/", authenticateToken, async (req, res) => {
  try {
    const balances = await FinanceBalance.getBalancesForBranches();

    res.json({
      success: true,
      data: balances,
    });
  } catch (error) {
    console.error("Error fetching finance balances:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch finance balances",
      error: error.message,
    });
  }
});

// GET /api/finance-balances/totals - get total balances across all branches
router.get("/totals", authenticateToken, async (req, res) => {
  try {
    const totals = await FinanceBalance.getTotalBalances();

    res.json({
      success: true,
      data: totals,
    });
  } catch (error) {
    console.error("Error fetching finance balance totals:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch finance balance totals",
      error: error.message,
    });
  }
});

// POST /api/finance-balances - create or update company balance
router.post("/", authenticateToken, async (req, res) => {
  try {
    const { capital, profit, sales_remittances, balance_date } = req.body;

    const data = await FinanceBalance.createOrUpdate({
      capital: parseFloat(capital || 0),
      profit: parseFloat(profit || 0),
      sales_remittances: parseFloat(sales_remittances || 0),
      balance_date: balance_date || null,
    });

    res.status(201).json({
      success: true,
      data,
      message: "Finance balance updated successfully",
    });
  } catch (error) {
    console.error("Error updating finance balance:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update finance balance",
      error: error.message,
    });
  }
});

// POST /api/finance-balances/capital - add capital amount for the company
router.post("/capital", authenticateToken, async (req, res) => {
  try {
    const { amount, balance_date } = req.body;

    if (amount === undefined || amount === null) {
      return res.status(400).json({
        success: false,
        message: "amount is required",
      });
    }

    const updated = await FinanceBalance.addCapital({
      amount: parseFloat(amount),
      balance_date: balance_date || null,
    });

    res.status(201).json({
      success: true,
      data: updated,
      message: "Capital added successfully",
    });
  } catch (error) {
    console.error("Error adding capital:", error);
    res.status(500).json({
      success: false,
      message: "Failed to add capital",
      error: error.message,
    });
  }
});

// POST /api/finance-balances/capital/set - set capital to an absolute amount
router.post("/capital/set", authenticateToken, async (req, res) => {
  try {
    const { amount, balance_date } = req.body;

    if (amount === undefined || amount === null) {
      return res.status(400).json({
        success: false,
        message: "amount is required",
      });
    }

    const updated = await FinanceBalance.setCapital({
      amount: parseFloat(amount),
      balance_date: balance_date || null,
    });

    res.status(201).json({
      success: true,
      data: updated,
      message: "Capital set successfully",
    });
  } catch (error) {
    console.error("Error setting capital:", error);
    res.status(500).json({
      success: false,
      message: "Failed to set capital",
      error: error.message,
    });
  }
});

module.exports = router;
