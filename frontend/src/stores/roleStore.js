import { defineStore } from 'pinia';
import axios from 'axios';
import { apiConfig } from '../config/api.js';

const API_BASE_URL = apiConfig.baseURL;

export const useRoleStore = defineStore('role', {
  state: () => ({
    roles: [],
    deletedRoles: [],
    loading: false,
    error: null,
  }),

  getters: {
    hasRoles: (state) => state.roles.length > 0,
    roleCount: (state) => state.roles.filter((role) => !role.deleted_at).length,
    activeRoles: (state) => state.roles.filter((role) => !role.deleted_at),
    getRoleById: (state) => (id) =>
      state.roles.find((role) => role.role_id === id),
    getRolesByDepartment: (state) => (department) =>
      state.roles.filter(
        (role) =>
          role.department.toLowerCase() === department.toLowerCase() &&
          !role.deleted_at
      ),
  },

  actions: {
    async fetchRoles(includeDeleted = false) {
      this.loading = true;
      this.error = null;
      try {
        const response = await axios.get(`${API_BASE_URL}/roles`, {
          params: { includeDeleted },
        });
        this.roles = response.data.data;

        if (includeDeleted) {
          this.deletedRoles = this.roles.filter((role) => role.deleted_at);
        } else {
          // Fetch deleted roles separately if needed
          const deletedResponse = await axios.get(
            `${API_BASE_URL}/roles/deleted/list`
          );
          this.deletedRoles = deletedResponse.data.data;
        }
      } catch (error) {
        this.error =
          error.response?.data?.message || 'Failed to fetch roles';
        console.error('Error fetching roles:', error);
      } finally {
        this.loading = false;
      }
    },

    async fetchRolesWithPermissions(includeDeleted = false) {
      this.loading = true;
      this.error = null;
      try {
        const response = await axios.get(
          `${API_BASE_URL}/roles/with-permissions/all`,
          {
            params: { includeDeleted },
          }
        );
        this.roles = response.data.data;
      } catch (error) {
        this.error =
          error.response?.data?.message ||
          'Failed to fetch roles with permissions';
        console.error('Error fetching roles with permissions:', error);
      } finally {
        this.loading = false;
      }
    },

    async getRoleWithPermissions(roleId) {
      this.loading = true;
      this.error = null;
      try {
        const response = await axios.get(
          `${API_BASE_URL}/roles/${roleId}/permissions`
        );
        return response.data.data;
      } catch (error) {
        this.error =
          error.response?.data?.message ||
          'Failed to fetch role with permissions';
        console.error('Error fetching role with permissions:', error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async createRole(roleData) {
      this.loading = true;
      this.error = null;
      try {
        const response = await axios.post(`${API_BASE_URL}/roles`, roleData);
        this.roles.push(response.data.data);
        return response.data.data;
      } catch (error) {
        this.error = error.response?.data?.message || 'Failed to create role';
        console.error('Error creating role:', error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async createRoleWithPermissions(roleData) {
      this.loading = true;
      this.error = null;
      try {
        const response = await axios.post(
          `${API_BASE_URL}/roles/with-permissions`,
          roleData
        );
        this.roles.push(response.data.data);
        return response.data.data;
      } catch (error) {
        this.error =
          error.response?.data?.message ||
          'Failed to create role with permissions';
        console.error('Error creating role with permissions:', error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async updateRole(roleId, roleData) {
      this.loading = true;
      this.error = null;
      try {
        const response = await axios.put(
          `${API_BASE_URL}/roles/${roleId}`,
          roleData
        );
        const index = this.roles.findIndex((role) => role.role_id === roleId);
        if (index !== -1) {
          this.roles[index] = response.data.data;
        }
        return response.data.data;
      } catch (error) {
        this.error = error.response?.data?.message || 'Failed to update role';
        console.error('Error updating role:', error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async updateRoleWithPermissions(roleId, roleData) {
      this.loading = true;
      this.error = null;
      try {
        const response = await axios.put(
          `${API_BASE_URL}/roles/${roleId}/permissions`,
          roleData
        );
        const index = this.roles.findIndex((role) => role.role_id === roleId);
        if (index !== -1) {
          this.roles[index] = response.data.data;
        }
        return response.data.data;
      } catch (error) {
        this.error =
          error.response?.data?.message ||
          'Failed to update role with permissions';
        console.error('Error updating role with permissions:', error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async deleteRole(roleId) {
      this.loading = true;
      this.error = null;
      try {
        const response = await axios.delete(`${API_BASE_URL}/roles/${roleId}`);
        const index = this.roles.findIndex((role) => role.role_id === roleId);
        if (index !== -1) {
          this.roles[index] = response.data.data;
        }
        return response.data.data;
      } catch (error) {
        this.error = error.response?.data?.message || 'Failed to delete role';
        console.error('Error deleting role:', error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async restoreRole(roleId) {
      this.loading = true;
      this.error = null;
      try {
        const response = await axios.patch(
          `${API_BASE_URL}/roles/${roleId}/restore`
        );
        const index = this.roles.findIndex((role) => role.role_id === roleId);
        if (index !== -1) {
          this.roles[index] = response.data.data;
        }
        return response.data.data;
      } catch (error) {
        this.error = error.response?.data?.message || 'Failed to restore role';
        console.error('Error restoring role:', error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async getRolesByDepartmentAPI(department, includeDeleted = false) {
      this.loading = true;
      this.error = null;
      try {
        const response = await axios.get(
          `${API_BASE_URL}/roles/department/${encodeURIComponent(department)}`,
          {
            params: { includeDeleted },
          }
        );
        return response.data.data;
      } catch (error) {
        this.error =
          error.response?.data?.message ||
          'Failed to fetch roles by department';
        console.error('Error fetching roles by department:', error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async getRoleCount(includeDeleted = false) {
      this.loading = true;
      this.error = null;
      try {
        const response = await axios.get(`${API_BASE_URL}/roles/count/all`, {
          params: { includeDeleted },
        });
        return response.data.count;
      } catch (error) {
        this.error = error.response?.data?.message || 'Failed to get role count';
        console.error('Error getting role count:', error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async checkRolePermission(roleId, permissionName) {
      this.loading = true;
      this.error = null;
      try {
        const response = await axios.get(
          `${API_BASE_URL}/roles/${roleId}/has-permission/${encodeURIComponent(
            permissionName
          )}`
        );
        return response.data.data.has_permission;
      } catch (error) {
        this.error =
          error.response?.data?.message || 'Failed to check role permission';
        console.error('Error checking role permission:', error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async getDeletedRoles() {
      this.loading = true;
      this.error = null;
      try {
        const response = await axios.get(`${API_BASE_URL}/roles/deleted/list`);
        this.deletedRoles = response.data.data;
        return response.data.data;
      } catch (error) {
        this.error =
          error.response?.data?.message || 'Failed to fetch deleted roles';
        console.error('Error fetching deleted roles:', error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    // Local state management methods
    addRole(role) {
      this.roles.push(role);
    },

    updateRoleInState(roleId, updatedRole) {
      const index = this.roles.findIndex((role) => role.role_id === roleId);
      if (index !== -1) {
        this.roles[index] = { ...this.roles[index], ...updatedRole };
      }
    },

    removeRoleFromState(roleId) {
      this.roles = this.roles.filter((role) => role.role_id !== roleId);
    },

    markRoleAsDeleted(roleId) {
      const index = this.roles.findIndex((role) => role.role_id === roleId);
      if (index !== -1) {
        this.roles[index].deleted_at = new Date().toISOString();
        this.roles[index].is_active = false;
      }
    },

    markRoleAsRestored(roleId) {
      const index = this.roles.findIndex((role) => role.role_id === roleId);
      if (index !== -1) {
        this.roles[index].deleted_at = null;
        this.roles[index].is_active = true;
      }
    },

    // Utility methods
    clearError() {
      this.error = null;
    },

    clearRoles() {
      this.roles = [];
      this.deletedRoles = [];
    },

    setLoading(loading) {
      this.loading = loading;
    },

    // Filter and search methods
    filterRolesByStatus(includeDeleted = false) {
      return includeDeleted
        ? this.roles
        : this.roles.filter((role) => !role.deleted_at);
    },

    searchRoles(searchTerm) {
      if (!searchTerm) return this.roles;

      const term = searchTerm.toLowerCase();
      return this.roles.filter(
        (role) =>
          role.role.toLowerCase().includes(term) ||
          role.department.toLowerCase().includes(term) ||
          role.description.toLowerCase().includes(term)
      );
    },

    // Department-specific methods
    getDepartments() {
      const departments = new Set();
      this.roles.forEach((role) => {
        if (!role.deleted_at) {
          departments.add(role.department);
        }
      });
      return Array.from(departments).sort();
    },

    getRoleCountByDepartment() {
      const departmentCounts = {};
      this.roles
        .filter((role) => !role.deleted_at)
        .forEach((role) => {
          departmentCounts[role.department] =
            (departmentCounts[role.department] || 0) + 1;
        });
      return departmentCounts;
    },

    // Permission-related methods
    async bulkUpdateRolePermissions(updates) {
      this.loading = true;
      this.error = null;
      try {
        const promises = updates.map(({ roleId, permissionIds }) =>
          this.updateRoleWithPermissions(roleId, { permission_ids: permissionIds })
        );
        const results = await Promise.all(promises);
        return results;
      } catch (error) {
        this.error =
          error.response?.data?.message ||
          'Failed to bulk update role permissions';
        console.error('Error bulk updating role permissions:', error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    // Validation methods
    validateRoleData(roleData) {
      const errors = [];

      if (!roleData.role || roleData.role.trim().length < 2) {
        errors.push('Role name must be at least 2 characters long');
      }

      if (!roleData.department || roleData.department.trim().length === 0) {
        errors.push('Department is required');
      }

      if (!roleData.description || roleData.description.trim().length < 5) {
        errors.push('Description must be at least 5 characters long');
      }

      return {
        isValid: errors.length === 0,
        errors,
      };
    },

    // Statistics methods
    getRoleStatistics() {
      const total = this.roles.length;
      const active = this.roles.filter((role) => !role.deleted_at).length;
      const deleted = this.roles.filter((role) => role.deleted_at).length;
      const departments = this.getDepartments().length;

      return {
        total,
        active,
        deleted,
        departments,
        departmentCounts: this.getRoleCountByDepartment(),
      };
    },
  },
});
