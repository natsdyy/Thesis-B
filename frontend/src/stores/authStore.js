import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import axios from 'axios';
import { apiConfig, formatImageUrl } from '../config/api.js';

// Set up axios interceptors for authentication
const setupAxiosInterceptors = () => {
  // Request interceptor to add auth token
  axios.interceptors.request.use(
    (config) => {
      // Check if this is a supplier endpoint
      if (config.url && config.url.includes('/supplier-auth/')) {
        // Use supplier token for supplier endpoints
        const supplierToken = localStorage.getItem('supplierToken');
        if (supplierToken) {
          config.headers.Authorization = `Bearer ${supplierToken}`;
        }
      } else {
        // Use regular employee token for other endpoints
        const token = localStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
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
        const requestUrl = error.config?.url || '';
        const isLoginRequest =
          requestUrl.includes('/auth/login') ||
          requestUrl.includes('/supplier-auth/login');
        const isOnLoginPage =
          typeof window !== 'undefined' &&
          (window.location?.pathname === '/login' ||
            window.location?.pathname === '/supplier/login');

        // Do NOT redirect for the login endpoint or when already on the login page
        if (isLoginRequest || isOnLoginPage) {
          return Promise.reject(error);
        }

        // For other 401s, just log the error but don't redirect automatically
        console.warn('401 Unauthorized error:', {
          url: requestUrl,
          status: error.response?.status,
          message: error.response?.data?.message,
        });

        // Handle employee authentication errors
        if (requestUrl.includes('/auth/validate-session')) {
          console.warn(
            'Employee session validation failed, redirecting to login'
          );
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          localStorage.removeItem('isAuthenticated');
          window.location.href = '/login';
          return;
        }

        // Handle board member authentication errors
        if (requestUrl.includes('/board-auth/validate-session')) {
          console.warn(
            'Board member session validation failed, redirecting to login'
          );
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          localStorage.removeItem('isAuthenticated');
          window.location.href = '/login';
          return;
        }

        // Handle supplier authentication errors
        if (requestUrl.includes('/supplier-auth/validate-session')) {
          console.warn(
            'Supplier session validation failed, redirecting to supplier login'
          );
          localStorage.removeItem('supplierToken');
          localStorage.removeItem('supplier');
          localStorage.removeItem('isSupplierAuthenticated');
          window.location.href = '/supplier/login';
          return;
        }

        // For other 401s, just reject the promise
        return Promise.reject(error);
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
  const isChairman = computed(() => userRole.value === 'Chairman of the Board');
  const isBoardDirector = computed(
    () => userRole.value === 'Board of Directors'
  );
  const isSuperAdmin = computed(
    () => userRole.value === 'Super Admin' || isChairman.value
  );
  const userPermissions = computed(() => user.value?.permissions || []);

  // Actions
  const login = async (credentials) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await axios.post(
        `${apiConfig.baseURL}/auth/login`,
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

  const boardLogin = async (credentials) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await axios.post(
        `${apiConfig.baseURL}/board-auth/login`,
        credentials
      );

      if (response.data.success) {
        // Transform board member data to match employee data structure
        const boardMember = response.data.data.user;
        const userData = {
          ...boardMember,
          role: boardMember.position, // Map position to role for compatibility
          employee_id: boardMember.board_id, // Map board_id to employee_id for compatibility
          name: `${boardMember.first_name} ${boardMember.last_name}`, // Create full name for compatibility
        };

        user.value = userData;
        isAuthenticated.value = true;

        // Store in localStorage for persistence
        localStorage.setItem('user', JSON.stringify(userData));
        localStorage.setItem('token', response.data.data.token);
        localStorage.setItem('isAuthenticated', 'true');

        return userData;
      } else {
        throw new Error(response.data.message || 'Board login failed');
      }
    } catch (err) {
      error.value =
        err.response?.data?.message || err.message || 'Board login failed';
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
    localStorage.removeItem('token');
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
      console.warn('No user ID found for session validation');
      return false;
    }

    try {
      console.log('Validating session for user ID:', user.value.id);

      // Determine if this is a Board member or employee based on the presence of board_id
      const isBoardMember =
        user.value.board_id ||
        user.value.role === 'Chairman of the Board' ||
        user.value.role === 'Board of Directors';

      const endpoint = isBoardMember
        ? `${apiConfig.baseURL}/board-auth/validate-session`
        : `${apiConfig.baseURL}/auth/validate-session`;

      const response = await axios.post(endpoint, {
        user_id: user.value.id,
      });

      if (response.data.success) {
        // Update user data with latest info
        const updatedUser = response.data.data.user;

        // Check if it's a Board member by looking for board_id or position
        const isBoardMember =
          updatedUser.board_id ||
          updatedUser.position === 'Board of Directors' ||
          updatedUser.position === 'Chairman of the Board';

        // If it's a Board member, transform the data structure
        if (isBoardMember) {
          const userData = {
            ...updatedUser,
            role: updatedUser.position, // Map position to role for compatibility
            employee_id: updatedUser.board_id, // Map board_id to employee_id for compatibility
            name: `${updatedUser.first_name} ${updatedUser.last_name}`, // Create full name for compatibility
          };
          user.value = userData;
          localStorage.setItem('user', JSON.stringify(userData));
          console.log(
            'validateSession - Transformed Board member data:',
            userData
          );
        } else {
          user.value = updatedUser;
          localStorage.setItem('user', JSON.stringify(updatedUser));
          console.log('validateSession - Set employee data:', updatedUser);
        }

        console.log('Session validation successful');
        return true;
      } else {
        console.warn('Session validation failed:', response.data.message);
        logout();
        return false;
      }
    } catch (err) {
      console.error('Session validation failed:', err);
      // Don't logout immediately on network errors, just log the error
      console.warn('Session validation error, but not logging out user');
      return true; // Allow user to continue for now
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

  const refreshUserData = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('No token found for refreshing user data');
      return false;
    }

    try {
      console.log('Refreshing user data from API...');

      // Check if current user is a Board member
      const isBoardMember =
        user.value?.board_id ||
        user.value?.role === 'Chairman of the Board' ||
        user.value?.role === 'Board of Directors';

      if (isBoardMember) {
        // Board members don't have a refresh endpoint, just validate session
        return await validateSession();
      }

      const response = await axios.get(`${apiConfig.baseURL}/employees/me`);

      if (response.data.success) {
        const employeeData = response.data.data;

        // Map employee data to user format
        const userData = {
          id: employeeData.id,
          employee_id: employeeData.employee_id,
          first_name: employeeData.first_name,
          last_name: employeeData.last_name,
          name: `${employeeData.first_name} ${employeeData.last_name}`,
          email: employeeData.email,
          role_id: employeeData.role_id,
          role: employeeData.role,
          department: employeeData.department,
          branch_id: employeeData.branch_id,
          photo_url: employeeData.photo_url
            ? formatImageUrl(employeeData.photo_url)
            : null,
        };

        user.value = userData;
        isAuthenticated.value = true;

        // Update localStorage with fresh data
        localStorage.setItem('user', JSON.stringify(userData));
        localStorage.setItem('isAuthenticated', 'true');

        console.log('User data refreshed successfully:', userData);
        return true;
      } else {
        console.warn('Failed to refresh user data:', response.data.message);
        return false;
      }
    } catch (error) {
      console.error('Error refreshing user data:', error);
      return false;
    }
  };

  // Fetch full employee profile for the logged-in user (raw fields)
  const fetchMyFullProfile = async () => {
    try {
      const response = await axios.get(`${apiConfig.baseURL}/employees/me`);
      if (response.data?.success) {
        return response.data.data;
      }
      throw new Error(response.data?.message || 'Failed to fetch profile');
    } catch (error) {
      console.error('fetchMyFullProfile error:', error);
      throw error;
    }
  };

  // Update own employee profile
  const updateMyProfile = async (payload) => {
    try {
      const response = await axios.put(
        `${apiConfig.baseURL}/employees/me`,
        payload
      );
      if (response.data?.success) {
        // refresh lightweight user cache
        await refreshUserData();
        return response.data.data;
      }
      throw new Error(response.data?.message || 'Failed to update profile');
    } catch (error) {
      console.error('updateMyProfile error:', error);
      throw error;
    }
  };

  // Change own password
  const changeMyPassword = async (current_password, new_password) => {
    try {
      const response = await axios.put(
        `${apiConfig.baseURL}/employees/me/change-password`,
        { current_password, new_password }
      );
      if (response.data?.success) {
        return true;
      }
      throw new Error(response.data?.message || 'Failed to change password');
    } catch (error) {
      console.error('changeMyPassword error:', error);
      throw error;
    }
  };

  // Upload own profile photo
  const uploadMyPhoto = async (file) => {
    try {
      const formData = new FormData();
      formData.append('photo', file);
      const response = await axios.post(
        `${apiConfig.baseURL}/employees/me/upload-photo`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      if (response.data?.success) {
        await refreshUserData();
        return response.data.data;
      }
      throw new Error(response.data?.message || 'Failed to upload photo');
    } catch (error) {
      console.error('uploadMyPhoto error:', error);
      throw error;
    }
  };

  // Password reset methods
  const forgotPassword = async (email) => {
    try {
      const response = await axios.post(
        `${apiConfig.baseURL}/auth/forgot-password`,
        { email }
      );
      if (response.data?.success) {
        return response.data;
      }
      throw new Error(response.data?.message || 'Failed to send reset email');
    } catch (error) {
      console.error('forgotPassword error:', error);
      throw error;
    }
  };

  const validateResetToken = async (token) => {
    try {
      const response = await axios.post(
        `${apiConfig.baseURL}/auth/validate-reset-token`,
        { token }
      );
      if (response.data?.success) {
        return response.data.data;
      }
      throw new Error(
        response.data?.message || 'Invalid or expired reset token'
      );
    } catch (error) {
      console.error('validateResetToken error:', error);
      throw error;
    }
  };

  const resetPassword = async (token, newPassword) => {
    try {
      const response = await axios.post(
        `${apiConfig.baseURL}/auth/reset-password`,
        { token, new_password: newPassword }
      );
      if (response.data?.success) {
        return response.data;
      }
      throw new Error(response.data?.message || 'Failed to reset password');
    } catch (error) {
      console.error('resetPassword error:', error);
      throw error;
    }
  };

  const initializeAuth = async () => {
    const storedUser = localStorage.getItem('user');
    const storedAuth = localStorage.getItem('isAuthenticated');
    const token = localStorage.getItem('token');

    if (storedUser && storedAuth === 'true' && token) {
      try {
        const parsedUser = JSON.parse(storedUser);

        // Transform Board member data if needed (in case it wasn't transformed when stored)
        let transformedUser = parsedUser;
        if (parsedUser.board_id && !parsedUser.role) {
          // This is a Board member without role transformation
          transformedUser = {
            ...parsedUser,
            role: parsedUser.position, // Map position to role for compatibility
            employee_id: parsedUser.board_id, // Map board_id to employee_id for compatibility
            name: `${parsedUser.first_name} ${parsedUser.last_name}`, // Create full name for compatibility
          };
          console.log(
            'initializeAuth - Transformed Board member data:',
            transformedUser
          );
        }

        user.value = transformedUser;
        isAuthenticated.value = true;

        console.log(
          'initializeAuth - Loaded user from localStorage:',
          transformedUser
        );

        // Try to refresh user data from API for fresh information
        const refreshed = await refreshUserData();

        if (!refreshed) {
          // If refresh failed, validate the session with stored data
          const isValid = await validateSession();
          if (!isValid) {
            error.value =
              'Your access has been revoked. Please contact your administrator.';
          }
        }
      } catch (e) {
        console.error('Error parsing stored user data:', e);
        logout();
      }
    } else {
      console.log('initializeAuth - No stored auth data found');
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
    isChairman,
    isBoardDirector,
    userPermissions,

    // Actions
    login,
    boardLogin,
    logout,
    setUser,
    validateSession,
    refreshUserData,
    checkPermission,
    hasAnyPermission,
    initializeAuth,
    clearError,
    fetchMyFullProfile,
    updateMyProfile,
    changeMyPassword,
    uploadMyPhoto,
    forgotPassword,
    validateResetToken,
    resetPassword,
  };
});
