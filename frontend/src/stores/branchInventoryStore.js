import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import axios from 'axios';
import { apiConfig } from '../config/api.js';

export const useBranchInventoryStore = defineStore('branchInventory', () => {
  // State
  const inventory = ref([]);
  const stats = ref({});
  const lowStockItems = ref([]);
  const expiringItems = ref([]);
  const recentActivity = ref([]);
  const loading = ref(false);
  const error = ref(null);

  // Cache for multiple branch inventory to avoid redundant API calls
  const inventoryCache = ref({});
  const cacheExpiry = ref({});

  // Getters
  const totalItems = computed(() => inventory.value.length);
  const totalValue = computed(() => {
    return inventory.value.reduce(
      (sum, item) => sum + parseFloat(item.total_value || 0),
      0
    );
  });
  const lowStockCount = computed(() => lowStockItems.value.length);
  const expiringCount = computed(() => expiringItems.value.length);

  // Actions
  const fetchInventory = async (branchId, filters = {}) => {
    loading.value = true;
    error.value = null;

    try {
      const params = new URLSearchParams();
      Object.keys(filters).forEach((key) => {
        if (filters[key]) {
          params.append(key, filters[key]);
        }
      });

      const response = await axios.get(
        `${apiConfig.baseURL}/branch-inventory/${branchId}?${params.toString()}`
      );

      if (response.data.success) {
        inventory.value = response.data.data;
        return response.data.data; // Return the data for use in components
      } else {
        throw new Error(response.data.message || 'Failed to fetch inventory');
      }
    } catch (err) {
      error.value =
        err.response?.data?.message ||
        err.message ||
        'Failed to fetch inventory';
      console.error('Error fetching branch inventory:', err);

      // Don't throw the error to prevent redirects, just log it
      console.warn('Branch inventory fetch failed, but continuing...');
      return []; // Return empty array on error
    } finally {
      loading.value = false;
    }
  };

  // Fetch inventory for multiple branches (optimized with backend endpoint)
  const fetchMultipleBranchInventory = async (branchIds, filters = {}) => {
    // Create cache key based on branch IDs and filters
    const cacheKey = `${branchIds.sort().join(',')}_${JSON.stringify(filters)}`;
    const now = Date.now();
    const cacheTimeout = 30000; // 30 seconds cache

    // Check if we have valid cached data
    if (inventoryCache.value[cacheKey] && cacheExpiry.value[cacheKey] > now) {
      return inventoryCache.value[cacheKey];
    }

    // If only one branch, use the single branch method
    if (branchIds.length === 1) {
      const branchId = branchIds[0];
      try {
        const data = await fetchInventory(branchId, filters);
        const result = { [branchId]: data || [] };

        // Cache the result
        inventoryCache.value[cacheKey] = result;
        cacheExpiry.value[cacheKey] = now + cacheTimeout;

        return result;
      } catch (error) {
        console.warn(
          `❌ Failed to fetch inventory for branch ${branchId}:`,
          error
        );
        return { [branchId]: [] };
      }
    }

    loading.value = true;
    error.value = null;

    try {
      // Temporarily use fallback method until backend endpoint is used
      return await fetchMultipleBranchInventoryFallback(branchIds, filters);
    } catch (error) {
      console.error('❌ Error fetching multiple branch inventory:', error);
      return {};
    } finally {
      loading.value = false;
    }
  };

  // Fallback method using individual requests (for backwards compatibility)
  const fetchMultipleBranchInventoryFallback = async (
    branchIds,
    filters = {}
  ) => {
    try {
      // Use Promise.allSettled for graceful error handling
      const inventoryPromises = branchIds.map(async (branchId) => {
        try {
          const data = await fetchInventory(branchId, filters);
          return { branchId, data: data || [] };
        } catch (error) {
          console.error(
            `❌ Failed to fetch inventory for branch ${branchId}:`,
            error.response?.status,
            error.response?.data || error.message
          );
          throw { branchId, error };
        }
      });

      const results = await Promise.allSettled(inventoryPromises);

      // Process results
      const branchInventoryData = {};
      let successCount = 0;
      let failureCount = 0;

      results.forEach((result, index) => {
        const branchIdFromOrder = branchIds[index];
        if (result.status === 'fulfilled') {
          // Be defensive: some environments strip custom properties from fulfilled values
          const resolvedBranchId =
            result.value && result.value.branchId !== undefined
              ? result.value.branchId
              : branchIdFromOrder;

          branchInventoryData[resolvedBranchId] = result.value?.data || [];
          successCount++;
        } else {
          console.warn(`[WARN] Rejected result:`, result.reason);
          branchInventoryData[branchIdFromOrder] = [];
          failureCount++;
        }
      });

      return branchInventoryData;
    } catch (error) {
      console.error('❌ Error in fallback method:', error);
      return {};
    }
  };

  // Clear inventory cache (useful when data is updated)
  const clearInventoryCache = () => {
    console.log('🗑️ Clearing inventory cache');
    inventoryCache.value = {};
    cacheExpiry.value = {};
  };

  const fetchStats = async (branchId) => {
    try {
      const response = await axios.get(
        `${apiConfig.baseURL}/branch-inventory/${branchId}/stats`
      );

      if (response.data.success) {
        stats.value = response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to fetch stats');
      }
    } catch (err) {
      error.value =
        err.response?.data?.message || err.message || 'Failed to fetch stats';
      console.error('Error fetching branch stats:', err);
      console.warn('Branch stats fetch failed, but continuing...');
    }
  };

  const fetchLowStockItems = async (branchId) => {
    try {
      const response = await axios.get(
        `${apiConfig.baseURL}/branch-inventory/${branchId}/low-stock`
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
      console.warn('Low stock items fetch failed, but continuing...');
    }
  };

  const fetchExpiringItems = async (branchId, days = 7) => {
    try {
      const response = await axios.get(
        `${apiConfig.baseURL}/branch-inventory/${branchId}/expiring?days=${days}`
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
      console.warn('Expiring items fetch failed, but continuing...');
    }
  };

  const fetchRecentActivity = async (branchId, limit = 10) => {
    try {
      const response = await axios.get(
        `${apiConfig.baseURL}/branch-inventory/${branchId}/activity?limit=${limit}`
      );

      if (response.data.success) {
        recentActivity.value = response.data.data;
      } else {
        throw new Error(
          response.data.message || 'Failed to fetch recent activity'
        );
      }
    } catch (err) {
      error.value =
        err.response?.data?.message ||
        err.message ||
        'Failed to fetch recent activity';
      console.error('Error fetching recent activity:', err);
      console.warn('Recent activity fetch failed, but continuing...');
    }
  };

  // Fetch all transactions for a branch with filters and pagination
  const fetchAllTransactions = async (branchId, params = {}) => {
    try {
      const queryParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, value);
        }
      });

      const response = await axios.get(
        `${apiConfig.baseURL}/branch-inventory/${branchId}/transactions?${queryParams.toString()}`
      );

      if (response.data && response.data.data) {
        return {
          data: response.data.data,
          total: response.data.total || response.data.data.length,
          page: response.data.page || 1,
          totalPages: response.data.totalPages || 1,
        };
      }

      // Fallback shape if backend returns array directly
      if (Array.isArray(response.data)) {
        return {
          data: response.data,
          total: response.data.length,
          page: 1,
          totalPages: 1,
        };
      }

      return { data: [], total: 0, page: 1, totalPages: 1 };
    } catch (err) {
      console.error('Error fetching branch transactions:', err);
      throw (
        err.response?.data?.message ||
        err.message ||
        'Failed to fetch transactions'
      );
    }
  };

  const addItem = async (branchId, itemData) => {
    try {
      const response = await axios.post(
        `${apiConfig.baseURL}/branch-inventory/${branchId}/items`,
        itemData
      );

      if (response.data.success) {
        // Refresh inventory after adding item
        await fetchInventory(branchId);
        await fetchStats(branchId);
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to add item');
      }
    } catch (err) {
      error.value =
        err.response?.data?.message || err.message || 'Failed to add item';
      console.error('Error adding item:', err);
      throw err;
    }
  };

  const updateQuantity = async (itemId, quantity, reason = 'adjustment') => {
    try {
      const response = await axios.put(
        `${apiConfig.baseURL}/branch-inventory/items/${itemId}/quantity`,
        {
          quantity,
          reason,
        }
      );

      if (response.data.success) {
        // Update local inventory
        const itemIndex = inventory.value.findIndex(
          (item) => item.id === itemId
        );
        if (itemIndex !== -1) {
          inventory.value[itemIndex] = response.data.data;
        }
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to update quantity');
      }
    } catch (err) {
      error.value =
        err.response?.data?.message ||
        err.message ||
        'Failed to update quantity';
      console.error('Error updating quantity:', err);
      throw err;
    }
  };

  const updateStatus = async (itemId, status) => {
    try {
      const response = await axios.put(
        `${apiConfig.baseURL}/branch-inventory/items/${itemId}/status`,
        {
          status,
        }
      );

      if (response.data.success) {
        // Update local inventory
        const itemIndex = inventory.value.findIndex(
          (item) => item.id === itemId
        );
        if (itemIndex !== -1) {
          inventory.value[itemIndex] = response.data.data;
        }
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to update status');
      }
    } catch (err) {
      error.value =
        err.response?.data?.message || err.message || 'Failed to update status';
      console.error('Error updating status:', err);
      throw err;
    }
  };

  const updateExpiryDate = async (
    itemId,
    expiry_date,
    { reference_number = null, notes = null } = {}
  ) => {
    try {
      const response = await axios.put(
        `${apiConfig.baseURL}/branch-inventory/items/${itemId}/expiry`,
        {
          expiry_date,
          reference_number,
          notes,
        }
      );

      if (response.data.success) {
        const itemIndex = inventory.value.findIndex(
          (item) => item.id === itemId
        );
        if (itemIndex !== -1) {
          inventory.value[itemIndex] = response.data.data;
        }
        return response.data.data;
      } else {
        throw new Error(
          response.data.message || 'Failed to update item expiry date'
        );
      }
    } catch (err) {
      error.value =
        err.response?.data?.message || err.message || 'Failed to update expiry';
      console.error('Error updating expiry date:', err);
      throw err;
    }
  };

  const deleteItem = async (itemId) => {
    try {
      const response = await axios.delete(
        `${apiConfig.baseURL}/branch-inventory/items/${itemId}`
      );

      if (response.data.success) {
        inventory.value = inventory.value.filter((item) => item.id !== itemId);
        return true;
      } else {
        throw new Error(response.data.message || 'Failed to delete item');
      }
    } catch (err) {
      error.value =
        err.response?.data?.message || err.message || 'Failed to delete item';
      console.error('Error deleting item:', err);
      throw err;
    }
  };

  const loadAllData = async (branchId) => {
    try {
      await Promise.all([
        fetchInventory(branchId),
        fetchStats(branchId),
        fetchLowStockItems(branchId),
        fetchExpiringItems(branchId),
        fetchRecentActivity(branchId),
      ]);
    } catch (err) {
      console.error('Error loading all branch inventory data:', err);
      console.warn(
        'Some branch inventory data failed to load, but continuing...'
      );
    }
  };

  // Helper functions
  const getItemStatus = (item) => {
    if (item.quantity <= 0)
      return {
        status: 'out_of_stock',
        class: 'badge-error',
        text: 'Out of Stock',
      };
    if (item.quantity <= item.minimum_stock)
      return { status: 'low_stock', class: 'badge-warning', text: 'Low Stock' };
    return { status: 'available', class: 'badge-success', text: 'In Stock' };
  };

  const getExpiryStatus = (expiryDate) => {
    if (!expiryDate)
      return { status: 'no_expiry', class: 'text-gray-500', text: 'No Expiry' };

    const today = new Date();
    const expiry = new Date(expiryDate);
    const daysUntilExpiry = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));

    if (daysUntilExpiry < 0)
      return {
        status: 'expired',
        class: 'text-error font-bold',
        text: 'Expired',
      };
    if (daysUntilExpiry <= 3)
      return {
        status: 'expiring_soon',
        class: 'text-error',
        text: `${daysUntilExpiry} days left`,
      };
    if (daysUntilExpiry <= 7)
      return {
        status: 'expiring_soon',
        class: 'text-warning',
        text: `${daysUntilExpiry} days left`,
      };
    return {
      status: 'good',
      class: 'text-success',
      text: `${daysUntilExpiry} days left`,
    };
  };

  return {
    // State
    inventory,
    stats,
    lowStockItems,
    expiringItems,
    recentActivity,
    loading,
    error,

    // Getters
    totalItems,
    totalValue,
    lowStockCount,
    expiringCount,

    // Actions
    fetchInventory,
    fetchMultipleBranchInventory,
    clearInventoryCache,
    fetchStats,
    fetchLowStockItems,
    fetchExpiringItems,
    fetchRecentActivity,
    fetchAllTransactions,
    addItem,
    updateQuantity,
    updateStatus,
    updateExpiryDate,
    deleteItem,
    loadAllData,

    // Helpers
    getItemStatus,
    getExpiryStatus,
  };
});
