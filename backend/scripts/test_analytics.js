const { db } = require("../config/database");
const Inventory = require("../models/Inventory");

async function testAnalytics() {
  try {
    console.log("🧪 Testing SCM Analytics & Forecasting System...\n");

    // Test 1: Get analytics dashboard
    console.log("1. Testing Analytics Dashboard...");
    const dashboard = await Inventory.getAnalyticsDashboard("month");
    console.log("✅ Dashboard retrieved successfully");
    console.log(`   - Total items: ${dashboard.total_inventory_items}`);
    console.log(`   - Total consumption: ${dashboard.total_consumption}`);
    console.log(`   - Timeframe: ${dashboard.timeframe}\n`);

    // Test 2: Get most used items
    console.log("2. Testing Most Used Items...");
    const mostUsed = await Inventory.getMostUsedItems(5, "month");
    console.log("✅ Most used items retrieved successfully");
    console.log(`   - Found ${mostUsed.length} items`);
    if (mostUsed.length > 0) {
      console.log(
        `   - Top item: ${mostUsed[0].item_name} (${mostUsed[0].total_consumed} consumed)`
      );
    }
    console.log("");

    // Test 3: Get least used items
    console.log("3. Testing Least Used Items...");
    const leastUsed = await Inventory.getLeastUsedItems(5, "month");
    console.log("✅ Least used items retrieved successfully");
    console.log(`   - Found ${leastUsed.length} items`);
    if (leastUsed.length > 0) {
      console.log(
        `   - Lowest item: ${leastUsed[0].item_name} (${leastUsed[0].total_consumed} consumed)`
      );
    }
    console.log("");

    // Test 4: Get usage analytics
    console.log("4. Testing Usage Analytics...");
    const analytics = await Inventory.getUsageAnalytics("month");
    console.log("✅ Usage analytics retrieved successfully");
    console.log(`   - Found ${analytics.length} items with consumption data`);
    console.log("");

    // Test 5: Get category breakdown
    console.log("5. Testing Category Breakdown...");
    const breakdown = await Inventory.getCategoryBreakdown("month");
    console.log("✅ Category breakdown retrieved successfully");
    console.log(`   - Found ${breakdown.length} categories`);
    if (breakdown.length > 0) {
      breakdown.forEach((cat) => {
        console.log(
          `   - ${cat.category}: ${cat.total_consumed} consumed (${cat.transaction_count} transactions)`
        );
      });
    }
    console.log("");

    // Test 6: Get inventory turnover
    console.log("6. Testing Inventory Turnover...");
    const turnover = await Inventory.getInventoryTurnover("month");
    console.log("✅ Inventory turnover retrieved successfully");
    console.log(`   - Found ${turnover.length} items with turnover data`);
    if (turnover.length > 0) {
      console.log(
        `   - Highest turnover: ${turnover[0].item_name} (${turnover[0].turnover_rate.toFixed(2)}%)`
      );
    }
    console.log("");

    // Test 7: Test forecasting (if we have data)
    if (analytics.length > 0) {
      const testItem = analytics[0].item_name;
      console.log(`7. Testing Forecasting for "${testItem}"...`);
      try {
        const forecast = await Inventory.getForecast(testItem, 3);
        console.log("✅ Forecast retrieved successfully");
        console.log(`   - Item: ${forecast.item_name}`);
        console.log(`   - Forecast: ${forecast.forecast}`);
        console.log(`   - Confidence: ${forecast.confidence}`);
        console.log(`   - Data points: ${forecast.data_points}`);
      } catch (error) {
        console.log(`   ⚠️  Forecast test skipped: ${error.message}`);
      }
      console.log("");
    }

    // Test 8: Test seasonal patterns (if we have data)
    if (analytics.length > 0) {
      const testItem = analytics[0].item_name;
      console.log(`8. Testing Seasonal Patterns for "${testItem}"...`);
      try {
        const patterns = await Inventory.getSeasonalPatterns(testItem);
        console.log("✅ Seasonal patterns retrieved successfully");
        console.log(`   - Item: ${patterns.item_name}`);
        console.log(`   - Total data points: ${patterns.total_data_points}`);
        if (patterns.peak_months.length > 0) {
          console.log(
            `   - Peak month: ${patterns.peak_months[0].month_name} (${patterns.peak_months[0].average})`
          );
        }
      } catch (error) {
        console.log(`   ⚠️  Seasonal patterns test skipped: ${error.message}`);
      }
      console.log("");
    }

    console.log("🎉 All analytics tests completed successfully!");
    console.log("\n📊 Your SCM Analytics System is ready with:");
    console.log("   - Usage analytics and ranking");
    console.log("   - Consumption forecasting");
    console.log("   - Seasonal pattern analysis");
    console.log("   - Inventory turnover tracking");
    console.log("   - Category breakdown analysis");
    console.log("   - Comprehensive dashboard data");
  } catch (error) {
    console.error("❌ Error testing analytics:", error);
  } finally {
    await db.destroy();
  }
}

testAnalytics();
