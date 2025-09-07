const express = require("express");
const router = express.Router();
const { db } = require("../config/database");
const { authenticateToken } = require("../middleware/rbac");

/**
 * @swagger
 * /api/menu/analytics/menu-item-approvals:
 *   get:
 *     summary: Get menu item approval analytics
 *     tags: [Analytics]
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 30
 */
router.get("/menu-item-approvals", authenticateToken, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    // Get approval data grouped by date
    const approvalData = await db("menu_items as mi")
      .select(
        db.raw("DATE(mi.created_at) as date"),
        db.raw("COUNT(*) as total_items"),
        db.raw(
          "COUNT(CASE WHEN mi.is_available = true THEN 1 END) as approved_items"
        ),
        db.raw(
          "ROUND(AVG(EXTRACT(EPOCH FROM (mi.updated_at - mi.created_at))/86400), 1) as avg_processing_days"
        )
      )
      .where("mi.created_at", ">=", startDate)
      .groupBy(db.raw("DATE(mi.created_at)"))
      .orderBy("date");

    // Calculate approval rates
    const formattedData = approvalData.map((item) => ({
      date: item.date,
      total_items: parseInt(item.total_items),
      approved_items: parseInt(item.approved_items),
      approval_rate:
        item.total_items > 0
          ? Math.round((item.approved_items / item.total_items) * 100)
          : 0,
      avg_processing_days: parseFloat(item.avg_processing_days) || 0,
    }));

    // Get category breakdown
    const categoryBreakdown = await db("menu_items as mi")
      .select(
        "mi.category",
        db.raw("COUNT(*) as total"),
        db.raw(
          "COUNT(CASE WHEN mi.is_available = true THEN 1 END) as approved"
        ),
        db.raw(
          "ROUND(COUNT(CASE WHEN mi.is_available = true THEN 1 END) * 100.0 / COUNT(*), 1) as rate"
        )
      )
      .where("mi.created_at", ">=", startDate)
      .whereNull("mi.deleted_at")
      .groupBy("mi.category")
      .having(db.raw("COUNT(*) > 0"));

    res.json({
      success: true,
      data: {
        trends: formattedData,
        categoryBreakdown: categoryBreakdown,
        overallStats: {
          totalItems: formattedData.reduce(
            (sum, item) => sum + item.total_items,
            0
          ),
          totalApproved: formattedData.reduce(
            (sum, item) => sum + item.approved_items,
            0
          ),
          averageApprovalRate:
            formattedData.length > 0
              ? Math.round(
                  formattedData.reduce(
                    (sum, item) => sum + item.approval_rate,
                    0
                  ) / formattedData.length
                )
              : 0,
          averageProcessingTime:
            formattedData.length > 0
              ? Math.round(
                  formattedData.reduce(
                    (sum, item) => sum + item.avg_processing_days,
                    0
                  ) / formattedData.length
                )
              : 0,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching menu item approval analytics:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch approval analytics",
    });
  }
});

/**
 * @swagger
 * /api/menu/analytics/sample-production-trends:
 *   get:
 *     summary: Get sample production trends analytics
 *     tags: [Analytics]
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 30
 */
