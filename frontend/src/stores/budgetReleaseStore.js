// frontend/src/stores/budgetReleaseStore.js
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import axios from 'axios';
import { apiConfig } from '../config/api.js';
import { useFinanceBalanceStore } from './financeBalanceStore.js';
import { useCashMovementStore } from './cashMovementStore.js';

export const useBudgetReleaseStore = defineStore('budgetRelease', () => {
  // State
  const releases = ref([]);
  const pendingReceipts = ref([]);
  const currentRelease = ref(null);
  const loading = ref(false);
  const error = ref(null);
  const stats = ref({
    total_releases: 0,
    confirmed_receipts: 0,
    pending_receipts: 0,
    total_released_amount: 0,
    total_confirmed_amount: 0,
  });

  // Getters
  const confirmedReleases = computed(() => {
    return releases.value.filter((release) => release.receipt_confirmed);
  });

  const pendingConfirmationReleases = computed(() => {
    return releases.value.filter((release) => !release.receipt_confirmed);
  });

  const releasesByDateRange = computed(() => (startDate, endDate) => {
    return releases.value.filter((release) => {
      const releaseDate = new Date(release.released_at);
      const start = new Date(startDate);
      const end = new Date(endDate);
      return releaseDate >= start && releaseDate <= end;
    });
  });

  // Actions
  const fetchReleases = async (filters = {}) => {
    loading.value = true;
    error.value = null;

    try {
      const params = new URLSearchParams();

      Object.keys(filters).forEach((key) => {
        if (
          filters[key] !== null &&
          filters[key] !== undefined &&
          filters[key] !== ''
        ) {
          params.append(key, filters[key]);
        }
      });

      const response = await axios.get(
        `${apiConfig.baseURL}/budget-releases?${params.toString()}`
      );

      if (response.data.success) {
        releases.value = response.data.data;
        return response.data.data;
      } else {
        throw new Error(
          response.data.message || 'Failed to fetch budget releases'
        );
      }
    } catch (err) {
      error.value =
        err.response?.data?.message ||
        err.message ||
        'Failed to fetch budget releases';
      console.error('Error fetching budget releases:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const fetchReleaseById = async (id) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await axios.get(
        `${apiConfig.baseURL}/budget-releases/${id}`
      );

      if (response.data.success) {
        currentRelease.value = response.data.data;
        return response.data.data;
      } else {
        throw new Error(
          response.data.message || 'Failed to fetch budget release'
        );
      }
    } catch (err) {
      error.value =
        err.response?.data?.message ||
        err.message ||
        'Failed to fetch budget release';
      console.error('Error fetching budget release:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const createBudgetRelease = async (releaseData) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await axios.post(
        `${apiConfig.baseURL}/budget-releases`,
        releaseData
      );

      if (response.data.success) {
        // Add to local state
        releases.value.unshift(response.data.data);

        // Refresh stats
        await fetchStats();

        // Refresh finance balance and cash movements
        const financeBalanceStore = useFinanceBalanceStore();
        const cashMovementStore = useCashMovementStore();

        await financeBalanceStore.fetchTotals();
        await cashMovementStore.fetchMovements({
          limit: 50,
          offset: 0,
          include_non_branch: true, // Include HQ/SCM budget release movements
        });

        return response.data.data;
      } else {
        throw new Error(
          response.data.message || 'Failed to create budget release'
        );
      }
    } catch (err) {
      error.value =
        err.response?.data?.message ||
        err.message ||
        'Failed to create budget release';
      console.error('Error creating budget release:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const confirmReceipt = async (id, confirmedBy) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await axios.patch(
        `${apiConfig.baseURL}/budget-releases/${id}/confirm-receipt`,
        { confirmed_by: confirmedBy }
      );

      if (response.data.success) {
        // Update local state
        const index = releases.value.findIndex((r) => r.id === id);
        if (index !== -1) {
          releases.value[index] = {
            ...releases.value[index],
            ...response.data.data,
          };
        }

        // Remove from pending receipts
        pendingReceipts.value = pendingReceipts.value.filter(
          (r) => r.id !== id
        );

        await fetchStats(); // Refresh stats
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to confirm receipt');
      }
    } catch (err) {
      error.value =
        err.response?.data?.message ||
        err.message ||
        'Failed to confirm receipt';
      console.error('Error confirming receipt:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const fetchPendingReceipts = async (department = null) => {
    loading.value = true;
    error.value = null;

    try {
      const params = department ? `?department=${department}` : '';
      const response = await axios.get(
        `${apiConfig.baseURL}/budget-releases/pending-receipts${params}`
      );

      if (response.data.success) {
        pendingReceipts.value = response.data.data;
        return response.data.data;
      } else {
        throw new Error(
          response.data.message || 'Failed to fetch pending receipts'
        );
      }
    } catch (err) {
      error.value =
        err.response?.data?.message ||
        err.message ||
        'Failed to fetch pending receipts';
      console.error('Error fetching pending receipts:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const fetchStats = async (filters = {}) => {
    try {
      const params = new URLSearchParams();

      Object.keys(filters).forEach((key) => {
        if (
          filters[key] !== null &&
          filters[key] !== undefined &&
          filters[key] !== ''
        ) {
          params.append(key, filters[key]);
        }
      });

      const response = await axios.get(
        `${apiConfig.baseURL}/budget-releases/stats?${params.toString()}`
      );

      if (response.data.success) {
        stats.value = response.data.data;
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to fetch stats');
      }
    } catch (err) {
      console.error('Error fetching budget release stats:', err);
      throw err;
    }
  };

  const releaseBudget = async (releaseData) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await axios.post(
        `${apiConfig.baseURL}/budget-releases`,
        releaseData
      );

      if (response.data.success) {
        // Add to local state
        releases.value.unshift(response.data.data);

        // Refresh stats
        await fetchStats();

        // Refresh finance balance and cash movements
        const financeBalanceStore = useFinanceBalanceStore();
        const cashMovementStore = useCashMovementStore();

        await financeBalanceStore.fetchTotals();
        await cashMovementStore.fetchMovements({
          limit: 50,
          offset: 0,
          include_non_branch: true, // Include HQ/SCM budget release movements
        });

        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to release budget');
      }
    } catch (err) {
      error.value =
        err.response?.data?.message ||
        err.message ||
        'Failed to release budget';
      console.error('Error releasing budget:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Utility actions
  const clearError = () => {
    error.value = null;
  };

  const clearCurrentRelease = () => {
    currentRelease.value = null;
  };

  return {
    // State
    releases,
    pendingReceipts,
    currentRelease,
    loading,
    error,
    stats,

    // Getters
    confirmedReleases,
    pendingConfirmationReleases,
    releasesByDateRange,

    // Actions
    fetchReleases,
    fetchReleaseById,
    createBudgetRelease,
    confirmReceipt,
    fetchPendingReceipts,
    fetchStats,
    clearError,
    clearCurrentRelease,
    releaseBudget,
  };
});
