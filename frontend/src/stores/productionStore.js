import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

export const useProductionStore = defineStore('production', () => {
  // State
  const productionOrders = ref([]);
  const recipes = ref([]);
  const workOrders = ref([]);
  const productionBatches = ref([]);
  const qualityInspections = ref([]);
  const equipment = ref([]);
  const maintenanceSchedules = ref([]);
  const productionWaste = ref([]);
  const productionMetrics = ref([]);
  const loading = ref(false);
  const error = ref(null);

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

  // Quality Control Actions
  const fetchQualityInspections = async (filters = {}) => {
    loading.value = true;
    error.value = null;

    try {
      const params = new URLSearchParams();
      Object.keys(filters).forEach((key) => {
        if (filters[key]) params.append(key, filters[key]);
      });

      const response = await axios.get(
        `${API_BASE_URL}/production/quality-inspections?${params}`
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

  return {
    // State
    productionOrders,
    recipes,
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
    getRecipeById,
    createRecipe,
    updateRecipe,
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
  };
});
