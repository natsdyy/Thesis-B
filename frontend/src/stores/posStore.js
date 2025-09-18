import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import axios from 'axios';
import { apiConfig, getApiUrl, formatImageUrl } from '../config/api.js';

export const usePOSStore = defineStore('pos', () => {
  // State
  const menuItems = ref([]);
  const pagination = ref({ total: 0, limit: 24, offset: 0 });
  const hasMore = ref(true);
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
    return 0; // VAT not included in POS total
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

  // Helper to get auth header
  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  // Actions
  // Fetch POS menu items from unified POS API (branch-aware)
  const fetchMenuItems = async (options = {}) => {
    loading.value = true;
    error.value = null;

    try {
      const {
        menuId,
        itemCodes = [],
        branchId,
        category,
        search,
        reset = false,
        limit = pagination.value.limit || 24,
      } = options;

      const params = new URLSearchParams();
      if (branchId) params.append('branch_id', String(branchId));
      if (menuId) params.append('menu_id', String(menuId));
      if (itemCodes.length) params.append('item_codes', itemCodes.join(','));
      params.append('is_available', 'true');
      if (category) params.append('category', String(category));
      if (search) params.append('search', String(search));
      params.append('limit', String(limit));
      params.append('offset', String(reset ? 0 : pagination.value.offset || 0));

      const url = `${getApiUrl('/pos/menu-items')}?${params.toString()}`;
      const { data: resp } = await axios.get(url, {
        baseURL: apiConfig.baseURL,
        headers: { ...getAuthHeaders() },
      });

      const apiItems = Array.isArray(resp?.data) ? resp.data : [];

      // Map API rows to POS-friendly structure
      const mapped = apiItems.map((it) => ({
        id: it.id,
        name: it.menu_item_name || it.item_name,
        price: parseFloat(it.selling_price || 0),
        category: it.category,
        stock_quantity: Number(it.branch_stock ?? 0) || 0,
        image_url: formatImageUrl(it.image_url),
        description: it.description || '',
        item_code: it.item_code,
        menu_id: it.menu_id,
      }));

      // Merge or reset list based on options.reset
      const cleaned = mapped.filter((m) => m.stock_quantity >= 0);
      if (reset) {
        menuItems.value = cleaned;
      } else {
        menuItems.value = [...menuItems.value, ...cleaned];
      }

      // Update pagination
      const p = resp?.pagination || {};
      const total = Number(p.total || 0);
      const newOffset =
        (reset ? 0 : pagination.value.offset || 0) + cleaned.length;
      const lim = Number(p.limit || limit);
      pagination.value = { total, limit: lim, offset: newOffset };
      hasMore.value = newOffset < total;

      // Derive categories from items
      const uniqueCats = Array.from(
        new Set(menuItems.value.map((i) => i.category).filter(Boolean))
      ).sort();
      categories.value = ['All', ...uniqueCats];
    } catch (err) {
      error.value =
        err?.response?.data?.message ||
        err.message ||
        'Failed to fetch menu items';
      console.error('Error fetching menu items:', err);
      if (options.reset) {
        menuItems.value = [];
        pagination.value = { total: 0, limit: 24, offset: 0 };
        hasMore.value = false;
      }
    } finally {
      loading.value = false;
    }
  };

  const fetchCategories = async () => {
    try {
      // Prefer categories derived from fetched items
      if (menuItems.value.length > 0) {
        const uniqueCats = Array.from(
          new Set(menuItems.value.map((i) => i.category).filter(Boolean))
        ).sort();
        categories.value = ['All', ...uniqueCats];
        return;
      }

      // Fallback to menu categories endpoint
      const url = getApiUrl('/menu/menus/categories');
      const { data } = await axios.get(url, {
        baseURL: apiConfig.baseURL,
        headers: { ...getAuthHeaders() },
      });
      const cats = Array.isArray(data?.data) ? data.data : [];
      categories.value = ['All', ...cats];
    } catch (err) {
      console.error('Error fetching categories:', err);
      categories.value = ['All'];
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
    const timestamp = now.getTime().toString().slice(-6);
    const random = Math.floor(Math.random() * 100)
      .toString()
      .padStart(2, '0');
    return `#${timestamp}${random}`;
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

      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Prepare order data for mock response
      const orderData = {
        id: Date.now(), // Mock ID
        order_number: currentOrder.value.orderNumber,
        items: currentOrder.value.items.map((item) => ({
          menu_item_id: item.id,
          quantity: item.quantity,
          price: item.price,
          subtotal: item.price * item.quantity,
        })),
        order_type: currentOrder.value.orderType,
        subtotal: orderSubtotal.value,
        tax: orderTax.value,
        total: orderTotal.value,
        amount_paid: currentOrder.value.amountPaid,
        change: orderChange.value,
        status: 'completed',
        created_at: currentOrder.value.createdAt,
        completed_at: new Date().toISOString(),
      };

      // Add to order history
      orderHistory.value.unshift({
        ...currentOrder.value,
        id: orderData.id,
        completedAt: orderData.completed_at,
      });

      // Reset current order
      resetOrder();

      return orderData;
    } catch (err) {
      error.value = err.message || 'Failed to process order';
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

  const fetchOrderHistory = async (filters = {}) => {
    try {
      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 300));

      // For now, just return the existing order history
      // In a real implementation, this would filter based on the filters parameter
      console.log('Fetching order history with filters:', filters);
    } catch (err) {
      console.error('Error fetching order history:', err);
    }
  };

  const setSelectedCategory = (category) => {
    selectedCategory.value = category;
  };

  // Initialize
  const initialize = async (options = {}) => {
    await fetchMenuItems({ ...options, reset: true });
    await fetchCategories();
  };

  const loadMore = async (options = {}) => {
    if (!hasMore.value || loading.value) return;
    await fetchMenuItems({ ...options, reset: false });
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
    pagination,
    hasMore,

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
    loadMore,
    addItemToOrder,
    removeItemFromOrder,
    updateItemQuantity,
    setOrderType,
    setAmountPaid,
    processOrder,
    resetOrder,
    cancelOrder,
    fetchOrderHistory,
    setSelectedCategory,
    initialize,
  };
});