router.get("/sample-production-trends", authenticateToken, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    // Get sample production trends
    const trendsData = await db("sample_productions as sp")
      .select(
        db.raw("DATE(sp.created_at) as date"),
        db.raw("COUNT(*) as total_samples"),
        db.raw(
          "COUNT(CASE WHEN sp.status = 'Completed' THEN 1 END) as successful_samples"
        ),
        db.raw("ROUND(AVG(sp.quantity_produced), 1) as average_yield"),
        db.raw(
          "ROUND(AVG(EXTRACT(EPOCH FROM (sp.actual_end_date - sp.actual_start_date))/3600), 1) as avg_production_time"
        ),
        db.raw("COUNT(CASE WHEN sp.status = 'Planned' THEN 1 END) as planned"),
        db.raw(
          "COUNT(CASE WHEN sp.status = 'In Progress' THEN 1 END) as in_progress"
        ),
        db.raw(
          "COUNT(CASE WHEN sp.status = 'Completed' THEN 1 END) as completed"
        ),
        db.raw("COUNT(CASE WHEN sp.status = 'Failed' THEN 1 END) as failed")
      )
      .where("sp.created_at", ">=", startDate)
      .groupBy(db.raw("DATE(sp.created_at)"))
      .orderBy("date");

    // Get top performing menu items
    const topPerformingItems = await db("sample_productions as sp")
      .leftJoin("menu_items as mi", "sp.menu_item_id", "mi.id")
      .select(
        "mi.menu_item_name",
        db.raw("COUNT(*) as total_samples"),
        db.raw(
          "COUNT(CASE WHEN sp.status = 'Completed' THEN 1 END) as successful_samples"
        ),
        db.raw(
          "ROUND(COUNT(CASE WHEN sp.status = 'Completed' THEN 1 END) * 100.0 / COUNT(*), 1) as success_rate"
        )
      )
      .where("sp.created_at", ">=", startDate)
      .groupBy("mi.id", "mi.menu_item_name")
      .having(db.raw("COUNT(*) >= 3"))
      .orderBy("success_rate", "desc")
      .limit(10);

    res.json({
      success: true,
      data: {
        trends: trendsData,
        topPerformingItems: topPerformingItems,
        summaryStats: {
          totalSamples: trendsData.reduce(
            (sum, item) => sum + parseInt(item.total_samples),
            0
          ),
          successRate:
            trendsData.length > 0
              ? Math.round(
                  (trendsData.reduce(
                    (sum, item) => sum + parseInt(item.successful_samples),
                    0
                  ) /
                    trendsData.reduce(
                      (sum, item) => sum + parseInt(item.total_samples),
                      0
                    )) *
                    100
                )
              : 0,
          averageYield:
            trendsData.length > 0
              ? Math.round(
                  trendsData.reduce(
                    (sum, item) => sum + parseFloat(item.average_yield || 0),
                    0
                  ) / trendsData.length
                )
              : 0,
          averageProductionTime:
            trendsData.length > 0
              ? Math.round(
                  trendsData.reduce(
                    (sum, item) =>
                      sum + parseFloat(item.avg_production_time || 0),
                    0
                  ) / trendsData.length
                )
              : 0,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching sample production trends:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch production trends",
    });
  }
});

/**
 * @swagger
 * /api/menu/analytics/production-metrics:
 *   get:
 *     summary: Get production metrics analytics
 *     tags: [Analytics]
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 30
 */
router.get("/production-metrics", authenticateToken, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    // Get production volume trends
    const productionTrends = await db("production_inventory as pi")
      .select(
        db.raw("DATE(pi.created_at) as date"),
        db.raw("SUM(pi.available_quantity) as volume"),
        db.raw("AVG(pi.selling_price) as avg_price")
      )
      .where("pi.created_at", ">=", startDate)
      .groupBy(db.raw("DATE(pi.created_at)"))
      .orderBy("date");

    // Get quality metrics from inspections
    const qualityTrends = await db("menu_quality_inspections as mqi")
      .select(
        db.raw("DATE(mqi.created_at) as date"),
        db.raw("ROUND(AVG(mqi.overall_quality_score), 1) as score"),
        db.raw("ROUND(AVG(mqi.taste_score), 1) as taste"),
        db.raw("ROUND(AVG(mqi.appearance_score), 1) as appearance")
      )
      .where("mqi.created_at", ">=", startDate)
      .groupBy(db.raw("DATE(mqi.created_at)"))
      .orderBy("date");

    // Calculate efficiency metrics
    const efficiencyMetrics = await db("sample_productions as sp")
      .select(
        db.raw(
          "ROUND(AVG(EXTRACT(EPOCH FROM (sp.actual_end_date - sp.actual_start_date))/3600), 1) as avg_production_time"
        ),
        db.raw("ROUND(AVG(sp.production_cost), 2) as avg_cost"),
        db.raw("ROUND(AVG(sp.quantity_produced), 1) as avg_yield")
      )
      .where("sp.created_at", ">=", startDate)
      .whereNotNull("sp.actual_end_date")
      .first();

    // Mock additional metrics (in real implementation, these would come from actual data)
    const metrics = {
      totalProduction: productionTrends.reduce(
        (sum, item) => sum + parseInt(item.volume),
        0
      ),
      productionGrowth: 12, // Mock growth percentage
      qualityScore:
        qualityTrends.length > 0
          ? qualityTrends.reduce(
              (sum, item) => sum + parseFloat(item.score),
              0
            ) / qualityTrends.length
          : 4.2,
      qualityGrowth: 8,
      efficiencyRate: 87,
      efficiencyGrowth: 5,
      costEfficiency: 45,
      costReduction: 7,
      equipmentUsage: 78,
      laborEfficiency: 85,
      materialYield: 92,
      productionTrend: productionTrends.map((item) => ({
        date: item.date,
        volume: parseInt(item.volume),
        target: Math.round(parseInt(item.volume) * 1.1), // Mock target
      })),
      qualityTrend: qualityTrends.map((item) => ({
        date: item.date,
        score: parseFloat(item.score),
        taste: parseFloat(item.taste),
        appearance: parseFloat(item.appearance),
      })),
      qualityBreakdown: {
        taste: 4.3,
        appearance: 4.1,
        texture: 4.0,
        overall: 4.2,
      },
      costAnalysis: {
        avgCostPerKg: 85,
        materialCost: 45,
        laborCost: 25,
        overheadCost: 15,
      },
    };

    res.json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    console.error("Error fetching production metrics:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch production metrics",
    });
  }
});

