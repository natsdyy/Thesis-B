import axios from 'axios';
import { apiConfig } from '../config/api';

// Create axios instance with the correct configuration
const api = axios.create({
  baseURL: apiConfig.baseURL,
  timeout: apiConfig.timeout,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const analyticsService = {
  // Get comprehensive dashboard data
  async getDashboardData(timeframe = '30') {
    try {
      const response = await api.get(
        `/inventory/analytics/dashboard?timeframe=${timeframe}`
      );
      return response.data.data; // Extract data from {success: true, data: [...]}
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      throw error;
    }
  },

  // Get most used items
  async getMostUsedItems(limit = 10, timeframe = '30') {
    try {
      const response = await api.get(
        `/inventory/analytics/most-used?limit=${limit}&timeframe=${timeframe}`
      );
      return response.data.data; // Extract data from {success: true, data: [...]}
    } catch (error) {
      console.error('Error fetching most used items:', error);
      throw error;
    }
  },

  // Get least used items
  async getLeastUsedItems(limit = 10, timeframe = '30') {
    try {
      const response = await api.get(
        `/inventory/analytics/least-used?limit=${limit}&timeframe=${timeframe}`
      );
      return response.data.data; // Extract data from {success: true, data: [...]}
    } catch (error) {
      console.error('Error fetching least used items:', error);
      throw error;
    }
  },

  // Get forecast for specific item
  async getForecast(itemName, periods = 7) {
    try {
      const response = await api.get(
        `/inventory/analytics/forecast/${encodeURIComponent(itemName)}?periods=${periods}`
      );
      return response.data.data; // Extract data from {success: true, data: [...]}
    } catch (error) {
      console.error('Error fetching forecast:', error);
      throw error;
    }
  },

  // Get seasonal patterns for specific item
  async getSeasonalPatterns(itemName) {
    try {
      const response = await api.get(
        `/inventory/analytics/seasonal/${encodeURIComponent(itemName)}`
      );
      return response.data.data; // Extract data from {success: true, data: [...]}
    } catch (error) {
      console.error('Error fetching seasonal patterns:', error);
      throw error;
    }
  },

  // Get usage analytics
  async getUsageAnalytics(timeframe = '30') {
    try {
      const response = await api.get(
        `/inventory/analytics/usage?timeframe=${timeframe}`
      );
      return response.data.data; // Extract data from {success: true, data: [...]}
    } catch (error) {
      console.error('Error fetching usage analytics:', error);
      throw error;
    }
  },

  // Get inventory turnover
  async getInventoryTurnover(timeframe = '30') {
    try {
      const response = await api.get(
        `/inventory/analytics/turnover?timeframe=${timeframe}`
      );
      return response.data.data; // Extract data from {success: true, data: [...]}
    } catch (error) {
      console.error('Error fetching inventory turnover:', error);
      throw error;
    }
  },

  // Get category breakdown
  async getCategoryBreakdown(timeframe = '30') {
    try {
      const response = await api.get(
        `/inventory/analytics/category-breakdown?timeframe=${timeframe}`
      );
      return response.data.data; // Extract data from {success: true, data: [...]}
    } catch (error) {
      console.error('Error fetching category breakdown:', error);
      throw error;
    }
  },
};
