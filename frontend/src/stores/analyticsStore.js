import { defineStore } from 'pinia';
import analyticsService from '../services/analyticsService';

export const useAnalyticsStore = defineStore('analytics', {
  state: () => ({
    // Dashboard data
    dashboardData: {},
    mostUsedItems: [],
    leastUsedItems: [],
    categoryBreakdown: [],
    consumptionTrends: {},

    // Forecasting data
    forecastData: {},
    seasonalPatterns: {},

    // Usage analytics
    usageAnalytics: {},
    inventoryTurnover: {},

    // Alerts and recommendations
    lowStockItems: [],
    reorderRecommendations: [],
    recentTransactions: [],

    // UI state
    loading: false,
    error: null,
    selectedTimeframe: '30',
    selectedForecastItem: '',
    forecastPeriods: '7',
  }),

  getters: {
    // Dashboard metrics
    totalItems: (state) => state.dashboardData.totalItems || 0,
    totalConsumption: (state) => state.dashboardData.totalConsumption || 0,
    turnoverRate: (state) => state.dashboardData.turnoverRate || 0,
    lowStockCount: (state) => state.lowStockItems.length,

    // Chart data
    consumptionTrendChartData: (state) => ({
      labels: state.consumptionTrends?.labels || [],
      values: state.consumptionTrends?.values || [],
    }),

    categoryBreakdownChartData: (state) =>
      (state.categoryBreakdown || []).map((item) => ({
        category: item.category || 'Unknown',
        consumption: parseFloat(item.total_consumed || 0),
      })),

    forecastChartData: (state) => {
      if (!state.forecastData || !state.forecastData.historical_data) {
        return null;
      }
      return {
        labels: state.forecastData.historical_data.map(
          (item) => item.month || 'Unknown'
        ),
        actual: state.forecastData.historical_data.map((item) =>
          parseFloat(item.monthly_consumption || 0)
        ),
        forecast: state.forecastData.forecasted_data || [],
      };
    },

    // Formatted data for display
    formattedMostUsedItems: (state) =>
      (state.mostUsedItems || []).map((item) => ({
        ...item,
        total_consumed: item.total_consumed || 0,
        frequency: item.frequency || 0,
      })),

    formattedLeastUsedItems: (state) =>
      (state.leastUsedItems || []).map((item) => ({
        ...item,
        total_consumed: item.total_consumed || 0,
        frequency: item.frequency || 0,
      })),
  },

  actions: {
    // Set timeframe and reload data
    async setTimeframe(timeframe) {
      this.selectedTimeframe = timeframe;
      await this.loadDashboardData();
    },

    // Set forecast item and load forecast data
    async setForecastItem(itemName) {
      this.selectedForecastItem = itemName;
      if (itemName) {
        await this.loadForecastData();
      }
    },

    // Set forecast periods and reload forecast data
    async setForecastPeriods(periods) {
      this.forecastPeriods = periods;
      if (this.selectedForecastItem) {
        await this.loadForecastData();
      }
    },

    // Load comprehensive dashboard data
    async loadDashboardData() {
      this.loading = true;
      this.error = null;

      try {
        const [
          overview,
          topFoods,
          branchPerformance,
          trends,
          ratingDistribution,
        ] = await Promise.all([
          analyticsService.getOverview({}),
          analyticsService.getTopFoods({ limit: 10 }),
          analyticsService.getBranchPerformance({}),
          analyticsService.getTrends({ period: this.selectedTimeframe }),
          analyticsService.getRatingDistribution({}),
        ]);

        // Update state with CRM analytics data
        this.dashboardData = overview?.data || {};
        this.mostUsedItems = topFoods?.data || [];
        this.leastUsedItems = []; // Not applicable for CRM analytics
        this.categoryBreakdown = branchPerformance?.data || [];
        this.usageAnalytics = trends?.data || {};
        this.inventoryTurnover = []; // Not applicable for CRM analytics

        // Process consumption trends from sales trends
        if (trends?.data?.sales && Array.isArray(trends.data.sales)) {
          this.consumptionTrends = {
            labels: trends.data.sales.map((item) => item.period),
            values: trends.data.sales.map((item) => item.total_sales || 0),
          };
        } else {
          this.consumptionTrends = { labels: [], values: [] };
        }

        // Process alerts and recommendations
        this.processInventoryAlerts();

        // Load recent activity
        this.recentTransactions = [];
      } catch (error) {
        console.error('Error loading dashboard data:', error);
        this.error = error.message || 'Failed to load dashboard data';
      } finally {
        this.loading = false;
      }
    },

    // Load forecast data for specific item
    async loadForecastData() {
      if (!this.selectedForecastItem) return;

      try {
        // For CRM analytics, we'll use trends data as forecast
        const trends = await analyticsService.getTrends({ 
          period: this.forecastPeriods === '7' ? 'day' : 
                 this.forecastPeriods === '30' ? 'week' : 'month'
        });

        // Store forecast data by item name
        this.forecastData[this.selectedForecastItem] = trends?.data || {};
      } catch (error) {
        console.error('Error loading forecast data:', error);
        this.error = error.message || 'Failed to load forecast data';
      }
    },

    // Load seasonal patterns for specific item
    async loadSeasonalPatterns(itemName) {
      try {
        // For CRM analytics, we'll use trends data as seasonal patterns
        const trends = await analyticsService.getTrends({ period: 'month' });
        this.seasonalPatterns[itemName] = trends?.data || {};
      } catch (error) {
        console.error('Error loading seasonal patterns:', error);
        this.error = error.message || 'Failed to load seasonal patterns';
      }
    },

    // Process inventory alerts and recommendations
    processInventoryAlerts() {
      // For CRM analytics, we'll use feedback data as "alerts"
      this.lowStockItems = this.dashboardData.negative_feedback || [];

      // Extract reorder recommendations from dashboard data
      this.reorderRecommendations = [];
    },

    // Refresh all data
    async refreshAll() {
      await this.loadDashboardData();
      if (this.selectedForecastItem) {
        await this.loadForecastData();
      }
    },

    // Clear error
    clearError() {
      this.error = null;
    },

    // Reset store state
    reset() {
      this.dashboardData = {};
      this.mostUsedItems = [];
      this.leastUsedItems = [];
      this.categoryBreakdown = [];
      this.consumptionTrends = {};
      this.forecastData = {};
      this.seasonalPatterns = {};
      this.usageAnalytics = {};
      this.inventoryTurnover = {};
      this.lowStockItems = [];
      this.reorderRecommendations = [];
      this.recentTransactions = [];
      this.loading = false;
      this.error = null;
      this.selectedTimeframe = '30';
      this.selectedForecastItem = '';
      this.forecastPeriods = '7';
    },
  },
});
