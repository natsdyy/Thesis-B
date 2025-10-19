import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import axios from 'axios';
import { apiConfig, getApiUrl, formatImageUrl } from '../config/api.js';
import { usePOSSessionStore } from './posSessionStore.js';

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
  const currentBranchId = ref(null);

  // Selected transaction for void/refund operations
  const selectedTransaction = ref(null);
  const pendingAction = ref(null);

  // Getters
  const filteredMenuItems = computed(() => {
    if (selectedCategory.value === 'All') {
      // Exclude Beverages from the default "All" view
      return menuItems.value.filter((item) => item.category !== 'Beverages');
    }
    return menuItems.value.filter(
      (item) => item.category === selectedCategory.value
    );
  });

  const availableItems = computed(() => {
    return filteredMenuItems.value.filter(
      (item) => item.stock_quantity > 0 && !item.is_expired
    );
  });

  const outOfStockItems = computed(() => {
    return filteredMenuItems.value.filter((item) => item.stock_quantity <= 0);
  });

  const expiredItems = computed(() => {
    return filteredMenuItems.value.filter((item) => item.is_expired);
  });

  // Separate production and SCM items for better organization
  const productionItems = computed(() => {
    return filteredMenuItems.value.filter(
      (item) => item.item_type === 'production'
    );
  });

  const scmItems = computed(() => {
    return filteredMenuItems.value.filter((item) => item.item_type === 'scm');
  });

  const beverageItems = computed(() => {
    return filteredMenuItems.value.filter(
      (item) => item.item_type === 'scm' && item.category === 'Beverages'
    );
  });

  const orderSubtotal = computed(() => {
    return currentOrder.value.items.reduce((total, item) => {
      // Calculate discounted price if promo applies
      let itemPrice = item.price;
      if (
        item.promo_info &&
        item.promo_info.is_active &&
        item.quantity >= item.promo_info.minimum_quantity
      ) {
        if (item.promo_info.discount_type === 'percentage') {
          const discountAmount =
            item.price * (item.promo_info.discount_percentage / 100);
          itemPrice = Math.max(0, item.price - discountAmount);
        } else if (item.promo_info.discount_type === 'fixed_amount') {
          itemPrice = Math.max(
            0,
            item.price - parseFloat(item.promo_info.discount_amount || 0)
          );
        }
      }
      return total + itemPrice * item.quantity;
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
      const mapped = apiItems.map((it) => {
        const today = new Date().toISOString().split('T')[0];
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];

        const isExpired =
          it.branch_expiry_date &&
          new Date(it.branch_expiry_date).toISOString().split('T')[0] <= today;
        const isExpiringSoon =
          it.branch_expiry_date &&
          new Date(it.branch_expiry_date).toISOString().split('T')[0] <=
            tomorrowStr &&
          !isExpired;

        return {
          id: it.id,
          name: it.menu_item_name || it.item_name,
          price: parseFloat(it.selling_price || 0),
          category: it.category,
          stock_quantity: Number(it.branch_stock ?? 0) || 0,
          image_url: formatImageUrl(it.image_url),
          description: it.description || '',
          item_code: it.item_code,
          menu_id: it.menu_id,
          expiry_date: it.branch_expiry_date,
          is_expired: isExpired,
          is_expiring_soon: isExpiringSoon,
          item_type: it.item_type || 'production', // Track if it's production or scm
          unit: it.unit || null, // For SCM items
          preparation_time_minutes: it.preparation_time_minutes || 0, // SCM items have 0 prep time
          // Include promo information
          promo_info: it.promo_info || null,
        };
      });

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

  const addItemToOrder = (menuItem, quantity = 1) => {
    if (menuItem.stock_quantity < quantity || quantity <= 0) {
      return false;
    }

    const existingItem = currentOrder.value.items.find(
      (item) => item.id === menuItem.id
    );

    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      currentOrder.value.items.push({
        id: menuItem.id,
        name: menuItem.name,
        price: parseFloat(menuItem.price),
        quantity: quantity,
        image: menuItem.image_url,
        category: menuItem.category,
        stock_quantity: menuItem.stock_quantity,
        promo_info: menuItem.promo_info, // Include promo discount information
      });
    }

    // Update stock quantity
    menuItem.stock_quantity -= quantity;

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
        items: currentOrder.value.items.map((item) => {
          // Calculate discounted price if promo applies
          let itemPrice = item.price;
          if (
            item.promo_info &&
            item.promo_info.is_active &&
            item.quantity >= item.promo_info.minimum_quantity
          ) {
            if (item.promo_info.discount_type === 'percentage') {
              const discountAmount =
                item.price * (item.promo_info.discount_percentage / 100);
              itemPrice = Math.max(0, item.price - discountAmount);
            } else if (item.promo_info.discount_type === 'fixed_amount') {
              itemPrice = Math.max(
                0,
                item.price - parseFloat(item.promo_info.discount_amount || 0)
              );
            }
          }

          return {
            id: item.id, // Keep the original ID for reference
            // Only set menu_item_id for production items; handle numeric IDs safely
            menu_item_id:
              typeof item.id === 'string' && item.id.startsWith('scm_')
                ? null
                : item.id,
            item_name: item.name,
            quantity: item.quantity,
            unit_price: itemPrice, // Use discounted price
            total_price: itemPrice * item.quantity, // Use discounted price
            notes: item.notes || null,
          };
        }),
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

  const voidOrder = async (orderId, voidReason, lossAmount = 0, flags = {}) => {
    try {
      loading.value = true;
      error.value = null;

      const url = getApiUrl(`/pos/orders/${orderId}/void`);
      const { data: response } = await axios.post(
        url,
        {
          void_reason: voidReason,
          loss_amount: lossAmount,
          // Backend flag to differentiate refund timing behavior
          refund_on_completed: Boolean(flags?.refund_on_completed),
        },
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

  // Move an existing order to processing (for kitchen/cook receiving orders)
  const processOrderById = async (orderId) => {
    loading.value = true;
    error.value = null;

    try {
      const url = getApiUrl(`/pos/orders/${orderId}/process`);
      const { data: response } = await axios.post(
        url,
        {},
        {
          baseURL: apiConfig.baseURL,
          headers: { ...getAuthHeaders() },
        }
      );

      if (!response.success) {
        throw new Error(response.message || 'Failed to receive order');
      }

      // Update local history state if present
      const orderIndex = orderHistory.value.findIndex((o) => o.id === orderId);
      if (orderIndex !== -1) {
        orderHistory.value[orderIndex].status = 'processing';
        orderHistory.value[orderIndex].processedAt =
          response.data?.processed_at || new Date().toISOString();
      }

      return response.data;
    } catch (err) {
      error.value =
        err?.response?.data?.message ||
        err.message ||
        'Failed to receive order';
      console.error('Error processing order by id:', err);
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
        remittance_id = null,
      } = filters;

      const url = getApiUrl('/pos/orders');
      const params = new URLSearchParams();
      if (branch_id) params.append('branch_id', branch_id);
      if (status) params.append('status', status);
      if (limit) params.append('limit', limit);
      if (offset) params.append('offset', offset);
      if (date_from) params.append('date_from', date_from);
      if (date_to) params.append('date_to', date_to);
      if (remittance_id) params.append('remittance_id', remittance_id);

      const { data: response } = await axios.get(
        `${url}?${params.toString()}`,
        {
          baseURL: apiConfig.baseURL,
          headers: { ...getAuthHeaders() },
        }
      );

      if (response.success) {
        return {
          data: response.data,
          pagination: response.pagination,
        };
      }
      return { data: [], pagination: { total: 0, limit: 20, offset: 0 } };
    } catch (err) {
      console.error('Error fetching order history:', err);
      return { data: [], pagination: { total: 0, limit: 20, offset: 0 } };
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

  // Fetch bucketed sales trends
  const fetchSalesTrends = async (
    branchId,
    { dateFrom = null, dateTo = null, period = null, bucket = 'auto' } = {}
  ) => {
    try {
      const url = getApiUrl('/pos/sales-trends');
      const params = new URLSearchParams();
      params.append('branch_id', branchId);
      if (dateFrom) params.append('date_from', dateFrom);
      if (dateTo) params.append('date_to', dateTo);
      if (period) params.append('period', period);
      if (bucket) params.append('bucket', bucket);

      const { data: response } = await axios.get(
        `${url}?${params.toString()}`,
        {
          baseURL: apiConfig.baseURL,
          headers: { ...getAuthHeaders() },
        }
      );
      if (response.success) return response.data;
      return {
        labels: [],
        gross_sales: [],
        refunds: [],
        disposed: [],
        net_sales: [],
        remitted_amount: [],
      };
    } catch (err) {
      console.error('Error fetching sales trends:', err);
      return {
        labels: [],
        gross_sales: [],
        refunds: [],
        disposed: [],
        net_sales: [],
        remitted_amount: [],
      };
    }
  };

  // List remittances (finance)
  const fetchRemittances = async ({
    branchId = null,
    status = null,
    dateFrom = null,
    dateTo = null,
    limit = 100,
    offset = 0,
  } = {}) => {
    try {
      const url = getApiUrl('/finance/remittances');
      const params = new URLSearchParams();
      if (branchId) params.append('branch_id', String(branchId));
      if (status) params.append('status', String(status));
      if (dateFrom) params.append('date_from', String(dateFrom));
      if (dateTo) params.append('date_to', String(dateTo));
      if (limit) params.append('limit', String(limit));
      if (offset) params.append('offset', String(offset));

      const { data } = await axios.get(`${url}?${params.toString()}`, {
        baseURL: apiConfig.baseURL,
        headers: { ...getAuthHeaders() },
      });
      const list = Array.isArray(data?.data) ? data.data : [];
      return { data: list, total: Number(data?.total || list.length) };
    } catch (err) {
      console.error('Error fetching remittances:', err);
      return { data: [], total: 0 };
    }
  };

  // Approve remittance (finance)
  const approveRemittance = async (remittanceId) => {
    try {
      const url = getApiUrl(`/finance/remittances/${remittanceId}/approve`);
      const { data: resp } = await axios.post(
        url,
        {},
        { baseURL: apiConfig.baseURL, headers: { ...getAuthHeaders() } }
      );
      return resp?.data || null;
    } catch (err) {
      console.error('Error approving remittance:', err);
      throw err;
    }
  };

  // Reject remittance (finance)
  const rejectRemittance = async (remittanceId, { notes = null } = {}) => {
    try {
      const url = getApiUrl(`/finance/remittances/${remittanceId}/reject`);
      const { data: resp } = await axios.post(
        url,
        { notes },
        { baseURL: apiConfig.baseURL, headers: { ...getAuthHeaders() } }
      );
      return resp?.data || null;
    } catch (err) {
      console.error('Error rejecting remittance:', err);
      throw err;
    }
  };

  // Submit a remittance to Finance
  const submitRemittance = async ({
    branchId,
    periodType,
    dateFrom,
    dateTo,
    grossSales,
    netSales,
    refundedAmount,
    voidedAmount,
    disposed,
    remittedAmount,
    notes,
  }) => {
    try {
      const url = getApiUrl('/finance/remittances');
      const payload = {
        branch_id: branchId,
        period_type: periodType,
        date_from: dateFrom,
        date_to: dateTo,
        gross_sales: grossSales,
        net_sales: netSales,
        refunded_amount: refundedAmount,
        voided_amount: voidedAmount,
        disposed,
        remitted_amount: remittedAmount,
        notes: notes || null,
      };
      const { data: resp } = await axios.post(url, payload, {
        baseURL: apiConfig.baseURL,
        headers: { ...getAuthHeaders() },
      });
      return resp?.data || null;
    } catch (err) {
      console.error('Error submitting remittance:', err);
      throw err;
    }
  };

  // Upload a CSV attachment for a remittance
  const uploadRemittanceCSV = async (
    remittanceId,
    fileBlob,
    filename = 'remittance.csv'
  ) => {
    try {
      const url = getApiUrl(`/finance/remittances/${remittanceId}/csv`);
      const form = new FormData();
      const file =
        fileBlob instanceof Blob
          ? fileBlob
          : new Blob([String(fileBlob || '')], { type: 'text/csv' });
      form.append('file', file, filename);
      const { data } = await axios.post(url, form, {
        baseURL: apiConfig.baseURL,
        headers: { ...getAuthHeaders(), 'Content-Type': 'multipart/form-data' },
      });
      return data?.data || null;
    } catch (err) {
      console.error('Error uploading remittance CSV:', err);
      throw err;
    }
  };

  // Check if there's already a pending remittance for the same period
  const hasPendingRemittance = async (branchId, dateFrom, dateTo) => {
    try {
      const url = getApiUrl('/finance/remittances');
      const params = new URLSearchParams();
      params.append('branch_id', String(branchId));
      params.append('status', 'pending');
      if (dateFrom) params.append('date_from', dateFrom);
      if (dateTo) params.append('date_to', dateTo);
      params.append('limit', '1');

      const { data } = await axios.get(`${url}?${params.toString()}`, {
        baseURL: apiConfig.baseURL,
        headers: { ...getAuthHeaders() },
      });
      const list = Array.isArray(data?.data) ? data.data : [];
      return list.length > 0;
    } catch (err) {
      console.warn('Failed to check pending remittance:', err);
      return false; // non-blocking
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
      const response = await fetchOrderHistory({
        branch_id: branchId,
        status: 'completed',
        limit: 100,
        date_from: dateFrom,
        date_to: dateTo,
      });

      const orders = response.data || [];

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
            itemCounts[key].revenue += parseFloat(item.total_price) || 0;
          });
        }
      });

      // Convert to array and sort by quantity
      return Object.entries(itemCounts)
        .map(([name, data]) => ({
          name,
          quantity: data.quantity,
          revenue: parseFloat(data.revenue.toFixed(2)),
        }))
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 10); // Top 10 items
    } catch (err) {
      console.error('Error fetching top selling items:', err);
      return [];
    }
  };

  // Fetch precise loss/disposed trends from backend
  const fetchLossTrends = async (
    branchId,
    dateFrom = null,
    dateTo = null,
    bucket = 'auto'
  ) => {
    try {
      const url = getApiUrl('/pos/loss-trends');
      const params = new URLSearchParams();
      if (branchId) params.append('branch_id', branchId);
      if (dateFrom) params.append('date_from', dateFrom);
      if (dateTo) params.append('date_to', dateTo);
      if (bucket) params.append('bucket', bucket);

      const { data: response } = await axios.get(
        `${url}?${params.toString()}`,
        {
          baseURL: apiConfig.baseURL,
          headers: { ...getAuthHeaders() },
        }
      );

      if (response.success) {
        return response.data; // { labels, disposed, loss }
      }
      return { labels: [], disposed: [], loss: [] };
    } catch (err) {
      console.error('Error fetching loss trends:', err);
      return { labels: [], disposed: [], loss: [] };
    }
  };

  // Fetch all branch menu items (read-only helper, does not mutate store)
  const fetchBranchMenuItems = async (
    branchId,
    { includeUnavailable = false } = {}
  ) => {
    try {
      const url = getApiUrl('/pos/menu-items');
      const params = new URLSearchParams();
      if (branchId) params.append('branch_id', String(branchId));
      if (!includeUnavailable) params.append('is_available', 'true');
      params.append('limit', '10000');

      const { data } = await axios.get(`${url}?${params.toString()}`, {
        baseURL: apiConfig.baseURL,
        headers: { ...getAuthHeaders() },
      });

      const items = Array.isArray(data?.data) ? data.data : [];
      return items.map((it) => ({
        id: it.id,
        name: it.menu_item_name || it.item_name || it.name,
        category: it.category,
      }));
    } catch (err) {
      console.warn('Failed to fetch branch menu items:', err);
      return [];
    }
  };

  const setSelectedCategory = (category) => {
    selectedCategory.value = category;
  };

  // Initialize
  const initialize = async (options = {}) => {
    currentBranchId.value = options.branchId || null;
    await fetchMenuItems({ ...options, reset: true });
    await fetchCategories();
  };

  const loadMore = async (options = {}) => {
    if (!hasMore.value || loading.value) return;
    await fetchMenuItems({ ...options, reset: false });
  };

  // Selected transaction management
  const setSelectedTransaction = (transaction, action) => {
    selectedTransaction.value = transaction;
    pendingAction.value = action;
  };

  const clearSelectedTransaction = () => {
    selectedTransaction.value = null;
    pendingAction.value = null;
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
    expiredItems,
    productionItems,
    scmItems,
    beverageItems,
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
    voidOrder,
    completeOrder,
    processOrderById,
    fetchOrderHistory,
    fetchOrderById,
    fetchDailySummary,
    fetchSalesStats,
    fetchTopSellingItems,
    fetchBranchMenuItems,
    fetchSalesTrends,
    fetchRemittances,
    approveRemittance,
    rejectRemittance,
    submitRemittance,
    uploadRemittanceCSV,
    hasPendingRemittance,
    setSelectedCategory,
    initialize,
    getNextOrderNumber,
    fetchLossTrends,

    // Selected transaction
    selectedTransaction,
    pendingAction,
    setSelectedTransaction,
    clearSelectedTransaction,
  };
});
