// frontend/src/stores/purchaseOrderStore.js
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import axios from 'axios';
import { apiConfig } from '../config/api.js';

const API_BASE_URL = apiConfig.baseURL;

export const usePurchaseOrderStore = defineStore('purchaseOrder', () => {
  // State
  const purchaseOrders = ref([]);
  const currentPurchaseOrder = ref(null);
  const loading = ref(false);
  const error = ref(null);
  const stats = ref({
    total: 0,
    completed: 0,
    pending: 0,
    returns: 0,
    totalValue: 0,
  });

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

  // Actions
  const fetchPurchaseOrders = async (filters = {}) => {
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
        `${API_BASE_URL}/purchase-orders?${params.toString()}`
      );

      if (response.data.success) {
        purchaseOrders.value = response.data.data;
        await fetchStats();
        return response.data.data;
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

  const fetchPurchaseOrderById = async (id) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await axios.get(`${API_BASE_URL}/purchase-orders/${id}`);

      if (response.data.success) {
        currentPurchaseOrder.value = response.data.data;
        return response.data.data;
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
        `${API_BASE_URL}/purchase-orders/from-supply-request`,
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
        `${API_BASE_URL}/purchase-orders/from-supply-request-with-items`,
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
        `${API_BASE_URL}/purchase-orders`,
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
        `${API_BASE_URL}/purchase-orders/${id}`,
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
        `${API_BASE_URL}/purchase-orders/${id}`
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
      const payload = {
        ...returnData,
        logged_by: returnData.logged_by || 'SCM User',
      };

      const response = await axios.post(
        `${API_BASE_URL}/purchase-orders/${purchaseOrderId}/returns`,
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
        `${API_BASE_URL}/purchase-orders/approved-supply-requests`
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
        `${API_BASE_URL}/purchase-orders/supply-request/${supplyRequestId}/items`
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

  const fetchStats = async (filters = {}) => {
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
        `${API_BASE_URL}/purchase-orders/stats?${params.toString()}`
      );

      if (response.data.success) {
        stats.value = response.data.data;
        return response.data.data;
      }
    } catch (err) {
      console.error('Error fetching purchase order stats:', err);
    }
  };

  const cancelPurchaseOrder = async (id) => {
    try {
      loading.value = true;
      const response = await axios.put(
        `${API_BASE_URL}/purchase-orders/${id}/cancel`
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
      let url = `${API_BASE_URL}/item-returns`;
      if (purchaseOrderId) {
        url += `?purchase_order_id=${purchaseOrderId}`;
      }

      const response = await axios.get(url);

      if (response.data.success) {
        itemReturns.value = response.data.data;
        return response.data.data;
      } else {
        throw new Error(
          response.data.message || 'Failed to fetch item returns'
        );
      }
    } catch (err) {
      error.value =
        err.response?.data?.message ||
        err.message ||
        'Failed to fetch item returns';
      console.error('Error fetching item returns:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const processItemReturn = async (returnId) => {
    try {
      loading.value = true;
      const response = await axios.put(
        `${API_BASE_URL}/item-returns/${returnId}/process`
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
        `${API_BASE_URL}/item-returns/${returnId}/complete`
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
        `${API_BASE_URL}/item-returns/${returnId}/cancel`
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

  // Add these methods for supplier rating
  const checkPurchaseOrderRating = async (purchaseOrderId) => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/supplier-ratings/purchase-order/${purchaseOrderId}`
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
        `${API_BASE_URL}/supplier-ratings`,
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
        `${API_BASE_URL}/supplier-ratings/purchase-order/${purchaseOrderId}`,
        ratingData
      );
      return response.data;
    } catch (error) {
      console.error('Error updating supplier rating:', error);
      throw error;
    }
  };

  return {
    // State
    purchaseOrders,
    currentPurchaseOrder,
    loading,
    error,
    stats,
    itemReturns, // Add this

    // Getters
    purchaseOrdersByStatus,
    completedOrders,
    pendingOrders,
    draftOrders,
    itemReturnsByStatus, // Add this

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
    fetchStats,
    cancelPurchaseOrder,
    fetchItemReturns,
    processItemReturn,
    completeItemReturn,
    cancelItemReturn,
    checkPurchaseOrderRating,
    submitSupplierRating,
    updateSupplierRating,
  };
});
