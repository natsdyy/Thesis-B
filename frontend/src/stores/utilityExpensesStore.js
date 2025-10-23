// frontend/src/stores/utilityExpensesStore.js
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import axios from 'axios';
import { apiConfig } from '../config/api.js';

export const useUtilityExpensesStore = defineStore('utilityExpenses', () => {
  // State
  const expenses = ref([]);
  const remittances = ref([]);
  const mainOfficeExpenses = ref([]);
  const loading = ref(false);
  const error = ref(null);
  const pagination = ref({
    total: 0,
    limit: 20,
    offset: 0,
    pages: 0,
  });

  // Getters
  const totalExpenses = computed(() => expenses.value.length);
  const totalRemittances = computed(() => remittances.value.length);
  const pendingRemittances = computed(() =>
    remittances.value.filter((r) => r.status === 'pending')
  );
  const approvedRemittances = computed(() =>
    remittances.value.filter((r) => r.status === 'approved')
  );
  const rejectedRemittances = computed(() =>
    remittances.value.filter((r) => r.status === 'rejected')
  );

  // Finance Actions - Utilities Expenses Management
  const fetchExpenses = async (filters = {}) => {
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
        `${apiConfig.baseURL}/utilities-expenses?${params.toString()}`
      );

      if (response.data.success) {
        expenses.value = response.data.expenses || [];
        pagination.value = {
          total: response.data.total || 0,
          limit: response.data.limit || 20,
          offset: response.data.offset || 0,
          pages: response.data.pages || 0,
        };
      }
    } catch (err) {
      console.error('Error fetching utilities expenses:', err);
      error.value =
        err.response?.data?.message || 'Failed to fetch utilities expenses';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Fetch main office expenses (department type)
  const fetchMainOfficeExpenses = async (filters = {}) => {
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
        `${apiConfig.baseURL}/utilities-expenses?${params.toString()}`
      );

      if (response.data.success) {
        mainOfficeExpenses.value = response.data.expenses || [];
      } else {
        throw new Error(
          response.data.message || 'Failed to fetch main office expenses'
        );
      }
    } catch (err) {
      error.value = err.response?.data?.message || err.message;
      console.error('Error fetching main office expenses:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const createExpense = async (expenseData) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await axios.post(
        `${apiConfig.baseURL}/utilities-expenses`,
        expenseData,
        {
          headers: {
            'Content-Type':
              expenseData instanceof FormData
                ? 'multipart/form-data'
                : 'application/json',
          },
        }
      );

      if (response.data.success) {
        // Refresh the lists
        await fetchExpenses();
        await fetchMainOfficeExpenses();
        return response.data.data;
      }
    } catch (err) {
      console.error('Error creating utilities expense:', err);
      error.value =
        err.response?.data?.message || 'Failed to create utilities expense';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const updateExpense = async (id, expenseData) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await axios.put(
        `${apiConfig.baseURL}/utilities-expenses/${id}`,
        expenseData
      );

      if (response.data.success) {
        // Refresh the list
        await fetchExpenses();
        return response.data.data;
      }
    } catch (err) {
      console.error('Error updating utilities expense:', err);
      error.value =
        err.response?.data?.message || 'Failed to update utilities expense';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const deleteExpense = async (id) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await axios.delete(
        `${apiConfig.baseURL}/utilities-expenses/${id}`
      );

      if (response.data.success) {
        // Refresh the list
        await fetchExpenses();
        return true;
      }
    } catch (err) {
      console.error('Error deleting utilities expense:', err);
      error.value =
        err.response?.data?.message || 'Failed to delete utilities expense';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const getExpenseTotals = async (dateFrom, dateTo, filters = {}) => {
    loading.value = true;
    error.value = null;

    try {
      const params = new URLSearchParams();
      params.append('date_from', dateFrom);
      params.append('date_to', dateTo);

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
        `${apiConfig.baseURL}/utilities-expenses/totals?${params.toString()}`
      );

      if (response.data.success) {
        return response.data;
      }
    } catch (err) {
      console.error('Error fetching expense totals:', err);
      error.value =
        err.response?.data?.message || 'Failed to fetch expense totals';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Branch Actions - Utilities Remittances Management
  const fetchRemittances = async (filters = {}) => {
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
        `${apiConfig.baseURL}/branch-utilities-expenses?${params.toString()}`
      );

      if (response.data.success) {
        remittances.value = response.data.remittances || [];
        pagination.value = {
          total: response.data.total || 0,
          limit: response.data.limit || 20,
          offset: response.data.offset || 0,
          pages: response.data.pages || 0,
        };
      }
    } catch (err) {
      console.error('Error fetching utilities remittances:', err);
      error.value =
        err.response?.data?.message || 'Failed to fetch utilities remittances';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const createRemittance = async (formData) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await axios.post(
        `${apiConfig.baseURL}/branch-utilities-expenses`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      if (response.data.success) {
        // Refresh the list
        await fetchRemittances();
        return response.data.data;
      }
    } catch (err) {
      console.error('Error creating utilities remittance:', err);
      error.value =
        err.response?.data?.message || 'Failed to create utilities remittance';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const updateRemittance = async (id, formData) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await axios.put(
        `${apiConfig.baseURL}/branch-utilities-expenses/${id}`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      if (response.data.success) {
        // Refresh the list
        await fetchRemittances();
        return response.data.data;
      }
    } catch (err) {
      console.error('Error updating utilities remittance:', err);
      error.value =
        err.response?.data?.message || 'Failed to update utilities remittance';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const deleteRemittance = async (id) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await axios.delete(
        `${apiConfig.baseURL}/branch-utilities-expenses/${id}`
      );

      if (response.data.success) {
        // Refresh the list
        await fetchRemittances();
        return true;
      }
    } catch (err) {
      console.error('Error deleting utilities remittance:', err);
      error.value =
        err.response?.data?.message || 'Failed to delete utilities remittance';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Finance Actions - Approve/Reject Remittances
  const approveRemittance = async (id) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await axios.post(
        `${apiConfig.baseURL}/branch-utilities-expenses/${id}/approve`
      );

      if (response.data.success) {
        // Refresh the list
        await fetchRemittances();
        return response.data.data;
      }
    } catch (err) {
      console.error('Error approving utilities remittance:', err);
      error.value =
        err.response?.data?.message || 'Failed to approve utilities remittance';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const rejectRemittance = async (id, reason) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await axios.post(
        `${apiConfig.baseURL}/branch-utilities-expenses/${id}/reject`,
        { reason }
      );

      if (response.data.success) {
        // Refresh the list
        await fetchRemittances();
        return response.data.data;
      }
    } catch (err) {
      console.error('Error rejecting utilities remittance:', err);
      error.value =
        err.response?.data?.message || 'Failed to reject utilities remittance';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const getRemittanceById = async (id) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await axios.get(
        `${apiConfig.baseURL}/branch-utilities-expenses/${id}`
      );

      if (response.data.success) {
        return response.data.data;
      }
    } catch (err) {
      console.error('Error fetching utilities remittance:', err);
      error.value =
        err.response?.data?.message || 'Failed to fetch utilities remittance';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Utility methods
  const clearError = () => {
    error.value = null;
  };

  const reset = () => {
    expenses.value = [];
    remittances.value = [];
    mainOfficeExpenses.value = [];
    loading.value = false;
    error.value = null;
    pagination.value = {
      total: 0,
      limit: 20,
      offset: 0,
      pages: 0,
    };
  };

  return {
    // State
    expenses,
    remittances,
    mainOfficeExpenses,
    loading,
    error,
    pagination,

    // Getters
    totalExpenses,
    totalRemittances,
    pendingRemittances,
    approvedRemittances,
    rejectedRemittances,

    // Finance Actions
    fetchExpenses,
    fetchMainOfficeExpenses,
    createExpense,
    updateExpense,
    deleteExpense,
    getExpenseTotals,

    // Branch Actions
    fetchRemittances,
    createRemittance,
    updateRemittance,
    deleteRemittance,

    // Finance Approval Actions
    approveRemittance,
    rejectRemittance,
    getRemittanceById,

    // Utility methods
    clearError,
    reset,
  };
});
