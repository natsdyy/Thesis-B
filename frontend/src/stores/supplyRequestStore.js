// frontend/src/stores/supplyRequestStore.js
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import axios from 'axios';
import { apiConfig } from '../config/api.js';

const API_BASE_URL = apiConfig.baseURL;

export const useSupplyRequestStore = defineStore('supplyRequest', () => {
  // State
  const requests = ref([]);
  const currentRequest = ref(null);
  const loading = ref(false);
  const error = ref(null);
  const stats = ref({
    total_requests: 0,
    to_request: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    cancelled: 0,
    budget_released: 0,
    completed: 0,
    total_approved_amount: 0,
    total_completed_amount: 0,
  });

  // Getters
  const requestsByStatus = computed(() => (status) => {
    return requests.value.filter(
      (request) => request.request_status === status
    );
  });

  const requestsByDate = computed(() => (date) => {
    return requests.value.filter(
      (request) =>
        request.request_date === date && request.request_status !== 'Cancelled'
    );
  });

  const pendingRequests = computed(() => {
    return requests.value.filter(
      (request) => request.request_status === 'Pending'
    );
  });

  const toRequestRequests = computed(() => {
    return requests.value.filter(
      (request) => request.request_status === 'To Request'
    );
  });

  const approvedRequests = computed(() => {
    return requests.value.filter(
      (request) => request.request_status === 'Approved'
    );
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
        `${API_BASE_URL}/supply-requests?${params.toString()}`
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
      console.error('Error fetching supply requests:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const fetchRequestById = async (id) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await axios.get(`${API_BASE_URL}/supply-requests/${id}`);

      if (response.data.success) {
        currentRequest.value = response.data.data;
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to fetch request');
      }
    } catch (err) {
      error.value =
        err.response?.data?.message || err.message || 'Failed to fetch request';
      console.error('Error fetching supply request:', err);
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
        `${API_BASE_URL}/supply-requests/request/${requestId}`
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
      console.error('Error fetching supply request by request ID:', err);
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
          item_unit: item.item_unit,
          item_type: item.item_type,
          item_unit_price: item.item_unitPrice || item.item_unit_price,
          item_notes: item.item_notes || null,
          // Optional linkage to branch inventory or production menu item
          inventory_item_id: item.inventory_item_id || null,
          menu_item_id: item.menu_item_id || null,
          category: item.category || null,
          source: item.source || null,
        })),
      };

      const response = await axios.post(
        `${API_BASE_URL}/supply-requests`,
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
      console.error('Error creating supply request:', err);
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
          item_unit: item.item_unit,
          item_type: item.item_type,
          item_unit_price: item.item_unitPrice || item.item_unit_price,
          item_notes: item.item_notes || null,
          inventory_item_id: item.inventory_item_id || null,
          menu_item_id: item.menu_item_id || null,
          category: item.category || null,
          source: item.source || null,
        }));
      }

      const response = await axios.put(
        `${API_BASE_URL}/supply-requests/${id}`,
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
      console.error('Error updating supply request:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const updateRequestStatus = async (id, status, updatedBy, remarks = null) => {
    loading.value = true;
    error.value = null;

    try {
      const payload = {
        status,
        updated_by: updatedBy,
        remarks,
      };

      const response = await axios.patch(
        `${API_BASE_URL}/supply-requests/${id}/status`,
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
      console.error('Error updating request status:', err);
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
        `${API_BASE_URL}/supply-requests/${id}`
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
      console.error('Error deleting supply request:', err);
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
        `${API_BASE_URL}/supply-requests/status/${status}`
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
      console.error('Error fetching requests by status:', err);
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
        `${API_BASE_URL}/supply-requests/stats?${params.toString()}`
      );

      if (response.data.success) {
        stats.value = response.data.data;
        return response.data.data;
      }
    } catch (err) {
      console.error('Error fetching supply request stats:', err);
    }
  };

  // Status transition helpers
  const sendRequest = async (id, updatedBy) => {
    return await updateRequestStatus(
      id,
      'Pending',
      updatedBy,
      'Request sent for approval'
    );
  };

  const approveRequest = async (id, updatedBy, remarks = null) => {
    return await updateRequestStatus(
      id,
      'Approved',
      updatedBy,
      remarks || 'Request approved'
    );
  };

  const rejectRequest = async (id, updatedBy, remarks) => {
    if (!remarks || remarks.trim() === '') {
      throw new Error('Remarks are required for rejection');
    }
    return await updateRequestStatus(id, 'Rejected', updatedBy, remarks);
  };

  const cancelRequest = async (id, updatedBy) => {
    return await updateRequestStatus(
      id,
      'Cancelled',
      updatedBy,
      'Request cancelled by SCM'
    );
  };

  const sendBackRequest = async (id, updatedBy, remarks) => {
    if (!remarks || remarks.trim() === '') {
      throw new Error('Remarks are required for sending back request');
    }
    return await updateRequestStatus(id, 'Sent Back', updatedBy, remarks);
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
    pendingRequests,
    toRequestRequests,
    approvedRequests,

    // Actions
    fetchRequests,
    fetchRequestById,
    fetchRequestByRequestId,
    createRequest,
    updateRequest,
    updateRequestStatus,
    deleteRequest,
    fetchRequestsByStatus,
    fetchStats,
    sendRequest,
    approveRequest,
    rejectRequest,
    cancelRequest,
    sendBackRequest,
  };
});
