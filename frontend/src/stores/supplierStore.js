// frontend/src/stores/supplierStore.js
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import axios from 'axios';
import { apiConfig } from '../config/api.js';

const API_BASE_URL = apiConfig.baseURL;

export const useSupplierStore = defineStore('supplier', () => {
  // State
  const suppliers = ref([]);
  const deletedSuppliers = ref([]); // NEW: Store deleted suppliers
  const currentSupplier = ref(null);
  const loading = ref(false);
  const error = ref(null);

  // Getters
  const activeSuppliers = computed(() => {
    return suppliers.value.filter((supplier) => supplier.status === 'Active');
  });

  const suppliersByCategory = computed(() => (category) => {
    return suppliers.value.filter((supplier) => supplier.category === category);
  });

  const supplierNames = computed(() => {
    return suppliers.value.map((supplier) => supplier.name);
  });

  // Actions
  const fetchSuppliers = async (filters = {}) => {
    loading.value = true;
    error.value = null;

    try {
      const params = new URLSearchParams();

      Object.keys(filters).forEach((key) => {
        if (
          filters[key] !== null &&
          filters[key] !== undefined &&
          filters[key] !== ''
        ) {
          params.append(key, filters[key]);
        }
      });

      const response = await axios.get(
        `${API_BASE_URL}/suppliers?${params.toString()}`
      );

      if (response.data.success) {
        suppliers.value = response.data.data;
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to fetch suppliers');
      }
    } catch (err) {
      error.value =
        err.response?.data?.message ||
        err.message ||
        'Failed to fetch suppliers';
      console.error('Error fetching suppliers:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const fetchSupplierById = async (id) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await axios.get(`${API_BASE_URL}/suppliers/${id}`);

      if (response.data.success) {
        currentSupplier.value = response.data.data;
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to fetch supplier');
      }
    } catch (err) {
      error.value =
        err.response?.data?.message ||
        err.message ||
        'Failed to fetch supplier';
      console.error('Error fetching supplier:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const createSupplier = async (supplierData) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await axios.post(
        `${API_BASE_URL}/suppliers`,
        supplierData
      );

      if (response.data.success) {
        suppliers.value.unshift(response.data.data);
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to create supplier');
      }
    } catch (err) {
      error.value =
        err.response?.data?.message ||
        err.message ||
        'Failed to create supplier';
      console.error('Error creating supplier:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const updateSupplier = async (id, supplierData) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await axios.put(
        `${API_BASE_URL}/suppliers/${id}`,
        supplierData
      );

      if (response.data.success) {
        const index = suppliers.value.findIndex((s) => s.id === id);
        if (index !== -1) {
          suppliers.value[index] = response.data.data;
        }
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to update supplier');
      }
    } catch (err) {
      error.value =
        err.response?.data?.message ||
        err.message ||
        'Failed to update supplier';
      console.error('Error updating supplier:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const deleteSupplier = async (id) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await axios.delete(`${API_BASE_URL}/suppliers/${id}`);

      if (response.data.success) {
        suppliers.value = suppliers.value.filter((s) => s.id !== id);
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to delete supplier');
      }
    } catch (err) {
      error.value =
        err.response?.data?.message ||
        err.message ||
        'Failed to delete supplier';
      console.error('Error deleting supplier:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const fetchSuppliersWithStats = async () => {
    loading.value = true;
    error.value = null;

    try {
      const response = await axios.get(`${API_BASE_URL}/suppliers/stats`);

      if (response.data.success) {
        suppliers.value = response.data.data;
        return response.data.data;
      } else {
        throw new Error(
          response.data.message || 'Failed to fetch suppliers with stats'
        );
      }
    } catch (err) {
      error.value =
        err.response?.data?.message ||
        err.message ||
        'Failed to fetch suppliers with stats';
      console.error('Error fetching suppliers with stats:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const fetchActiveSuppliers = async () => {
    loading.value = true;
    error.value = null;

    try {
      const response = await axios.get(`${API_BASE_URL}/suppliers/active`);

      if (response.data.success) {
        suppliers.value = response.data.data;
        return response.data.data;
      } else {
        throw new Error(
          response.data.message || 'Failed to fetch active suppliers'
        );
      }
    } catch (err) {
      error.value =
        err.response?.data?.message ||
        err.message ||
        'Failed to fetch active suppliers';
      console.error('Error fetching active suppliers:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const restoreSupplier = async (id) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await axios.patch(
        `${API_BASE_URL}/suppliers/${id}/restore`
      );

      if (response.data.success) {
        // Remove from deleted list and add back to main list
        deletedSuppliers.value = deletedSuppliers.value.filter(
          (s) => s.id !== id
        );
        suppliers.value.unshift(response.data.data);
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to restore supplier');
      }
    } catch (err) {
      error.value =
        err.response?.data?.message ||
        err.message ||
        'Failed to restore supplier';
      console.error('Error restoring supplier:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const fetchDeletedSuppliers = async () => {
    loading.value = true;
    error.value = null;

    try {
      const response = await axios.get(`${API_BASE_URL}/suppliers/deleted`);

      if (response.data.success) {
        deletedSuppliers.value = response.data.data; // Store in state
        return response.data.data;
      } else {
        throw new Error(
          response.data.message || 'Failed to fetch deleted suppliers'
        );
      }
    } catch (err) {
      error.value =
        err.response?.data?.message ||
        err.message ||
        'Failed to fetch deleted suppliers';
      console.error('Error fetching deleted suppliers:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  return {
    // State
    suppliers,
    deletedSuppliers, // NEW
    currentSupplier,
    loading,
    error,

    // Getters
    activeSuppliers,
    suppliersByCategory,
    supplierNames,

    // Actions
    fetchSuppliers,
    fetchSupplierById,
    fetchActiveSuppliers,
    fetchDeletedSuppliers, // Make sure this is included
    createSupplier,
    updateSupplier,
    deleteSupplier,
    restoreSupplier, // Make sure this is included
    fetchSuppliersWithStats,
  };
});
