import { defineStore } from 'pinia';
import axios from 'axios';
import { apiConfig } from '../config/api.js';

export const useRolePermissionStore = defineStore('rolePermission', {
  state: () => ({
    rolePermissions: [],
    loading: false,
    error: null,
  }),

  getters: {
    getPermissionsByRoleId: (state) => (roleId) =>
      state.rolePermissions.filter((rp) => rp.role_id === roleId),

    getRolesByPermissionId: (state) => (permissionId) =>
      state.rolePermissions.filter((rp) => rp.permission_id === permissionId),
  },

  actions: {
    async fetchRolePermissions() {
      this.loading = true;
      this.error = null;
      try {
        const response = await axios.get(
          `${apiConfig.baseURL}/role-permissions`
        );
        this.rolePermissions = response.data.data;
      } catch (error) {
        this.error =
          error.response?.data?.message || 'Failed to fetch role permissions';
        console.error('Error fetching role permissions:', error);
      } finally {
        this.loading = false;
      }
    },

    async getPermissionsByRole(roleId) {
      this.loading = true;
      this.error = null;
      try {
        const response = await axios.get(
          `${apiConfig.baseURL}/role-permissions/role/${roleId}`
        );
        return response.data.data;
      } catch (error) {
        this.error =
          error.response?.data?.message ||
          'Failed to fetch permissions for role';
        console.error('Error fetching permissions for role:', error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async assignPermissionToRole(roleId, permissionId) {
      this.loading = true;
      this.error = null;
      try {
        const response = await axios.post(
          `${apiConfig.baseURL}/role-permissions/assign`,
          {
            role_id: roleId,
            permission_id: permissionId,
          }
        );
        return response.data.data;
      } catch (error) {
        this.error =
          error.response?.data?.message ||
          'Failed to assign permission to role';
        console.error('Error assigning permission to role:', error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async bulkAssignPermissionsToRole(roleId, permissionIds) {
      this.loading = true;
      this.error = null;
      try {
        const response = await axios.post(
          `${apiConfig.baseURL}/role-permissions/bulk-assign`,
          {
            role_id: roleId,
            permission_ids: permissionIds,
          }
        );
        return response.data.data;
      } catch (error) {
        this.error =
          error.response?.data?.message ||
          'Failed to bulk assign permissions to role';
        console.error('Error bulk assigning permissions to role:', error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async removePermissionFromRole(roleId, permissionId) {
      this.loading = true;
      this.error = null;
      try {
        const response = await axios.delete(
          `${apiConfig.baseURL}/role-permissions/remove`,
          {
            data: {
              role_id: roleId,
              permission_id: permissionId,
            },
          }
        );
        return response.data.data;
      } catch (error) {
        this.error =
          error.response?.data?.message ||
          'Failed to remove permission from role';
        console.error('Error removing permission from role:', error);
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
          `${apiConfig.baseURL}/role-permissions/check/${roleId}/${encodeURIComponent(permissionName)}`
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

    clearError() {
      this.error = null;
    },
  },
});
