// frontend/src/stores/purchaseOrderStore.js
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import axios from 'axios';
import { apiConfig } from '../config/api.js';
import { useAuthStore } from './authStore.js';

export const usePurchaseOrderStore = defineStore('purchaseOrder', () => {
  // State
  const purchaseOrders = ref([]);
  const loading = ref(false);
  const error = ref(null);
  const lastFetchTime = ref(null);
  const cacheTimeout = 3 * 60 * 1000; // 3 minutes (reduced from 5)

  // Enhanced caching for individual POs
  const poCache = ref(new Map());
  const poCacheTimeout = 2 * 60 * 1000; // 2 minutes for individual POs

  // Stats with separate caching
  const stats = ref({
    total: 0,
    draft: 0,
    sent: 0,
    confirmed: 0,
    inProgress: 0,
    completed: 0,
    cancelled: 0,
    returns: 0,
    totalValue: 0,
    pending: 0,
  });
  const lastStatsFetchTime = ref(null);
  const statsCacheTimeout = 2 * 60 * 1000; // 2 minutes for stats

  // Add this state for item returns
  const itemReturns = ref([]);

  // Getters
  const purchaseOrdersByStatus = computed(() => (status) => {
    return purchaseOrders.value.filter((order) => order.status === status);
  });

  const completedOrders = computed(() => {
    return purchaseOrders.value.filter((order) => order.status === 'Completed');
  });

  const pendingOrders = computed(() => {
    return purchaseOrders.value.filter(
      (order) => order.status === 'Pending' || order.status === 'In Progress'
    );
  });

  const draftOrders = computed(() => {
    return purchaseOrders.value.filter((order) => order.status === 'Draft');
  });

  // Add this getter for item returns
  const itemReturnsByStatus = computed(() => (status) => {
    return itemReturns.value.filter(
      (returnItem) => returnItem.status === status
    );
  });

  // Helper getter for purchase orders with supplier products
  const ordersWithSupplierProducts = computed(() => {
    return purchaseOrders.value.filter(
      (order) =>
        order.items && order.items.some((item) => item.supplier_product_id)
    );
  });

  // Helper getter for purchase orders by supplier
  const ordersBySupplier = computed(() => (supplierId) => {
    return purchaseOrders.value.filter(
      (order) => order.supplier_id === supplierId
    );
  });

  // Check if cache is still valid
  const isCacheValid = computed(() => {
    return (
      lastFetchTime.value && Date.now() - lastFetchTime.value < cacheTimeout
    );
  });

  // Check if individual PO cache is valid
  const isPOCacheValid = (id) => {
    const cached = poCache.value.get(id);
    return cached && Date.now() - cached.timestamp < poCacheTimeout;
  };

  // Check if stats cache is valid
  const isStatsCacheValid = computed(() => {
    return (
      lastStatsFetchTime.value &&
      Date.now() - lastStatsFetchTime.value < statsCacheTimeout
    );
  });

  // Actions
  const fetchPurchaseOrders = async (filters = {}) => {
    // Return cached data if still valid and no specific filters
    if (isCacheValid.value && Object.keys(filters).length === 0) {
      return purchaseOrders.value;
    }

    loading.value = true;
    error.value = null;

    try {
      const params = new URLSearchParams();

      // Add filters to params for server-side filtering
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
        `${apiConfig.baseURL}/purchase-orders?${params.toString()}`
      );

      if (response.data.success) {
        purchaseOrders.value = response.data.data || [];
        lastFetchTime.value = Date.now();
        return purchaseOrders.value;
      } else {
        throw new Error(
          response.data.message || 'Failed to fetch purchase orders'
        );
      }
    } catch (err) {
      error.value =
        err.response?.data?.message ||
        err.message ||
        'Failed to fetch purchase orders';
      console.error('Error fetching purchase orders:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const fetchPurchaseOrderById = async (id, useCache = true) => {
    // Check cache first if enabled
    if (useCache && isPOCacheValid(id)) {
      return poCache.value.get(id).data;
    }

    loading.value = true;
    error.value = null;

    try {
      const response = await axios.get(
        `${apiConfig.baseURL}/purchase-orders/${id}`
      );

      if (response.data.success) {
        const poData = response.data.data;

        // Cache the PO data
        poCache.value.set(id, {
          data: poData,
          timestamp: Date.now(),
        });

        return poData;
      } else {
        throw new Error(
          response.data.message || 'Failed to fetch purchase order'
        );
      }
    } catch (err) {
      error.value =
        err.response?.data?.message ||
        err.message ||
        'Failed to fetch purchase order';
      console.error('Error fetching purchase order:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const createPurchaseOrderFromSupplyRequest = async (
    supplyRequestId,
    supplierId,
    poData
  ) => {
    loading.value = true;
    error.value = null;

    try {
      const payload = {
        supplyRequestId,
        supplierId,
        poData: {
          ...poData,
          created_by: poData.created_by || 'SCM User',
        },
      };

      const response = await axios.post(
        `${apiConfig.baseURL}/purchase-orders/from-supply-request`,
        payload
      );

      if (response.data.success) {
        purchaseOrders.value.unshift(response.data.data);
        await fetchStats();
        return response.data.data;
      } else {
        throw new Error(
          response.data.message || 'Failed to create purchase order'
        );
      }
    } catch (err) {
      error.value =
        err.response?.data?.message ||
        err.message ||
        'Failed to create purchase order';
      console.error('Error creating purchase order from supply request:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const createPurchaseOrderFromSupplyRequestWithItems = async (
    supplyRequestId,
    supplierId,
    poData,
    selectedItems
  ) => {
    loading.value = true;
    error.value = null;

    try {
      const payload = {
        supplyRequestId,
        supplierId,
        poData: {
          ...poData,
          created_by: poData.created_by || 'SCM User',
        },
        selectedItems: selectedItems.map((item) => ({
          id: item.id,
          item_name: item.item_name || item.name,
          quantity: item.item_quantity || item.quantity,
          unit: item.item_unit || item.unit,
          unit_price: item.item_unit_price || item.unit_price,
          total_price: item.item_amount || item.total_price,
          description: item.item_notes || item.description,
        })),
      };

      const response = await axios.post(
        `${apiConfig.baseURL}/purchase-orders/from-supply-request-with-items`,
        payload
      );

      if (response.data.success) {
        purchaseOrders.value.unshift(response.data.data);
        await fetchStats();
        return response.data.data;
      } else {
        throw new Error(
          response.data.message || 'Failed to create purchase order'
        );
      }
    } catch (err) {
      error.value =
        err.response?.data?.message ||
        err.message ||
        'Failed to create purchase order';
      console.error(
        'Error creating purchase order from supply request with items:',
        err
      );
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const createPurchaseOrder = async (poData, items) => {
    loading.value = true;
    error.value = null;

    try {
      const payload = {
        poData: {
          ...poData,
          created_by: poData.created_by || 'SCM User',
        },
        items,
      };

      const response = await axios.post(
        `${apiConfig.baseURL}/purchase-orders`,
        payload
      );

      if (response.data.success) {
        purchaseOrders.value.unshift(response.data.data);
        await fetchStats();
        return response.data.data;
      } else {
        throw new Error(
          response.data.message || 'Failed to create purchase order'
        );
      }
    } catch (err) {
      error.value =
        err.response?.data?.message ||
        err.message ||
        'Failed to create purchase order';
      console.error('Error creating purchase order:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const updatePurchaseOrder = async (id, poData, items = null) => {
    loading.value = true;
    error.value = null;

    try {
      const payload = { poData, items };

      const response = await axios.put(
        `${apiConfig.baseURL}/purchase-orders/${id}`,
        payload
      );

      if (response.data.success) {
        const index = purchaseOrders.value.findIndex((po) => po.id === id);
        if (index !== -1) {
          purchaseOrders.value[index] = response.data.data;
        }
        await fetchStats();
        return response.data.data;
      } else {
        throw new Error(
          response.data.message || 'Failed to update purchase order'
        );
      }
    } catch (err) {
      error.value =
        err.response?.data?.message ||
        err.message ||
        'Failed to update purchase order';
      console.error('Error updating purchase order:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const deletePurchaseOrder = async (id) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await axios.delete(
        `${apiConfig.baseURL}/purchase-orders/${id}`
      );

      if (response.data.success) {
        purchaseOrders.value = purchaseOrders.value.filter(
          (po) => po.id !== id
        );
        await fetchStats();
        return response.data.data;
      } else {
        throw new Error(
          response.data.message || 'Failed to delete purchase order'
        );
      }
    } catch (err) {
      error.value =
        err.response?.data?.message ||
        err.message ||
        'Failed to delete purchase order';
      console.error('Error deleting purchase order:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const logItemReturn = async (purchaseOrderId, returnData) => {
    loading.value = true;
    error.value = null;

    try {
      const authStore = useAuthStore();
      const defaultLogger =
        authStore.user?.name ||
        `${authStore.user?.first_name || ''} ${authStore.user?.last_name || ''}`.trim() ||
        authStore.user?.email ||
        'SCM User';
      const payload = {
        ...returnData,
        logged_by: returnData.logged_by || defaultLogger,
      };

      const response = await axios.post(
        `${apiConfig.baseURL}/purchase-orders/${purchaseOrderId}/returns`,
        payload
      );

      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to log return');
      }
    } catch (err) {
      error.value =
        err.response?.data?.message || err.message || 'Failed to log return';
      console.error('Error logging item return:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const fetchApprovedSupplyRequests = async () => {
    loading.value = true;
    error.value = null;

    try {
      const response = await axios.get(
        `${apiConfig.baseURL}/purchase-orders/approved-supply-requests`
      );

      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(
          response.data.message || 'Failed to fetch approved supply requests'
        );
      }
    } catch (err) {
      error.value =
        err.response?.data?.message ||
        err.message ||
        'Failed to fetch approved supply requests';
      console.error('Error fetching approved supply requests:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const fetchSupplyRequestItems = async (supplyRequestId) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await axios.get(
        `${apiConfig.baseURL}/purchase-orders/supply-request/${supplyRequestId}/items`
      );

      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(
          response.data.message || 'Failed to fetch supply request items'
        );
      }
    } catch (err) {
      error.value =
        err.response?.data?.message ||
        err.message ||
        'Failed to fetch supply request items';
      console.error('Error fetching supply request items:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const fetchAvailableItems = async (supplyRequestId) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await axios.get(
        `${apiConfig.baseURL}/purchase-orders/supply-request/${supplyRequestId}/available-items`
      );

      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(
          response.data.message || 'Failed to fetch available items'
        );
      }
    } catch (err) {
      error.value =
        err.response?.data?.message ||
        err.message ||
        'Failed to fetch available items';
      console.error('Error fetching available items:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const fetchStats = async (forceRefresh = false) => {
    // Return cached stats if still valid and not forcing refresh
    if (!forceRefresh && isStatsCacheValid.value) {
      return stats.value;
    }

    try {
      const response = await axios.get(
        `${apiConfig.baseURL}/purchase-orders/stats`
      );

      if (response.data.success) {
        stats.value = response.data.data || {};
        lastStatsFetchTime.value = Date.now();
        return stats.value;
      } else {
        throw new Error(response.data.message || 'Failed to fetch stats');
      }
    } catch (err) {
      console.error('Error fetching purchase order stats:', err);
      throw err;
    }
  };

  const cancelPurchaseOrder = async (id) => {
    try {
      loading.value = true;
      const response = await axios.put(
        `${apiConfig.baseURL}/purchase-orders/${id}/cancel`
      );

      if (response.data.success) {
        // Refresh the purchase orders list
        await fetchPurchaseOrders();
        return response.data.data;
      } else {
        throw new Error(response.data.message);
      }
    } catch (error) {
      throw new Error(
        error.response?.data?.message || 'Failed to cancel purchase order'
      );
    } finally {
      loading.value = false;
    }
  };

  // Add these methods for item returns management
  const fetchItemReturns = async (purchaseOrderId = null) => {
    loading.value = true;
    error.value = null;

    try {
      let url = `${apiConfig.baseURL}/item-returns`;
      if (purchaseOrderId) {
        url += `?purchase_order_id=${purchaseOrderId}`;
      }

      console.log('🔍 Store: Fetching from URL:', url);
      const response = await axios.get(url);
      console.log('🔍 Store: Full response:', response);
      console.log('🔍 Store: Response data:', response.data);
      console.log('🔍 Store: Response success:', response.data.success);
      console.log('🔍 Store: Response data.data:', response.data.data);

      if (response.data.success) {
        // Ensure we always set an array, never undefined
        const data = response.data.data || [];
        console.log('🔍 Store: Setting itemReturns.value to:', data);
        itemReturns.value = data;
        console.log(
          '🔍 Store: itemReturns.value after setting:',
          itemReturns.value
        );
        return data;
      } else {
        throw new Error(
          response.data.message || 'Failed to fetch item returns'
        );
      }
    } catch (err) {
      console.error('❌ Store: Error in fetchItemReturns:', err);
      error.value =
        err.response?.data?.message ||
        err.message ||
        'Failed to fetch item returns';
      console.error('Error fetching item returns:', err);
      // Ensure itemReturns is always an array even on error
      itemReturns.value = [];
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const processItemReturn = async (returnId) => {
    try {
      loading.value = true;
      const response = await axios.put(
        `${apiConfig.baseURL}/item-returns/${returnId}/process`
      );

      if (response.data.success) {
        // Refresh the item returns list
        await fetchItemReturns();
        return response.data.data;
      } else {
        throw new Error(response.data.message);
      }
    } catch (error) {
      throw new Error(
        error.response?.data?.message || 'Failed to process item return'
      );
    } finally {
      loading.value = false;
    }
  };

  const completeItemReturn = async (returnId) => {
    try {
      loading.value = true;
      const response = await axios.put(
        `${apiConfig.baseURL}/item-returns/${returnId}/complete`
      );

      if (response.data.success) {
        // Refresh the item returns list
        await fetchItemReturns();
        return response.data.data;
      } else {
        throw new Error(response.data.message);
      }
    } catch (error) {
      throw new Error(
        error.response?.data?.message || 'Failed to complete item return'
      );
    } finally {
      loading.value = false;
    }
  };

  const cancelItemReturn = async (returnId) => {
    try {
      loading.value = true;
      const response = await axios.put(
        `${apiConfig.baseURL}/item-returns/${returnId}/cancel`
      );

      if (response.data.success) {
        // Refresh the item returns list
        await fetchItemReturns();
        return response.data.data;
      } else {
        throw new Error(response.data.message);
      }
    } catch (error) {
      throw new Error(
        error.response?.data?.message || 'Failed to cancel item return'
      );
    } finally {
      loading.value = false;
    }
  };

  const updateItemReturn = async (returnId, updateData) => {
    try {
      loading.value = true;
      const response = await axios.put(
        `${apiConfig.baseURL}/item-returns/${returnId}`,
        updateData
      );

      if (response.data.success) {
        // Refresh the item returns list
        await fetchItemReturns();
        return response.data.data;
      } else {
        throw new Error(response.data.message);
      }
    } catch (error) {
      throw new Error(
        error.response?.data?.message || 'Failed to update item return'
      );
    } finally {
      loading.value = false;
    }
  };

  // Add these methods for supplier rating
  const checkPurchaseOrderRating = async (purchaseOrderId) => {
    try {
      const response = await axios.get(
        `${apiConfig.baseURL}/supplier-ratings/purchase-order/${purchaseOrderId}`
      );

      // If we get here, a rating exists
      return response.data;
    } catch (error) {
      // If the error is 404 (not found), it means no rating exists
      if (error.response && error.response.status === 404) {
        // Return success: true with null data to indicate no rating exists
        return { success: true, data: null };
      }
      console.error('Error checking purchase order rating:', error);
      throw error;
    }
  };

  const submitSupplierRating = async (ratingData) => {
    try {
      const response = await axios.post(
        `${apiConfig.baseURL}/supplier-ratings`,
        ratingData
      );
      return response.data;
    } catch (error) {
      console.error('Error submitting supplier rating:', error);
      throw error;
    }
  };

  const updateSupplierRating = async (purchaseOrderId, ratingData) => {
    try {
      const response = await axios.put(
        `${apiConfig.baseURL}/supplier-ratings/purchase-order/${purchaseOrderId}`,
        ratingData
      );
      return response.data;
    } catch (error) {
      console.error('Error updating supplier rating:', error);
      throw error;
    }
  };

  // Clear all caches
  const clearCaches = () => {
    lastFetchTime.value = null;
    lastStatsFetchTime.value = null;
    poCache.value.clear();
  };

  // Clear specific PO cache
  const clearPOCache = (id) => {
    if (id) {
      poCache.value.delete(id);
    } else {
      poCache.value.clear();
    }
  };

  // Clear stats cache
  const clearStatsCache = () => {
    lastStatsFetchTime.value = null;
  };

  // NEW: Get comprehensive order statistics including ordered vs received quantities
  const fetchOrderStatistics = async (purchaseOrderId) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await axios.get(
        `${apiConfig.baseURL}/purchase-orders/${purchaseOrderId}/statistics`
      );

      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(
          response.data.message || 'Failed to fetch order statistics'
        );
      }
    } catch (err) {
      error.value =
        err.response?.data?.message ||
        err.message ||
        'Failed to fetch order statistics';
      console.error('Error fetching order statistics:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // NEW: Get supplier product fulfillment rates
  const fetchSupplierProductFulfillment = async (
    supplierId,
    productId = null
  ) => {
    loading.value = true;
    error.value = null;

    try {
      let url = `${apiConfig.baseURL}/purchase-orders/supplier/${supplierId}/product-fulfillment`;
      if (productId) {
        url += `?productId=${productId}`;
      }

      const response = await axios.get(url);

      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(
          response.data.message ||
            'Failed to fetch supplier product fulfillment'
        );
      }
    } catch (err) {
      error.value =
        err.response?.data?.message ||
        err.message ||
        'Failed to fetch supplier product fulfillment';
      console.error('Error fetching supplier product fulfillment:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  return {
    // State
    purchaseOrders,
    loading,
    error,
    stats,
    itemReturns, // Add this - the component needs access to the state

    // Getters
    purchaseOrdersByStatus,
    completedOrders,
    pendingOrders,
    draftOrders,
    itemReturnsByStatus, // Add this
    ordersWithSupplierProducts,
    ordersBySupplier,

    // Actions
    fetchPurchaseOrders,
    fetchPurchaseOrderById,
    createPurchaseOrderFromSupplyRequest,
    createPurchaseOrderFromSupplyRequestWithItems,
    createPurchaseOrder,
    updatePurchaseOrder,
    deletePurchaseOrder,
    logItemReturn,
    fetchApprovedSupplyRequests,
    fetchSupplyRequestItems,
    fetchAvailableItems,
    fetchStats,
    cancelPurchaseOrder,
    fetchItemReturns,
    processItemReturn,
    completeItemReturn,
    cancelItemReturn,
    updateItemReturn, // NEW: Update item return
    checkPurchaseOrderRating,
    submitSupplierRating,
    updateSupplierRating,
    clearCaches,
    clearPOCache,
    clearStatsCache,
    fetchOrderStatistics, // NEW: Order statistics with ordered vs received
    fetchSupplierProductFulfillment, // NEW: Supplier product fulfillment rates
  };
});
