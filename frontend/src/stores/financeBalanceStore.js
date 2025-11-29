// frontend/src/stores/financeBalanceStore.js
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import axios from 'axios';
import { apiConfig } from '../config/api.js';

export const useFinanceBalanceStore = defineStore('financeBalance', () => {
  // State
  const balances = ref([]);
  const totals = ref({
    capital: 0,
    profit: 0,
    sales_remittances: 0,
    total_balance: 0,
  });
  const loading = ref(false);
  const error = ref(null);

  // Getters
  const totalCapital = computed(() => totals.value.capital);
  const totalProfit = computed(() => totals.value.profit);
  const totalSalesRemittances = computed(() => totals.value.sales_remittances);
  const totalBalance = computed(() => totals.value.total_balance);

  const balancesByBranch = computed(() => {
    return balances.value.reduce((acc, balance) => {
      acc[balance.branch_id] = balance;
      return acc;
    }, {});
  });

  // Actions
  const fetchBalances = async (filters = {}) => {
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
        `${apiConfig.baseURL}/finance-balances?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );

      if (response.data.success) {
        balances.value = response.data.data;
      } else {
        throw new Error(
          response.data.message || 'Failed to fetch finance balances'
        );
      }
    } catch (err) {
      error.value =
        err.response?.data?.message ||
        err.message ||
        'Failed to fetch finance balances';
      console.error('Error fetching finance balances:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const fetchTotals = async () => {
    loading.value = true;
    error.value = null;

    try {
      const response = await axios.get(
        `${apiConfig.baseURL}/finance-balances/totals`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );

      if (response.data.success) {
        totals.value = response.data.data;
      } else {
        throw new Error(
          response.data.message || 'Failed to fetch finance balance totals'
        );
      }
    } catch (err) {
      error.value =
        err.response?.data?.message ||
        err.message ||
        'Failed to fetch finance balance totals';
      console.error('Error fetching finance balance totals:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const updateBalance = async (balanceData) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await axios.post(
        `${apiConfig.baseURL}/finance-balances`,
        balanceData,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data.success) {
        // Refresh balances after update
        await fetchBalances();
        await fetchTotals();
        return response.data.data;
      } else {
        throw new Error(
          response.data.message || 'Failed to update finance balance'
        );
      }
    } catch (err) {
      error.value =
        err.response?.data?.message ||
        err.message ||
        'Failed to update finance balance';
      console.error('Error updating finance balance:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const addCapital = async ({ amount, balance_date = null }) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await axios.post(
        `${apiConfig.baseURL}/finance-balances/capital`,
        { amount, balance_date },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data.success) {
        await fetchBalances();
        await fetchTotals();
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to add capital');
      }
    } catch (err) {
      error.value =
        err.response?.data?.message || err.message || 'Failed to add capital';
      console.error('Error adding capital:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const setCapital = async ({ amount, balance_date = null }) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await axios.post(
        `${apiConfig.baseURL}/finance-balances/capital/set`,
        { amount, balance_date },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data.success) {
        await fetchBalances();
        await fetchTotals();
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to set capital');
      }
    } catch (err) {
      error.value =
        err.response?.data?.message || err.message || 'Failed to set capital';
      console.error('Error setting capital:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Utility actions
  const clearError = () => {
    error.value = null;
  };

  const clearBalances = () => {
    balances.value = [];
    totals.value = {
      capital: 0,
      profit: 0,
      sales_remittances: 0,
      total_balance: 0,
    };
  };

  return {
    // State
    balances,
    totals,
    loading,
    error,

    // Getters
    totalCapital,
    totalProfit,
    totalSalesRemittances,
    totalBalance,
    balancesByBranch,

    // Actions
    fetchBalances,
    fetchTotals,
    updateBalance,
    addCapital,
    setCapital,
    clearError,
    clearBalances,
  };
});
