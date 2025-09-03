import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import axios from 'axios';
import { apiConfig } from '../config/api.js';

const API_BASE_URL = apiConfig.baseURL;

// Set up axios interceptors for authentication
const setupAxiosInterceptors = () => {
  // Request interceptor to add auth token
  axios.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // Response interceptor to handle 401 errors
  axios.interceptors.response.use(
    (response) => {
      return response;
    },
    (error) => {
      if (error.response?.status === 401) {
        // Token is invalid or expired
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('isAuthenticated');
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }
  );
};

// Initialize interceptors
setupAxiosInterceptors();

export const useAuthStore = defineStore('auth', () => {
  // State
  const user = ref(null);
  const isAuthenticated = ref(false);
  const loading = ref(false);
  const error = ref(null);

  // Getters
  const userRole = computed(() => user.value?.role || null);
  const userDepartment = computed(() => user.value?.department || null);
  const isSuperAdmin = computed(() => userRole.value === 'Super Admin');
  const userPermissions = computed(() => user.value?.permissions || []);

  // Actions
  const login = async (credentials) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await axios.post(
        `${API_BASE_URL}/auth/login`,
        credentials
      );

      if (response.data.success) {
        user.value = response.data.data.user;
        isAuthenticated.value = true;

        // Store in localStorage for persistence
        localStorage.setItem('user', JSON.stringify(response.data.data.user));
        localStorage.setItem('token', response.data.data.token);
        localStorage.setItem('isAuthenticated', 'true');

        return response.data.data.user;
      } else {
        throw new Error(response.data.message || 'Login failed');
      }
    } catch (err) {
      error.value =
        err.response?.data?.message || err.message || 'Login failed';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const logout = () => {
    user.value = null;
    isAuthenticated.value = false;
    error.value = null;

    // Clear localStorage
    localStorage.removeItem('user');
    localStorage.removeItem('isAuthenticated');
  };

  const setUser = (userData) => {
    user.value = userData;
    isAuthenticated.value = true;

    // Update localStorage
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('isAuthenticated', 'true');
  };

  const validateSession = async () => {
    if (!user.value?.id) {
      return false;
    }

    try {
      const response = await axios.post(
        `${API_BASE_URL}/auth/validate-session`,
        {
          user_id: user.value.id,
        }
      );

      if (response.data.success) {
        // Update user data with latest info
        user.value = response.data.data.user;
        localStorage.setItem('user', JSON.stringify(response.data.data.user));
        return true;
      } else {
        logout();
        return false;
      }
    } catch (err) {
      console.error('Session validation failed:', err);
      logout();
      return false;
    }
  };

  const checkPermission = (permissionKey) => {
    if (isSuperAdmin.value) return true;
    return userPermissions.value.some(
      (permission) => permission.permission_key === permissionKey
    );
  };

  const hasAnyPermission = (permissionKeys) => {
    if (isSuperAdmin.value) return true;
    return permissionKeys.some((key) => checkPermission(key));
  };

  const initializeAuth = async () => {
    const storedUser = localStorage.getItem('user');
    const storedAuth = localStorage.getItem('isAuthenticated');

    if (storedUser && storedAuth === 'true') {
      try {
        user.value = JSON.parse(storedUser);
        isAuthenticated.value = true;

        // Validate the session to ensure role is still active
        const isValid = await validateSession();
        if (!isValid) {
          error.value =
            'Your access has been revoked. Please contact your administrator.';
        }
      } catch (e) {
        console.error('Error parsing stored user data:', e);
        logout();
      }
    }
  };

  const clearError = () => {
    error.value = null;
  };

  return {
    // State
    user,
    isAuthenticated,
    loading,
    error,

    // Getters
    userRole,
    userDepartment,
    isSuperAdmin,
    userPermissions,

    // Actions
    login,
    logout,
    setUser,
    validateSession,
    checkPermission,
    hasAnyPermission,
    initializeAuth,
    clearError,
  };
});
