const express = require("express");
const { db } = require("../config/database");
const router = express.Router();

// GET /api/analytics/overview - Get overview statistics
router.get("/overview", async (req, res) => {
  try {
    const { date_from, date_to, branch_id } = req.query;
    
    let dateFilter = "";
    let branchFilter = "";
    let params = [];

    if (date_from && date_to) {
      dateFilter = "AND DATE(created_at) BETWEEN ? AND ?";
      params.push(date_from, date_to);
    }

    if (branch_id) {
      branchFilter = "AND branch_id = ?";
      params.push(branch_id);
    }

    // Get customer statistics
    const customerStats = await db.raw(`
      SELECT 
        COUNT(*) as total_customers,
        COUNT(CASE WHEN last_visit >= NOW() - INTERVAL '30 days' THEN 1 END) as active_customers,
        AVG(average_rating) as overall_average_rating,
        SUM(total_spent) as total_revenue,
        AVG(total_spent) as average_customer_value
      FROM customers
      WHERE 1=1 ${dateFilter}
    `, params);

    // Get feedback statistics
    const feedbackStats = await db.raw(`
      SELECT 
        COUNT(*) as total_feedback,
        AVG(rating) as average_feedback_rating,
        COUNT(CASE WHEN rating >= 4 THEN 1 END) as positive_feedback,
        COUNT(CASE WHEN rating <= 2 THEN 1 END) as negative_feedback
      FROM feedback
      WHERE 1=1 ${dateFilter}
    `, params);

    // Get order rating statistics
    const ratingStats = await db.raw(`
      SELECT 
        COUNT(*) as total_ratings,
        AVG(overall_rating) as average_order_rating,
        COUNT(CASE WHEN overall_rating >= 4 THEN 1 END) as positive_ratings,
        COUNT(CASE WHEN overall_rating <= 2 THEN 1 END) as negative_ratings
      FROM order_ratings
      WHERE 1=1 ${dateFilter}
    `, params);

    // Get sales statistics
    const salesStats = await db.raw(`
      SELECT 
        COUNT(*) as total_orders,
        SUM(order_total) as total_sales,
        AVG(order_total) as average_order_value
      FROM order_ratings
      WHERE order_total IS NOT NULL ${dateFilter}
    `, params);

    res.json({
      success: true,
      data: {
        customers: customerStats[0][0],
        feedback: feedbackStats[0][0],
        ratings: ratingStats[0][0],
        sales: salesStats[0][0]
      }
    });
  } catch (error) {
    console.error("Error fetching overview analytics:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch overview analytics"
    });
  }
});

// GET /api/analytics/top-foods - Get top rated food items
router.get("/top-foods", async (req, res) => {
  try {
    const { limit = 10, date_from, date_to, branch_id } = req.query;
    
    let dateFilter = "";
    let branchFilter = "";
    let params = [limit];

    if (date_from && date_to) {
      dateFilter = "AND DATE(or.created_at) BETWEEN ? AND ?";
      params.push(date_from, date_to);
    }

    if (branch_id) {
      branchFilter = "AND or.branch_name = (SELECT name FROM branches WHERE id = ?)";
      params.push(branch_id);
    }

    const topFoods = await db.raw(`
      SELECT 
        JSON_EXTRACT(item_ratings, '$[*].itemName') as item_names,
        JSON_EXTRACT(item_ratings, '$[*].rating') as item_ratings,
        JSON_EXTRACT(item_ratings, '$[*].comment') as item_comments
      FROM order_ratings or
      WHERE item_ratings IS NOT NULL ${dateFilter} ${branchFilter}
      ORDER BY or.created_at DESC
      LIMIT ?
    `, params);

    // Process the data to aggregate ratings by item
    const itemRatings = {};
    
    topFoods[0].forEach(row => {
      if (row.item_names && row.item_ratings) {
        const names = JSON.parse(row.item_names);
        const ratings = JSON.parse(row.item_ratings);
        const comments = row.item_comments ? JSON.parse(row.item_comments) : [];
        
        names.forEach((name, index) => {
          if (name && ratings[index]) {
            if (!itemRatings[name]) {
              itemRatings[name] = {
                name: name,
                ratings: [],
                total_ratings: 0,
                average_rating: 0,
                comments: []
              };
            }
            itemRatings[name].ratings.push(ratings[index]);
            itemRatings[name].total_ratings++;
            if (comments[index]) {
              itemRatings[name].comments.push(comments[index]);
            }
          }
        });
      }
    });

    // Calculate averages and sort
    const processedFoods = Object.values(itemRatings).map(item => {
      const sum = item.ratings.reduce((a, b) => a + b, 0);
      item.average_rating = sum / item.total_ratings;
      return item;
    }).sort((a, b) => b.average_rating - a.average_rating).slice(0, limit);

    res.json({
      success: true,
      data: processedFoods
    });
  } catch (error) {
    console.error("Error fetching top foods:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch top foods"
    });
  }
});

