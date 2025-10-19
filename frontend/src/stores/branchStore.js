import { defineStore } from 'pinia';
import axios from 'axios';
import { apiConfig } from '../config/api.js';

export const useBranchStore = defineStore('branch', {
  state: () => ({
    branches: [],
    currentBranch: null,
    loading: false,
    error: null,
    stats: {
      total_branches: 0,
      active_branches: 0,
      inactive_branches: 0,
      total_employees_in_branches: 0,
    },
  }),

  getters: {
    activeBranches: (state) =>
      state.branches.filter((branch) => branch.is_active),
    inactiveBranches: (state) =>
      state.branches.filter((branch) => !branch.is_active),
    allBranches: (state) => state.branches,

    getBranchById: (state) => (id) => {
      return state.branches.find((branch) => branch.id === id);
    },

    getBranchByCode: (state) => (code) => {
      return state.branches.find((branch) => branch.code === code);
    },

    branchOptions: (state) => {
      return state.branches
        .filter((branch) => branch.is_active)
        .map((branch) => ({
          value: branch.id,
          label: `${branch.name} (${branch.code})`,
          branch: branch,
        }));
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
      console.error('Branch Store Error:', error);
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

    // Fetch all branches
    async fetchBranches(includeStats = false, includeDeleted = false) {
      this.setLoading(true);
      this.clearError();

      try {
        const params = { include_stats: includeStats ? 'true' : 'false' };
        if (includeDeleted) params.includeDeleted = 'true';

        const response = await axios.get(`${apiConfig.baseURL}/branches`, {
          ...this.getAuthHeaders(),
          params,
        });

        this.branches = response.data;
        return response.data;
      } catch (error) {
        this.setError(
          error.response?.data?.error || 'Failed to fetch branches'
        );
        throw error;
      } finally {
        this.setLoading(false);
      }
    },

    // Fetch active branches only
    async fetchActiveBranches() {
      this.setLoading(true);
      this.clearError();

      try {
        const response = await axios.get(`${apiConfig.baseURL}/branches`, {
          ...this.getAuthHeaders(),
          params: { active: 'true' },
        });

        this.branches = response.data;
        return response.data;
      } catch (error) {
        this.setError(
          error.response?.data?.error || 'Failed to fetch active branches'
        );
        throw error;
      } finally {
        this.setLoading(false);
      }
    },

    // Fetch all branches (both active and inactive) for employee assignment
    async fetchAllBranches() {
      this.setLoading(true);
      this.clearError();

      try {
        const response = await axios.get(`${apiConfig.baseURL}/branches`, {
          ...this.getAuthHeaders(),
        });

        this.branches = response.data;
        return response.data;
      } catch (error) {
        this.setError(
          error.response?.data?.error || 'Failed to fetch all branches'
        );
        throw error;
      } finally {
        this.setLoading(false);
      }
    },

    // Fetch branch by ID
    async fetchBranchById(id) {
      this.setLoading(true);
      this.clearError();

      try {
        const response = await axios.get(
          `${apiConfig.baseURL}/branches/${id}`,
          this.getAuthHeaders()
        );

        this.currentBranch = response.data;
        return response.data;
      } catch (error) {
        this.setError(error.response?.data?.error || 'Failed to fetch branch');
        throw error;
      } finally {
        this.setLoading(false);
      }
    },

    // Create branch
    async createBranch(branchData) {
      this.setLoading(true);
      this.clearError();

      try {
        const response = await axios.post(
          `${apiConfig.baseURL}/branches`,
          branchData,
          this.getAuthHeaders()
        );

        // Add to local state
        this.branches.push(response.data);

        return response.data;
      } catch (error) {
        this.setError(error.response?.data?.error || 'Failed to create branch');
        throw error;
      } finally {
        this.setLoading(false);
      }
    },

    // Update branch
    async updateBranch(id, branchData) {
      this.setLoading(true);
      this.clearError();

      try {
        const response = await axios.put(
          `${apiConfig.baseURL}/branches/${id}`,
          branchData,
          this.getAuthHeaders()
        );

        // Update local state
        const index = this.branches.findIndex((branch) => branch.id === id);
        if (index !== -1) {
          this.branches[index] = response.data;
        }

        // Update current branch if it's the one being updated
        if (this.currentBranch && this.currentBranch.id === id) {
          this.currentBranch = response.data;
        }

        return response.data;
      } catch (error) {
        this.setError(error.response?.data?.error || 'Failed to update branch');
        throw error;
      } finally {
        this.setLoading(false);
      }
    },

    // Delete branch
    async deleteBranch(id) {
      this.setLoading(true);
      this.clearError();

      try {
        await axios.delete(
          `${apiConfig.baseURL}/branches/${id}`,
          this.getAuthHeaders()
        );

        // Remove from local state
        this.branches = this.branches.filter((branch) => branch.id !== id);

        // Clear current branch if it's the one being deleted
        if (this.currentBranch && this.currentBranch.id === id) {
          this.currentBranch = null;
        }

        return true;
      } catch (error) {
        this.setError(error.response?.data?.error || 'Failed to delete branch');
        throw error;
      } finally {
        this.setLoading(false);
      }
    },

    // Fetch branch employees
    async fetchBranchEmployees(branchId) {
      this.setLoading(true);
      this.clearError();

      try {
        const response = await axios.get(
          `${apiConfig.baseURL}/branches/${branchId}/employees`,
          this.getAuthHeaders()
        );

        return response.data;
      } catch (error) {
        this.setError(
          error.response?.data?.error || 'Failed to fetch branch employees'
        );
        throw error;
      } finally {
        this.setLoading(false);
      }
    },

    // Fetch branch statistics
    async fetchBranchStats() {
      this.setLoading(true);
      this.clearError();

      try {
        const response = await axios.get(
          `${apiConfig.baseURL}/branches/stats/summary`,
          this.getAuthHeaders()
        );

        this.stats = response.data;
        return response.data;
      } catch (error) {
        this.setError(
          error.response?.data?.error || 'Failed to fetch branch statistics'
        );
        throw error;
      } finally {
        this.setLoading(false);
      }
    },

    // Toggle branch active status
    async toggleBranchStatus(id) {
      const branch = this.getBranchById(id);
      if (!branch) {
        throw new Error('Branch not found');
      }

      return this.updateBranch(id, {
        ...branch,
        is_active: !branch.is_active,
      });
    },

    // Restore soft-deleted branch
    async restoreBranch(id) {
      this.setLoading(true);
      this.clearError();

      try {
        const response = await axios.patch(
          `${apiConfig.baseURL}/branches/${id}/restore`,
          {},
          this.getAuthHeaders()
        );

        // Refresh branches list to include restored branch
        await this.fetchBranches(true);

        return response.data;
      } catch (error) {
        this.setError(
          error.response?.data?.error || 'Failed to restore branch'
        );
        throw error;
      } finally {
        this.setLoading(false);
      }
    },

    // Search branches
    searchBranches(query) {
      if (!query.trim()) {
        return this.branches;
      }

      const searchTerm = query.toLowerCase();
      return this.branches.filter(
        (branch) =>
          branch.name.toLowerCase().includes(searchTerm) ||
          branch.code.toLowerCase().includes(searchTerm) ||
          branch.city?.toLowerCase().includes(searchTerm) ||
          branch.state?.toLowerCase().includes(searchTerm)
      );
    },

    // Set current branch
    setCurrentBranch(branch) {
      this.currentBranch = branch;
    },

    // Clear current branch
    clearCurrentBranch() {
      this.currentBranch = null;
    },

    // Reset store
    reset() {
      this.branches = [];
      this.currentBranch = null;
      this.loading = false;
      this.error = null;
      this.stats = {
        total_branches: 0,
        active_branches: 0,
        inactive_branches: 0,
        total_employees_in_branches: 0,
      };
    },
  },
});
