import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import axios from 'axios';
import { apiConfig } from '../config/api.js';

export const useSupplierProductsStore = defineStore('supplierProducts', () => {
  // State
  const products = ref([]);
  const itemTypes = ref([]);
  const loading = ref(false);
  const error = ref(null);

  // Getters
  const availableProducts = computed(() =>
    products.value.filter((p) => p.is_available)
  );

  const productsByItemType = computed(
    () => (itemTypeId) =>
      products.value.filter((p) => p.item_type_id === itemTypeId)
  );

  const productCount = computed(() => products.value.length);

  const availableCount = computed(() => availableProducts.value.length);

  // Actions
  const getToken = () => localStorage.getItem('supplierToken');

  const getSupplier = () => JSON.parse(localStorage.getItem('supplier'));

  const fetchProducts = async (filters = {}) => {
    loading.value = true;
    error.value = null;

    try {
      const token = getToken();
      const supplier = getSupplier();

      let url = `${apiConfig.baseURL}/supplier-products?supplier_id=${supplier.id}`;

      if (filters.search) {
        url += `&search=${encodeURIComponent(filters.search)}`;
      }
      if (filters.item_type_id) {
        url += `&item_type_id=${encodeURIComponent(filters.item_type_id)}`;
      }

      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        products.value = response.data.data || [];
        return response.data.data;
      }
    } catch (err) {
      error.value =
        err.response?.data?.message || err.message || 'Failed to load products';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const fetchAvailableProducts = async () => {
    loading.value = true;
    error.value = null;

    try {
      const token = getToken();
      const supplier = getSupplier();

      const response = await axios.get(
        `${apiConfig.baseURL}/supplier-products/available?supplier_id=${supplier.id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        return response.data.data || [];
      }
    } catch (err) {
      error.value =
        err.response?.data?.message ||
        err.message ||
        'Failed to load available products';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const fetchItemTypes = async () => {
    try {
      const token = getToken();

      const response = await axios.get(
        `${apiConfig.baseURL}/supplier-products/all-item-types`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        itemTypes.value = response.data.data || [];
        return response.data.data;
      }
    } catch (err) {
      error.value =
        err.response?.data?.message ||
        err.message ||
        'Failed to load item types';
      throw err;
    }
  };

  const getProductById = async (productId) => {
    loading.value = true;
    error.value = null;

    try {
      const token = getToken();

      const response = await axios.get(
        `${apiConfig.baseURL}/supplier-products/${productId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        return response.data.data;
      }
    } catch (err) {
      error.value =
        err.response?.data?.message || err.message || 'Failed to load product';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const createProduct = async (productData) => {
    loading.value = true;
    error.value = null;

    try {
      const token = getToken();
      const supplier = getSupplier();

      const data = {
        ...productData,
        supplier_id: supplier.id,
      };

      const response = await axios.post(
        `${apiConfig.baseURL}/supplier-products`,
        data,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        // Add new product to the list
        products.value.unshift(response.data.data);

        return response.data.data;
      }
    } catch (err) {
      error.value =
        err.response?.data?.message ||
        err.message ||
        'Failed to create product';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const updateProduct = async (productId, productData) => {
    loading.value = true;
    error.value = null;

    try {
      const token = getToken();
      const supplier = getSupplier();

      const data = {
        ...productData,
        supplier_id: supplier.id,
      };

      const response = await axios.put(
        `${apiConfig.baseURL}/supplier-products/${productId}`,
        data,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        // Update product in the list
        const index = products.value.findIndex((p) => p.id === productId);
        if (index !== -1) {
          products.value[index] = response.data.data;
        }

        return response.data.data;
      }
    } catch (err) {
      error.value =
        err.response?.data?.message ||
        err.message ||
        'Failed to update product';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const deleteProduct = async (productId) => {
    loading.value = true;
    error.value = null;

    try {
      const token = getToken();
      const supplier = getSupplier();

      const response = await axios.delete(
        `${apiConfig.baseURL}/supplier-products/${productId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          data: { supplier_id: supplier.id },
        }
      );

      if (response.data.success) {
        // Remove product from the list
        products.value = products.value.filter((p) => p.id !== productId);

        return response.data.data;
      }
    } catch (err) {
      error.value =
        err.response?.data?.message ||
        err.message ||
        'Failed to delete product';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const toggleAvailability = async (productId) => {
    loading.value = true;
    error.value = null;

    try {
      const token = getToken();
      const supplier = getSupplier();

      const response = await axios.patch(
        `${apiConfig.baseURL}/supplier-products/${productId}/toggle-availability`,
        { supplier_id: supplier.id },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        // Update product in the list
        const index = products.value.findIndex((p) => p.id === productId);
        if (index !== -1) {
          products.value[index] = response.data.data;
        }

        return response.data.data;
      }
    } catch (err) {
      error.value =
        err.response?.data?.message ||
        err.message ||
        'Failed to update availability';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const searchProducts = async (searchTerm) => {
    return fetchProducts({ search: searchTerm });
  };

  const filterByItemType = async (itemTypeId) => {
    return fetchProducts({ item_type_id: itemTypeId });
  };

  const clearError = () => {
    error.value = null;
  };

  const resetStore = () => {
    products.value = [];
    itemTypes.value = [];
    loading.value = false;
    error.value = null;
  };

  return {
    // State
    products,
    itemTypes,
    loading,
    error,

    // Getters
    availableProducts,
    productsByItemType,
    productCount,
    availableCount,

    // Actions
    fetchProducts,
    fetchAvailableProducts,
    fetchItemTypes,
    getProductById,
    createProduct,
    updateProduct,
    deleteProduct,
    toggleAvailability,
    searchProducts,
    filterByItemType,
    clearError,
    resetStore,
  };
});
