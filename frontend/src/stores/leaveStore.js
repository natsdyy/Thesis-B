import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import axios from 'axios';
import { apiConfig, getApiUrl } from '../config/api.js';

export const useLeaveStore = defineStore('leave', () => {
  // State
  const myLeaveRequests = ref([]);
  const allLeaveRequests = ref([]);
  const pendingManagerApprovals = ref([]);
  const pendingHRApprovals = ref([]);
  const departmentEmployeeRequests = ref([]);
  const loading = ref(false);
  const error = ref(null);

  // Getters
  const pendingRequests = computed(() => {
    return myLeaveRequests.value.filter((req) => req.status === 'pending');
  });

  const approvedRequests = computed(() => {
    return myLeaveRequests.value.filter(
      (req) => req.status === 'approved_by_hr'
    );
  });

  const rejectedRequests = computed(() => {
    return myLeaveRequests.value.filter((req) => req.status === 'rejected');
  });

  const managerApprovedRequests = computed(() => {
    return myLeaveRequests.value.filter(
      (req) => req.status === 'approved_by_manager'
    );
  });

  // Actions
  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    };
  };

  // Fetch my leave requests
  const fetchMyLeaveRequests = async (page = 1, limit = 20) => {
    try {
      loading.value = true;
      error.value = null;

      const response = await axios.get(
        getApiUrl(`/leave/my-requests?page=${page}&limit=${limit}`),
        getAuthHeaders()
      );

      if (response.data.success) {
        myLeaveRequests.value = response.data.data || [];
        return response.data.data;
      } else {
        throw new Error(response.data.message);
      }
    } catch (err) {
      error.value = err.response?.data?.message || err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Create a new leave request
  const createLeaveRequest = async (leaveData) => {
    try {
      loading.value = true;
      error.value = null;

      const response = await axios.post(
        getApiUrl('/leave'),
        leaveData,
        getAuthHeaders()
      );

      if (response.data.success) {
        // Refresh the list after creating
        await fetchMyLeaveRequests();
        return response.data.data;
      } else {
        throw new Error(response.data.message);
      }
    } catch (err) {
      error.value = err.response?.data?.message || err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Update leave request
  const updateLeaveRequest = async (id, updateData) => {
    try {
      loading.value = true;
      error.value = null;

      const response = await axios.put(
        getApiUrl(`/leave/${id}`),
        updateData,
        getAuthHeaders()
      );

      if (response.data.success) {
        // Refresh the list after updating
        await fetchMyLeaveRequests();
        return response.data.data;
      } else {
        throw new Error(response.data.message);
      }
    } catch (err) {
      error.value = err.response?.data?.message || err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Delete leave request
  const deleteLeaveRequest = async (id) => {
    try {
      loading.value = true;
      error.value = null;

      const response = await axios.delete(
        getApiUrl(`/leave/${id}`),
        getAuthHeaders()
      );

      if (response.data.success) {
        // Refresh the list after deleting
        await fetchMyLeaveRequests();
        return true;
      } else {
        throw new Error(response.data.message);
      }
    } catch (err) {
      error.value = err.response?.data?.message || err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Get all leave requests (for managers/HR)
  const fetchAllLeaveRequests = async (filters = {}) => {
    try {
      loading.value = true;
      error.value = null;

      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.branch_id) params.append('branch_id', filters.branch_id);
      if (filters.department) params.append('department', filters.department);
      if (filters.page) params.append('page', filters.page);
      if (filters.limit) params.append('limit', filters.limit);

      const response = await axios.get(
        getApiUrl(`/leave?${params.toString()}`),
        getAuthHeaders()
      );

      if (response.data.success) {
        allLeaveRequests.value = response.data.data || [];
        return {
          data: response.data.data,
          pagination: response.data.pagination,
        };
      } else {
        throw new Error(response.data.message);
      }
    } catch (err) {
      error.value = err.response?.data?.message || err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Get leave request by ID
  const fetchLeaveRequestById = async (id) => {
    try {
      loading.value = true;
      error.value = null;

      const response = await axios.get(
        getApiUrl(`/leave/${id}`),
        getAuthHeaders()
      );

      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.message);
      }
    } catch (err) {
      error.value = err.response?.data?.message || err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Approve by manager
  const approveByManager = async (id, notes = null) => {
    try {
      loading.value = true;
      error.value = null;

      const response = await axios.post(
        getApiUrl(`/leave/${id}/approve-manager`),
        { notes },
        getAuthHeaders()
      );

      if (response.data.success) {
        // Refresh relevant lists
        await Promise.all([
          fetchMyLeaveRequests(),
          fetchPendingManagerApprovals(),
        ]);
        return response.data.data;
      } else {
        throw new Error(response.data.message);
      }
    } catch (err) {
      error.value = err.response?.data?.message || err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Approve by HR
  const approveByHR = async (id, notes = null) => {
    try {
      loading.value = true;
      error.value = null;

      const response = await axios.post(
        getApiUrl(`/leave/${id}/approve-hr`),
        { notes },
        getAuthHeaders()
      );

      if (response.data.success) {
        // Refresh relevant lists
        await Promise.all([fetchMyLeaveRequests(), fetchPendingHRApprovals()]);
        return response.data.data;
      } else {
        throw new Error(response.data.message);
      }
    } catch (err) {
      error.value = err.response?.data?.message || err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Reject leave request
  const rejectLeaveRequest = async (id, rejectionReason) => {
    try {
      loading.value = true;
      error.value = null;

      const response = await axios.post(
        getApiUrl(`/leave/${id}/reject`),
        { rejection_reason: rejectionReason },
        getAuthHeaders()
      );

      if (response.data.success) {
        // Refresh relevant lists
        await Promise.all([
          fetchMyLeaveRequests(),
          fetchPendingManagerApprovals(),
          fetchPendingHRApprovals(),
        ]);
        return response.data.data;
      } else {
        throw new Error(response.data.message);
      }
    } catch (err) {
      error.value = err.response?.data?.message || err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Fetch pending manager approvals
  const fetchPendingManagerApprovals = async (branchId = null) => {
    try {
      loading.value = true;
      error.value = null;

      const params = branchId ? `?branch_id=${branchId}` : '';
      const response = await axios.get(
        getApiUrl(`/leave/pending/manager${params}`),
        getAuthHeaders()
      );

      if (response.data.success) {
        pendingManagerApprovals.value = response.data.data || [];
        return response.data.data;
      } else {
        throw new Error(response.data.message);
      }
    } catch (err) {
      error.value = err.response?.data?.message || err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Fetch pending HR approvals
  const fetchPendingHRApprovals = async () => {
    try {
      loading.value = true;
      error.value = null;

      const response = await axios.get(
        getApiUrl('/leave/pending/hr'),
        getAuthHeaders()
      );

      if (response.data.success) {
        pendingHRApprovals.value = response.data.data || [];
        return response.data.data;
      } else {
        throw new Error(response.data.message);
      }
    } catch (err) {
      error.value = err.response?.data?.message || err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Fetch department employee requests (single approval)
  const fetchDepartmentEmployeeRequests = async () => {
    try {
      loading.value = true;
      error.value = null;

      const response = await axios.get(
        getApiUrl('/leave/department-employees'),
        getAuthHeaders()
      );

      if (response.data.success) {
        departmentEmployeeRequests.value = response.data.data || [];
        return response.data.data;
      } else {
        throw new Error(response.data.message);
      }
    } catch (err) {
      error.value = err.response?.data?.message || err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Clear error
  const clearError = () => {
    error.value = null;
  };

  // Fetch leave statistics
  const fetchLeaveStatistics = async (filters = {}) => {
    try {
      loading.value = true;
      error.value = null;

      const params = new URLSearchParams();
      if (filters.branch_id) params.append('branch_id', filters.branch_id);
      if (filters.department) params.append('department', filters.department);

      const response = await axios.get(
        getApiUrl(`/leave/stats?${params.toString()}`),
        getAuthHeaders()
      );

      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.message);
      }
    } catch (err) {
      error.value = err.response?.data?.message || err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Fetch completed/approved leave requests history
  const fetchLeaveHistory = async (filters = {}) => {
    try {
      loading.value = true;
      error.value = null;

      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.branch_id) params.append('branch_id', filters.branch_id);
      if (filters.department) params.append('department', filters.department);
      if (filters.page) params.append('page', filters.page);
      if (filters.limit) params.append('limit', filters.limit);

      const response = await axios.get(
        getApiUrl(`/leave/history?${params.toString()}`),
        getAuthHeaders()
      );

      if (response.data.success) {
        return {
          data: response.data.data,
          pagination: response.data.pagination,
        };
      } else {
        throw new Error(response.data.message);
      }
    } catch (err) {
      error.value = err.response?.data?.message || err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Fetch SIL credits for current employee
  const fetchSILCredits = async () => {
    try {
      loading.value = true;
      error.value = null;

      const response = await axios.get(
        getApiUrl('/leave/sil-credits'),
        getAuthHeaders()
      );

      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.message);
      }
    } catch (err) {
      error.value = err.response?.data?.message || err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Fetch all SIL credits (Admin/HR only)
  const fetchAllSILCredits = async (filters = {}) => {
    try {
      loading.value = true;
      error.value = null;

      const params = new URLSearchParams();
      if (filters.year) params.append('year', filters.year);
      if (filters.department) params.append('department', filters.department);
      if (filters.branch_id) params.append('branch_id', filters.branch_id);

      const response = await axios.get(
        getApiUrl(`/leave/sil-credits/all?${params.toString()}`),
        getAuthHeaders()
      );

      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.message);
      }
    } catch (err) {
      error.value = err.response?.data?.message || err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Initialize SIL credits for all employees (Admin/HR only)
  const initializeSILCredits = async (year) => {
    try {
      loading.value = true;
      error.value = null;

      const response = await axios.post(
        getApiUrl('/leave/sil-credits/initialize'),
        { year },
        getAuthHeaders()
      );

      if (response.data.success) {
        return response.data;
      } else {
        throw new Error(response.data.message);
      }
    } catch (err) {
      error.value = err.response?.data?.message || err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Refresh all data
  const refreshAll = async () => {
    await Promise.all([
      fetchMyLeaveRequests(),
      fetchPendingManagerApprovals(),
      fetchPendingHRApprovals(),
    ]);
  };

  return {
    // State
    myLeaveRequests,
    allLeaveRequests,
    pendingManagerApprovals,
    pendingHRApprovals,
    departmentEmployeeRequests,
    loading,
    error,

    // Getters
    pendingRequests,
    approvedRequests,
    rejectedRequests,
    managerApprovedRequests,

    // Actions
    fetchMyLeaveRequests,
    createLeaveRequest,
    updateLeaveRequest,
    deleteLeaveRequest,
    fetchAllLeaveRequests,
    fetchLeaveRequestById,
    approveByManager,
    approveByHR,
    rejectLeaveRequest,
    fetchPendingManagerApprovals,
    fetchPendingHRApprovals,
    fetchDepartmentEmployeeRequests,
    fetchLeaveStatistics,
    fetchLeaveHistory,
    fetchSILCredits,
    fetchAllSILCredits,
    initializeSILCredits,
    clearError,
    refreshAll,
  };
});
