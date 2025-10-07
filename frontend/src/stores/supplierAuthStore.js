import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import axios from 'axios';
import { apiConfig } from '../config/api.js';

export const useSupplierAuthStore = defineStore('supplierAuth', () => {
  // State
  const supplier = ref(null);
  const isAuthenticated = ref(false);
  const loading = ref(false);
  const error = ref(null);

  // Getters
  const supplierName = computed(() => supplier.value?.name || '');
  const supplierEmail = computed(() => supplier.value?.email || '');
  const supplierCategory = computed(() => supplier.value?.category || '');
  const supplierId = computed(() => supplier.value?.id || null);

  // Actions
  const login = async (credentials) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await axios.post(
        `${apiConfig.baseURL}/supplier-auth/login`,
        credentials
      );

      if (response.data.success) {
        supplier.value = response.data.data.supplier;
        isAuthenticated.value = true;

        // Store in localStorage for persistence
        localStorage.setItem(
          'supplier',
          JSON.stringify(response.data.data.supplier)
        );
        localStorage.setItem('supplierToken', response.data.data.token);
        localStorage.setItem('isSupplierAuthenticated', 'true');

        return response.data.data.supplier;
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
    supplier.value = null;
    isAuthenticated.value = false;
    error.value = null;

    // Clear localStorage
    localStorage.removeItem('supplier');
    localStorage.removeItem('supplierToken');
    localStorage.removeItem('isSupplierAuthenticated');
  };

  const setSupplier = (supplierData) => {
    supplier.value = supplierData;
    isAuthenticated.value = true;

    // Update localStorage
    localStorage.setItem('supplier', JSON.stringify(supplierData));
    localStorage.setItem('isSupplierAuthenticated', 'true');
  };

  const validateSession = async () => {
    try {
      const storedSupplier = localStorage.getItem('supplier');
      const token = localStorage.getItem('supplierToken');
      const isAuth = localStorage.getItem('isSupplierAuthenticated');

      if (!storedSupplier || !token || isAuth !== 'true') {
        return false;
      }

      const supplierData = JSON.parse(storedSupplier);

      const response = await axios.post(
        `${apiConfig.baseURL}/supplier-auth/validate-session`,
        { supplier_id: supplierData.id }
      );

      if (response.data.success) {
        supplier.value = response.data.data.supplier;
        isAuthenticated.value = true;
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

  const changePassword = async (oldPassword, newPassword) => {
    loading.value = true;
    error.value = null;

    try {
      const token = localStorage.getItem('supplierToken');

      const response = await axios.post(
        `${apiConfig.baseURL}/supplier-auth/change-password`,
        {
          supplier_id: supplier.value.id,
          old_password: oldPassword,
          new_password: newPassword,
        }
      );

      if (response.data.success) {
        return response.data;
      } else {
        throw new Error(response.data.message || 'Password change failed');
      }
    } catch (err) {
      error.value =
        err.response?.data?.message || err.message || 'Password change failed';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const getProfile = async () => {
    loading.value = true;
    error.value = null;

    try {
      const token = localStorage.getItem('supplierToken');

      const response = await axios.get(
        `${apiConfig.baseURL}/supplier-auth/profile?supplier_id=${supplier.value.id}`
      );

      if (response.data.success) {
        supplier.value = response.data.data.supplier;
        setSupplier(response.data.data.supplier);
        return response.data.data.supplier;
      } else {
        throw new Error(response.data.message || 'Failed to get profile');
      }
    } catch (err) {
      error.value =
        err.response?.data?.message || err.message || 'Failed to get profile';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const updateProfile = async (profileData) => {
    loading.value = true;
    error.value = null;

    try {
      const token = localStorage.getItem('supplierToken');

      const response = await axios.put(
        `${apiConfig.baseURL}/supplier-auth/profile`,
        {
          supplier_id: supplier.value.id,
          ...profileData,
        }
      );

      if (response.data.success) {
        supplier.value = response.data.data.supplier;
        setSupplier(response.data.data.supplier);
        return response.data.data.supplier;
      } else {
        throw new Error(response.data.message || 'Failed to update profile');
      }
    } catch (err) {
      error.value =
        err.response?.data?.message ||
        err.message ||
        'Failed to update profile';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const clearError = () => {
    error.value = null;
  };

  // Initialize from localStorage on store creation
  const initializeFromStorage = () => {
    const storedSupplier = localStorage.getItem('supplier');
    const isAuth = localStorage.getItem('isSupplierAuthenticated');

    if (storedSupplier && isAuth === 'true') {
      try {
        supplier.value = JSON.parse(storedSupplier);
        isAuthenticated.value = true;
      } catch (err) {
        console.error('Failed to parse stored supplier data:', err);
        logout();
      }
    }
  };

  // Initialize on store creation
  initializeFromStorage();

  return {
    // State
    supplier,
    isAuthenticated,
    loading,
    error,

    // Getters
    supplierName,
    supplierEmail,
    supplierCategory,
    supplierId,

    // Actions
    login,
    logout,
    setSupplier,
    validateSession,
    changePassword,
    getProfile,
    updateProfile,
    clearError,
  };
});
