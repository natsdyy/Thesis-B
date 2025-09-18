import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import axios from 'axios';
import { apiConfig } from '../config/api.js';

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
  const initialize = async () => {
    await Promise.all([fetchMenuItems(), fetchCategories()]);
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
    fetchOrderHistory,
    setSelectedCategory,
    initialize,
  };
});
