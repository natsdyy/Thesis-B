import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import axios from 'axios';
import { apiConfig } from '../config/api.js';

const API_BASE_URL = apiConfig.baseURL;

export const useGRNStore = defineStore('grn', () => {
  // State
  const grns = ref([]);
  const loading = ref(false);
  const error = ref(null);
  const lastFetchTime = ref(null);
  const cacheTimeout = 5 * 60 * 1000; // 5 minutes

  // Enhanced caching for individual GRNs
  const grnCache = ref(new Map());
  const grnCacheTimeout = 2 * 60 * 1000; // 2 minutes for individual GRNs

  // Stats for better performance
  const stats = ref({
    total: 0,
    draft: 0,
    pending_inspection: 0,
    passed: 0,
    failed: 0,
    completed: 0,
    today: 0,
    week: 0,
    month: 0,
  });

  // Getters
  const grnCount = computed(() => stats.value.total);
  const hasGRNs = computed(() => stats.value.total > 0);
  const draftGRNs = computed(() => stats.value.draft);
  const pendingInspectionGRNs = computed(() => stats.value.pending_inspection);
  const completedGRNs = computed(() => stats.value.completed);

  // Check if cache is still valid
  const isCacheValid = computed(() => {
    return (
      lastFetchTime.value && Date.now() - lastFetchTime.value < cacheTimeout
    );
  });

  // Check if individual GRN cache is valid
  const isGRNCacheValid = (id) => {
    const cached = grnCache.value.get(id);
    return cached && Date.now() - cached.timestamp < grnCacheTimeout;
  };

  // Actions
  const fetchGRNs = async (filters = {}) => {
    // Return cached data if still valid and no specific filters
    if (isCacheValid.value && Object.keys(filters).length === 0) {
      return grns.value;
    }

    loading.value = true;
    error.value = null;

    try {
      const params = new URLSearchParams();

      // Add filters to params for server-side filtering
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
        `${API_BASE_URL}/grn?${params.toString()}`
      );

      if (response.data.success) {
        grns.value = response.data.data || [];

        // Update stats if provided by backend
        if (response.data.stats) {
          stats.value = response.data.stats;
        } else {
          // Fallback to client-side calculation
          stats.value = {
            total: grns.value.length,
            draft: grns.value.filter((g) => g.status === 'draft').length,
            pending_inspection: grns.value.filter(
              (g) => g.status === 'pending_inspection'
            ).length,
            passed: grns.value.filter((g) => g.status === 'passed').length,
            failed: grns.value.filter((g) => g.status === 'failed').length,
            completed: grns.value.filter((g) => g.status === 'completed')
              .length,
            today: 0,
            week: 0,
            month: 0,
          };
        }

        lastFetchTime.value = Date.now();
        return grns.value;
      } else {
        throw new Error(response.data.message || 'Failed to fetch GRNs');
      }
    } catch (err) {
      error.value =
        err.response?.data?.message || err.message || 'Failed to fetch GRNs';
      console.error('Error fetching GRNs:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Optimized fetch with stats
  const fetchGRNsWithStats = async (filters = {}) => {
    return await fetchGRNs({ ...filters, include_stats: true });
  };

  // Fetch stats separately
  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/grn/stats`);
      if (response.data.success) {
        stats.value = response.data.data;
        return stats.value;
      }
    } catch (err) {
      console.error('Error fetching GRN stats:', err);
      throw err;
    }
  };

  const fetchGRNById = async (id, useCache = true) => {
    // Check cache first if enabled
    if (useCache && isGRNCacheValid(id)) {
      return grnCache.value.get(id).data;
    }

    loading.value = true;
    error.value = null;

    try {
      const response = await axios.get(`${API_BASE_URL}/grn/${id}`);

      if (response.data.success) {
        const grnData = response.data.data;

        // Cache the GRN data
        grnCache.value.set(id, {
          data: grnData,
          timestamp: Date.now(),
        });

        return grnData;
      } else {
        throw new Error(response.data.message || 'Failed to fetch GRN');
      }
    } catch (err) {
      error.value =
        err.response?.data?.message || err.message || 'Failed to fetch GRN';
      console.error('Error fetching GRN:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const checkGRNCreationEligibility = async (poId) => {
    error.value = null;

    try {
      const response = await axios.get(
        `${API_BASE_URL}/purchase-orders/${poId}/can-create-grn`
      );

      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(
          response.data.message || 'Failed to check GRN eligibility'
        );
      }
    } catch (err) {
      error.value =
        err.response?.data?.message ||
        err.message ||
        'Failed to check GRN eligibility';
      console.error('Error checking GRN eligibility:', err);
      throw err;
    }
  };

  const createGRNFromPO = async (poId, grnData) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await axios.post(
        `${API_BASE_URL}/grn/from-po/${poId}`,
        grnData
      );

      if (response.data.success) {
        // Add the new GRN to the beginning of the list
        grns.value.unshift(response.data.data);
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to create GRN');
      }
    } catch (err) {
      error.value =
        err.response?.data?.message || err.message || 'Failed to create GRN';
      console.error('Error creating GRN:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const updateGRNStatus = async (id, status, updatedBy, notes = null) => {
    // Don't set global loading for status updates to avoid blocking UI
    error.value = null;

    try {
      const response = await axios.patch(`${API_BASE_URL}/grn/${id}/status`, {
        status,
        updated_by: updatedBy,
        notes,
      });

      if (response.data.success) {
        // Update the GRN in the list immediately
        const index = grns.value.findIndex((grn) => grn.id === id);
        if (index !== -1) {
          grns.value[index] = response.data.data;
        }

        // Update stats if provided
        if (response.data.stats) {
          stats.value = response.data.stats;
        }

        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to update GRN status');
      }
    } catch (err) {
      error.value =
        err.response?.data?.message ||
        err.message ||
        'Failed to update GRN status';
      console.error('Error updating GRN status:', err);
      throw err;
    }
  };

  const clearError = () => {
    error.value = null;
  };

  // Quality inspection methods with stats update
  const performQualityInspection = async (
    grnId,
    grnItemId,
    result,
    notes = null,
    inspectionCriteria = null
  ) => {
    error.value = null;

    try {
      const response = await axios.post(
        `${API_BASE_URL}/grn/${grnId}/items/${grnItemId}/inspect`,
        {
          result,
          notes,
          inspection_criteria: inspectionCriteria,
          inspector_id: 4, // Hardcoded for now - should come from auth store
        }
      );

      if (response.data.success) {
        // Update the GRN in the store
        const updatedGRN = response.data.data;
        const index = grns.value.findIndex((grn) => grn.id === grnId);
        if (index !== -1) {
          grns.value[index] = updatedGRN;
        }

        // Update stats if provided
        if (response.data.stats) {
          stats.value = response.data.stats;
        }

        return updatedGRN;
      }
    } catch (err) {
      error.value =
        err.response?.data?.message || 'Failed to perform quality inspection';
      throw err;
    }
  };

  const performBulkQualityInspection = async (grnId, result, notes = null) => {
    error.value = null;

    try {
      const response = await axios.post(
        `${API_BASE_URL}/grn/${grnId}/bulk-inspect`,
        {
          result,
          notes,
          inspector_id: 4, // Hardcoded for now - should come from auth store
        }
      );

      if (response.data.success) {
        // Update the GRN in the store
        const updatedGRN = response.data.data;
        const index = grns.value.findIndex((grn) => grn.id === grnId);
        if (index !== -1) {
          grns.value[index] = updatedGRN;
        }

        // Update stats if provided
        if (response.data.stats) {
          stats.value = response.data.stats;
        }

        return updatedGRN;
      }
    } catch (err) {
      error.value =
        err.response?.data?.message ||
        'Failed to perform bulk quality inspection';
      throw err;
    }
  };

  // Item type mapping helpers
  const fetchActiveItemTypes = async () => {
    error.value = null;
    const { data } = await axios.get(
      `${API_BASE_URL}/grn/meta/active-item-types`
    );
    return data.data || [];
  };

  const mapGrnItemType = async (grnId, grnItemId, itemTypeId) => {
    error.value = null;
    const { data } = await axios.post(
      `${API_BASE_URL}/grn/${grnId}/items/${grnItemId}/map-item-type`,
      { item_type_id: itemTypeId }
    );
    // Update local grn
    const updatedGRN = data.data;
    const index = grns.value.findIndex((grn) => grn.id === grnId);
    if (index !== -1) grns.value[index] = updatedGRN;
    return updatedGRN;
  };

  const updateGRNInventoryData = async (grnId) => {
    error.value = null;
    try {
      const response = await axios.post(
        `${API_BASE_URL}/grn/${grnId}/update-inventory-data`
      );

      if (response.data.success) {
        // Clear cache and refresh the GRN
        grnCache.value.delete(grnId);
        return response.data;
      } else {
        throw new Error(
          response.data.message || 'Failed to update inventory data'
        );
      }
    } catch (err) {
      error.value =
        err.response?.data?.message ||
        err.message ||
        'Failed to update inventory data';
      console.error('Error updating GRN inventory data:', err);
      throw err;
    }
  };

  // Clear all caches
  const clearCaches = () => {
    lastFetchTime.value = null;
    grnCache.value.clear();
  };

  // Clear specific GRN cache
  const clearGRNCache = (id) => {
    if (id) {
      grnCache.value.delete(id);
    } else {
      grnCache.value.clear();
    }
  };

  return {
    // State
    grns,
    loading,
    error,
    stats,

    // Getters
    grnCount,
    hasGRNs,
    draftGRNs,
    pendingInspectionGRNs,
    completedGRNs,

    // Actions
    fetchGRNs,
    fetchGRNsWithStats,
    fetchStats,
    fetchGRNById,
    checkGRNCreationEligibility,
    createGRNFromPO,
    updateGRNStatus,
    performQualityInspection,
    performBulkQualityInspection,
    fetchActiveItemTypes,
    mapGrnItemType,
    updateGRNInventoryData,
    clearError,
    clearCaches,
    clearGRNCache,
  };
});
