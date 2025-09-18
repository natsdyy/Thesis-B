import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import axios from 'axios';
import { apiConfig } from '../config/api.js';

const API_BASE_URL = apiConfig.baseURL;

// NOTE: This store is named 'user' for historical reasons but actually manages employees
// It calls the correct /api/employees endpoints and should be used for employee operations
export const useUserStore = defineStore('user', () => {
  // State - Note: This store manages employees but uses 'user' terminology for compatibility
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
      const response = await axios.get(`${API_BASE_URL}/employees`, {
        params: { includeDeleted },
      });

      if (response.data.success) {
        users.value = response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to fetch employees');
      }
    } catch (err) {
      error.value =
        err.response?.data?.message || err.message || 'Failed to fetch employees';
      console.error('Error fetching employees:', err);
    } finally {
      loading.value = false;
    }
  };

  const createUser = async (userData) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await axios.post(`${API_BASE_URL}/employees`, userData);

      if (response.data.success) {
        users.value.push(response.data.data);
        users.value.sort(
          (a, b) => new Date(b.created_at) - new Date(a.created_at)
        );
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to create employee');
      }
    } catch (err) {
      error.value =
        err.response?.data?.message || err.message || 'Failed to create employee';
      console.error('Error creating employee:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const updateUser = async (id, userData) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await axios.put(
        `${API_BASE_URL}/employees/${id}`,
        userData
      );

      if (response.data.success) {
        const index = users.value.findIndex((user) => user.id === id);
        if (index !== -1) {
          users.value[index] = response.data.data;
        }
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to update employee');
      }
    } catch (err) {
      error.value =
        err.response?.data?.message || err.message || 'Failed to update employee';
      console.error('Error updating employee:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const deleteUser = async (id) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await axios.delete(`${API_BASE_URL}/employees/${id}`);

      if (response.data.success) {
        users.value = users.value.filter((user) => user.id !== id);
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to delete employee');
      }
    } catch (err) {
      error.value =
        err.response?.data?.message || err.message || 'Failed to delete employee';
      console.error('Error deleting employee:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const restoreUser = async (id) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await axios.put(
        `${API_BASE_URL}/employees/${id}/restore`
      );

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
        throw new Error(response.data.message || 'Failed to restore employee');
      }
    } catch (err) {
      error.value =
        err.response?.data?.message || err.message || 'Failed to restore employee';
      console.error('Error restoring employee:', err);
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
        `${API_BASE_URL}/employees/${id}/permissions`
      );

      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(
          response.data.message || 'Failed to fetch employee permissions'
        );
      }
    } catch (err) {
      error.value =
        err.response?.data?.message ||
        err.message ||
        'Failed to fetch employee permissions';
      console.error('Error fetching employee permissions:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const clearError = () => {
    error.value = null;
  };

  // Get production staff (users with production roles)
  const getProductionStaff = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/employees`, {
        params: {
          department: 'Production',
          includeDeleted: false,
        },
      });

      if (response.data.success) {
        return response.data.data.filter(
          (employee) =>
            employee.department === 'Production' ||
            employee.role?.includes('Production')
        );
      } else {
        throw new Error(
          response.data.message || 'Failed to fetch production staff'
        );
      }
    } catch (err) {
      console.error('Error fetching production staff:', err);
      // Return all employees as fallback
      return users.value.filter(
        (employee) =>
          employee.department === 'Production' ||
          employee.role?.includes('Production')
      );
    }
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
    getProductionStaff,
    clearError,
  };
});
