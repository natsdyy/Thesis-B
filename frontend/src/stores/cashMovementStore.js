// frontend/src/stores/cashMovementStore.js
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import axios from 'axios';
import { apiConfig } from '../config/api.js';

export const useCashMovementStore = defineStore('cashMovement', () => {
  // State
  const movements = ref([]);
  const summary = ref([]);
  const loading = ref(false);
  const error = ref(null);
  const pagination = ref({
    total: 0,
    limit: 20,
    offset: 0,
    pages: 0,
  });

  // Getters
  const inflowMovements = computed(() => {
    return movements.value.filter(
      (movement) => movement.movement_type === 'in'
    );
  });

  const outflowMovements = computed(() => {
    return movements.value.filter(
      (movement) => movement.movement_type === 'out'
    );
  });

  const movementsByBranch = computed(() => {
    const grouped = {};
    movements.value.forEach((movement) => {
      const branchId = movement.branch_id;
      if (!grouped[branchId]) {
        grouped[branchId] = {
          branch_id: branchId,
          branch_name: movement.branch_name,
          movements: [],
          totalInflow: 0,
          totalOutflow: 0,
        };
      }
      grouped[branchId].movements.push(movement);
      if (movement.movement_type === 'in') {
        grouped[branchId].totalInflow += Number(movement.amount || 0);
      } else {
        grouped[branchId].totalOutflow += Number(movement.amount || 0);
      }
    });
    return Object.values(grouped);
  });

  // Actions
  const fetchMovements = async (filters = {}) => {
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
        `${apiConfig.baseURL}/cash-movements?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );

      if (response.data.success) {
        movements.value = response.data.data;
        pagination.value = response.data.pagination;
      } else {
        throw new Error(
          response.data.message || 'Failed to fetch cash movements'
        );
      }
    } catch (err) {
      error.value =
        err.response?.data?.message ||
        err.message ||
        'Failed to fetch cash movements';
      console.error('Error fetching cash movements:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const createMovement = async (movementData) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await axios.post(
        `${apiConfig.baseURL}/cash-movements`,
        movementData,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data.success) {
        // Add to local state
        movements.value.unshift(response.data.data);
        return response.data.data;
      } else {
        throw new Error(
          response.data.message || 'Failed to create cash movement'
        );
      }
    } catch (err) {
      error.value =
        err.response?.data?.message ||
        err.message ||
        'Failed to create cash movement';
      console.error('Error creating cash movement:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const fetchSummary = async (filters = {}) => {
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
        `${apiConfig.baseURL}/cash-movements/summary?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );

      if (response.data.success) {
        summary.value = response.data.data;
        return response.data.data;
      } else {
        throw new Error(
          response.data.message || 'Failed to fetch cash movement summary'
        );
      }
    } catch (err) {
      error.value =
        err.response?.data?.message ||
        err.message ||
        'Failed to fetch cash movement summary';
      console.error('Error fetching cash movement summary:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Utility actions
  const clearError = () => {
    error.value = null;
  };

  const clearMovements = () => {
    movements.value = [];
    summary.value = [];
    pagination.value = {
      total: 0,
      limit: 20,
      offset: 0,
      pages: 0,
    };
  };

  return {
    // State
    movements,
    summary,
    loading,
    error,
    pagination,

    // Getters
    inflowMovements,
    outflowMovements,
    movementsByBranch,

    // Actions
    fetchMovements,
    createMovement,
    fetchSummary,
    clearError,
    clearMovements,
  };
});
