import { defineStore } from 'pinia';
import axios from 'axios';
import { getApiUrl } from '../config/api.js';

export const useExecutiveStore = defineStore('executive', {
  state: () => ({
    kpis: {
      todaySales: 0,
      mtdSales: 0,
      grossMarginPct: 0,
      activeBranches: 0,
      salesTrendDeltaPct: 0,
      payrollMtd: 0,
      pendingPayrollApprovals: 0,
    },
    topBranches: [],
    alerts: [],
    loading: false,
    error: null,
  }),

  actions: {
    /**
     * Fetch all KPI metrics
     * @param {string} period - 'today' | 'week' | 'month' | 'customMonth'
     * @param {string} customMonth - YYYY-MM format
     */
    async fetchKPIs(period = 'month', customMonth = null) {
      this.loading = true;
      this.error = null;

      try {
        const params = new URLSearchParams({ period });
        if (customMonth) {
          params.append('customMonth', customMonth);
        }

        const response = await axios.get(
          getApiUrl(`executive/kpis?${params.toString()}`),
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
          }
        );

        if (response.data.success) {
          this.kpis = response.data.data;
        } else {
          throw new Error(response.data.message || 'Failed to fetch KPIs');
        }
      } catch (error) {
        console.error('Error fetching KPIs:', error);
        this.error = error.response?.data?.message || error.message;
        throw error;
      } finally {
        this.loading = false;
      }
    },

    /**
     * Fetch top performing branches
     * @param {string} period - 'today' | 'week' | 'month' | 'customMonth'
     * @param {string} customMonth - YYYY-MM format
     */
    async fetchTopBranches(period = 'month', customMonth = null) {
      this.loading = true;
      this.error = null;

      try {
        const params = new URLSearchParams({ period });
        if (customMonth) {
          params.append('customMonth', customMonth);
        }

        const response = await axios.get(
          getApiUrl(`executive/top-branches?${params.toString()}`),
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
          }
        );

        if (response.data.success) {
          this.topBranches = response.data.data;
        } else {
          throw new Error(
            response.data.message || 'Failed to fetch top branches'
          );
        }
      } catch (error) {
        console.error('Error fetching top branches:', error);
        this.error = error.response?.data?.message || error.message;
        throw error;
      } finally {
        this.loading = false;
      }
    },

    /**
     * Fetch system alerts
     */
    async fetchAlerts() {
      this.loading = true;
      this.error = null;

      try {
        const response = await axios.get(getApiUrl('executive/alerts'), {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        });

        if (response.data.success) {
          this.alerts = response.data.data;
        } else {
          throw new Error(response.data.message || 'Failed to fetch alerts');
        }
      } catch (error) {
        console.error('Error fetching alerts:', error);
        this.error = error.response?.data?.message || error.message;
        throw error;
      } finally {
        this.loading = false;
      }
    },

    /**
     * Fetch all executive data (KPIs, top branches, and alerts)
     * @param {string} period - 'today' | 'week' | 'month' | 'customMonth'
     * @param {string} customMonth - YYYY-MM format
     */
    async fetchAllData(period = 'month', customMonth = null) {
      this.loading = true;
      this.error = null;

      try {
        await Promise.all([
          this.fetchKPIs(period, customMonth),
          this.fetchTopBranches(period, customMonth),
          this.fetchAlerts(),
        ]);
      } catch (error) {
        console.error('Error fetching executive data:', error);
        this.error = error.message;
        throw error;
      } finally {
        this.loading = false;
      }
    },

    /**
     * Reset store state
     */
    reset() {
      this.kpis = {
        todaySales: 0,
        mtdSales: 0,
        grossMarginPct: 0,
        activeBranches: 0,
        salesTrendDeltaPct: 0,
        payrollMtd: 0,
        pendingPayrollApprovals: 0,
      };
      this.topBranches = [];
      this.alerts = [];
      this.error = null;
    },
  },
});