/**
 * @swagger
 * /api/menu/analytics/inventory-trends:
 *   get:
 *     summary: Get inventory trends analytics
 *     tags: [Analytics]
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 30
 */
router.get("/inventory-trends", authenticateToken, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    // Get inventory trends from production inventory
    const inventoryTrends = await db("production_inventory as pi")
      .select(
        db.raw("DATE(pi.created_at) as date"),
        db.raw("SUM(pi.available_quantity) as total_stock"),
        db.raw("SUM(pi.available_quantity * pi.unit_cost) as total_value"),
        db.raw(
          "COUNT(CASE WHEN pi.available_quantity <= pi.reorder_point THEN 1 END) as low_stock_count"
        )
      )
      .where("pi.created_at", ">=", startDate)
      .where("pi.is_active", true)
      .groupBy(db.raw("DATE(pi.created_at)"))
      .orderBy("date");

    // Get current inventory stats
    const currentStats = await db("production_inventory as pi")
      .select(
        db.raw("SUM(pi.available_quantity) as total_stock"),
        db.raw(
          "COUNT(CASE WHEN pi.available_quantity <= pi.reorder_point THEN 1 END) as low_stock_count"
        ),
        db.raw(
          "COUNT(CASE WHEN pi.next_quality_check_date <= CURRENT_DATE + INTERVAL '30 days' THEN 1 END) as quality_check_due_count"
        ),
        db.raw(
          "ROUND(AVG(pi.available_quantity * pi.unit_cost), 2) as avg_value_per_item"
        )
      )
      .first();

    // Get category analysis by menu item categories
    const categoryAnalysis = await db("production_inventory as pi")
      .leftJoin("menu_items as mi", "pi.menu_item_id", "mi.id")
      .select(
        "mi.category as name",
        db.raw("COUNT(*) as items"),
        db.raw("SUM(pi.available_quantity) as quantity"),
        db.raw("SUM(pi.available_quantity * pi.unit_cost) as value")
      )
      .where("pi.is_active", true)
      .whereNull("mi.deleted_at")
      .groupBy("mi.category")
      .orderBy("value", "desc");

    // Calculate percentages for category analysis
    const totalValue = categoryAnalysis.reduce(
      (sum, cat) => sum + parseFloat(cat.value),
      0
    );
    const categoryAnalysisWithPercentages = categoryAnalysis.map((cat) => ({
      ...cat,
      percentage:
        totalValue > 0
          ? Math.round((parseFloat(cat.value) / totalValue) * 100)
          : 0,
      value: `₱${parseFloat(cat.value).toLocaleString()}`,
    }));

    // Mock alerts (in real implementation, these would come from actual alert system)
    const alerts = [
      {
        id: 1,
        itemName: "Premium Rice",
        message: "Low stock - only 5kg remaining",
        severity: "Critical",
        daysLeft: 0,
      },
      {
        id: 2,
        itemName: "Longsilog",
        message: "Quality check due in 3 days",
        severity: "Warning",
        daysLeft: 3,
      },
      {
        id: 3,
        itemName: "Cooking Oil",
        message: "Below reorder point",
        severity: "Warning",
        daysLeft: 0,
      },
    ];

    // Mock available stock calculation
    const trendsWithAvailableStock = inventoryTrends.map((trend) => ({
      ...trend,
      availableStock: Math.round(parseInt(trend.total_stock) * 0.9), // Mock 90% available
      totalValue: Math.round(parseFloat(trend.total_value)),
    }));

    const data = {
      currentStats: {
        totalStock: parseInt(currentStats?.total_stock) || 1250,
        lowStockCount: parseInt(currentStats?.low_stock_count) || 15,
        qualityCheckDueCount:
          parseInt(currentStats?.quality_check_due_count) || 0,
        stockTurnover: 2.3, // Mock turnover rate
      },
      trends: trendsWithAvailableStock,
      categoryAnalysis: categoryAnalysisWithPercentages,
      alerts: alerts,
    };

    res.json({
      success: true,
      data: data,
    });
  } catch (error) {
    console.error("Error fetching inventory trends:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch inventory trends",
    });
  }
});

module.exports = router;
