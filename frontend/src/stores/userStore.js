import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import axios from 'axios';
import { apiConfig } from '../config/api.js';

const API_BASE_URL = apiConfig.baseURL;

export const useUserStore = defineStore('user', () => {
  // State
  const users = ref([]);
  const loading = ref(false);
  const error = ref(null);

  // Getters
  const userCount = computed(() => users.value.length);
  const hasUsers = computed(() => users.value.length > 0);
  const deletedUsers = computed(() =>
    users.value.filter((user) => user.deleted_at)
  );

  // Actions
  const fetchUsers = async (includeDeleted = false) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await axios.get(`${API_BASE_URL}/users`, {
        params: { includeDeleted },
      });

      if (response.data.success) {
        users.value = response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to fetch users');
      }
    } catch (err) {
      error.value =
        err.response?.data?.message || err.message || 'Failed to fetch users';
      console.error('Error fetching users:', err);
    } finally {
      loading.value = false;
    }
  };

  const createUser = async (userData) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await axios.post(`${API_BASE_URL}/users`, userData);

      if (response.data.success) {
        users.value.push(response.data.data);
        users.value.sort(
          (a, b) => new Date(b.created_at) - new Date(a.created_at)
        );
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to create user');
      }
    } catch (err) {
      error.value =
        err.response?.data?.message || err.message || 'Failed to create user';
      console.error('Error creating user:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const updateUser = async (id, userData) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await axios.put(`${API_BASE_URL}/users/${id}`, userData);

      if (response.data.success) {
        const index = users.value.findIndex((user) => user.id === id);
        if (index !== -1) {
          users.value[index] = response.data.data;
        }
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to update user');
      }
    } catch (err) {
      error.value =
        err.response?.data?.message || err.message || 'Failed to update user';
      console.error('Error updating user:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const deleteUser = async (id) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await axios.delete(`${API_BASE_URL}/users/${id}`);

      if (response.data.success) {
        users.value = users.value.filter((user) => user.id !== id);
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to delete user');
      }
    } catch (err) {
      error.value =
        err.response?.data?.message || err.message || 'Failed to delete user';
      console.error('Error deleting user:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const restoreUser = async (id) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await axios.put(`${API_BASE_URL}/users/${id}/restore`);

      if (response.data.success) {
        const index = users.value.findIndex((user) => user.id === id);
        if (index !== -1) {
          users.value[index] = response.data.data;
        } else {
          users.value.push(response.data.data);
        }
        users.value.sort(
          (a, b) => new Date(b.created_at) - new Date(a.created_at)
        );
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to restore user');
      }
    } catch (err) {
      error.value =
        err.response?.data?.message || err.message || 'Failed to restore user';
      console.error('Error restoring user:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const getUserWithPermissions = async (id) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await axios.get(
        `${API_BASE_URL}/users/${id}/permissions`
      );

      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(
          response.data.message || 'Failed to fetch user permissions'
        );
      }
    } catch (err) {
      error.value =
        err.response?.data?.message ||
        err.message ||
        'Failed to fetch user permissions';
      console.error('Error fetching user permissions:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const clearError = () => {
    error.value = null;
  };

  return {
    // State
    users,
    loading,
    error,

    // Getters
    userCount,
    hasUsers,
    deletedUsers,

    // Actions
    fetchUsers,
    createUser,
    updateUser,
    deleteUser,
    restoreUser,
    getUserWithPermissions,
    clearError,
  };
});
