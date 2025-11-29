const { db } = require("../config/database");
const BranchRemittance = require("../models/BranchRemittance");
const PayrollPeriod = require("../models/PayrollPeriod");
const Branch = require("../models/Branch");
const { getCurrentPhilippineTime } = require("../utils/timezoneUtils");

class ExecutiveController {
  /**
   * Get all KPI metrics for executive dashboard
   * @param {string} period - 'today' | 'week' | 'month' | 'customMonth'
   * @param {string} customMonth - YYYY-MM format for custom month
   * @returns {Promise<Object>}
   */
  static async getKPIs(period = "month", customMonth = null) {
    try {
      const dateRange = this.getDateRange(period, customMonth);
      const previousDateRange = this.getPreviousDateRange(period, customMonth);

      // Get today's sales
      const todaySales = await this.getTodaySales();

      // Get MTD sales
      const mtdSales = await this.getMTDSales(dateRange);

      // Get gross margin percentage
      const grossMarginPct = await this.getGrossMarginPct(dateRange);

      // Get active branches count
      const activeBranches = await this.getActiveBranches();

      // Get sales trend delta
      const salesTrendDeltaPct = await this.getSalesTrendDelta(
        dateRange,
        previousDateRange
      );

      // Get payroll MTD
      const payrollMtd = await this.getPayrollMTD(dateRange);

      // Get pending payroll approvals
      const pendingPayrollApprovals = await this.getPendingPayrollApprovals();

      return {
        todaySales,
        mtdSales,
        grossMarginPct,
        activeBranches,
        salesTrendDeltaPct,
        payrollMtd,
        pendingPayrollApprovals,
      };
    } catch (error) {
      console.error("Error getting KPIs:", error);
      throw new Error("Failed to retrieve executive KPIs");
    }
  }

