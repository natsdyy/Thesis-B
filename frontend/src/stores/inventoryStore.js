import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import axios from 'axios';
import { apiConfig } from '../config/api.js';

const API_BASE_URL = apiConfig.baseURL;

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
  // Distribution draft cart (SCM + Production)
  const distributionCart = ref({
    branch_id: '',
    items: [], // { key, source: 'scm'|'production', item, item_id, name, unit, unit_price, quantity }
    notes: '',
  });
  // Recent activity
  const recentActivity = ref([]);

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

  // Cart totals
  const cartItemCount = computed(() => distributionCart.value.items.length);
  const cartTotalQuantity = computed(() =>
    distributionCart.value.items.reduce(
      (s, it) => s + Number(it.quantity || 0),
      0
    )
  );
  const cartTotalValue = computed(() =>
    distributionCart.value.items.reduce(
      (s, it) => s + Number(it.unit_price || 0) * Number(it.quantity || 0),
      0
    )
  );

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

  // ===== Distribution Cart Actions =====
  const setCartBranch = (branchId) => {
    distributionCart.value.branch_id = branchId || '';
  };

  const clearDistributionCart = () => {
    distributionCart.value = { branch_id: '', items: [], notes: '' };
  };

  const addToDistributionCart = ({
    source,
    item,
    item_id,
    name,
    unit,
    unit_price,
    quantity,
    branch_id,
  }) => {
    if (!branch_id && !distributionCart.value.branch_id) {
      throw new Error('Branch is required');
    }
    const effectiveBranch = branch_id || distributionCart.value.branch_id;
    if (
      distributionCart.value.branch_id &&
      effectiveBranch !== distributionCart.value.branch_id
    ) {
      throw new Error('Selected branch differs from current cart branch');
    }
    distributionCart.value.branch_id = effectiveBranch;
    const key = `${source}:${item_id}`;
    const existing = distributionCart.value.items.find((it) => it.key === key);
    if (existing) {
      existing.quantity = Number(existing.quantity) + Number(quantity || 0);
      existing.unit_price = Number(unit_price || existing.unit_price || 0);
    } else {
      distributionCart.value.items.push({
        key,
        source,
        item,
        item_id,
        name,
        unit,
        unit_price: Number(unit_price || 0),
        quantity: Number(quantity || 0),
      });
    }
  };

  const updateCartItem = (key, { quantity, unit_price }) => {
    const idx = distributionCart.value.items.findIndex((it) => it.key === key);
    if (idx === -1) return;
    if (quantity !== undefined)
      distributionCart.value.items[idx].quantity = Number(quantity);
    if (unit_price !== undefined)
      distributionCart.value.items[idx].unit_price = Number(unit_price);
  };

  const removeFromCart = (key) => {
    distributionCart.value.items = distributionCart.value.items.filter(
      (it) => it.key !== key
    );
    if (distributionCart.value.items.length === 0)
      distributionCart.value.branch_id = '';
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

  // Fetch recent activity
  const fetchRecentActivity = async (limit = 10) => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/inventory/recent-activity?limit=${limit}`
      );

      if (response.data.success) {
        recentActivity.value = response.data.data;
        return recentActivity.value;
      } else {
        throw new Error(
          response.data.message || 'Failed to fetch recent activity'
        );
      }
    } catch (error) {
      console.error('Error fetching recent activity:', error);
      throw error;
    }
  };

  // Fetch all transactions with filters and pagination
  const fetchAllTransactions = async (params = {}) => {
    try {
      const queryParams = new URLSearchParams();

      // Add all parameters to query string
      Object.keys(params).forEach((key) => {
        if (
          params[key] !== '' &&
          params[key] !== null &&
          params[key] !== undefined
        ) {
          queryParams.append(key, params[key]);
        }
      });

      const response = await axios.get(
        `${API_BASE_URL}/inventory/transactions?${queryParams.toString()}`
      );

      if (response.data.success) {
        return response.data;
      } else {
        throw new Error(
          response.data.message || 'Failed to fetch transactions'
        );
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
      throw error;
    }
  };

  const fetchDisposedItems = async (params = {}) => {
    try {
      const queryParams = new URLSearchParams();

      // Add all parameters to query string
      Object.keys(params).forEach((key) => {
        if (
          params[key] !== '' &&
          params[key] !== null &&
          params[key] !== undefined
        ) {
          queryParams.append(key, params[key]);
        }
      });

      const response = await axios.get(
        `${API_BASE_URL}/inventory/disposed?${queryParams.toString()}`
      );

      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(
          response.data.message || 'Failed to fetch disposed items'
        );
      }
    } catch (error) {
      console.error('Error fetching disposed items:', error);
      throw error;
    }
  };

  // Single consumption
  const singleConsumption = async (consumptionData) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await axios.post(
        `${API_BASE_URL}/inventory/consumption/single`,
        consumptionData
      );

      if (response.data.success) {
        // Refresh current inventory to show updated quantities
        await fetchCurrentInventory();
        await fetchStats();
        await fetchRecentActivity();
        return response.data;
      } else {
        throw new Error(
          response.data.message || 'Failed to record consumption'
        );
      }
    } catch (err) {
      error.value =
        err.response?.data?.message ||
        err.message ||
        'Failed to record consumption';
      console.error('Error recording consumption:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Stock adjustment
  const stockAdjustment = async (adjustmentData) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await axios.post(
        `${API_BASE_URL}/inventory/adjustment`,
        adjustmentData
      );

      if (response.data.success) {
        // Refresh current inventory to show updated quantities
        await fetchCurrentInventory();
        await fetchStats();
        await fetchRecentActivity();
        return response.data;
      } else {
        throw new Error(response.data.message || 'Failed to record adjustment');
      }
    } catch (err) {
      error.value =
        err.response?.data?.message ||
        err.message ||
        'Failed to record adjustment';
      console.error('Error recording adjustment:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Branch distribution (SCM inventory → branch)
  // This uses the existing stock adjustment endpoint with adjustment_type 'transfer_out'
  // and computes the new quantity after distribution.
  const distributeToBranch = async ({
    inventory_item_id,
    current_quantity,
    branch_id,
    quantity,
    transfer_price,
    notes,
    performed_by = null,
    reference_number = null,
  }) => {
    loading.value = true;
    error.value = null;

    try {
      const new_quantity =
        parseFloat(current_quantity || 0) - parseFloat(quantity || 0);
      if (new_quantity < 0) {
        throw new Error('Distributed quantity exceeds available stock');
      }

      // Resolve performed_by from auth store if not provided
      let actorName = performed_by;
      try {
        if (!actorName) {
          const { useAuthStore } = await import('./authStore.js');
          const authStore = useAuthStore();
          const u = authStore?.user;
          if (u) {
            actorName =
              [u.first_name, u.last_name].filter(Boolean).join(' ') ||
              u.full_name ||
              u.email ||
              'System';
          }
        }
      } catch (_) {
        actorName = performed_by || 'System';
      }

      const payload = {
        inventory_item_id,
        adjustment_type: 'reduce_quantity', // use supported adjustment type
        new_quantity,
        reason: 'Branch Distribution',
        // Carry context; backend can log these in audit trail
        notes:
          notes || `Distributed to branch ${branch_id} @ ${transfer_price}`,
        reference_number,
        performed_by: actorName || 'System',
        branch_id,
        transfer_price,
        audit_action: 'transfer_out',
      };

      const response = await axios.post(
        `${API_BASE_URL}/inventory/adjustment`,
        payload
      );

      if (response.data.success) {
        await Promise.all([
          fetchCurrentInventory(),
          fetchStats(),
          fetchRecentActivity(),
        ]);
        return response.data;
      } else {
        throw new Error(
          response.data.message || 'Failed to distribute to branch'
        );
      }
    } catch (err) {
      error.value =
        err.response?.data?.message ||
        err.message ||
        'Failed to distribute to branch';
      console.error('Error distributing to branch:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // DEV: Seed backdated consumption transactions for testing forecasting
  const seedTestConsumption = async (inventoryItemId, entries = []) => {
    // entries: [{ date: Date|string, quantity: number }]
    loading.value = true;
    error.value = null;
    try {
      for (const e of entries) {
        const payload = {
          transaction_type: 'consumption',
          quantity: e.quantity,
          reference_number: 'SEED',
          reason: 'Test Seed',
          notes: 'Forecasting test seed',
          performed_by: 'Seeder',
          transaction_date:
            e.date instanceof Date ? e.date.toISOString() : e.date,
        };
        await axios.patch(
          `${API_BASE_URL}/inventory/items/${inventoryItemId}/quantity`,
          payload
        );
      }
      // Refresh key datasets
      await Promise.all([
        fetchCurrentInventory(),
        fetchRecentActivity(),
        fetchLowStockItems(),
      ]);
      return true;
    } catch (err) {
      error.value =
        err.response?.data?.message ||
        err.message ||
        'Failed to seed test consumption';
      console.error('Error seeding test consumption:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Configure alerts
  const configureAlert = async (alertData) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await axios.post(
        `${API_BASE_URL}/inventory/alerts/configure`,
        alertData
      );

      if (response.data.success) {
        await fetchLowStockItems(); // Refresh alerts
        return response.data;
      } else {
        throw new Error(response.data.message || 'Failed to configure alert');
      }
    } catch (err) {
      error.value =
        err.response?.data?.message ||
        err.message ||
        'Failed to configure alert';
      console.error('Error configuring alert:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Get alert configuration
  const getAlertConfiguration = async (itemTypeId) => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/inventory/alerts/configure/${itemTypeId}`
      );

      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(
          response.data.message || 'Failed to fetch alert configuration'
        );
      }
    } catch (err) {
      console.error('Error fetching alert configuration:', err);
      throw err;
    }
  };

  // Acknowledge alert
  const acknowledgeAlert = async (alertId, acknowledgedBy, notes) => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/inventory/alerts/${alertId}/acknowledge`,
        { acknowledged_by: acknowledgedBy, notes }
      );

      if (response.data.success) {
        await fetchLowStockItems(); // Refresh alerts
        return response.data;
      } else {
        throw new Error(response.data.message || 'Failed to acknowledge alert');
      }
    } catch (err) {
      console.error('Error acknowledging alert:', err);
      throw err;
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
    distributionCart,
    categoriesForRequests, // New state
    recentActivity,

    // GettersWz
    totalValue,
    totalItems,
    categoriesWithCounts,
    itemTypesByCategory,
    alertsCount,
    cartItemCount,
    cartTotalQuantity,
    cartTotalValue,

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
    fetchRecentActivity,
    fetchAllTransactions,
    fetchDisposedItems,
    singleConsumption,
    stockAdjustment,
    distributeToBranch,
    setCartBranch,
    clearDistributionCart,
    addToDistributionCart,
    updateCartItem,
    removeFromCart,
    configureAlert,
    getAlertConfiguration,
    acknowledgeAlert,

    // Dev helpers
    seedTestConsumption,

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
