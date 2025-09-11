import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import axios from 'axios';
import { apiConfig } from '../config/api.js';

export const useBranchDistributionStore = defineStore(
  'branchDistribution',
  () => {
    const API_BASE_URL = apiConfig.baseURL;
    // State
    const distributions = ref([]);
    const currentDistribution = ref(null);
    const loading = ref(false);
    const error = ref(null);
    const pagination = ref({
      page: 1,
      limit: 20,
      total: 0,
      pages: 0,
    });

    // Getters
    const isLoading = computed(() => loading.value);
    const hasError = computed(() => !!error.value);
    const totalDistributions = computed(() => pagination.value.total);

    // Actions
    const clearError = () => {
      error.value = null;
    };

    /**
     * Create a new branch distribution
     * @param {Object} distributionData - The distribution data
     * @returns {Promise<Object>} Created distribution
     */
    const createDistribution = async (distributionData) => {
      loading.value = true;
      error.value = null;

      try {
        const response = await axios.post(
          `${API_BASE_URL}/branch-distributions`,
          distributionData
        );

        if (response.data.success) {
          const createdDistribution = response.data.data;
          distributions.value.unshift(createdDistribution);

          return createdDistribution;
        } else {
          throw new Error(
            response.data.message || 'Failed to create distribution'
          );
        }
      } catch (err) {
        const errorMessage =
          err.response?.data?.message ||
          err.message ||
          'Failed to create distribution';
        error.value = errorMessage;

        throw err;
      } finally {
        loading.value = false;
      }
    };

    /**
     * Fetch all distributions with pagination and filters
     * @param {Object} options - Query options
     * @returns {Promise<Object>} Paginated distributions
     */
    const fetchDistributions = async (options = {}) => {
      loading.value = true;
      error.value = null;

      try {
        const params = {
          page: options.page || 1,
          limit: options.limit || 20,
          ...options,
        };

        const response = await axios.get(
          `${API_BASE_URL}/branch-distributions`,
          { params }
        );

        if (response.data.success) {
          distributions.value = response.data.data;
          pagination.value = response.data.pagination;
          return response.data;
        } else {
          throw new Error(
            response.data.message || 'Failed to fetch distributions'
          );
        }
      } catch (err) {
        const errorMessage =
          err.response?.data?.message ||
          err.message ||
          'Failed to fetch distributions';
        error.value = errorMessage;

        throw err;
      } finally {
        loading.value = false;
      }
    };

    /**
     * Fetch distributions for a specific branch
     * @param {number} branchId - Branch ID
     * @param {Object} options - Query options
     * @returns {Promise<Object>} Paginated distributions
     */
    const fetchDistributionsByBranch = async (branchId, options = {}) => {
      loading.value = true;
      error.value = null;

      try {
        const params = {
          page: options.page || 1,
          limit: options.limit || 20,
          ...options,
        };

        const response = await axios.get(
          `${API_BASE_URL}/branch-distributions/branch/${branchId}`,
          { params }
        );

        if (response.data.success) {
          distributions.value = response.data.data;
          pagination.value = response.data.pagination;
          return response.data;
        } else {
          throw new Error(
            response.data.message || 'Failed to fetch branch distributions'
          );
        }
      } catch (err) {
        const errorMessage =
          err.response?.data?.message ||
          err.message ||
          'Failed to fetch branch distributions';
        error.value = errorMessage;

        throw err;
      } finally {
        loading.value = false;
      }
    };

    /**
     * Fetch a distribution by ID
     * @param {number} id - Distribution ID
     * @returns {Promise<Object>} Distribution with items
     */
    const fetchDistributionById = async (id) => {
      loading.value = true;
      error.value = null;

      try {
        const response = await axios.get(
          `${API_BASE_URL}/branch-distributions/${id}`
        );

        if (response.data.success) {
          currentDistribution.value = response.data.data;
          return response.data.data;
        } else {
          throw new Error(response.data.message || 'Distribution not found');
        }
      } catch (err) {
        const errorMessage =
          err.response?.data?.message ||
          err.message ||
          'Failed to fetch distribution';
        error.value = errorMessage;

        throw err;
      } finally {
        loading.value = false;
      }
    };

    /**
     * Fetch a distribution by reference
     * @param {string} reference - Distribution reference
     * @returns {Promise<Object>} Distribution with items
     */
    const fetchDistributionByReference = async (reference) => {
      loading.value = true;
      error.value = null;

      try {
        const response = await axios.get(
          `${API_BASE_URL}/branch-distributions/reference/${reference}`
        );

        if (response.data.success) {
          currentDistribution.value = response.data.data;
          return response.data.data;
        } else {
          throw new Error(response.data.message || 'Distribution not found');
        }
      } catch (err) {
        const errorMessage =
          err.response?.data?.message ||
          err.message ||
          'Failed to fetch distribution';
        error.value = errorMessage;

        throw err;
      } finally {
        loading.value = false;
      }
    };

    /**
     * Delete a distribution (soft delete)
     * @param {number} id - Distribution ID
     * @returns {Promise<boolean>} Success status
     */
    const deleteDistribution = async (id) => {
      loading.value = true;
      error.value = null;

      try {
        const response = await axios.delete(
          `${API_BASE_URL}/branch-distributions/${id}`
        );

        if (response.data.success) {
          // Remove from local state
          distributions.value = distributions.value.filter((d) => d.id !== id);

          return true;
        } else {
          throw new Error(
            response.data.message || 'Failed to delete distribution'
          );
        }
      } catch (err) {
        const errorMessage =
          err.response?.data?.message ||
          err.message ||
          'Failed to delete distribution';
        error.value = errorMessage;

        throw err;
      } finally {
        loading.value = false;
      }
    };

    /**
     * Update distribution status (delivered/completed)
     */
    const updateDistributionStatus = async (id, status) => {
      loading.value = true;
      error.value = null;
      try {
        const response = await axios.patch(
          `${API_BASE_URL}/branch-distributions/${id}/status`,
          { status }
        );
        if (response.data.success) {
          distributions.value = distributions.value.map((d) =>
            d.id === id ? { ...d, status } : d
          );
          if (
            currentDistribution.value &&
            currentDistribution.value.id === id
          ) {
            currentDistribution.value.status = status;
          }
          return response.data.data;
        } else {
          throw new Error(response.data.message || 'Failed to update status');
        }
      } catch (err) {
        const errorMessage =
          err.response?.data?.message ||
          err.message ||
          'Failed to update status';
        error.value = errorMessage;
        toast.error(errorMessage);
        throw err;
      } finally {
        loading.value = false;
      }
    };

    /**
     * Clear current distribution
     */
    const clearCurrentDistribution = () => {
      currentDistribution.value = null;
    };

    /**
     * Clear all distributions
     */
    const clearDistributions = () => {
      distributions.value = [];
      pagination.value = {
        page: 1,
        limit: 20,
        total: 0,
        pages: 0,
      };
    };

    /**
     * Update pagination
     * @param {Object} newPagination - New pagination data
     */
    const updatePagination = (newPagination) => {
      pagination.value = { ...pagination.value, ...newPagination };
    };

    /**
     * Get distribution summary for dashboard
     * @returns {Object} Summary statistics
     */
    const getDistributionSummary = computed(() => {
      const totalAmount = distributions.value.reduce(
        (sum, dist) => sum + parseFloat(dist.total_amount || 0),
        0
      );
      const totalItems = distributions.value.length;
      const recentDistributions = distributions.value.slice(0, 5);

      return {
        totalAmount,
        totalItems,
        recentDistributions,
        averageAmount: totalItems > 0 ? totalAmount / totalItems : 0,
      };
    });

    return {
      // State
      distributions,
      currentDistribution,
      loading,
      error,
      pagination,

      // Getters
      isLoading,
      hasError,
      totalDistributions,
      getDistributionSummary,

      // Actions
      clearError,
      createDistribution,
      fetchDistributions,
      fetchDistributionsByBranch,
      fetchDistributionById,
      fetchDistributionByReference,
      deleteDistribution,
      updateDistributionStatus,
      clearCurrentDistribution,
      clearDistributions,
      updatePagination,
    };
  }
);
