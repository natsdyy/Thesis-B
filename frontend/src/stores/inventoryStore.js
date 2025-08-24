import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

export const useInventoryStore = defineStore('inventory', () => {
  // State
  const categories = ref([]);
  const itemTypes = ref([]);
  const currentInventory = ref([]);
  const inventorySummary = ref([]);
  const stats = ref({});
  const expiringItems = ref([]);
  const lowStockItems = ref([]);
  const loading = ref(false);
  const error = ref(null);
  const categoriesForRequests = ref([]); // New state for centralized categories

  // Getters
  const totalValue = computed(() => {
    return currentInventory.value.reduce(
      (sum, item) => sum + parseFloat(item.total_value || 0),
      0
    );
  });

  const totalItems = computed(() => currentInventory.value.length);

  const categoriesWithCounts = computed(() => {
    return categories.value.map((category) => {
      const count = currentInventory.value.filter(
        (item) => item.category_name === category.name
      ).length;
      return { ...category, count };
    });
  });

  const itemTypesByCategory = computed(() => {
    const grouped = {};
    itemTypes.value.forEach((type) => {
      if (!grouped[type.category_id]) {
        grouped[type.category_id] = [];
      }
      grouped[type.category_id].push(type);
    });
    return grouped;
  });

  const alertsCount = computed(() => {
    return {
      expiring: expiringItems.value.length,
      lowStock: lowStockItems.value.length,
      total: expiringItems.value.length + lowStockItems.value.length,
    };
  });

  // Actions
  const fetchCategories = async () => {
    loading.value = true;
    error.value = null;

    try {
      const response = await axios.get(`${API_BASE_URL}/inventory/categories`);
      if (response.data.success) {
        categories.value = response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to fetch categories');
      }
    } catch (err) {
      error.value =
        err.response?.data?.message ||
        err.message ||
        'Failed to fetch categories';
      console.error('Error fetching categories:', err);
    } finally {
      loading.value = false;
    }
  };

  const fetchItemTypes = async () => {
    loading.value = true;
    error.value = null;

    try {
      const response = await axios.get(`${API_BASE_URL}/inventory/item-types`);
      if (response.data.success) {
        itemTypes.value = response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to fetch item types');
      }
    } catch (err) {
      error.value =
        err.response?.data?.message ||
        err.message ||
        'Failed to fetch item types';
      console.error('Error fetching item types:', err);
    } finally {
      loading.value = false;
    }
  };

  const fetchItemTypesByCategory = async (categoryId) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await axios.get(
        `${API_BASE_URL}/inventory/categories/${categoryId}/item-types`
      );
      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to fetch item types');
      }
    } catch (err) {
      error.value =
        err.response?.data?.message ||
        err.message ||
        'Failed to fetch item types';
      console.error('Error fetching item types by category:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const fetchCurrentInventory = async (filters = {}) => {
    loading.value = true;
    error.value = null;

    try {
      const queryParams = new URLSearchParams();
      Object.keys(filters).forEach((key) => {
        if (filters[key] !== undefined && filters[key] !== '') {
          queryParams.append(key, filters[key]);
        }
      });

      const response = await axios.get(
        `${API_BASE_URL}/inventory/current?${queryParams}`
      );
      if (response.data.success) {
        currentInventory.value = response.data.data;
      } else {
        throw new Error(
          response.data.message || 'Failed to fetch current inventory'
        );
      }
    } catch (err) {
      error.value =
        err.response?.data?.message ||
        err.message ||
        'Failed to fetch current inventory';
      console.error('Error fetching current inventory:', err);
    } finally {
      loading.value = false;
    }
  };

  const fetchInventorySummary = async () => {
    loading.value = true;
    error.value = null;

    try {
      const response = await axios.get(`${API_BASE_URL}/inventory/summary`);
      if (response.data.success) {
        inventorySummary.value = response.data.data;
      } else {
        throw new Error(
          response.data.message || 'Failed to fetch inventory summary'
        );
      }
    } catch (err) {
      error.value =
        err.response?.data?.message ||
        err.message ||
        'Failed to fetch inventory summary';
      console.error('Error fetching inventory summary:', err);
    } finally {
      loading.value = false;
    }
  };

  const fetchStats = async () => {
    loading.value = true;
    error.value = null;

    try {
      const response = await axios.get(`${API_BASE_URL}/inventory/stats`);
      if (response.data.success) {
        stats.value = response.data.data;
      } else {
        throw new Error(
          response.data.message || 'Failed to fetch inventory stats'
        );
      }
    } catch (err) {
      error.value =
        err.response?.data?.message ||
        err.message ||
        'Failed to fetch inventory stats';
      console.error('Error fetching inventory stats:', err);
    } finally {
      loading.value = false;
    }
  };

  const addInventoryItem = async (itemData) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await axios.post(
        `${API_BASE_URL}/inventory/items`,
        itemData
      );
      if (response.data.success) {
        // Refresh current inventory to show the new item
        await fetchCurrentInventory();
        await fetchStats();
        return response.data.data;
      } else {
        throw new Error(
          response.data.message || 'Failed to add inventory item'
        );
      }
    } catch (err) {
      error.value =
        err.response?.data?.message ||
        err.message ||
        'Failed to add inventory item';
      console.error('Error adding inventory item:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const getInventoryItem = async (id) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await axios.get(`${API_BASE_URL}/inventory/items/${id}`);
      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(
          response.data.message || 'Failed to fetch inventory item'
        );
      }
    } catch (err) {
      error.value =
        err.response?.data?.message ||
        err.message ||
        'Failed to fetch inventory item';
      console.error('Error fetching inventory item:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const updateInventoryQuantity = async (id, transactionData) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await axios.patch(
        `${API_BASE_URL}/inventory/items/${id}/quantity`,
        transactionData
      );
      if (response.data.success) {
        // Refresh current inventory to show updated quantities
        await fetchCurrentInventory();
        await fetchStats();
        return response.data.data;
      } else {
        throw new Error(
          response.data.message || 'Failed to update inventory quantity'
        );
      }
    } catch (err) {
      error.value =
        err.response?.data?.message ||
        err.message ||
        'Failed to update inventory quantity';
      console.error('Error updating inventory quantity:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const getTransactionHistory = async (inventoryItemId) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await axios.get(
        `${API_BASE_URL}/inventory/items/${inventoryItemId}/transactions`
      );
      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(
          response.data.message || 'Failed to fetch transaction history'
        );
      }
    } catch (err) {
      error.value =
        err.response?.data?.message ||
        err.message ||
        'Failed to fetch transaction history';
      console.error('Error fetching transaction history:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const fetchExpiringItems = async (days = 7) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await axios.get(
        `${API_BASE_URL}/inventory/alerts/expiring?days=${days}`
      );
      if (response.data.success) {
        expiringItems.value = response.data.data;
      } else {
        throw new Error(
          response.data.message || 'Failed to fetch expiring items'
        );
      }
    } catch (err) {
      error.value =
        err.response?.data?.message ||
        err.message ||
        'Failed to fetch expiring items';
      console.error('Error fetching expiring items:', err);
    } finally {
      loading.value = false;
    }
  };

  const fetchLowStockItems = async () => {
    loading.value = true;
    error.value = null;

    try {
      const response = await axios.get(
        `${API_BASE_URL}/inventory/alerts/low-stock`
      );
      if (response.data.success) {
        lowStockItems.value = response.data.data;
      } else {
        throw new Error(
          response.data.message || 'Failed to fetch low stock items'
        );
      }
    } catch (err) {
      error.value =
        err.response?.data?.message ||
        err.message ||
        'Failed to fetch low stock items';
      console.error('Error fetching low stock items:', err);
    } finally {
      loading.value = false;
    }
  };

  const bulkConsumption = async (consumptionData) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await axios.post(
        `${API_BASE_URL}/inventory/consumption/bulk`,
        consumptionData
      );
      if (response.data.success) {
        // Refresh current inventory to show updated quantities
        await fetchCurrentInventory();
        await fetchStats();
        return response.data;
      } else {
        throw new Error(
          response.data.message || 'Failed to process bulk consumption'
        );
      }
    } catch (err) {
      error.value =
        err.response?.data?.message ||
        err.message ||
        'Failed to process bulk consumption';
      console.error('Error processing bulk consumption:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Helper methods
  const getCategoryById = (id) => {
    return categories.value.find((cat) => cat.id === id);
  };

  const getItemTypeById = (id) => {
    return itemTypes.value.find((type) => type.id === id);
  };

  const getInventoryByCategory = (categoryName) => {
    return currentInventory.value.filter(
      (item) => item.category_name === categoryName
    );
  };

  const getInventoryByItemType = (itemTypeId) => {
    return currentInventory.value.filter(
      (item) => item.item_type_id === itemTypeId
    );
  };

  const calculateTotalValueByCategory = (categoryName) => {
    return getInventoryByCategory(categoryName).reduce(
      (sum, item) => sum + parseFloat(item.total_value || 0),
      0
    );
  };

  const calculateTotalQuantityByCategory = (categoryName) => {
    return getInventoryByCategory(categoryName).reduce(
      (sum, item) => sum + parseFloat(item.quantity || 0),
      0
    );
  };

  // Clear functions
  const clearError = () => {
    error.value = null;
  };

  const clearInventory = () => {
    currentInventory.value = [];
    inventorySummary.value = [];
    stats.value = {};
    expiringItems.value = [];
    lowStockItems.value = [];
  };

  // New methods for centralized categories
  const fetchCategoriesForRequests = async () => {
    loading.value = true;
    error.value = null;
    try {
      const response = await axios.get(
        `${API_BASE_URL}/inventory/categories/for-requests`
      );
      if (response.data.success) {
        categoriesForRequests.value = response.data.data;
      } else {
        throw new Error(
          response.data.message || 'Failed to fetch categories for requests'
        );
      }
    } catch (err) {
      error.value =
        err.response?.data?.message ||
        err.message ||
        'Failed to fetch categories for requests';
      console.error('Error fetching categories for requests:', err);
    } finally {
      loading.value = false;
    }
  };

  const fetchItemTypesByCategoryForRequests = async (categoryId) => {
    loading.value = true;
    error.value = null;
    try {
      const response = await axios.get(
        `${API_BASE_URL}/inventory/categories/${categoryId}/item-types`
      );
      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(
          response.data.message || 'Failed to fetch item types for requests'
        );
      }
    } catch (err) {
      error.value =
        err.response?.data?.message ||
        err.message ||
        'Failed to fetch item types for requests';
      console.error('Error fetching item types for requests:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  return {
    // State
    categories,
    itemTypes,
    currentInventory,
    inventorySummary,
    stats,
    expiringItems,
    lowStockItems,
    loading,
    error,
    categoriesForRequests, // New state

    // Getters
    totalValue,
    totalItems,
    categoriesWithCounts,
    itemTypesByCategory,
    alertsCount,

    // Actions
    fetchCategories,
    fetchItemTypes,
    fetchItemTypesByCategory,
    fetchCurrentInventory,
    fetchInventorySummary,
    fetchStats,
    addInventoryItem,
    getInventoryItem,
    updateInventoryQuantity,
    getTransactionHistory,
    fetchExpiringItems,
    fetchLowStockItems,
    bulkConsumption,
    fetchCategoriesForRequests, // New action
    fetchItemTypesByCategoryForRequests, // New action

    // Helper methods
    getCategoryById,
    getItemTypeById,
    getInventoryByCategory,
    getInventoryByItemType,
    calculateTotalValueByCategory,
    calculateTotalQuantityByCategory,
    clearError,
    clearInventory,
  };
});
