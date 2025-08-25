import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

export const useGRNStore = defineStore('grn', () => {
  // State
  const grns = ref([]);
  const loading = ref(false);
  const error = ref(null);

  // Getters
  const grnCount = computed(() => grns.value.length);
  const hasGRNs = computed(() => grns.value.length > 0);
  const draftGRNs = computed(() =>
    grns.value.filter((grn) => grn.status === 'draft')
  );
  const pendingInspectionGRNs = computed(() =>
    grns.value.filter((grn) => grn.status === 'pending_inspection')
  );
  const completedGRNs = computed(() =>
    grns.value.filter((grn) => grn.status === 'completed')
  );

  // Actions
  const fetchGRNs = async (filters = {}) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await axios.get(`${API_BASE_URL}/grn`, {
        params: filters,
      });

      if (response.data.success) {
        grns.value = response.data.data || [];
      } else {
        throw new Error(response.data.message || 'Failed to fetch GRNs');
      }
    } catch (err) {
      error.value =
        err.response?.data?.message || err.message || 'Failed to fetch GRNs';
      console.error('Error fetching GRNs:', err);
    } finally {
      loading.value = false;
    }
  };

  const fetchGRNById = async (id) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await axios.get(`${API_BASE_URL}/grn/${id}`);

      if (response.data.success) {
        return response.data.data;
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

  // Quality inspection methods
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

  return {
    // State
    grns,
    loading,
    error,

    // Getters
    grnCount,
    hasGRNs,
    draftGRNs,
    pendingInspectionGRNs,
    completedGRNs,

    // Actions
    fetchGRNs,
    fetchGRNById,
    createGRNFromPO,
    updateGRNStatus,
    performQualityInspection,
    performBulkQualityInspection,
    fetchActiveItemTypes,
    mapGrnItemType,
    clearError,
  };
});
