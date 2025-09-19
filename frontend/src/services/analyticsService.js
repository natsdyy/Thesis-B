const API_BASE_URL = process.env.VUE_APP_API_URL || '';

class AnalyticsService {
  // Get overview statistics
  async getOverview(filters = {}) {
    try {
      const params = new URLSearchParams();
      
      Object.keys(filters).forEach(key => {
        if (filters[key] !== null && filters[key] !== undefined && filters[key] !== '') {
          params.append(key, filters[key]);
        }
      });

      const response = await fetch(`${API_BASE_URL}/api/analytics/overview?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch overview analytics');
      }

      return data;
    } catch (error) {
      console.error('Error fetching overview analytics:', error);
      throw error;
    }
  }

  // Get top rated foods
  async getTopFoods(filters = {}) {
    try {
      const params = new URLSearchParams();
      
      Object.keys(filters).forEach(key => {
        if (filters[key] !== null && filters[key] !== undefined && filters[key] !== '') {
          params.append(key, filters[key]);
        }
      });

      const response = await fetch(`${API_BASE_URL}/api/analytics/top-foods?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch top foods');
      }

      return data;
    } catch (error) {
      console.error('Error fetching top foods:', error);
      throw error;
    }
  }

  // Get branch performance analytics
  async getBranchPerformance(filters = {}) {
    try {
      const params = new URLSearchParams();
      
      Object.keys(filters).forEach(key => {
        if (filters[key] !== null && filters[key] !== undefined && filters[key] !== '') {
          params.append(key, filters[key]);
        }
      });

      const response = await fetch(`${API_BASE_URL}/api/analytics/branch-performance?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch branch performance');
      }

      return data;
    } catch (error) {
      console.error('Error fetching branch performance:', error);
      throw error;
    }
  }

  // Get trends over time
  async getTrends(filters = {}) {
    try {
      const params = new URLSearchParams();
      
      Object.keys(filters).forEach(key => {
        if (filters[key] !== null && filters[key] !== undefined && filters[key] !== '') {
          params.append(key, filters[key]);
        }
      });

      const response = await fetch(`${API_BASE_URL}/api/analytics/trends?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch trends');
      }

      return data;
    } catch (error) {
      console.error('Error fetching trends:', error);
      throw error;
    }
  }

  // Get rating distribution
  async getRatingDistribution(filters = {}) {
    try {
      const params = new URLSearchParams();
      
      Object.keys(filters).forEach(key => {
        if (filters[key] !== null && filters[key] !== undefined && filters[key] !== '') {
          params.append(key, filters[key]);
        }
      });

      const response = await fetch(`${API_BASE_URL}/api/analytics/rating-distribution?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch rating distribution');
      }

      return data;
    } catch (error) {
      console.error('Error fetching rating distribution:', error);
      throw error;
    }
  }

  // Get all analytics data at once
  async getAllAnalytics(filters = {}) {
    try {
      const [
        overview,
        topFoods,
        branchPerformance,
        trends,
        ratingDistribution
      ] = await Promise.all([
        this.getOverview(filters),
        this.getTopFoods(filters),
        this.getBranchPerformance(filters),
        this.getTrends(filters),
        this.getRatingDistribution(filters)
      ]);

      return {
        success: true,
        data: {
          overview: overview.data,
          topFoods: topFoods.data,
          branchPerformance: branchPerformance.data,
          trends: trends.data,
          ratingDistribution: ratingDistribution.data
        }
      };
    } catch (error) {
      console.error('Error fetching all analytics:', error);
      throw error;
    }
  }

  // Get dashboard summary (for main dashboard)
  async getDashboardSummary(filters = {}) {
    try {
      const [overview, topCustomers, recentActivity] = await Promise.all([
        this.getOverview(filters),
        this.getTopCustomers(filters),
        this.getRecentActivity(filters)
      ]);

      return {
        success: true,
        data: {
          overview: overview.data,
          topCustomers: topCustomers.data,
          recentActivity: recentActivity.data
        }
      };
    } catch (error) {
      console.error('Error fetching dashboard summary:', error);
      throw error;
    }
  }

  // Get top customers (for dashboard)
  async getTopCustomers(filters = {}) {
    try {
      const params = new URLSearchParams();
      params.append('limit', filters.limit || 5);
      
      Object.keys(filters).forEach(key => {
        if (key !== 'limit' && filters[key] !== null && filters[key] !== undefined && filters[key] !== '') {
          params.append(key, filters[key]);
        }
      });

      const response = await fetch(`${API_BASE_URL}/api/customers/top?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch top customers');
      }

      return data;
    } catch (error) {
      console.error('Error fetching top customers:', error);
      throw error;
    }
  }

  // Get recent activity (for dashboard)
  async getRecentActivity(filters = {}) {
    try {
      const params = new URLSearchParams();
      params.append('limit', filters.limit || 5);
      params.append('sort_by', 'created_at');
      params.append('sort_order', 'desc');
      
      Object.keys(filters).forEach(key => {
        if (!['limit', 'sort_by', 'sort_order'].includes(key) && filters[key] !== null && filters[key] !== undefined && filters[key] !== '') {
          params.append(key, filters[key]);
        }
      });

      const response = await fetch(`${API_BASE_URL}/api/customers?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch recent activity');
      }

      // Transform customer data to activity format
      const activities = data.data.map(customer => ({
        id: customer.id,
        description: `New customer ${customer.name} registered`,
        created_at: customer.created_at,
        type: 'customer_registration'
      }));

      return {
        success: true,
        data: activities
      };
    } catch (error) {
      console.error('Error fetching recent activity:', error);
      throw error;
    }
  }

  // Export analytics data
  async exportAnalytics(filters = {}, format = 'json') {
    try {
      const params = new URLSearchParams();
      params.append('format', format);
      
      Object.keys(filters).forEach(key => {
        if (filters[key] !== null && filters[key] !== undefined && filters[key] !== '') {
          params.append(key, filters[key]);
        }
      });

      const response = await fetch(`${API_BASE_URL}/api/analytics/export?${params.toString()}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to export analytics');
      }

      if (format === 'json') {
        return await response.json();
      } else {
        // For CSV or other formats, return blob
        return await response.blob();
      }
    } catch (error) {
      console.error('Error exporting analytics:', error);
      throw error;
    }
  }
}

export default new AnalyticsService();