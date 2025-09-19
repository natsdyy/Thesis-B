import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import axios from 'axios';
<<<<<<< HEAD
import { apiConfig } from '../config/api.js';

const API_BASE_URL = apiConfig.baseURL;
=======
import { apiConfig, getApiUrl, formatImageUrl } from '../config/api.js';
import { usePOSSessionStore } from './posSessionStore.js';
>>>>>>> a2002e1 (Implement Order Rating and POS Order Management Features)

export const usePOSStore = defineStore('pos', () => {
  // State
  const menuItems = ref([]);
  const categories = ref([]);
  const currentOrder = ref({
    orderNumber: '',
    items: [],
    orderType: 'Dine In', // 'Dine In' or 'Take Out'
    subtotal: 0,
    tax: 0,
    total: 0,
    amountPaid: 0,
    change: 0,
    status: 'pending', // 'pending', 'processing', 'completed', 'cancelled'
    createdAt: null,
    completedAt: null,
  });
  const selectedCategory = ref('All');
  const loading = ref(false);
  const error = ref(null);
  const orderHistory = ref([]);
  const currentBranchId = ref(null);

  // Getters
  const filteredMenuItems = computed(() => {
    if (selectedCategory.value === 'All') {
      return menuItems.value;
    }
    return menuItems.value.filter(
      (item) => item.category === selectedCategory.value
    );
  });

  const availableItems = computed(() => {
    return filteredMenuItems.value.filter((item) => item.stock_quantity > 0);
  });

  const outOfStockItems = computed(() => {
    return filteredMenuItems.value.filter((item) => item.stock_quantity <= 0);
  });

  const orderSubtotal = computed(() => {
    return currentOrder.value.items.reduce((total, item) => {
      return total + item.price * item.quantity;
    }, 0);
  });

  const orderTax = computed(() => {
    return orderSubtotal.value * 0.12; // 12% VAT
  });

  const orderTotal = computed(() => {
    return orderSubtotal.value + orderTax.value;
  });

  const orderChange = computed(() => {
    return Math.max(0, currentOrder.value.amountPaid - orderTotal.value);
  });

  const isOrderValid = computed(() => {
    return (
      currentOrder.value.items.length > 0 &&
      currentOrder.value.amountPaid >= orderTotal.value
    );
  });

  // Mock data for UI development
  const mockMenuItems = [
    {
      id: 1,
      name: 'Tapsilog',
      price: 150.0,
      category: 'Silog Meal',
      stock_quantity: 20,
      image_url: '/images/menu/Silog Food.png',
      description: 'Cured beef with garlic rice and fried egg',
    },
    {
      id: 2,
      name: 'Porksilog',
      price: 150.0,
      category: 'Silog Meal',
      stock_quantity: 20,
      image_url: '/images/menu/Silog Food.png',
      description: 'Pork chop with garlic rice and fried egg',
    },
    {
      id: 3,
      name: 'Tocilog',
      price: 150.0,
      category: 'Silog Meal',
      stock_quantity: 20,
      image_url: '/images/menu/Silog Food.png',
      description: 'Cured pork with garlic rice and fried egg',
    },
    {
      id: 4,
      name: 'Pork Sisig',
      price: 150.0,
      category: 'Sizzling',
      stock_quantity: 20,
      image_url: '/images/menu/Sizzling Picture.png',
      description: 'Sizzling pork sisig on hot plate',
    },
    {
      id: 5,
      name: 'Sizzling Pusit',
      price: 150.0,
      category: 'Sizzling',
      stock_quantity: 20,
      image_url: '/images/menu/Sizzling Picture.png',
      description: 'Sizzling squid on hot plate',
    },
    {
      id: 6,
      name: 'Tenderloin Steak',
      price: 150.0,
      category: 'Sizzling',
      stock_quantity: 20,
      image_url: '/images/menu/Sizzling Tenderloin Steak.png',
      description: 'Tenderloin steak on hot plate',
    },
    {
      id: 7,
      name: 'Sizzling T-Bone Steak',
      price: 150.0,
      category: 'Sizzling',
      stock_quantity: 20,
      image_url: '/images/menu/Sizzling T-Bone Steak.png',
      description: 'Sizzling T-bone steak on hot plate',
    },
    {
      id: 8,
      name: 'Sizzling Chicken Leg',
      price: 150.0,
      category: 'Sizzling',
      stock_quantity: 20,
      image_url: '/images/menu/Sizzling Picture.png',
      description: 'Sizzling chicken leg on hot plate',
    },
    {
      id: 9,
      name: 'Burger Steak',
      price: 150.0,
      category: 'Chicken Meal',
      stock_quantity: 0,
      image_url: '/images/menu/Menu 1.png',
      description: 'Burger steak with rice',
    },
    {
      id: 10,
      name: 'Pork Steak',
      price: 150.0,
      category: 'Sizzling',
      stock_quantity: 20,
      image_url: '/images/menu/Sizzling Picture.png',
      description: 'Pork steak on hot plate',
    },
    {
      id: 11,
      name: 'Sizzling Beef Mushroom',
      price: 150.0,
      category: 'Sizzling',
      stock_quantity: 20,
      image_url: '/images/menu/Sizzling Picture.png',
      description: 'Sizzling beef mushroom with rice',
    },
    {
      id: 12,
      name: 'Sizzling Chicken Wings',
      price: 150.0,
      category: 'Sizzling',
      stock_quantity: 0,
      image_url: '/images/menu/Menu 1.png',
      description: 'Sizzling chicken wings on hot plate',
    },
  ];

  const mockCategories = [
    'All',
    'All Time Favorites',
    'Drinks',
    'Sizzling',
    'Silog Meal',
    'Chicken Meal',
    'Gulay',
  ];

  // Actions
  const fetchMenuItems = async () => {
    loading.value = true;
    error.value = null;

    try {
      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 500));
      menuItems.value = mockMenuItems;
    } catch (err) {
      error.value = err.message || 'Failed to fetch menu items';
      console.error('Error fetching menu items:', err);
    } finally {
      loading.value = false;
    }
  };

  const fetchCategories = async () => {
    try {
      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 200));
      categories.value = mockCategories;
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  };

  const addItemToOrder = (menuItem) => {
    if (menuItem.stock_quantity <= 0) {
      return false;
    }

    const existingItem = currentOrder.value.items.find(
      (item) => item.id === menuItem.id
    );

    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      currentOrder.value.items.push({
        id: menuItem.id,
        name: menuItem.name,
        price: parseFloat(menuItem.price),
        quantity: 1,
        image: menuItem.image_url,
        category: menuItem.category,
        stock_quantity: menuItem.stock_quantity,
      });
    }

    // Update stock quantity
    menuItem.stock_quantity -= 1;

    return true;
  };

  const removeItemFromOrder = (itemId) => {
    const itemIndex = currentOrder.value.items.findIndex(
      (item) => item.id === itemId
    );

    if (itemIndex !== -1) {
      const item = currentOrder.value.items[itemIndex];

      // Restore stock quantity
      const menuItem = menuItems.value.find((mi) => mi.id === itemId);
      if (menuItem) {
        menuItem.stock_quantity += item.quantity;
      }

      currentOrder.value.items.splice(itemIndex, 1);
    }
  };

  const updateItemQuantity = (itemId, quantity) => {
    const item = currentOrder.value.items.find((item) => item.id === itemId);
    const menuItem = menuItems.value.find((mi) => mi.id === itemId);

    if (item && menuItem) {
      const quantityDifference = quantity - item.quantity;

      if (quantity <= 0) {
        removeItemFromOrder(itemId);
      } else if (menuItem.stock_quantity >= quantityDifference) {
        item.quantity = quantity;
        menuItem.stock_quantity -= quantityDifference;
      }
    }
  };

  const setOrderType = (type) => {
    currentOrder.value.orderType = type;
  };

  const setAmountPaid = (amount) => {
    currentOrder.value.amountPaid = parseFloat(amount) || 0;
  };

  const generateOrderNumber = () => {
    const now = new Date();
    const today = now.toDateString(); // Get date string for today
    const storageKey = `pos_order_count_${today}`;

    // Clean up old order counts (keep only last 7 days)
    cleanupOldOrderCounts();

    // Get today's order count from localStorage
    let todayOrderCount = parseInt(localStorage.getItem(storageKey)) || 0;

    // Increment the count for this order
    todayOrderCount += 1;

    // Save the updated count back to localStorage
    localStorage.setItem(storageKey, todayOrderCount.toString());

    // Format as #001, #002, etc. (3 digits with leading zeros)
    const orderNumber = todayOrderCount.toString().padStart(3, '0');

    return `#${orderNumber}`;
  };

  const cleanupOldOrderCounts = () => {
    const today = new Date();
    const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Remove localStorage entries older than 7 days
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('pos_order_count_')) {
        const dateString = key.replace('pos_order_count_', '');
        const entryDate = new Date(dateString);

        if (entryDate < sevenDaysAgo) {
          localStorage.removeItem(key);
        }
      }
    }
  };

  const getNextOrderNumber = () => {
    const now = new Date();
    const today = now.toDateString();
    const storageKey = `pos_order_count_${today}`;

    // Get today's current order count
    const currentCount = parseInt(localStorage.getItem(storageKey)) || 0;
    const nextCount = currentCount + 1;

    // Format as #001, #002, etc. (3 digits with leading zeros)
    const orderNumber = nextCount.toString().padStart(3, '0');

    return `#${orderNumber}`;
  };

  const processOrder = async () => {
    if (!isOrderValid.value) {
      throw new Error('Invalid order - check items and payment amount');
    }

    loading.value = true;
    error.value = null;

    try {
      // Generate order number
      currentOrder.value.orderNumber = generateOrderNumber();
      currentOrder.value.createdAt = new Date().toISOString();
      currentOrder.value.status = 'processing';

      // Get manager ID from POS session
      const posSessionStore = usePOSSessionStore();
      const managerId = posSessionStore.managerInfo?.id || null;

      // Prepare order data for API
      const orderData = {
        branch_id: currentBranchId.value,
        manager_id: managerId,
        order_type: currentOrder.value.orderType,
        subtotal: orderSubtotal.value,
        tax_amount: orderTax.value,
        total_amount: orderTotal.value,
        amount_paid: currentOrder.value.amountPaid,
        change_amount: orderChange.value,
        items: currentOrder.value.items.map((item) => ({
          menu_item_id: item.id,
          item_name: item.name,
          quantity: item.quantity,
          unit_price: item.price,
          total_price: item.price * item.quantity,
          notes: item.notes || null,
        })),
        notes: currentOrder.value.notes || null,
      };

      // Create order via API
      const url = getApiUrl('/pos/orders');
      const { data: response } = await axios.post(url, orderData, {
        baseURL: apiConfig.baseURL,
        headers: { ...getAuthHeaders() },
      });

      if (!response.success) {
        throw new Error(response.message || 'Failed to create order');
      }

      const createdOrder = response.data;

      // Process the order (pending -> processing)
      const processUrl = getApiUrl(`/pos/orders/${createdOrder.id}/process`);
      const { data: processResponse } = await axios.post(
        processUrl,
        {},
        {
          baseURL: apiConfig.baseURL,
          headers: { ...getAuthHeaders() },
        }
      );

      if (!processResponse.success) {
        throw new Error(processResponse.message || 'Failed to process order');
      }

      // Add to order history
      orderHistory.value.unshift({
        ...currentOrder.value,
        id: createdOrder.id,
        order_number: createdOrder.order_number,
        processedAt: processResponse.data.processed_at,
      });

      // Reset current order
      resetOrder();

      return processResponse.data;
    } catch (err) {
      error.value =
        err?.response?.data?.message ||
        err.message ||
        'Failed to process order';
      console.error('Error processing order:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const resetOrder = () => {
    // Restore all stock quantities
    currentOrder.value.items.forEach((orderItem) => {
      const menuItem = menuItems.value.find((mi) => mi.id === orderItem.id);
      if (menuItem) {
        menuItem.stock_quantity += orderItem.quantity;
      }
    });

    currentOrder.value = {
      orderNumber: '',
      items: [],
      orderType: 'Dine In',
      subtotal: 0,
      tax: 0,
      total: 0,
      amountPaid: 0,
      change: 0,
      status: 'pending',
      createdAt: null,
      completedAt: null,
    };
  };

  const cancelOrder = () => {
    resetOrder();
  };

  const voidOrder = async (orderId, voidReason) => {
    try {
      loading.value = true;
      error.value = null;

      const url = getApiUrl(`/pos/orders/${orderId}/void`);
      const { data: response } = await axios.post(
        url,
        { void_reason: voidReason },
        {
          baseURL: apiConfig.baseURL,
          headers: { ...getAuthHeaders() },
        }
      );

      if (!response.success) {
        throw new Error(response.message || 'Failed to void order');
      }

      // Remove from order history
      const orderIndex = orderHistory.value.findIndex(
        (order) => order.id === orderId
      );
      if (orderIndex !== -1) {
        orderHistory.value.splice(orderIndex, 1);
      }

      return response.data;
    } catch (err) {
      error.value =
        err?.response?.data?.message || err.message || 'Failed to void order';
      console.error('Error voiding order:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const completeOrder = async (orderId) => {
    loading.value = true;
    error.value = null;

    try {
      const url = getApiUrl(`/pos/orders/${orderId}/complete`);
      const { data: response } = await axios.post(
        url,
        {},
        {
          baseURL: apiConfig.baseURL,
          headers: { ...getAuthHeaders() },
        }
      );

      if (!response.success) {
        throw new Error(response.message || 'Failed to complete order');
      }

      // Update order in history
      const orderIndex = orderHistory.value.findIndex(
        (order) => order.id === orderId
      );
      if (orderIndex !== -1) {
        orderHistory.value[orderIndex].status = 'completed';
        orderHistory.value[orderIndex].completedAt = response.data.completed_at;
      }

      return response.data;
    } catch (err) {
      error.value =
        err?.response?.data?.message ||
        err.message ||
        'Failed to complete order';
      console.error('Error completing order:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const fetchOrderHistory = async (filters = {}) => {
    try {
      const {
        branch_id = null,
        status = null,
        limit = 20,
        offset = 0,
        date_from = null,
        date_to = null,
      } = filters;

      const url = getApiUrl('/pos/orders');
      const params = new URLSearchParams();
      if (branch_id) params.append('branch_id', branch_id);
      if (status) params.append('status', status);
      if (limit) params.append('limit', limit);
      if (offset) params.append('offset', offset);
      if (date_from) params.append('date_from', date_from);
      if (date_to) params.append('date_to', date_to);

      const { data: response } = await axios.get(
        `${url}?${params.toString()}`,
        {
          baseURL: apiConfig.baseURL,
          headers: { ...getAuthHeaders() },
        }
      );

      if (response.success) {
        return response.data;
      }
      return [];
    } catch (err) {
      console.error('Error fetching order history:', err);
      return [];
    }
  };

  const fetchOrderById = async (orderNumber) => {
    try {
      const url = getApiUrl(`/pos/orders/${orderNumber}`);
      const { data: response } = await axios.get(url, {
        baseURL: apiConfig.baseURL,
        headers: { ...getAuthHeaders() },
      });

      if (response.success) {
        return response.data;
      }
      return null;
    } catch (err) {
      console.error('Error fetching order by ID:', err);
      return null;
    }
  };

  // Fetch daily sales summary
  const fetchDailySummary = async (branchId, date) => {
    try {
      const url = getApiUrl('/pos/daily-summary');
      const params = new URLSearchParams();
      params.append('branch_id', branchId);
      params.append('date', date);

      const { data: response } = await axios.get(
        `${url}?${params.toString()}`,
        {
          baseURL: apiConfig.baseURL,
          headers: { ...getAuthHeaders() },
        }
      );

      if (response.success) {
        return response.data;
      }
      return null;
    } catch (err) {
      console.error('Error fetching daily summary:', err);
      return null;
    }
  };

  // Fetch sales statistics
  const fetchSalesStats = async (branchId, dateFrom = null, dateTo = null) => {
    try {
      const url = getApiUrl('/pos/sales-stats');
      const params = new URLSearchParams();
      params.append('branch_id', branchId);
      if (dateFrom) params.append('date_from', dateFrom);
      if (dateTo) params.append('date_to', dateTo);

      const { data: response } = await axios.get(
        `${url}?${params.toString()}`,
        {
          baseURL: apiConfig.baseURL,
          headers: { ...getAuthHeaders() },
        }
      );

      if (response.success) {
        return response.data;
      }
      return null;
    } catch (err) {
      console.error('Error fetching sales stats:', err);
      return null;
    }
  };

  // Fetch top selling items
  const fetchTopSellingItems = async (
    branchId,
    dateFrom = null,
    dateTo = null
  ) => {
    try {
      // This would need a specific API endpoint for top selling items
      // For now, we'll fetch recent orders and calculate top items
      const orders = await fetchOrderHistory({
        branch_id: branchId,
        status: 'completed',
        limit: 100,
        date_from: dateFrom,
        date_to: dateTo,
      });

      if (!orders || orders.length === 0) {
        return [];
      }

      // Calculate top selling items from order data
      const itemCounts = {};
      orders.forEach((order) => {
        if (order.items) {
          order.items.forEach((item) => {
            const key = item.item_name || item.name;
            if (!itemCounts[key]) {
              itemCounts[key] = { quantity: 0, revenue: 0 };
            }
            itemCounts[key].quantity += item.quantity;
            itemCounts[key].revenue += item.total_price;
          });
        }
      });

      // Convert to array and sort by quantity
      return Object.entries(itemCounts)
        .map(([name, data]) => ({
          name,
          quantity: data.quantity,
          revenue: data.revenue,
        }))
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 10); // Top 10 items
    } catch (err) {
      console.error('Error fetching top selling items:', err);
      return [];
    }
  };

  const setSelectedCategory = (category) => {
    selectedCategory.value = category;
  };

  // Initialize
<<<<<<< HEAD
  const initialize = async () => {
    await Promise.all([fetchMenuItems(), fetchCategories()]);
=======
  const initialize = async (options = {}) => {
    currentBranchId.value = options.branchId || null;
    await fetchMenuItems({ ...options, reset: true });
    await fetchCategories();
  };

  const loadMore = async (options = {}) => {
    if (!hasMore.value || loading.value) return;
    await fetchMenuItems({ ...options, reset: false });
>>>>>>> a2002e1 (Implement Order Rating and POS Order Management Features)
  };

  return {
    // State
    menuItems,
    categories,
    currentOrder,
    selectedCategory,
    loading,
    error,
    orderHistory,

    // Getters
    filteredMenuItems,
    availableItems,
    outOfStockItems,
    orderSubtotal,
    orderTax,
    orderTotal,
    orderChange,
    isOrderValid,

    // Actions
    fetchMenuItems,
    fetchCategories,
    addItemToOrder,
    removeItemFromOrder,
    updateItemQuantity,
    setOrderType,
    setAmountPaid,
    processOrder,
    resetOrder,
    cancelOrder,
    voidOrder,
    completeOrder,
    fetchOrderHistory,
    fetchOrderById,
    fetchDailySummary,
    fetchSalesStats,
    fetchTopSellingItems,
    setSelectedCategory,
    initialize,
    getNextOrderNumber,
  };
});