// GET /api/analytics/branch-performance - Get branch performance analytics
router.get("/branch-performance", async (req, res) => {
  try {
    const { date_from, date_to } = req.query;
    
    let dateFilter = "";
    let params = [];

    if (date_from && date_to) {
      dateFilter = "AND DATE(created_at) BETWEEN ? AND ?";
      params.push(date_from, date_to);
    }

    // Get branch feedback statistics
    const branchFeedback = await db.raw(`
      SELECT 
        branch_name,
        COUNT(*) as total_feedback,
        AVG(rating) as average_rating,
        COUNT(CASE WHEN rating >= 4 THEN 1 END) as positive_feedback,
        COUNT(CASE WHEN rating <= 2 THEN 1 END) as negative_feedback
      FROM feedback
      WHERE branch_name IS NOT NULL ${dateFilter}
      GROUP BY branch_name
      ORDER BY average_rating DESC
    `, params);

    // Get branch sales statistics
    const branchSales = await db.raw(`
      SELECT 
        branch_name,
        COUNT(*) as total_orders,
        SUM(order_total) as total_sales,
        AVG(order_total) as average_order_value,
        AVG(overall_rating) as average_rating
      FROM order_ratings
      WHERE branch_name IS NOT NULL AND order_total IS NOT NULL ${dateFilter}
      GROUP BY branch_name
      ORDER BY total_sales DESC
    `, params);

    // Combine the data
    const branchPerformance = {};
    
    // Add feedback data
    branchFeedback[0].forEach(branch => {
      if (!branchPerformance[branch.branch_name]) {
        branchPerformance[branch.branch_name] = {
          branch_name: branch.branch_name,
          total_feedback: 0,
          average_feedback_rating: 0,
          positive_feedback: 0,
          negative_feedback: 0,
          total_orders: 0,
          total_sales: 0,
          average_order_value: 0,
          average_order_rating: 0
        };
      }
      Object.assign(branchPerformance[branch.branch_name], branch);
    });

    // Add sales data
    branchSales[0].forEach(branch => {
      if (!branchPerformance[branch.branch_name]) {
        branchPerformance[branch.branch_name] = {
          branch_name: branch.branch_name,
          total_feedback: 0,
          average_feedback_rating: 0,
          positive_feedback: 0,
          negative_feedback: 0,
          total_orders: 0,
          total_sales: 0,
          average_order_value: 0,
          average_order_rating: 0
        };
      }
      Object.assign(branchPerformance[branch.branch_name], branch);
    });

    const result = Object.values(branchPerformance);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error("Error fetching branch performance:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch branch performance"
    });
  }
});

// GET /api/analytics/trends - Get trends over time
router.get("/trends", async (req, res) => {
  try {
    const { period = 'month', date_from, date_to } = req.query;
    
    let dateFilter = "";
    let params = [];

    if (date_from && date_to) {
      dateFilter = "AND DATE(created_at) BETWEEN ? AND ?";
      params.push(date_from, date_to);
    }

    let groupBy = "";
    switch (period) {
      case 'day':
        groupBy = "DATE(created_at)";
        break;
      case 'week':
        groupBy = "YEARWEEK(created_at)";
        break;
      case 'month':
        groupBy = "DATE_FORMAT(created_at, '%Y-%m')";
        break;
      case 'year':
        groupBy = "YEAR(created_at)";
        break;
      default:
        groupBy = "DATE_FORMAT(created_at, '%Y-%m')";
    }

    // Get customer trends
    const customerTrends = await db.raw(`
      SELECT 
        ${groupBy} as period,
        COUNT(*) as new_customers,
        SUM(total_spent) as revenue
      FROM customers
      WHERE 1=1 ${dateFilter}
      GROUP BY ${groupBy}
      ORDER BY period
    `, params);

    // Get feedback trends
    const feedbackTrends = await db.raw(`
      SELECT 
        ${groupBy} as period,
        COUNT(*) as total_feedback,
        AVG(rating) as average_rating
      FROM feedback
      WHERE 1=1 ${dateFilter}
      GROUP BY ${groupBy}
      ORDER BY period
    `, params);

    // Get sales trends
    const salesTrends = await db.raw(`
      SELECT 
        ${groupBy} as period,
        COUNT(*) as total_orders,
        SUM(order_total) as total_sales,
        AVG(order_total) as average_order_value
      FROM order_ratings
      WHERE order_total IS NOT NULL ${dateFilter}
      GROUP BY ${groupBy}
      ORDER BY period
    `, params);

    res.json({
      success: true,
      data: {
        customers: customerTrends[0],
        feedback: feedbackTrends[0],
        sales: salesTrends[0]
      }
    });
  } catch (error) {
    console.error("Error fetching trends:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch trends"
    });
  }
});

// GET /api/analytics/rating-distribution - Get rating distribution
router.get("/rating-distribution", async (req, res) => {
  try {
    const { date_from, date_to, branch_id } = req.query;
    
    let dateFilter = "";
    let branchFilter = "";
    let params = [];

    if (date_from && date_to) {
      dateFilter = "AND DATE(created_at) BETWEEN ? AND ?";
      params.push(date_from, date_to);
    }

    if (branch_id) {
      branchFilter = "AND branch_name = (SELECT name FROM branches WHERE id = ?)";
      params.push(branch_id);
    }

    // Get feedback rating distribution
    const feedbackDistribution = await db.raw(`
      SELECT 
        rating,
        COUNT(*) as count
      FROM feedback
      WHERE rating IS NOT NULL ${dateFilter} ${branchFilter}
      GROUP BY rating
      ORDER BY rating
    `, params);

    // Get order rating distribution
    const orderRatingDistribution = await db.raw(`
      SELECT 
        overall_rating as rating,
        COUNT(*) as count
      FROM order_ratings
      WHERE overall_rating IS NOT NULL ${dateFilter} ${branchFilter}
      GROUP BY overall_rating
      ORDER BY overall_rating
    `, params);

    res.json({
      success: true,
      data: {
        feedback: feedbackDistribution[0],
        order_ratings: orderRatingDistribution[0]
      }
    });
  } catch (error) {
    console.error("Error fetching rating distribution:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch rating distribution"
    });
  }
});

module.exports = router;
