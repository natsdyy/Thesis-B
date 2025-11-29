import { defineStore } from 'pinia';
import axios from 'axios';
import { apiConfig } from '../config/api.js';

export const useEmployeeTransferRequestStore = defineStore(
  'employeeTransferRequest',
  {
    state: () => ({
      transferRequests: [],
      pendingRequests: [],
      loading: false,
      error: null,
      stats: {
        totalRequests: 0,
        pendingRequests: 0,
        approvedRequests: 0,
        rejectedRequests: 0,
      },
    }),

    getters: {
      // Get transfer requests filtered by status
      getRequestsByStatus: (state) => (status) => {
        return state.transferRequests.filter(
          (request) => request.status === status
        );
      },

      // Get transfer requests for specific branch
      getRequestsByBranch: (state) => (branchId) => {
        return state.transferRequests.filter(
          (request) =>
            request.from_branch_id === branchId ||
            request.to_branch_id === branchId
        );
      },

      // Get transfer requests by employee
      getRequestsByEmployee: (state) => (employeeId) => {
        return state.transferRequests.filter(
          (request) => request.employee_id === employeeId
        );
      },

      // Get pending requests count
      pendingCount: (state) => state.pendingRequests.length,

      // Get transfer request by ID
      getRequestById: (state) => (id) => {
        return state.transferRequests.find((request) => request.id === id);
      },
    },

    actions: {
      // Set loading state
      setLoading(loading) {
        this.loading = loading;
      },

      // Set error state
      setError(error) {
        this.error = error;
        console.error('Employee Transfer Request Store Error:', error);
      },

      // Clear error
      clearError() {
        this.error = null;
      },

      // Get auth headers
      getAuthHeaders() {
        const token = localStorage.getItem('token');
        return {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        };
      },

      // Fetch all transfer requests with optional filters
      async fetchTransferRequests(filters = {}) {
        this.setLoading(true);
        this.clearError();

        try {
          const params = {};

          if (filters.status) {
            params.status = filters.status;
          }

          if (filters.branch_id) {
            params.branch_id = filters.branch_id;
          }

          if (filters.employee_id) {
            params.employee_id = filters.employee_id;
          }

          const response = await axios.get(
            `${apiConfig.baseURL}/employee-transfer-requests`,
            {
              ...this.getAuthHeaders(),
              params,
            }
          );

          this.transferRequests = response.data.data || [];
          return response.data.data || [];
        } catch (error) {
          this.setError(
            error.response?.data?.message || 'Failed to fetch transfer requests'
          );
          throw error;
        } finally {
          this.setLoading(false);
        }
      },

      // Fetch pending transfer requests (HR only)
      async fetchPendingRequests() {
        this.setLoading(true);
        this.clearError();

        try {
          const response = await axios.get(
            `${apiConfig.baseURL}/employee-transfer-requests/pending`,
            this.getAuthHeaders()
          );

          this.pendingRequests = response.data.data || [];
          this.transferRequests = response.data.data || []; // Also populate transferRequests for consistency
          return response.data.data || [];
        } catch (error) {
          this.setError(
            error.response?.data?.message ||
              'Failed to fetch pending transfer requests'
          );
          throw error;
        } finally {
          this.setLoading(false);
        }
      },

      // Fetch transfer requests for specific branch
      async fetchBranchTransferRequests(branchId) {
        if (this.loading) return []; // Prevent multiple simultaneous calls
        this.setLoading(true);
        this.clearError();

        try {
          const response = await axios.get(
            `${apiConfig.baseURL}/employee-transfer-requests/branch/${branchId}`,
            this.getAuthHeaders()
          );

          this.transferRequests = response.data.data || [];
          return response.data.data || [];
        } catch (error) {
          this.setError(
            error.response?.data?.message ||
              'Failed to fetch branch transfer requests'
          );
          this.transferRequests = [];
          throw error;
        } finally {
          this.setLoading(false);
        }
      },

      // Get transfer request by ID
      async fetchTransferRequestById(id) {
        this.setLoading(true);
        this.clearError();

        try {
          const response = await axios.get(
            `${apiConfig.baseURL}/employee-transfer-requests/${id}`,
            this.getAuthHeaders()
          );

          return response.data.data;
        } catch (error) {
          this.setError(
            error.response?.data?.message || 'Failed to fetch transfer request'
          );
          throw error;
        } finally {
          this.setLoading(false);
        }
      },

      // Create new transfer request
      async createTransferRequest(requestData) {
        this.setLoading(true);
        this.clearError();

        try {
          const response = await axios.post(
            `${apiConfig.baseURL}/employee-transfer-requests`,
            requestData,
            this.getAuthHeaders()
          );

          // Add to local state
          this.transferRequests.unshift(response.data.data);

          return response.data.data;
        } catch (error) {
          this.setError(
            error.response?.data?.message || 'Failed to create transfer request'
          );
          throw error;
        } finally {
          this.setLoading(false);
        }
      },

      // Approve transfer request (HR only)
      async approveTransferRequest(id, notes = '') {
        this.setLoading(true);
        this.clearError();

        try {
          const response = await axios.post(
            `${apiConfig.baseURL}/employee-transfer-requests/${id}/approve`,
            { notes },
            this.getAuthHeaders()
          );

          // Update local state
          const index = this.transferRequests.findIndex(
            (request) => request.id === id
          );
          if (index !== -1) {
            this.transferRequests[index] = response.data.data;
          }

          // Remove from pending requests if it exists
          this.pendingRequests = this.pendingRequests.filter(
            (request) => request.id !== id
          );

          return response.data.data;
        } catch (error) {
          this.setError(
            error.response?.data?.message ||
              'Failed to approve transfer request'
          );
          throw error;
        } finally {
          this.setLoading(false);
        }
      },

      // Reject transfer request (HR only)
      async rejectTransferRequest(id, notes) {
        this.setLoading(true);
        this.clearError();

        try {
          if (!notes || !notes.trim()) {
            throw new Error('Rejection notes are required');
          }

          const response = await axios.post(
            `${apiConfig.baseURL}/employee-transfer-requests/${id}/reject`,
            { notes },
            this.getAuthHeaders()
          );

          // Update local state
          const index = this.transferRequests.findIndex(
            (request) => request.id === id
          );
          if (index !== -1) {
            this.transferRequests[index] = response.data.data;
          }

          // Remove from pending requests if it exists
          this.pendingRequests = this.pendingRequests.filter(
            (request) => request.id !== id
          );

          return response.data.data;
        } catch (error) {
          this.setError(
            error.response?.data?.message || 'Failed to reject transfer request'
          );
          throw error;
        } finally {
          this.setLoading(false);
        }
      },

      // Fetch transfer request statistics
      async fetchTransferRequestStats() {
        this.setLoading(true);
        this.clearError();

        try {
          const response = await axios.get(
            `${apiConfig.baseURL}/employee-transfer-requests`,
            this.getAuthHeaders()
          );

          const requests = response.data.data || [];

          this.stats = {
            totalRequests: requests.length,
            pendingRequests: requests.filter((r) => r.status === 'pending')
              .length,
            approvedRequests: requests.filter((r) => r.status === 'approved')
              .length,
            rejectedRequests: requests.filter((r) => r.status === 'rejected')
              .length,
          };

          return this.stats;
        } catch (error) {
          this.setError(
            error.response?.data?.message ||
              'Failed to fetch transfer request statistics'
          );
          throw error;
        } finally {
          this.setLoading(false);
        }
      },

      // Search transfer requests
      searchTransferRequests(query) {
        if (!query.trim()) {
          return this.transferRequests;
        }

        const searchTerm = query.toLowerCase();
        return this.transferRequests.filter(
          (request) =>
            request.employee_name.toLowerCase().includes(searchTerm) ||
            request.from_branch_name.toLowerCase().includes(searchTerm) ||
            request.to_branch_name.toLowerCase().includes(searchTerm) ||
            request.reason.toLowerCase().includes(searchTerm) ||
            request.requested_by_name.toLowerCase().includes(searchTerm)
        );
      },

      // Filter transfer requests by multiple criteria
      filterTransferRequests(filters) {
        let filtered = [...this.transferRequests];

        if (filters.status) {
          filtered = filtered.filter(
            (request) => request.status === filters.status
          );
        }

        if (filters.branch_id) {
          filtered = filtered.filter(
            (request) =>
              request.from_branch_id === filters.branch_id ||
              request.to_branch_id === filters.branch_id
          );
        }

        if (filters.employee_id) {
          filtered = filtered.filter(
            (request) => request.employee_id === filters.employee_id
          );
        }

        if (filters.transfer_type) {
          filtered = filtered.filter(
            (request) => request.transfer_type === filters.transfer_type
          );
        }

        if (filters.search) {
          const searchTerm = filters.search.toLowerCase();
          filtered = filtered.filter(
            (request) =>
              request.employee_name.toLowerCase().includes(searchTerm) ||
              request.from_branch_name.toLowerCase().includes(searchTerm) ||
              request.to_branch_name.toLowerCase().includes(searchTerm) ||
              request.reason.toLowerCase().includes(searchTerm) ||
              request.requested_by_name.toLowerCase().includes(searchTerm)
          );
        }

        return filtered;
      },

      // Reset store
      reset() {
        this.transferRequests = [];
        this.pendingRequests = [];
        this.loading = false;
        this.error = null;
        this.stats = {
          totalRequests: 0,
          pendingRequests: 0,
          approvedRequests: 0,
          rejectedRequests: 0,
        };
      },
    },
  }
);
