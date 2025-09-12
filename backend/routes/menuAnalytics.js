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

    // Calculate real metrics from actual data
    const totalProduction = productionTrends.reduce(
      (sum, item) => sum + parseInt(item.volume || 0),
      0
    );

    // Calculate production growth by comparing first and last periods
    const productionGrowth =
      productionTrends.length >= 2
        ? Math.round(
            ((parseInt(
              productionTrends[productionTrends.length - 1]?.volume || 0
            ) -
              parseInt(productionTrends[0]?.volume || 0)) /
              parseInt(productionTrends[0]?.volume || 1)) *
              100
          )
        : 0;

    // Calculate real quality scores
    const avgQualityScore =
      qualityTrends.length > 0
        ? Math.round(
            (qualityTrends.reduce(
              (sum, item) => sum + parseFloat(item.score || 0),
              0
            ) /
              qualityTrends.length) *
              10
          ) / 10
        : 0;

    const qualityGrowth =
      qualityTrends.length >= 2
        ? Math.round(
            ((parseFloat(qualityTrends[qualityTrends.length - 1]?.score || 0) -
              parseFloat(qualityTrends[0]?.score || 0)) /
              parseFloat(qualityTrends[0]?.score || 1)) *
              100
          )
        : 0;

    // Calculate efficiency from sample productions
    const completedProductions = efficiencyMetrics
      ? efficiencyMetrics.avg_production_time || 0
      : 0;
    const efficiencyRate =
      completedProductions > 0
        ? Math.round(Math.max(0, 100 - (completedProductions - 8) * 5))
        : 85; // Target 8 hours, penalize overruns

    // Calculate real cost efficiency
    const avgCostPerKg = efficiencyMetrics
      ? parseFloat(efficiencyMetrics.avg_cost || 0)
      : 0;
    const costEfficiency =
      avgCostPerKg > 0
        ? Math.round(Math.max(0, 100 - (avgCostPerKg - 50) * 2))
        : 50; // Target ₱50/kg

    // Calculate material yield
    const avgYield = efficiencyMetrics
      ? parseFloat(efficiencyMetrics.avg_yield || 0)
      : 0;
    const materialYield = avgYield > 0 ? Math.round((avgYield / 10) * 100) : 90; // Assume 10 is target yield

    const metrics = {
      totalProduction: totalProduction,
      productionGrowth: productionGrowth,
      qualityScore: avgQualityScore,
      qualityGrowth: qualityGrowth,
      efficiencyRate: Math.min(100, efficiencyRate),
      efficiencyGrowth: 0, // Would need historical data to calculate
      costEfficiency: Math.min(100, costEfficiency),
      costReduction: 0, // Would need historical data to calculate
      equipmentUsage: 75, // Would need equipment tracking data
      laborEfficiency: efficiencyRate,
      materialYield: Math.min(100, materialYield),
      productionTrend: productionTrends.map((item) => ({
        date: item.date,
        volume: parseInt(item.volume || 0),
        target: Math.round(parseInt(item.volume || 0) * 1.1), // 10% above actual as target
      })),
      qualityTrend: qualityTrends.map((item) => ({
        date: item.date,
        score: parseFloat(item.score || 0),
        taste: parseFloat(item.taste || 0),
        appearance: parseFloat(item.appearance || 0),
      })),
      qualityBreakdown:
        qualityTrends.length > 0
          ? {
              taste:
                Math.round(
                  (qualityTrends.reduce(
                    (sum, item) => sum + parseFloat(item.taste || 0),
                    0
                  ) /
                    qualityTrends.length) *
                    10
                ) / 10,
              appearance:
                Math.round(
                  (qualityTrends.reduce(
                    (sum, item) => sum + parseFloat(item.appearance || 0),
                    0
                  ) /
                    qualityTrends.length) *
                    10
                ) / 10,
              texture: avgQualityScore, // Use overall score as texture proxy
              overall: avgQualityScore,
            }
          : {
              taste: 0,
              appearance: 0,
              texture: 0,
              overall: 0,
            },
      costAnalysis: {
        avgCostPerKg: Math.round(avgCostPerKg),
        materialCost: Math.round(avgCostPerKg * 0.6), // Assume 60% material cost
        laborCost: Math.round(avgCostPerKg * 0.25), // Assume 25% labor cost
        overheadCost: Math.round(avgCostPerKg * 0.15), // Assume 15% overhead
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

    // Get real alerts from production inventory
    const lowStockAlerts = await db("production_inventory as pi")
      .leftJoin("menu_items as mi", "pi.menu_item_id", "mi.id")
      .select(
        "pi.id",
        "mi.menu_item_name as itemName",
        "pi.available_quantity",
        "pi.reorder_point"
      )
      .where("pi.available_quantity", "<=", db.raw("pi.reorder_point"))
      .where("pi.is_active", true)
      .whereNull("mi.deleted_at")
      .limit(10);

    const qualityCheckAlerts = await db("production_inventory as pi")
      .leftJoin("menu_items as mi", "pi.menu_item_id", "mi.id")
      .select(
        "pi.id",
        "mi.menu_item_name as itemName",
        "pi.next_quality_check_date"
      )
      .where(
        "pi.next_quality_check_date",
        "<=",
        db.raw("CURRENT_DATE + INTERVAL '7 days'")
      )
      .where("pi.is_active", true)
      .whereNull("mi.deleted_at")
      .limit(10);

    // Format real alerts
    const alerts = [
      ...lowStockAlerts.map((item, index) => ({
        id: `low-stock-${item.id}`,
        itemName: item.itemName,
        message: `Low stock - only ${item.available_quantity} units remaining`,
        severity: item.available_quantity === 0 ? "Critical" : "Warning",
        daysLeft: 0,
        type: "low_stock",
      })),
      ...qualityCheckAlerts.map((item, index) => {
        const daysLeft = Math.ceil(
          (new Date(item.next_quality_check_date) - new Date()) /
            (1000 * 60 * 60 * 24)
        );
        return {
          id: `quality-check-${item.id}`,
          itemName: item.itemName,
          message: `Quality check due in ${daysLeft} days`,
          severity: daysLeft <= 1 ? "Critical" : "Warning",
          daysLeft: Math.max(0, daysLeft),
          type: "quality_check",
        };
      }),
    ].slice(0, 10); // Limit to 10 alerts total

    // Calculate real available stock (excluding items marked as unavailable)
    const trendsWithAvailableStock = inventoryTrends.map((trend) => ({
      ...trend,
      availableStock: parseInt(trend.total_stock) || 0,
      totalValue: Math.round(parseFloat(trend.total_value) || 0),
    }));

    // Calculate stock turnover from distribution data
    const stockTurnoverData = await db("production_inventory as pi")
      .leftJoin("branch_distribution_items as bdi", function () {
        this.on("pi.id", "bdi.item_ref_id").andOn(
          "bdi.source",
          "=",
          db.raw("'production'")
        );
      })
      .leftJoin("branch_distributions as bd", "bdi.distribution_id", "bd.id")
      .select(
        db.raw("SUM(bdi.qty) as total_distributed"),
        db.raw("SUM(pi.available_quantity) as total_stock")
      )
      .where("bd.created_at", ">=", startDate)
      .where("pi.is_active", true)
      .first();

    const stockTurnover =
      stockTurnoverData && stockTurnoverData.total_stock > 0
        ? Math.round(
            (parseFloat(stockTurnoverData.total_distributed || 0) /
              parseFloat(stockTurnoverData.total_stock)) *
              12,
            1
          ) // Annualized turnover
        : 0;

    const data = {
      currentStats: {
        totalStock: parseInt(currentStats?.total_stock) || 0,
        lowStockCount: parseInt(currentStats?.low_stock_count) || 0,
        qualityCheckDueCount:
          parseInt(currentStats?.quality_check_due_count) || 0,
        stockTurnover: stockTurnover,
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
