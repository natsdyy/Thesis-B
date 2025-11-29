const express = require("express");
const router = express.Router();
const ExecutiveController = require("../controllers/executiveController");
const { authenticateToken } = require("../middleware/rbac");

/**
 * GET /api/executive/kpis
 * Get all KPI metrics for executive dashboard
 * Query params: period (today|week|month|customMonth), customMonth (YYYY-MM)
 */
router.get("/kpis", authenticateToken, async (req, res) => {
  try {
    const { period = "month", customMonth = null } = req.query;

    const kpis = await ExecutiveController.getKPIs(period, customMonth);

    res.json({
      success: true,
      data: kpis,
    });
  } catch (error) {
    console.error("Error fetching KPIs:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch executive KPIs",
      error: error.message,
    });
  }
});

/**
 * GET /api/executive/top-branches
 * Get top performing branches
 * Query params: period (today|week|month|customMonth), customMonth (YYYY-MM)
 */
router.get("/top-branches", authenticateToken, async (req, res) => {
  try {
    const { period = "month", customMonth = null } = req.query;

    const topBranches = await ExecutiveController.getTopBranches(
      period,
      customMonth
    );

    res.json({
      success: true,
      data: topBranches,
    });
  } catch (error) {
    console.error("Error fetching top branches:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch top branches",
      error: error.message,
    });
  }
});

/**
 * GET /api/executive/alerts
 * Get system alerts (low stock, pending approvals, etc.)
 */
router.get("/alerts", authenticateToken, async (req, res) => {
  try {
    const alerts = await ExecutiveController.getAlerts();

    res.json({
      success: true,
      data: alerts,
    });
  } catch (error) {
    console.error("Error fetching alerts:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch alerts",
      error: error.message,
    });
  }
});

/**
 * GET /api/executive/debug-sales
 * Debug endpoint to check what sales data exists
 * Query params: period (today|week|month|customMonth), customMonth (YYYY-MM)
 */
router.get("/debug-sales", authenticateToken, async (req, res) => {
  try {
    const { period = "month", customMonth = null } = req.query;

    const dateRange = ExecutiveController.getDateRange(period, customMonth);
    const previousDateRange = ExecutiveController.getPreviousDateRange(
      period,
      customMonth
    );

    const debugData = await ExecutiveController.debugSalesData(
      dateRange,
      previousDateRange
    );

    res.json({
      success: true,
      data: debugData,
    });
  } catch (error) {
    console.error("Error debugging sales data:", error);
    res.status(500).json({
      success: false,
      message: "Failed to debug sales data",
      error: error.message,
    });
  }
});

module.exports = router;
