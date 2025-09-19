// frontend/src/stores/branchRequestStore.js
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import axios from 'axios';
import { apiConfig } from '../config/api.js';

export const useBranchRequestStore = defineStore('branchRequest', () => {
  // State
  const requests = ref([]);
  const currentRequest = ref(null);
  const loading = ref(false);
  const error = ref(null);
  const stats = ref({
    total_requests: 0,
    draft: 0,
    sent: 0,
    acknowledged: 0,
    in_progress: 0,
    completed: 0,
    cancelled: 0,
  });

  // Getters
  const requestsByStatus = computed(() => (status) => {
    return requests.value.filter((request) => request.status === status);
  });

  const requestsByDate = computed(() => (date) => {
    return requests.value.filter(
      (request) =>
        request.request_date === date && request.status !== 'Cancelled'
    );
  });

  const draftRequests = computed(() => {
    return requests.value.filter((request) => request.status === 'Draft');
  });

  const sentRequests = computed(() => {
    return requests.value.filter((request) => request.status === 'Sent');
  });

  const acknowledgedRequests = computed(() => {
    return requests.value.filter(
      (request) => request.status === 'Acknowledged'
    );
  });

  const inProgressRequests = computed(() => {
    return requests.value.filter((request) => request.status === 'In Progress');
  });

  const completedRequests = computed(() => {
    return requests.value.filter((request) => request.status === 'Completed');
  });

  // Actions
  const fetchRequests = async (filters = {}) => {
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
        `${apiConfig.baseURL}/branch-requests?${params.toString()}`
      );

      if (response.data.success) {
        requests.value = response.data.data;
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to fetch requests');
      }
    } catch (err) {
      error.value =
        err.response?.data?.message ||
        err.message ||
        'Failed to fetch requests';
      console.error('Error fetching branch requests:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const fetchRequestsWithItems = async (filters = {}) => {
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
        `${apiConfig.baseURL}/branch-requests/with-items?${params.toString()}`
      );

      if (response.data.success) {
        requests.value = response.data.data;
        return response.data.data;
      } else {
        throw new Error(
          response.data.message || 'Failed to fetch requests with items'
        );
      }
    } catch (err) {
      error.value =
        err.response?.data?.message ||
        err.message ||
        'Failed to fetch requests with items';
      console.error('Error fetching branch requests with items:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const fetchRequestById = async (id) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await axios.get(
        `${apiConfig.baseURL}/branch-requests/${id}`
      );

      if (response.data.success) {
        currentRequest.value = response.data.data;
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to fetch request');
      }
    } catch (err) {
      error.value =
        err.response?.data?.message || err.message || 'Failed to fetch request';
      console.error('Error fetching branch request:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const fetchRequestByRequestId = async (requestId) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await axios.get(
        `${apiConfig.baseURL}/branch-requests/request/${requestId}`
      );

      if (response.data.success) {
        currentRequest.value = response.data.data;
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to fetch request');
      }
    } catch (err) {
      error.value =
        err.response?.data?.message || err.message || 'Failed to fetch request';
      console.error('Error fetching branch request by request ID:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const createRequest = async (requestData, items) => {
    loading.value = true;
    error.value = null;

    try {
      const payload = {
        ...requestData,
        items: items.map((item) => ({
          item_name: item.item_name,
          item_quantity: item.item_quantity,
          item_unit: item.item_unit || 'pieces',
          item_type: item.item_type || 'General',
          item_notes: item.item_notes || null,
          unit_price: item.unit_price ?? null,
          category: item.category ?? null,
          inventory_item_id: item.inventory_item_id ?? null,
          menu_item_id: item.menu_item_id ?? null,
        })),
      };

      const response = await axios.post(
        `${apiConfig.baseURL}/branch-requests`,
        payload
      );

      if (response.data.success) {
        requests.value.unshift(response.data.data);
        await fetchStats();
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to create request');
      }
    } catch (err) {
      error.value =
        err.response?.data?.message ||
        err.message ||
        'Failed to create request';
      console.error('Error creating branch request:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const updateRequest = async (id, requestData, items = null) => {
    loading.value = true;
    error.value = null;

    try {
      const payload = { ...requestData };

      if (items) {
        payload.items = items.map((item) => ({
          item_name: item.item_name,
          item_quantity: item.item_quantity,
          item_unit: item.item_unit || 'pieces',
          item_type: item.item_type || 'General',
          item_notes: item.item_notes || null,
          unit_price: item.unit_price ?? null,
          category: item.category ?? null,
          inventory_item_id: item.inventory_item_id ?? null,
          menu_item_id: item.menu_item_id ?? null,
        }));
      }

      const response = await axios.put(
        `${apiConfig.baseURL}/branch-requests/${id}`,
        payload
      );

      if (response.data.success) {
        const index = requests.value.findIndex((r) => r.id === id);
        if (index !== -1) {
          requests.value[index] = response.data.data;
        }
        await fetchStats();
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to update request');
      }
    } catch (err) {
      error.value =
        err.response?.data?.message ||
        err.message ||
        'Failed to update request';
      console.error('Error updating branch request:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const updateRequestStatus = async (id, status, updatedBy, notes = null) => {
    loading.value = true;
    error.value = null;

    try {
      const payload = {
        status,
        updated_by: updatedBy,
        notes,
      };

      const response = await axios.patch(
        `${apiConfig.baseURL}/branch-requests/${id}/status`,
        payload
      );

      if (response.data.success) {
        const index = requests.value.findIndex((r) => r.id === id);
        if (index !== -1) {
          requests.value[index] = {
            ...requests.value[index],
            ...response.data.data,
          };
        }
        await fetchStats();
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to update status');
      }
    } catch (err) {
      error.value =
        err.response?.data?.message || err.message || 'Failed to update status';
      console.error('Error updating branch request status:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const deleteRequest = async (id) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await axios.delete(
        `${apiConfig.baseURL}/branch-requests/${id}`
      );

      if (response.data.success) {
        requests.value = requests.value.filter((r) => r.id !== id);
        await fetchStats();
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to delete request');
      }
    } catch (err) {
      error.value =
        err.response?.data?.message ||
        err.message ||
        'Failed to delete request';
      console.error('Error deleting branch request:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const fetchRequestsByStatus = async (status) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await axios.get(
        `${apiConfig.baseURL}/branch-requests/status/${status}`
      );

      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(
          response.data.message || 'Failed to fetch requests by status'
        );
      }
    } catch (err) {
      error.value =
        err.response?.data?.message ||
        err.message ||
        'Failed to fetch requests by status';
      console.error('Error fetching branch requests by status:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const fetchRequestsByBranch = async (branchId, filters = {}) => {
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
        `${apiConfig.baseURL}/branch-requests/branch/${branchId}?${params.toString()}`
      );

      if (response.data.success) {
        requests.value = response.data.data;
        return response.data.data;
      } else {
        throw new Error(
          response.data.message || 'Failed to fetch branch requests'
        );
      }
    } catch (err) {
      error.value =
        err.response?.data?.message ||
        err.message ||
        'Failed to fetch branch requests';
      console.error('Error fetching branch requests:', err);
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
        `${apiConfig.baseURL}/branch-requests/stats?${params.toString()}`
      );

      if (response.data.success) {
        stats.value = response.data.data;
        return response.data.data;
      }
    } catch (err) {
      console.error('Error fetching branch request stats:', err);
    }
  };

  // Status transition helpers
  const sendRequest = async (id, updatedBy) => {
    return await updateRequestStatus(
      id,
      'Sent',
      updatedBy,
      'Request sent to main office'
    );
  };

  const acknowledgeRequest = async (id, updatedBy, notes = null) => {
    return await updateRequestStatus(
      id,
      'Acknowledged',
      updatedBy,
      notes || 'Request acknowledged by main office'
    );
  };

  const markInProgress = async (id, updatedBy, notes = null) => {
    return await updateRequestStatus(
      id,
      'In Progress',
      updatedBy,
      notes || 'Request is being processed'
    );
  };

  const completeRequest = async (id, updatedBy, notes = null) => {
    return await updateRequestStatus(
      id,
      'Completed',
      updatedBy,
      notes || 'Request completed'
    );
  };

  const cancelRequest = async (id, updatedBy) => {
    return await updateRequestStatus(
      id,
      'Cancelled',
      updatedBy,
      'Request cancelled'
    );
  };

  // Auto-map availability for a branch request (SCM helper)
  const autoMapRequest = async (id) => {
    try {
      const response = await axios.get(
        `${apiConfig.baseURL}/branch-requests/${id}/auto-map`
      );
      if (response.data && response.data.success) return response.data.data;
      throw new Error(response.data?.message || 'Auto-map failed');
    } catch (err) {
      console.error('Error auto-mapping branch request:', err);
      throw err;
    }
  };

  return {
    // State
    requests,
    currentRequest,
    loading,
    error,
    stats,

    // Getters
    requestsByStatus,
    requestsByDate,
    draftRequests,
    sentRequests,
    acknowledgedRequests,
    inProgressRequests,
    completedRequests,

    // Actions
    fetchRequests,
    fetchRequestsWithItems,
    fetchRequestById,
    fetchRequestByRequestId,
    createRequest,
    updateRequest,
    updateRequestStatus,
    deleteRequest,
    fetchRequestsByStatus,
    fetchRequestsByBranch,
    fetchStats,
    sendRequest,
    acknowledgeRequest,
    markInProgress,
    completeRequest,
    cancelRequest,
    autoMapRequest,
  };
});
