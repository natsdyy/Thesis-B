import { defineStore } from 'pinia';
import axios from 'axios';
import { apiConfig } from '../config/api.js';

export const usePermissionStore = defineStore('permission', {
  state: () => ({
    permissions: [],
    loading: false,
    error: null,
  }),

  getters: {
    hasPermissions: (state) => state.permissions.length > 0,
    permissionCount: (state) => state.permissions.length,
    getPermissionById: (state) => (id) =>
      state.permissions.find((p) => p.permission_id === id),
    getPermissionByName: (state) => (name) =>
      state.permissions.find((p) => p.permission_name === name),
  },

  actions: {
    async fetchPermissions() {
      this.loading = true;
      this.error = null;
      try {
        const response = await axios.get(`${apiConfig.baseURL}/permissions`);
        this.permissions = response.data.data;
      } catch (error) {
        this.error =
          error.response?.data?.message || 'Failed to fetch permissions';
        console.error('Error fetching permissions:', error);
      } finally {
        this.loading = false;
      }
    },

    async createPermission(permissionData) {
      this.loading = true;
      this.error = null;
      try {
        const response = await axios.post(
          `${apiConfig.baseURL}/permissions`,
          permissionData
        );
        this.permissions.push(response.data.data);
        return response.data.data;
      } catch (error) {
        this.error =
          error.response?.data?.message || 'Failed to create permission';
        console.error('Error creating permission:', error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async updatePermission(permissionId, permissionData) {
      this.loading = true;
      this.error = null;
      try {
        const response = await axios.put(
          `${apiConfig.baseURL}/permissions/${permissionId}`,
          permissionData
        );
        const index = this.permissions.findIndex(
          (p) => p.permission_id === permissionId
        );
        if (index !== -1) {
          this.permissions[index] = response.data.data;
        }
        return response.data.data;
      } catch (error) {
        this.error =
          error.response?.data?.message || 'Failed to update permission';
        console.error('Error updating permission:', error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async deletePermission(permissionId) {
      this.loading = true;
      this.error = null;
      try {
        await axios.delete(`${apiConfig.baseURL}/permissions/${permissionId}`);
        this.permissions = this.permissions.filter(
          (p) => p.permission_id !== permissionId
        );
      } catch (error) {
        this.error =
          error.response?.data?.message || 'Failed to delete permission';
        console.error('Error deleting permission:', error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async seedDefaultPermissions() {
      this.loading = true;
      this.error = null;
      try {
        const response = await axios.post(
          `${apiConfig.baseURL}/permissions/seed`
        );
        await this.fetchPermissions(); // Refresh the list
        return response.data.data;
      } catch (error) {
        this.error =
          error.response?.data?.message || 'Failed to seed permissions';
        console.error('Error seeding permissions:', error);
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
