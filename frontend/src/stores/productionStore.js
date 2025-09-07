import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import axios from 'axios';
import { apiConfig } from '../config/api.js';

const API_BASE_URL = apiConfig.baseURL;

export const useProductionStore = defineStore('production', () => {
  // State
  const productionOrders = ref([]);
  const recipes = ref([]);
  const deletedRecipes = ref([]);
  const workOrders = ref([]);
  const productionBatches = ref([]);
  const qualityInspections = ref([]);
  const equipment = ref([]);
  const maintenanceSchedules = ref([]);
  const productionWaste = ref([]);
  const productionMetrics = ref([]);
  const loading = ref(false);
  const error = ref(null);

  // Menu Management State
  const menus = ref([]);
  const menuItems = ref([]);
  const sampleProductions = ref([]);
  const productionInventory = ref([]);
  const menuStats = ref({
    total_menus: 0,
    active_menus: 0,
    total_menu_items: 0,
    available_items: 0,
    total_categories: 0,
  });
  const menuItemStats = ref({
    total_items: 0,
    available_items: 0,
    featured_items: 0,
    average_price: 0,
    average_margin: 0,
    total_categories: 0,
  });
  const sampleProductionStats = ref({
    total_samples: 0,
    planned_samples: 0,
    in_progress_samples: 0,
    completed_samples: 0,
    failed_samples: 0,
    average_cost: 0,
    total_quantity_produced: 0,
  });
  const qualityInspectionStats = ref({
    total_inspections: 0,
    passed_inspections: 0,
    failed_inspections: 0,
    retest_required: 0,
    approved_for_production: 0,
    pass_rate: 0,
    average_taste_score: 0,
    average_appearance_score: 0,
    average_texture_score: 0,
    average_overall_score: 0,
  });
  const productionInventoryStats = ref({
    total_items: 0,
    total_quantity: 0,
    average_cost: 0,
    average_selling_price: 0,
    average_margin: 0,
    low_stock_items: 0,
    total_produced_all_time: 0,
  });

  // Inventory Integration State
  const inventoryStats = ref({
    total_items: 0,
    total_quantity: 0,
    low_stock_items: 0,
    expiring_soon: 0,
    total_value: 0,
    average_cost: 0,
  });
  const lowStockAlerts = ref([]);
  const expiringItems = ref([]);

  // Dashboard stats
  const dashboardStats = ref({
    total_orders: 0,
    draft_orders: 0,
    scheduled_orders: 0,
    in_progress_orders: 0,
    completed_orders: 0,
    total_planned_quantity: 0,
    total_produced_quantity: 0,
    today_orders: 0,
    today_planned: 0,
    today_produced: 0,
  });

  // Recipe stats
  const recipeStats = ref({
    total_recipes: 0,
    active_recipes: 0,
    inactive_recipes: 0,
    total_categories: 0,
    average_cost_per_batch: 0,
  });

  // Getters
  const activeProductionOrders = computed(() =>
    productionOrders.value.filter(
      (order) => order.status !== 'Cancelled' && order.status !== 'Completed'
    )
  );

  const todayProductionOrders = computed(() => {
    const today = new Date().toISOString().split('T')[0];
    return productionOrders.value.filter((order) =>
      order.planned_start_date?.startsWith(today)
    );
  });

  const urgentOrders = computed(() =>
    productionOrders.value.filter(
      (order) =>
        order.priority === 'Urgent' &&
        order.status !== 'Completed' &&
        order.status !== 'Cancelled'
    )
  );

  const activeRecipes = computed(() =>
    recipes.value.filter((recipe) => recipe.is_active)
  );

  const pendingWorkOrders = computed(() =>
    workOrders.value.filter(
      (order) => order.status === 'Pending' || order.status === 'In Progress'
    )
  );

  const overdueMaintenance = computed(() => {
    const today = new Date().toISOString().split('T')[0];
    return maintenanceSchedules.value.filter(
      (schedule) => schedule.next_due_date < today && schedule.is_active
    );
  });

  // Production Orders Actions
  const fetchProductionOrders = async (filters = {}) => {
    loading.value = true;
    error.value = null;

    try {
      const params = new URLSearchParams();
      Object.keys(filters).forEach((key) => {
        if (filters[key]) params.append(key, filters[key]);
      });

      const response = await axios.get(
        `${API_BASE_URL}/production/orders?${params}`
      );
      if (response.data.success) {
        productionOrders.value = response.data.data;
      } else {
        throw new Error(
          response.data.message || 'Failed to fetch production orders'
        );
      }
    } catch (err) {
      error.value =
        err.response?.data?.message ||
        err.message ||
        'Failed to fetch production orders';
      console.error('Error fetching production orders:', err);
    } finally {
      loading.value = false;
    }
  };

  const getProductionOrderById = async (id) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await axios.get(
        `${API_BASE_URL}/production/orders/${id}`
      );
      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(
          response.data.message || 'Failed to fetch production order'
        );
      }
    } catch (err) {
      error.value =
        err.response?.data?.message ||
        err.message ||
        'Failed to fetch production order';
      console.error('Error fetching production order:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const createProductionOrder = async (orderData) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await axios.post(
        `${API_BASE_URL}/production/orders`,
        orderData
      );
      if (response.data.success) {
        await fetchProductionOrders();
        return response.data.data;
      } else {
        throw new Error(
          response.data.message || 'Failed to create production order'
        );
      }
    } catch (err) {
      error.value =
        err.response?.data?.message ||
        err.message ||
        'Failed to create production order';
      console.error('Error creating production order:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const updateProductionOrder = async (id, updateData) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await axios.put(
        `${API_BASE_URL}/production/orders/${id}`,
        updateData
      );
      if (response.data.success) {
        await fetchProductionOrders();
        return response.data.data;
      } else {
        throw new Error(
          response.data.message || 'Failed to update production order'
        );
      }
    } catch (err) {
      error.value =
        err.response?.data?.message ||
        err.message ||
        'Failed to update production order';
      console.error('Error updating production order:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const updateProductionOrderStatus = async (id, status, notes = null) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await axios.patch(
        `${API_BASE_URL}/production/orders/${id}/status`,
        {
          status,
          notes,
        }
      );
      if (response.data.success) {
        await fetchProductionOrders();
        return response.data.data;
      } else {
        throw new Error(
          response.data.message || 'Failed to update order status'
        );
      }
    } catch (err) {
      error.value =
        err.response?.data?.message ||
        err.message ||
        'Failed to update order status';
      console.error('Error updating order status:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Recipes Actions
  const fetchRecipes = async (filters = {}) => {
    loading.value = true;
    error.value = null;

    try {
      const params = new URLSearchParams();
      Object.keys(filters).forEach((key) => {
        if (filters[key] !== undefined) params.append(key, filters[key]);
      });

      const response = await axios.get(
        `${API_BASE_URL}/production/recipes?${params}`
      );
      if (response.data.success) {
        recipes.value = response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to fetch recipes');
      }
    } catch (err) {
      error.value =
        err.response?.data?.message || err.message || 'Failed to fetch recipes';
      console.error('Error fetching recipes:', err);
    } finally {
      loading.value = false;
    }
  };

  const fetchRecipeStats = async () => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/production/recipes/stats`
      );
      if (response.data.success) {
        recipeStats.value = response.data.data;
        return response.data.data;
      } else {
        throw new Error(
          response.data.message || 'Failed to fetch recipe stats'
        );
      }
    } catch (err) {
      error.value =
        err.response?.data?.message ||
        err.message ||
        'Failed to fetch recipe stats';
      console.error('Error fetching recipe stats:', err);
      throw err;
    }
  };

  const fetchDeletedRecipes = async () => {
    loading.value = true;
    error.value = null;

    try {
      const response = await axios.get(
        `${API_BASE_URL}/production/recipes/deleted`
      );
      if (response.data.success) {
        deletedRecipes.value = response.data.data;
        return response.data.data;
      } else {
        throw new Error(
          response.data.message || 'Failed to fetch deleted recipes'
        );
      }
    } catch (err) {
      error.value =
        err.response?.data?.message ||
        err.message ||
        'Failed to fetch deleted recipes';
      console.error('Error fetching deleted recipes:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const getRecipeById = async (id) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await axios.get(
        `${API_BASE_URL}/production/recipes/${id}`
      );
      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to fetch recipe');
      }
    } catch (err) {
      error.value =
        err.response?.data?.message || err.message || 'Failed to fetch recipe';
      console.error('Error fetching recipe:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const createRecipe = async (recipeData, ingredients) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await axios.post(`${API_BASE_URL}/production/recipes`, {
        ...recipeData,
        ingredients,
      });
      if (response.data.success) {
        await fetchRecipes();
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to create recipe');
      }
    } catch (err) {
      error.value =
        err.response?.data?.message || err.message || 'Failed to create recipe';
      console.error('Error creating recipe:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const updateRecipe = async (id, recipeData, ingredients = null) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await axios.put(
        `${API_BASE_URL}/production/recipes/${id}`,
        {
          ...recipeData,
          ingredients,
        }
      );
      if (response.data.success) {
        await fetchRecipes();
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to update recipe');
      }
    } catch (err) {
      error.value =
        err.response?.data?.message || err.message || 'Failed to update recipe';
      console.error('Error updating recipe:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const deleteRecipe = async (id) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await axios.delete(
        `${API_BASE_URL}/production/recipes/${id}`
      );
      if (response.data.success) {
        // Remove from list without refetch
        recipes.value = recipes.value.filter((r) => r.id !== id);
        await fetchRecipeStats();
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to delete recipe');
      }
    } catch (err) {
      error.value =
        err.response?.data?.message || err.message || 'Failed to delete recipe';
      console.error('Error deleting recipe:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const restoreRecipe = async (id) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await axios.patch(
        `${API_BASE_URL}/production/recipes/${id}/restore`
      );
      if (response.data.success) {
        // Add back to list then sort by name
        recipes.value.unshift(response.data.data);
        recipes.value.sort((a, b) =>
          a.recipe_name.localeCompare(b.recipe_name)
        );
        await fetchRecipeStats();
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to restore recipe');
      }
    } catch (err) {
      error.value =
        err.response?.data?.message ||
        err.message ||
        'Failed to restore recipe';
      console.error('Error restoring recipe:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const checkIngredientAvailability = async (recipeId, batchSize = null) => {
    loading.value = true;
    error.value = null;

    try {
      const params = batchSize ? `?batch_size=${batchSize}` : '';
      const response = await axios.get(
        `${API_BASE_URL}/production/recipes/${recipeId}/availability${params}`
      );
      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(
          response.data.message || 'Failed to check ingredient availability'
        );
      }
    } catch (err) {
      error.value =
        err.response?.data?.message ||
        err.message ||
        'Failed to check ingredient availability';
      console.error('Error checking ingredient availability:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Work Orders Actions
  const fetchWorkOrders = async (filters = {}) => {
    loading.value = true;
    error.value = null;

    try {
      const params = new URLSearchParams();
      Object.keys(filters).forEach((key) => {
        if (filters[key]) params.append(key, filters[key]);
      });

      const response = await axios.get(
        `${API_BASE_URL}/production/work-orders?${params}`
      );
      if (response.data.success) {
        workOrders.value = response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to fetch work orders');
      }
    } catch (err) {
      error.value =
        err.response?.data?.message ||
        err.message ||
        'Failed to fetch work orders';
      console.error('Error fetching work orders:', err);
    } finally {
      loading.value = false;
    }
  };

  const updateWorkOrderStatus = async (id, status, notes = null) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await axios.patch(
        `${API_BASE_URL}/production/work-orders/${id}/status`,
        {
          status,
          notes,
        }
      );
      if (response.data.success) {
        await fetchWorkOrders();
        return response.data.data;
      } else {
        throw new Error(
          response.data.message || 'Failed to update work order status'
        );
      }
    } catch (err) {
      error.value =
        err.response?.data?.message ||
        err.message ||
        'Failed to update work order status';
      console.error('Error updating work order status:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Dashboard Actions
  const fetchDashboardStats = async () => {
    loading.value = true;
    error.value = null;

    try {
      const response = await axios.get(
        `${API_BASE_URL}/production/dashboard/stats`
      );
      if (response.data.success) {
        dashboardStats.value = response.data.data;
      } else {
        throw new Error(
          response.data.message || 'Failed to fetch dashboard stats'
        );
      }
    } catch (err) {
      error.value =
        err.response?.data?.message ||
        err.message ||
        'Failed to fetch dashboard stats';
      console.error('Error fetching dashboard stats:', err);
    } finally {
      loading.value = false;
    }
  };

  // Equipment & Maintenance Actions
  const fetchEquipment = async () => {
    loading.value = true;
    error.value = null;

    try {
      const response = await axios.get(`${API_BASE_URL}/production/equipment`);
      if (response.data.success) {
        equipment.value = response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to fetch equipment');
      }
    } catch (err) {
      error.value =
        err.response?.data?.message ||
        err.message ||
        'Failed to fetch equipment';
      console.error('Error fetching equipment:', err);
    } finally {
      loading.value = false;
    }
  };

  const fetchMaintenanceSchedules = async () => {
    loading.value = true;
    error.value = null;

    try {
      const response = await axios.get(
        `${API_BASE_URL}/production/maintenance/schedules`
      );
      if (response.data.success) {
        maintenanceSchedules.value = response.data.data;
      } else {
        throw new Error(
          response.data.message || 'Failed to fetch maintenance schedules'
        );
      }
    } catch (err) {
      error.value =
        err.response?.data?.message ||
        err.message ||
        'Failed to fetch maintenance schedules';
      console.error('Error fetching maintenance schedules:', err);
    } finally {
      loading.value = false;
    }
  };

  // Waste Management Actions
  const fetchProductionWaste = async (filters = {}) => {
    loading.value = true;
    error.value = null;

    try {
      const params = new URLSearchParams();
      Object.keys(filters).forEach((key) => {
        if (filters[key]) params.append(key, filters[key]);
      });

      const response = await axios.get(
        `${API_BASE_URL}/production/waste?${params}`
      );
      if (response.data.success) {
        productionWaste.value = response.data.data;
      } else {
        throw new Error(
          response.data.message || 'Failed to fetch production waste'
        );
      }
    } catch (err) {
      error.value =
        err.response?.data?.message ||
        err.message ||
        'Failed to fetch production waste';
      console.error('Error fetching production waste:', err);
    } finally {
      loading.value = false;
    }
  };

  const recordWaste = async (wasteData) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await axios.post(
        `${API_BASE_URL}/production/waste`,
        wasteData
      );
      if (response.data.success) {
        await fetchProductionWaste();
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to record waste');
      }
    } catch (err) {
      error.value =
        err.response?.data?.message || err.message || 'Failed to record waste';
      console.error('Error recording waste:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Analytics Actions
  const fetchProductionMetrics = async (filters = {}) => {
    loading.value = true;
    error.value = null;

    try {
      const params = new URLSearchParams();
      Object.keys(filters).forEach((key) => {
        if (filters[key]) params.append(key, filters[key]);
      });

      const response = await axios.get(
        `${API_BASE_URL}/production/analytics/metrics?${params}`
      );
      if (response.data.success) {
        productionMetrics.value = response.data.data;
      } else {
        throw new Error(
          response.data.message || 'Failed to fetch production metrics'
        );
      }
    } catch (err) {
      error.value =
        err.response?.data?.message ||
        err.message ||
        'Failed to fetch production metrics';
      console.error('Error fetching production metrics:', err);
    } finally {
      loading.value = false;
    }
  };

  // Utility Actions
  const resetError = () => {
    error.value = null;
  };

  const resetStore = () => {
    productionOrders.value = [];
    recipes.value = [];
    workOrders.value = [];
    productionBatches.value = [];
    qualityInspections.value = [];
    equipment.value = [];
    maintenanceSchedules.value = [];
    productionWaste.value = [];
    productionMetrics.value = [];
    dashboardStats.value = {
      total_orders: 0,
      draft_orders: 0,
      scheduled_orders: 0,
      in_progress_orders: 0,
      completed_orders: 0,
      total_planned_quantity: 0,
      total_produced_quantity: 0,
      today_orders: 0,
      today_planned: 0,
      today_produced: 0,
    };
    recipeStats.value = {
      total_recipes: 0,
      active_recipes: 0,
      inactive_recipes: 0,
      total_categories: 0,
      average_cost_per_batch: 0,
    };
    error.value = null;
    loading.value = false;
  };

  // ==================== MENU MANAGEMENT ACTIONS ====================

  // Menu Actions
  const fetchMenus = async (filters = {}) => {
    loading.value = true;
    error.value = null;

    try {
      const params = new URLSearchParams();
      Object.keys(filters).forEach((key) => {
        if (filters[key]) params.append(key, filters[key]);
      });

      const response = await axios.get(`${API_BASE_URL}/menu/menus?${params}`);
      if (response.data.success) {
        menus.value = response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to fetch menus');
      }
    } catch (err) {
      error.value =
        err.response?.data?.message || err.message || 'Failed to fetch menus';
      console.error('Error fetching menus:', err);
    } finally {
      loading.value = false;
    }
  };

  const fetchMenuStats = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/menu/menus/stats`);
      if (response.data.success) {
        menuStats.value = response.data.data;
      }
    } catch (err) {
      console.error('Error fetching menu stats:', err);
    }
  };

  // Menu Item Actions
  const fetchMenuItems = async (filters = {}) => {
    loading.value = true;
    error.value = null;

    try {
      const params = new URLSearchParams();
      Object.keys(filters).forEach((key) => {
        if (filters[key]) params.append(key, filters[key]);
      });

      const url = `${API_BASE_URL}/menu/items?${params}`;
      console.log('Fetching menu items from URL:', url);
      console.log('Filters applied:', filters);

      const response = await axios.get(url);
      console.log('API Response:', response.data);

      if (response.data.success) {
        menuItems.value = response.data.data;
        console.log('Menu items loaded:', menuItems.value.length, 'items');
      } else {
        throw new Error(response.data.message || 'Failed to fetch menu items');
      }
    } catch (err) {
      error.value =
        err.response?.data?.message ||
        err.message ||
        'Failed to fetch menu items';
      console.error('Error fetching menu items:', err);
    } finally {
      loading.value = false;
    }
  };

  const createMenuItem = async (menuItemData) => {
    loading.value = true;
    error.value = null;

    try {
      const isFormData =
        typeof FormData !== 'undefined' && menuItemData instanceof FormData;
      const url = isFormData
        ? `${API_BASE_URL}/menu/items/upload`
        : `${API_BASE_URL}/menu/items`;
      const headers = isFormData
        ? { 'Content-Type': 'multipart/form-data' }
        : undefined;
      const response = await axios.post(url, menuItemData, { headers });
      if (response.data.success) {
        await fetchMenuItems();
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to create menu item');
      }
    } catch (err) {
      error.value =
        err.response?.data?.message ||
        err.message ||
        'Failed to create menu item';
      console.error('Error creating menu item:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const updateMenuItem = async (id, updateData) => {
    loading.value = true;
    error.value = null;

    try {
      console.log('Frontend sending update request:', { id, updateData });

      // Check if updateData is FormData (contains image)
      const isFormData = updateData instanceof FormData;
      const endpoint = isFormData
        ? `${API_BASE_URL}/menu/items/${id}/upload`
        : `${API_BASE_URL}/menu/items/${id}`;

      console.log('Using endpoint:', endpoint, 'FormData:', isFormData);

      const response = await axios.put(endpoint, updateData);
      if (response.data.success) {
        // Update the specific item in the store instead of refetching all items
        const updatedItem = response.data.data;
        console.log('Backend returned updated item:', updatedItem);
        const index = menuItems.value.findIndex((item) => item.id === id);
        if (index !== -1) {
          console.log('Before update - store item:', menuItems.value[index]);
          // Merge the updated data with existing item data
          menuItems.value[index] = {
            ...menuItems.value[index],
            ...updatedItem,
          };

          // Ensure image_url is properly formatted if it exists
          if (
            menuItems.value[index].image_url &&
            menuItems.value[index].image_url.startsWith('/uploads/')
          ) {
            const baseUrl = apiConfig.baseURL.replace('/api', '');
            menuItems.value[index].image_url =
              `${baseUrl}${menuItems.value[index].image_url}`;
          }

          console.log('After update - store item:', menuItems.value[index]);
        }

        // Also update the corresponding item in production inventory
        const inventoryIndex = productionInventory.value.findIndex(
          (item) => item.menu_item_id === id
        );
        if (inventoryIndex !== -1) {
          console.log('Updating production inventory item:', inventoryIndex);
          // Update the fields that come from menu items
          productionInventory.value[inventoryIndex] = {
            ...productionInventory.value[inventoryIndex],
            item_name:
              updatedItem.menu_item_name ||
              productionInventory.value[inventoryIndex].item_name,
            menu_item_name:
              updatedItem.menu_item_name ||
              productionInventory.value[inventoryIndex].menu_item_name,
            description:
              updatedItem.description ||
              productionInventory.value[inventoryIndex].description,
            selling_price:
              updatedItem.selling_price ||
              productionInventory.value[inventoryIndex].selling_price,
            menu_selling_price:
              updatedItem.selling_price ||
              productionInventory.value[inventoryIndex].menu_selling_price,
            tags:
              updatedItem.tags ||
              productionInventory.value[inventoryIndex].tags,
            image_url:
              updatedItem.image_url ||
              productionInventory.value[inventoryIndex].image_url,
          };

          // Format image URL for production inventory if needed
          if (
            productionInventory.value[inventoryIndex].image_url &&
            productionInventory.value[inventoryIndex].image_url.startsWith(
              '/uploads/'
            )
          ) {
            const baseUrl = apiConfig.baseURL.replace('/api', '');
            productionInventory.value[inventoryIndex].image_url =
              `${baseUrl}${productionInventory.value[inventoryIndex].image_url}`;
          }

          console.log(
            'Updated production inventory item:',
            productionInventory.value[inventoryIndex]
          );
        }
        return updatedItem;
      } else {
        throw new Error(response.data.message || 'Failed to update menu item');
      }
    } catch (err) {
      error.value =
        err.response?.data?.message ||
        err.message ||
        'Failed to update menu item';
      console.error('Error updating menu item:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const approveMenuItemForProduction = async (id) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await axios.post(
        `${API_BASE_URL}/menu/items/${id}/approve`
      );
      if (response.data.success) {
        // Update the specific item in the store instead of refetching all items
        const index = menuItems.value.findIndex((item) => item.id === id);
        if (index !== -1) {
          menuItems.value[index].is_available = true;
        }
        // Only refresh production inventory since a new item was added there
        await fetchProductionInventory();
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to approve menu item');
      }
    } catch (err) {
      error.value =
        err.response?.data?.message ||
        err.message ||
        'Failed to approve menu item';
      console.error('Error approving menu item:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const deleteMenuItem = async (id, userId) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await axios.delete(`${API_BASE_URL}/menu/items/${id}`, {
        data: { userId }, // Pass userId for audit logging
      });
      if (response.data.success) {
        await fetchMenuItems();
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to delete menu item');
      }
    } catch (err) {
      error.value =
        err.response?.data?.message ||
        err.message ||
        'Failed to delete menu item';
      console.error('Error deleting menu item:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const restoreMenuItem = async (id, userId) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await axios.post(
        `${API_BASE_URL}/menu/items/${id}/restore`
      );
      if (response.data.success) {
        await fetchMenuItems();
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to restore menu item');
      }
    } catch (err) {
      error.value =
        err.response?.data?.message ||
        err.message ||
        'Failed to restore menu item';
      console.error('Error restoring menu item:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Sample Production Actions
  const fetchSampleProductions = async (filters = {}) => {
    loading.value = true;
    error.value = null;

    try {
      const params = new URLSearchParams();
      Object.keys(filters).forEach((key) => {
        if (filters[key]) params.append(key, filters[key]);
      });

      const response = await axios.get(
        `${API_BASE_URL}/menu/sample-production?${params}`
      );
      if (response.data.success) {
        sampleProductions.value = response.data.data;
      } else {
        throw new Error(
          response.data.message || 'Failed to fetch sample productions'
        );
      }
    } catch (err) {
      error.value =
        err.response?.data?.message ||
        err.message ||
        'Failed to fetch sample productions';
      console.error('Error fetching sample productions:', err);
    } finally {
      loading.value = false;
    }
  };

  const getSampleProductionById = async (id) => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/menu/sample-production/${id}`,
        { timeout: 10000 } // 10 second timeout for complex operations
      );
      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(
          response.data.message || 'Failed to fetch sample production'
        );
      }
    } catch (err) {
      console.error('Error fetching sample production by ID:', err);
      throw err;
    }
  };

  const createSampleProduction = async (sampleData) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await axios.post(
        `${API_BASE_URL}/menu/sample-production`,
        sampleData,
        { timeout: 10000 } // 10 second timeout for complex operations
      );
      if (response.data.success) {
        await fetchSampleProductions();
        return response.data.data;
      } else {
        throw new Error(
          response.data.message || 'Failed to create sample production'
        );
      }
    } catch (err) {
      error.value =
        err.response?.data?.message ||
        err.message ||
        'Failed to create sample production';
      console.error('Error creating sample production:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const startSampleProduction = async (id) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await axios.post(
        `${API_BASE_URL}/menu/sample-production/${id}/start`,
        {},
        { timeout: 10000 } // 10 second timeout for complex operations
      );
      if (response.data.success) {
        await fetchSampleProductions();
        return response.data.data;
      } else {
        throw new Error(
          response.data.message || 'Failed to start sample production'
        );
      }
    } catch (err) {
      error.value =
        err.response?.data?.message ||
        err.message ||
        'Failed to start sample production';
      console.error('Error starting sample production:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const completeSampleProduction = async (
    id,
    quantityProduced,
    productionCost,
    notes
  ) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await axios.post(
        `${API_BASE_URL}/menu/sample-production/${id}/complete`,
        {
          quantity_produced: quantityProduced,
          production_cost: productionCost,
          notes,
        },
        { timeout: 10000 } // 10 second timeout for complex operations
      );
      if (response.data.success) {
        await fetchSampleProductions();
        await fetchQualityInspections();
        return response.data.data;
      } else {
        throw new Error(
          response.data.message || 'Failed to complete sample production'
        );
      }
    } catch (err) {
      error.value =
        err.response?.data?.message ||
        err.message ||
        'Failed to complete sample production';
      console.error('Error completing sample production:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const updateSampleProduction = async (id, updateData) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await axios.put(
        `${API_BASE_URL}/menu/sample-production/${id}`,
        updateData,
        { timeout: 10000 } // 10 second timeout for complex operations
      );
      if (response.data.success) {
        // Small delay to ensure database transaction is committed
        await new Promise((resolve) => setTimeout(resolve, 100));
        await fetchSampleProductions();
        return response.data.data;
      } else {
        throw new Error(
          response.data.message || 'Failed to update sample production'
        );
      }
    } catch (err) {
      error.value =
        err.response?.data?.message ||
        err.message ||
        'Failed to update sample production';
      console.error('Error updating sample production:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const cancelSampleProduction = async (id) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await axios.post(
        `${API_BASE_URL}/menu/sample-production/${id}/cancel`,
        {},
        { timeout: 10000 } // 10 second timeout for complex operations
      );
      if (response.data.success) {
        await fetchSampleProductions();
        return response.data.data;
      } else {
        throw new Error(
          response.data.message || 'Failed to cancel sample production'
        );
      }
    } catch (err) {
      error.value =
        err.response?.data?.message ||
        err.message ||
        'Failed to cancel sample production';
      console.error('Error cancelling sample production:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const failSampleProduction = async (
    id,
    failureReason,
    quantityLost,
    costIncurred,
    notes
  ) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await axios.post(
        `${API_BASE_URL}/menu/sample-production/${id}/fail`,
        {
          failure_reason: failureReason,
          quantity_lost: quantityLost,
          cost_incurred: costIncurred,
          notes: notes,
        },
        { timeout: 10000 } // 10 second timeout for complex operations
      );
      if (response.data.success) {
        await fetchSampleProductions();
        return response.data.data;
      } else {
        throw new Error(
          response.data.message || 'Failed to fail sample production'
        );
      }
    } catch (err) {
      error.value =
        err.response?.data?.message ||
        err.message ||
        'Failed to fail sample production';
      console.error('Error failing sample production:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const deleteSampleProduction = async (id) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await axios.delete(
        `${API_BASE_URL}/menu/sample-production/${id}`,
        { timeout: 10000 } // 10 second timeout for complex operations
      );
      if (response.data.success) {
        await fetchSampleProductions();
        return response.data.data;
      } else {
        throw new Error(
          response.data.message || 'Failed to delete sample production'
        );
      }
    } catch (err) {
      error.value =
        err.response?.data?.message ||
        err.message ||
        'Failed to delete sample production';
      console.error('Error deleting sample production:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Quality Inspection Actions
  const fetchQualityInspections = async (filters = {}) => {
    loading.value = true;
    error.value = null;

    try {
      const params = new URLSearchParams();
      Object.keys(filters).forEach((key) => {
        if (filters[key]) params.append(key, filters[key]);
      });

      const response = await axios.get(
        `${API_BASE_URL}/menu/quality-inspection?${params}`
      );
      if (response.data.success) {
        qualityInspections.value = response.data.data;
      } else {
        throw new Error(
          response.data.message || 'Failed to fetch quality inspections'
        );
      }
    } catch (err) {
      error.value =
        err.response?.data?.message ||
        err.message ||
        'Failed to fetch quality inspections';
      console.error('Error fetching quality inspections:', err);
    } finally {
      loading.value = false;
    }
  };

  const archiveSampleProduction = async (id, notes = null) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await axios.post(
        `${API_BASE_URL}/menu/sample-production/${id}/archive`,
        { notes },
        { timeout: 10000 } // 10 second timeout for complex operations
      );
      if (response.data.success) {
        await fetchSampleProductions();
        return response.data.data;
      } else {
        throw new Error(
          response.data.message || 'Failed to archive sample production'
        );
      }
    } catch (err) {
      error.value =
        err.response?.data?.message ||
        err.message ||
        'Failed to archive sample production';
      console.error('Error archiving sample production:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const fetchSampleProductionAuditLogs = async (filters = {}) => {
    loading.value = true;
    error.value = null;

    try {
      const queryParams = new URLSearchParams();
      Object.keys(filters).forEach((key) => {
        if (
          filters[key] !== null &&
          filters[key] !== undefined &&
          filters[key] !== ''
        ) {
          queryParams.append(key, filters[key]);
        }
      });

      const response = await axios.get(
        `${API_BASE_URL}/menu/sample-production/audit-logs?${queryParams.toString()}`,
        { timeout: 10000 }
      );

      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to fetch audit logs');
      }
    } catch (err) {
      error.value =
        err.response?.data?.message ||
        err.message ||
        'Failed to fetch audit logs';
      console.error('Error fetching audit logs:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const createQualityInspection = async (inspectionData) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await axios.post(
        `${API_BASE_URL}/menu/quality-inspection`,
        inspectionData
      );
      if (response.data.success) {
        await fetchQualityInspections();
        return response.data.data;
      } else {
        throw new Error(
          response.data.message || 'Failed to create quality inspection'
        );
      }
    } catch (err) {
      error.value =
        err.response?.data?.message ||
        err.message ||
        'Failed to create quality inspection';
      console.error('Error creating quality inspection:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const updateQualityInspection = async (id, updateData) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await axios.put(
        `${API_BASE_URL}/menu/quality-inspection/${id}`,
        updateData
      );
      if (response.data.success) {
        await fetchQualityInspections();
        return response.data.data;
      } else {
        throw new Error(
          response.data.message || 'Failed to update quality inspection'
        );
      }
    } catch (err) {
      error.value =
        err.response?.data?.message ||
        err.message ||
        'Failed to update quality inspection';
      console.error('Error updating quality inspection:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const approveForProduction = async (id) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await axios.post(
        `${API_BASE_URL}/menu/quality-inspection/${id}/approve`
      );
      if (response.data.success) {
        await fetchQualityInspections();
        await fetchMenuItems();
        await fetchProductionInventory();
        return response.data.data;
      } else {
        throw new Error(
          response.data.message || 'Failed to approve for production'
        );
      }
    } catch (err) {
      error.value =
        err.response?.data?.message ||
        err.message ||
        'Failed to approve for production';
      console.error('Error approving for production:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const failInspection = async (
    id,
    findings,
    correctiveActions,
    requiresRetest,
    retestDate
  ) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await axios.post(
        `${API_BASE_URL}/menu/quality-inspection/${id}/fail`,
        {
          findings,
          corrective_actions: correctiveActions,
          requires_retest: requiresRetest,
          retest_date: retestDate,
        }
      );
      if (response.data.success) {
        await fetchQualityInspections();
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to fail inspection');
      }
    } catch (err) {
      error.value =
        err.response?.data?.message ||
        err.message ||
        'Failed to fail inspection';
      console.error('Error failing inspection:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Production Inventory Actions
  const fetchProductionInventory = async (filters = {}) => {
    loading.value = true;
    error.value = null;

    try {
      const params = new URLSearchParams();
      Object.keys(filters).forEach((key) => {
        if (filters[key]) params.append(key, filters[key]);
      });

      const response = await axios.get(
        `${API_BASE_URL}/menu/production-inventory?${params}`
      );
      if (response.data.success) {
        // Map backend field names to frontend expected field names
        productionInventory.value = response.data.data.map((item) => ({
          ...item,
          item_name: item.menu_item_name, // Map menu_item_name to item_name for frontend compatibility
          selling_price: item.menu_selling_price || item.selling_price, // Use menu_selling_price if available
        }));
      } else {
        throw new Error(
          response.data.message || 'Failed to fetch production inventory'
        );
      }
    } catch (err) {
      error.value =
        err.response?.data?.message ||
        err.message ||
        'Failed to fetch production inventory';
      console.error('Error fetching production inventory:', err);
    } finally {
      loading.value = false;
    }
  };

  const updateInventoryStock = async (id, quantity, notes) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await axios.put(
        `${API_BASE_URL}/menu/production-inventory/${id}/stock`,
        {
          quantity,
          notes,
        }
      );
      if (response.data.success) {
        await fetchProductionInventory();
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to update stock');
      }
    } catch (err) {
      error.value =
        err.response?.data?.message || err.message || 'Failed to update stock';
      console.error('Error updating stock:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const updateInventoryPricing = async (id, sellingPrice) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await axios.put(
        `${API_BASE_URL}/menu/production-inventory/${id}/pricing`,
        {
          selling_price: sellingPrice,
        }
      );
      if (response.data.success) {
        await fetchProductionInventory();
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to update pricing');
      }
    } catch (err) {
      error.value =
        err.response?.data?.message ||
        err.message ||
        'Failed to update pricing';
      console.error('Error updating pricing:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Statistics Actions
  const fetchMenuItemStats = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/menu/items/stats`);
      if (response.data.success) {
        menuItemStats.value = response.data.data;
      }
    } catch (err) {
      console.error('Error fetching menu item stats:', err);
    }
  };

  const fetchSampleProductionStats = async () => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/menu/sample-production/stats`
      );
      if (response.data.success) {
        sampleProductionStats.value = response.data.data;
      }
    } catch (err) {
      console.error('Error fetching sample production stats:', err);
    }
  };

  const fetchQualityInspectionStats = async () => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/menu/quality-inspection/stats`
      );
      if (response.data.success) {
        qualityInspectionStats.value = response.data.data;
      }
    } catch (err) {
      console.error('Error fetching quality inspection stats:', err);
    }
  };

  const fetchProductionInventoryStats = async () => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/menu/production-inventory/stats`
      );
      if (response.data.success) {
        productionInventoryStats.value = response.data.data;
      }
    } catch (err) {
      console.error('Error fetching production inventory stats:', err);
    }
  };

  // Utility Actions
  const fetchAvailableRecipes = async () => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/menu/items/available-recipes`
      );
      if (response.data.success) {
        return response.data.data;
      }
    } catch (err) {
      console.error('Error fetching available recipes:', err);
      return [];
    }
  };

  // Get menus by category for hybrid approach
  const fetchMenusByCategory = async (category) => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/menu/menus/by-category/${encodeURIComponent(category)}`
      );
      if (response.data.success) {
        return response.data.data;
      }
    } catch (err) {
      console.error('Error fetching menus by category:', err);
      return [];
    }
  };

  // Create new menu for hybrid approach
  const createMenu = async (menuData) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/menu/menus`, menuData);
      if (response.data.success) {
        return response.data.data;
      }
      throw new Error(response.data.message || 'Failed to create menu');
    } catch (err) {
      console.error('Error creating menu:', err);
      throw err;
    }
  };

  const fetchLowStockItems = async () => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/menu/production-inventory/low-stock`
      );
      if (response.data.success) {
        return response.data.data;
      }
    } catch (err) {
      console.error('Error fetching low stock items:', err);
      return [];
    }
  };

  // Branch Management
  const fetchBranches = async () => {
    try {
      loading.value = true;
      const response = await axios.get(`${API_BASE_URL}/branches?active=true`);
      if (response.data) {
        return response.data;
      }
    } catch (error) {
      console.error('Error fetching branches:', error);
      throw error;
    } finally {
      loading.value = false;
    }
  };

  // Distribution Actions
  const recordDistribution = async (inventoryId, distributionData) => {
    try {
      loading.value = true;
      const response = await axios.post(
        `${API_BASE_URL}/menu/production-inventory/${inventoryId}/distribute`,
        distributionData
      );
      if (response.data.success) {
        await fetchProductionInventory(); // Refresh inventory
        return response.data;
      }
    } catch (error) {
      console.error('Error recording distribution:', error);
      throw error;
    } finally {
      loading.value = false;
    }
  };

  const fetchDistributionHistory = async (inventoryId, filters = {}) => {
    try {
      loading.value = true;
      const params = new URLSearchParams(filters).toString();
      const response = await axios.get(
        `${API_BASE_URL}/menu/production-inventory/${inventoryId}/distribution-history?${params}`
      );
      if (response.data.success) {
        return response.data.data;
      }
    } catch (error) {
      console.error('Error fetching distribution history:', error);
      throw error;
    } finally {
      loading.value = false;
    }
  };

  const fetchAllDistributions = async (filters = {}) => {
    try {
      loading.value = true;
      const params = new URLSearchParams(filters).toString();
      const response = await axios.get(
        `${API_BASE_URL}/menu/production-inventory/distributions?${params}`
      );
      if (response.data.success) {
        return response.data.data;
      }
    } catch (error) {
      console.error('Error fetching all distributions:', error);
      throw error;
    } finally {
      loading.value = false;
    }
  };

  const checkDistributionAvailability = async (inventoryId, quantity) => {
    try {
      loading.value = true;
      const response = await axios.post(
        `${API_BASE_URL}/menu/production-inventory/${inventoryId}/check-availability`,
        { quantity }
      );
      if (response.data.success) {
        return response.data.data;
      }
    } catch (error) {
      console.error('Error checking distribution availability:', error);
      throw error;
    } finally {
      loading.value = false;
    }
  };

  // Configure production inventory settings (reorder points, max stock) without adding actual stock
  // Stock should only be added through actual production workflow
  const configureProductionInventory = async (inventoryId) => {
    try {
      loading.value = true;
      const response = await axios.post(
        `${API_BASE_URL}/menu/production-inventory/${inventoryId}/update-initial-stock`
      );
      if (response.data.success) {
        await fetchProductionInventory(); // Refresh inventory
        return response.data;
      }
    } catch (error) {
      console.error('Error configuring production inventory:', error);
      throw error;
    } finally {
      loading.value = false;
    }
  };

  // Legacy function name for backward compatibility
  const updateInitialStockFromRecipe = configureProductionInventory;

  // Refresh production inventory data (useful after menu item updates)
  const refreshProductionInventory = async () => {
    try {
      await fetchProductionInventory();
    } catch (error) {
      console.error('Error refreshing production inventory:', error);
    }
  };

  // Force refresh production inventory from server (useful when data might be stale)
  const forceRefreshProductionInventory = async () => {
    try {
      loading.value = true;
      const response = await axios.get(
        `${API_BASE_URL}/menu/production-inventory`
      );
      if (response.data.success) {
        // Map backend field names to frontend expected field names
        productionInventory.value = response.data.data.map((item) => ({
          ...item,
          item_name: item.menu_item_name, // Map menu_item_name to item_name for frontend compatibility
          selling_price: item.menu_selling_price || item.selling_price, // Use menu_selling_price if available
        }));
        console.log(
          'Production inventory force refreshed:',
          productionInventory.value.length,
          'items'
        );
      }
    } catch (error) {
      console.error('Error force refreshing production inventory:', error);
    } finally {
      loading.value = false;
    }
  };

  // Fetch recent activity for production inventory
  const fetchRecentActivity = async (limit = 10) => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/menu/production-inventory/recent-activity?limit=${limit}`
      );

      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(
          response.data.message || 'Failed to fetch recent activity'
        );
      }
    } catch (error) {
      console.error('Error fetching recent activity:', error);
      error.value =
        error.response?.data?.message ||
        error.message ||
        'Failed to fetch recent activity';
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

      // Fetch both audit logs and production batch transactions
      const [auditLogsResponse, productionBatchesResponse] = await Promise.all([
        axios.get(
          `${API_BASE_URL}/menu/production-inventory/audit-logs?${queryParams.toString()}`
        ),
        axios.get(
          `${API_BASE_URL}/production/batches?${queryParams.toString()}`
        ),
      ]);

      let allTransactions = [];

      // Process audit logs
      if (auditLogsResponse.data.success) {
        const auditLogs = auditLogsResponse.data.data.map((log) => ({
          ...log,
          transaction_type: 'audit_log',
          source: 'audit',
        }));
        allTransactions = [...allTransactions, ...auditLogs];
      }

      // Process production batches
      if (productionBatchesResponse.data.success) {
        const productionBatches = productionBatchesResponse.data.data.map(
          (batch) => ({
            id: batch.id,
            action_type: batch.status,
            item_name: batch.menu_item_name,
            menu_item_id: batch.menu_item_id,
            created_at: batch.updated_at,
            performed_by: batch.assigned_to_name,
            notes: batch.notes,
            transaction_type: 'production_batch',
            source: 'production',
            batch_number: batch.batch_number,
            batch_size: batch.batch_size,
            quantity_produced: batch.quantity_produced,
            production_date: batch.production_date,
            start_time: batch.start_time,
            end_time: batch.end_time,
          })
        );
        allTransactions = [...allTransactions, ...productionBatches];
      }

      // Sort by date (most recent first)
      allTransactions.sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
      );

      // Apply pagination
      const page = parseInt(params.page) || 1;
      const limit = parseInt(params.limit) || 10;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedTransactions = allTransactions.slice(startIndex, endIndex);

      return {
        data: paginatedTransactions,
        total: allTransactions.length,
        page: page,
        totalPages: Math.ceil(allTransactions.length / limit),
      };
    } catch (error) {
      console.error('Error fetching transactions:', error);
      error.value =
        error.response?.data?.message ||
        error.message ||
        'Failed to fetch transactions';
      throw error;
    }
  };

  // Inventory Integration Actions
  const checkRecipeAvailability = async (recipeId, batchSize = 1) => {
    try {
      loading.value = true;
      const response = await axios.get(
        `${API_BASE_URL}/menu/inventory/check-recipe-availability`,
        {
          params: { recipe_id: recipeId, batch_size: batchSize },
        }
      );
      if (response.data.success) {
        return response.data.data;
      }
    } catch (err) {
      console.error('Error checking recipe availability:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const checkSampleAvailability = async (sampleId) => {
    try {
      loading.value = true;
      const response = await axios.get(
        `${API_BASE_URL}/menu/inventory/check-sample-availability/${sampleId}`
      );
      if (response.data.success) {
        return response.data.data;
      }
    } catch (err) {
      console.error('Error checking sample availability:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const fetchInventoryStats = async () => {
    try {
      loading.value = true;
      const response = await axios.get(`${API_BASE_URL}/menu/inventory/stats`);
      if (response.data.success) {
        inventoryStats.value = response.data.data;
        return response.data.data;
      }
    } catch (err) {
      console.error('Error fetching inventory stats:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const fetchLowStockAlerts = async () => {
    try {
      loading.value = true;
      const response = await axios.get(
        `${API_BASE_URL}/menu/inventory/low-stock-alerts`
      );
      if (response.data.success) {
        lowStockAlerts.value = response.data.data;
        return response.data.data;
      }
    } catch (err) {
      console.error('Error fetching low stock alerts:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const fetchExpiringItems = async (daysAhead = 30) => {
    try {
      loading.value = true;
      const response = await axios.get(
        `${API_BASE_URL}/menu/inventory/expiring-soon`,
        {
          params: { days_ahead: daysAhead },
        }
      );
      if (response.data.success) {
        expiringItems.value = response.data.data;
        return response.data.data;
      }
    } catch (err) {
      console.error('Error fetching expiring items:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // ==================== PRODUCTION EXECUTION METHODS ====================

  // Get production inventory (ready for production)
  const getProductionInventory = async (filters = {}) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/production/inventory`, {
        params: filters,
        timeout: 10000,
      });

      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(
          response.data.message || 'Failed to fetch production inventory'
        );
      }
    } catch (err) {
      console.error('Error fetching production inventory:', err);
      throw err;
    }
  };

  // Execute production batch
  const executeProduction = async (executionData) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await axios.post(
        `${API_BASE_URL}/production/execute`,
        executionData,
        { timeout: 15000 }
      );

      if (response.data.success) {
        // Refresh production inventory after successful execution
        await fetchProductionInventory();
        return response.data.data;
      } else {
        throw new Error(
          response.data.message || 'Failed to execute production'
        );
      }
    } catch (err) {
      error.value =
        err.response?.data?.message ||
        err.message ||
        'Failed to execute production';
      console.error('Error executing production:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Get active production batches
  const getActiveBatches = async (filters = {}) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/production/batches`, {
        params: filters,
        timeout: 10000,
      });

      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(
          response.data.message || 'Failed to fetch active batches'
        );
      }
    } catch (err) {
      console.error('Error fetching active batches:', err);
      throw err;
    }
  };

  // Update batch status
  const updateBatchStatus = async (
    batchId,
    status,
    notes = null,
    quantityProduced = null
  ) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await axios.patch(
        `${API_BASE_URL}/production/batches/${batchId}/status`,
        {
          status,
          notes,
          quantity_produced: quantityProduced,
        },
        { timeout: 10000 }
      );

      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(
          response.data.message || 'Failed to update batch status'
        );
      }
    } catch (err) {
      error.value =
        err.response?.data?.message ||
        err.message ||
        'Failed to update batch status';
      console.error('Error updating batch status:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Get ingredient requirements for production
  const getIngredientRequirements = async (menuItemId, batchSize = null) => {
    try {
      const params = {};
      if (batchSize) params.batch_size = batchSize;

      const response = await axios.get(
        `${API_BASE_URL}/production/ingredient-requirements/${menuItemId}`,
        { params, timeout: 10000 }
      );

      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(
          response.data.message || 'Failed to fetch ingredient requirements'
        );
      }
    } catch (err) {
      console.error('Error fetching ingredient requirements:', err);
      throw err;
    }
  };

  // Get production history
  const getProductionHistory = async (filters = {}) => {
    try {
      // This would typically be a separate endpoint, but for now we can use existing data
      const response = await axios.get(`${API_BASE_URL}/production/batches`, {
        params: { ...filters, status: 'Completed' },
        timeout: 10000,
      });

      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(
          response.data.message || 'Failed to fetch production history'
        );
      }
    } catch (err) {
      console.error('Error fetching production history:', err);
      return []; // Return empty array if fails
    }
  };

  return {
    // State
    productionOrders,
    recipes,
    deletedRecipes,
    workOrders,
    productionBatches,
    qualityInspections,
    equipment,
    maintenanceSchedules,
    productionWaste,
    productionMetrics,
    loading,
    error,
    dashboardStats,
    recipeStats,

    // Menu Management State
    menus,
    menuItems,
    sampleProductions,
    productionInventory,
    menuStats,
    menuItemStats,
    sampleProductionStats,
    qualityInspectionStats,
    productionInventoryStats,

    // Getters
    activeProductionOrders,
    todayProductionOrders,
    urgentOrders,
    activeRecipes,
    pendingWorkOrders,
    overdueMaintenance,

    // Actions
    fetchProductionOrders,
    getProductionOrderById,
    createProductionOrder,
    updateProductionOrder,
    updateProductionOrderStatus,
    fetchRecipes,
    fetchRecipeStats,
    fetchDeletedRecipes,
    getRecipeById,
    createRecipe,
    updateRecipe,
    deleteRecipe,
    restoreRecipe,
    checkIngredientAvailability,
    fetchWorkOrders,
    updateWorkOrderStatus,
    fetchDashboardStats,
    fetchQualityInspections,
    fetchEquipment,
    fetchMaintenanceSchedules,
    fetchProductionWaste,
    recordWaste,
    fetchProductionMetrics,
    resetError,
    resetStore,

    // Menu Management Actions
    fetchMenus,
    fetchMenuStats,
    fetchMenuItems,
    createMenuItem,
    updateMenuItem,
    approveMenuItemForProduction,
    deleteMenuItem,
    restoreMenuItem,
    fetchSampleProductions,
    getSampleProductionById,
    createSampleProduction,
    updateSampleProduction,
    startSampleProduction,
    completeSampleProduction,
    cancelSampleProduction,
    failSampleProduction,
    deleteSampleProduction,
    archiveSampleProduction,
    fetchSampleProductionAuditLogs,
    createQualityInspection,
    updateQualityInspection,
    approveForProduction,
    failInspection,
    fetchProductionInventory,
    updateInventoryStock,
    updateInventoryPricing,
    fetchMenuItemStats,
    fetchSampleProductionStats,
    fetchQualityInspectionStats,
    fetchProductionInventoryStats,
    fetchAvailableRecipes,
    fetchMenusByCategory,
    createMenu,
    fetchLowStockItems,

    // Branch Management
    fetchBranches,

    // Distribution Actions
    recordDistribution,
    fetchDistributionHistory,
    fetchAllDistributions,
    checkDistributionAvailability,
    configureProductionInventory,
    updateInitialStockFromRecipe, // Legacy alias
    refreshProductionInventory,
    forceRefreshProductionInventory,
    fetchRecentActivity,
    fetchAllTransactions,

    // Inventory Integration Actions
    checkRecipeAvailability,
    checkSampleAvailability,
    fetchInventoryStats,
    fetchLowStockAlerts,
    fetchExpiringItems,
    inventoryStats,
    lowStockAlerts,
    expiringItems,

    // Production Execution Actions
    getProductionInventory,
    executeProduction,
    getActiveBatches,
    updateBatchStatus,
    getIngredientRequirements,
    getProductionHistory,
  };
});