  /**
   * Get today's sales from approved remittances
   * @returns {Promise<number>}
   */
  static async getTodaySales() {
    const now = getCurrentPhilippineTime();
    const startOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      0,
      0,
      0,
      0
    );
    const endOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      23,
      59,
      59,
      999
    );

    const result = await db("branch_remittances")
      .where("status", "approved")
      .whereBetween("approved_at", [startOfDay, endOfDay])
      .sum("remitted_amount as total")
      .first();

    return Number(result?.total || 0);
  }

  /**
   * Get month-to-date sales
   * @param {Object} dateRange - { start, end }
   * @returns {Promise<number>}
   */
  static async getMTDSales(dateRange) {
    const result = await db("branch_remittances")
      .where("status", "approved")
      .whereBetween("approved_at", [dateRange.start, dateRange.end])
      .sum("remitted_amount as total")
      .first();

    return Number(result?.total || 0);
  }

  /**
   * Get gross margin percentage
   * @param {Object} dateRange - { start, end }
   * @returns {Promise<number>}
   */
  static async getGrossMarginPct(dateRange) {
    const result = await db("branch_remittances")
      .where("status", "approved")
      .whereBetween("approved_at", [dateRange.start, dateRange.end])
      .select(
        db.raw("SUM(gross_sales) as total_gross"),
        db.raw("SUM(net_sales) as total_net")
      )
      .first();

    const totalGross = Number(result?.total_gross || 0);
    const totalNet = Number(result?.total_net || 0);

    if (totalGross === 0) return 0;

    return (totalNet / totalGross) * 100;
  }

  /**
   * Get count of active branches
   * @returns {Promise<number>}
   */
  static async getActiveBranches() {
    const result = await db("branches")
      .whereNull("deleted_at")
      .count("id as count")
      .first();

    return Number(result?.count || 0);
  }

  /**
   * Get sales trend delta percentage
   * @param {Object} currentRange - { start, end }
   * @param {Object} previousRange - { start, end }
   * @returns {Promise<number>}
   */
  static async getSalesTrendDelta(currentRange, previousRange) {
    // Get current period sales
    const currentResult = await db("branch_remittances")
      .where("status", "approved")
      .whereBetween("approved_at", [currentRange.start, currentRange.end])
      .sum("remitted_amount as total")
      .first();

    // Get previous period sales
    const previousResult = await db("branch_remittances")
      .where("status", "approved")
      .whereBetween("approved_at", [previousRange.start, previousRange.end])
      .sum("remitted_amount as total")
      .first();

    const currentSales = Number(currentResult?.total || 0);
    const previousSales = Number(previousResult?.total || 0);

    // If no previous data, return 0 (no comparison possible)
    if (previousSales === 0) {
      console.log("No previous period data for sales trend comparison");
      return 0;
    }

    // If no current data but previous data exists, return negative 100%
    if (currentSales === 0 && previousSales > 0) {
      console.log("No current period data but previous data exists");
      return -100;
    }

    const delta = ((currentSales - previousSales) / previousSales) * 100;
    console.log(
      `Sales trend: Current=${currentSales}, Previous=${previousSales}, Delta=${delta.toFixed(2)}%`
    );

    return delta;
  }

  /**
   * Get month-to-date payroll
   * @param {Object} dateRange - { start, end }
   * @returns {Promise<number>}
   */
  static async getPayrollMTD(dateRange) {
    const result = await db("payroll_periods")
      .where("status", "paid")
      .whereBetween("date_to", [dateRange.start, dateRange.end])
      .sum("total_net_amount as total")
      .first();

    return Number(result?.total || 0);
  }

  /**
   * Get count of pending payroll approvals
   * @returns {Promise<number>}
   */
  static async getPendingPayrollApprovals() {
    const result = await db("payroll_periods")
      .where("status", "pending")
      .count("id as count")
      .first();

    return Number(result?.count || 0);
  }

  /**
   * Get top performing branches
   * @param {string} period - 'today' | 'week' | 'month' | 'customMonth'
   * @param {string} customMonth - YYYY-MM format
   * @returns {Promise<Array>}
   */
  static async getTopBranches(period = "month", customMonth = null) {
    try {
      const dateRange = this.getDateRange(period, customMonth);
      const previousDateRange = this.getPreviousDateRange(period, customMonth);

      // Get sales by branch from remittances
      const salesByBranch = await db("branch_remittances as br")
        .join("branches as b", "br.branch_id", "b.id")
        .where("br.status", "approved")
        .whereBetween("br.approved_at", [dateRange.start, dateRange.end])
        .select("b.id as branch_id", "b.name as branch_name")
        .sum("br.remitted_amount as sales")
        .groupBy("b.id", "b.name")
        .orderBy("sales", "desc")
        .limit(5);

      // Get previous period sales for growth calculation
      const previousSalesByBranch = await db("branch_remittances as br")
        .where("br.status", "approved")
        .whereBetween("br.approved_at", [
          previousDateRange.start,
          previousDateRange.end,
        ])
        .select("br.branch_id")
        .sum("br.remitted_amount as sales")
        .groupBy("br.branch_id");

      const previousSalesMap = {};
      previousSalesByBranch.forEach((item) => {
        previousSalesMap[item.branch_id] = Number(item.sales || 0);
      });

      // Get AOV by branch from POS orders
      const aovByBranch = await db("pos_sales_orders")
        .where("status", "completed")
        .whereBetween("created_at", [dateRange.start, dateRange.end])
        .select("branch_id")
        .sum("total_amount as total_sales")
        .count("id as order_count")
        .groupBy("branch_id");

      const aovMap = {};
      aovByBranch.forEach((item) => {
        const orderCount = Number(item.order_count || 0);
        const totalSales = Number(item.total_sales || 0);
        aovMap[item.branch_id] = orderCount > 0 ? totalSales / orderCount : 0;
      });

      // Get OOS (out of stock) count by branch - only for production items
      const oosByBranch = await db("branch_inventory")
        .whereNull("deleted_at")
        .andWhere("item_type", "production")
        .whereIn("status", ["low_stock", "out_of_stock"])
        .select("branch_id")
        .count("id as oos_count")
        .groupBy("branch_id");

      const oosMap = {};
      oosByBranch.forEach((item) => {
        oosMap[item.branch_id] = Number(item.oos_count || 0);
      });

      // Combine all data
      const topBranches = salesByBranch.map((branch) => {
        const branchId = branch.branch_id;
        const sales = Number(branch.sales || 0);
        const previousSales = previousSalesMap[branchId] || 0;
        const growth =
          previousSales > 0
            ? ((sales - previousSales) / previousSales) * 100
            : 0;

        return {
          name: branch.branch_name,
          sales: sales,
          aov: aovMap[branchId] || 0,
          growth: growth,
          oos: oosMap[branchId] || 0,
        };
      });

      return topBranches;
    } catch (error) {
      console.error("Error getting top branches:", error);
      throw new Error("Failed to retrieve top branches");
    }
  }

  /**
   * Get system alerts
   * @returns {Promise<Array>}
   */
  static async getAlerts() {
    try {
      const alerts = [];

      // Low stock alerts from branch inventory - only for production items
      const lowStockItems = await db("branch_inventory as bi")
        .join("branches as b", "bi.branch_id", "b.id")
        .whereNull("bi.deleted_at")
        .andWhere("bi.item_type", "production")
        .whereIn("bi.status", ["low_stock", "out_of_stock"])
        .select("b.name as branch_name", "bi.item_name")
        .groupBy("b.name", "bi.item_name");

      if (lowStockItems.length > 0) {
        const branchNames = [
          ...new Set(lowStockItems.map((item) => item.branch_name)),
        ];
        alerts.push({
          type: "inventory",
          text: `Low stock: ${lowStockItems[0].item_name} (${branchNames.join(", ")})`,
          level: "warning",
        });
      }

      // Pending payroll approvals
      const pendingPayrolls = await this.getPendingPayrollApprovals();
      if (pendingPayrolls > 0) {
        alerts.push({
          type: "approval",
          text: `${pendingPayrolls} payroll period${pendingPayrolls > 1 ? "s" : ""} pending approval`,
          level: "info",
        });
      }

      // Pending budget releases
      const pendingBudgetReleases = await db("budget_releases")
        .where("receipt_confirmed", false)
        .count("id as count")
        .first();

      const budgetCount = Number(pendingBudgetReleases?.count || 0);
      if (budgetCount > 0) {
        alerts.push({
          type: "cash",
          text: `${budgetCount} budget release${budgetCount > 1 ? "s" : ""} pending confirmation`,
          level: "info",
        });
      }

      return alerts;
    } catch (error) {
      console.error("Error getting alerts:", error);
      throw new Error("Failed to retrieve alerts");
    }
  }

  /**
   * Debug: Check what data exists in the database
   * @param {Object} currentRange - { start, end }
   * @param {Object} previousRange - { start, end }
   * @returns {Promise<Object>}
   */
  static async debugSalesData(currentRange, previousRange) {
    // Get current period data
    const currentData = await db("branch_remittances")
      .where("status", "approved")
      .whereBetween("approved_at", [currentRange.start, currentRange.end])
      .select("id", "branch_id", "remitted_amount", "approved_at")
      .orderBy("approved_at", "desc")
      .limit(5);

    // Get previous period data
    const previousData = await db("branch_remittances")
      .where("status", "approved")
      .whereBetween("approved_at", [previousRange.start, previousRange.end])
      .select("id", "branch_id", "remitted_amount", "approved_at")
      .orderBy("approved_at", "desc")
      .limit(5);

    return {
      currentRange: {
        start: currentRange.start,
        end: currentRange.end,
        count: currentData.length,
        sample: currentData,
      },
      previousRange: {
        start: previousRange.start,
        end: previousRange.end,
        count: previousData.length,
        sample: previousData,
      },
    };
  }

  /**
   * Helper: Get date range based on period
   * @param {string} period - 'today' | 'week' | 'month' | 'customMonth'
   * @param {string} customMonth - YYYY-MM format
   * @returns {Object} { start, end }
   */
  static getDateRange(period, customMonth = null) {
    const now = getCurrentPhilippineTime();

    if (period === "today") {
      const start = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        0,
        0,
        0,
        0
      );
      const end = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        23,
        59,
        59,
        999
      );
      return { start, end };
    }

    if (period === "week") {
      const dayOfWeek = now.getDay();
      const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const start = new Date(now);
      start.setDate(now.getDate() - daysFromMonday);
      start.setHours(0, 0, 0, 0);

      const end = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        23,
        59,
        59,
        999
      );
      return { start, end };
    }

    if (period === "customMonth" && customMonth) {
      const [year, month] = customMonth.split("-").map(Number);
      const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
      const end = new Date(year, month, 0, 23, 59, 59, 999);
      return { start, end };
    }

    // Default: this month
    const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const end = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      23,
      59,
      59,
      999
    );
    return { start, end };
  }

  /**
   * Helper: Get previous period date range
   * @param {string} period - 'today' | 'week' | 'month' | 'customMonth'
   * @param {string} customMonth - YYYY-MM format
   * @returns {Object} { start, end }
   */
  static getPreviousDateRange(period, customMonth = null) {
    const now = getCurrentPhilippineTime();

    if (period === "today") {
      // Previous day
      const previousDay = new Date(now);
      previousDay.setDate(previousDay.getDate() - 1);
      const start = new Date(
        previousDay.getFullYear(),
        previousDay.getMonth(),
        previousDay.getDate(),
        0,
        0,
        0,
        0
      );
      const end = new Date(
        previousDay.getFullYear(),
        previousDay.getMonth(),
        previousDay.getDate(),
        23,
        59,
        59,
        999
      );
      return { start, end };
    }

    if (period === "week") {
      // Previous week (same days)
      const dayOfWeek = now.getDay();
      const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const start = new Date(now);
      start.setDate(now.getDate() - daysFromMonday - 7);
      start.setHours(0, 0, 0, 0);

      const end = new Date(now);
      end.setDate(now.getDate() - daysFromMonday - 1);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }

    if (period === "customMonth" && customMonth) {
      // Previous month
      const [year, month] = customMonth.split("-").map(Number);
      const start = new Date(year, month - 2, 1, 0, 0, 0, 0);
      const end = new Date(year, month - 1, 0, 23, 59, 59, 999);
      return { start, end };
    }

    // Default: previous month
    const start = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      1,
      0,
      0,
      0,
      0
    );
    const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    return { start, end };
  }
}

module.exports = ExecutiveController;
