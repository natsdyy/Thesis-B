<script setup>
  import { ref, computed, onMounted, watch } from 'vue';
  import {
    Calendar,
    Plus,
    Search,
    Filter,
    Clock,
    Package,
    Users,
    CheckCircle,
    AlertTriangle,
    TrendingUp,
    RefreshCcw,
    ChevronDown,
    ChevronUp,
    Eye,
    Edit,
    Trash2,
    Play,
    Pause,
    X,
  } from 'lucide-vue-next';
  import { useProductionStore } from '../../stores/productionStore.js';
  import { useInventoryStore } from '../../stores/inventoryStore.js';

  const productionStore = useProductionStore();
  const inventoryStore = useInventoryStore();

  // Reactive state
  const activeTab = ref('schedule');
  const currentDate = ref(new Date());
  const selectedDate = ref(new Date().toISOString().split('T')[0]);
  const searchQuery = ref('');
  const statusFilter = ref('');
  const priorityFilter = ref('');
  const showCreateModal = ref(false);
  const showDetailsModal = ref(false);
  const selectedOrder = ref(null);
  const expandedOrders = ref(new Set());

  // Form data
  const orderForm = ref({
    product_name: '',
    recipe_id: '',
    quantity_planned: '',
    unit_of_measure: 'servings',
    priority: 'Normal',
    planned_start_date: new Date().toISOString().split('T')[0],
    planned_end_date: '',
    assigned_to: '',
    notes: '',
    estimated_cost: '',
  });

  // Access store data
  const loading = computed(() => productionStore.loading);
  const error = computed(() => productionStore.error);
  const productionOrders = computed(() => productionStore.productionOrders);
  const recipes = computed(() => productionStore.recipes);
  const dashboardStats = computed(() => productionStore.dashboardStats);

  // Computed properties
  const filteredOrders = computed(() => {
    let filtered = productionOrders.value;

    if (searchQuery.value) {
      const query = searchQuery.value.toLowerCase();
      filtered = filtered.filter(
        (order) =>
          order.product_name.toLowerCase().includes(query) ||
          order.order_number.toLowerCase().includes(query) ||
          order.recipe_name?.toLowerCase().includes(query)
      );
    }

    if (statusFilter.value) {
      filtered = filtered.filter(
        (order) => order.status === statusFilter.value
      );
    }

    if (priorityFilter.value) {
      filtered = filtered.filter(
        (order) => order.priority === priorityFilter.value
      );
    }

    return filtered.sort((a, b) => {
      // Sort by planned start date, then by priority
      const dateCompare =
        new Date(a.planned_start_date) - new Date(b.planned_start_date);
      if (dateCompare === 0) {
        const priorityOrder = { Urgent: 0, High: 1, Normal: 2, Low: 3 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return dateCompare;
    });
  });

  const todayOrders = computed(() => {
    const today = new Date().toISOString().split('T')[0];
    return filteredOrders.value.filter(
      (order) => order.planned_start_date === today
    );
  });

  const weekOrders = computed(() => {
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);

    const todayStr = today.toISOString().split('T')[0];
    const nextWeekStr = nextWeek.toISOString().split('T')[0];

    return filteredOrders.value.filter(
      (order) =>
        order.planned_start_date >= todayStr &&
        order.planned_start_date <= nextWeekStr
    );
  });

  const overdueOrders = computed(() => {
    const today = new Date().toISOString().split('T')[0];
    return filteredOrders.value.filter(
      (order) =>
        order.planned_end_date < today &&
        (order.status === 'Scheduled' || order.status === 'In Progress')
    );
  });

  // Methods
  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'Completed':
        return 'badge-success';
      case 'In Progress':
        return 'badge-info';
      case 'Scheduled':
        return 'badge-warning';
      case 'Draft':
        return 'badge-neutral';
      case 'Cancelled':
        return 'badge-error';
      default:
        return 'badge-neutral';
    }
  };

  const getPriorityBadgeClass = (priority) => {
    switch (priority) {
      case 'Urgent':
        return 'badge-error';
      case 'High':
        return 'badge-warning';
      case 'Normal':
        return 'badge-info';
      case 'Low':
        return 'badge-neutral';
      default:
        return 'badge-neutral';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const toggleOrderExpansion = (orderId) => {
    if (expandedOrders.value.has(orderId)) {
      expandedOrders.value.delete(orderId);
    } else {
      expandedOrders.value.add(orderId);
    }
  };

  const openCreateModal = () => {
    resetForm();
    showCreateModal.value = true;
  };

  const closeCreateModal = () => {
    showCreateModal.value = false;
    resetForm();
  };

  const openDetailsModal = (order) => {
    selectedOrder.value = order;
    showDetailsModal.value = true;
  };

  const closeDetailsModal = () => {
    showDetailsModal.value = false;
    selectedOrder.value = null;
  };

  const resetForm = () => {
    orderForm.value = {
      product_name: '',
      recipe_id: '',
      quantity_planned: '',
      unit_of_measure: 'servings',
      priority: 'Normal',
      planned_start_date: new Date().toISOString().split('T')[0],
      planned_end_date: '',
      assigned_to: '',
      notes: '',
      estimated_cost: '',
    };
  };

  const createProductionOrder = async () => {
    try {
      await productionStore.createProductionOrder({
        ...orderForm.value,
        created_by: 1, // TODO: Get from auth store
      });
      closeCreateModal();
      showToast('Production order created successfully!', 'success');
    } catch (error) {
      showToast(error.message || 'Failed to create production order', 'error');
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      await productionStore.updateProductionOrderStatus(orderId, newStatus);
      showToast(`Order ${newStatus.toLowerCase()} successfully!`, 'success');
    } catch (error) {
      showToast(error.message || 'Failed to update order status', 'error');
    }
  };

  const deleteOrder = async (orderId) => {
    if (confirm('Are you sure you want to delete this production order?')) {
      try {
        // TODO: Implement delete in store
        showToast('Production order deleted successfully!', 'success');
      } catch (error) {
        showToast(
          error.message || 'Failed to delete production order',
          'error'
        );
      }
    }
  };

  const refreshData = async () => {
    try {
      await Promise.all([
        productionStore.fetchProductionOrders(),
        productionStore.fetchRecipes({ is_active: true }),
        productionStore.fetchDashboardStats(),
      ]);
    } catch (error) {
      console.error('Error refreshing data:', error);
    }
  };

  const showToast = (message, type) => {
    // TODO: Implement toast notification
    console.log(`${type}: ${message}`);
  };

  // Watchers
  watch([searchQuery, statusFilter, priorityFilter], () => {
    // Auto-refresh when filters change
  });

  // Lifecycle
  onMounted(async () => {
    await refreshData();
  });
</script>

<template>
  <div class="p-6 space-y-6 bg-base-100 min-h-screen">
    <!-- Header -->
    <div
      class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
    >
      <div>
        <h1
          class="text-3xl font-bold text-primaryColor flex items-center gap-3"
        >
          <Calendar class="w-8 h-8" />
          Production Planning
        </h1>
        <p class="text-base-content/70 mt-1">
          Schedule and manage production orders efficiently
        </p>
      </div>

      <div class="flex items-center gap-3">
        <button
          @click="refreshData"
          class="btn btn-ghost btn-sm"
          :disabled="loading"
        >
          <RefreshCcw class="w-4 h-4" :class="{ 'animate-spin': loading }" />
          Refresh
        </button>
        <button
          @click="openCreateModal"
          class="btn bg-primaryColor text-white btn-sm hover:bg-primaryColor/80"
        >
          <Plus class="w-4 h-4" />
          New Order
        </button>
      </div>
    </div>

    <!-- Quick Stats Cards -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
      <div class="bg-accentColor rounded-xl p-6 shadow-sm border">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-base-content/70">
              Today's Orders
            </p>
            <p class="text-2xl font-bold text-primaryColor">
              {{ todayOrders.length }}
            </p>
          </div>
          <Calendar class="w-8 h-8 text-primaryColor opacity-80" />
        </div>
      </div>

      <div class="bg-accentColor rounded-xl p-6 shadow-sm border">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-base-content/70">This Week</p>
            <p class="text-2xl font-bold text-primaryColor">
              {{ weekOrders.length }}
            </p>
          </div>
          <Package class="w-8 h-8 text-info opacity-80" />
        </div>
      </div>

      <div class="bg-accentColor rounded-xl p-6 shadow-sm border">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-base-content/70">In Progress</p>
            <p class="text-2xl font-bold text-primaryColor">
              {{ dashboardStats.in_progress_orders || 0 }}
            </p>
          </div>
          <Clock class="w-8 h-8 text-warning opacity-80" />
        </div>
      </div>

      <div class="bg-accentColor rounded-xl p-6 shadow-sm border">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-base-content/70">Overdue</p>
            <p class="text-2xl font-bold text-primaryColor">
              {{ overdueOrders.length }}
            </p>
          </div>
          <AlertTriangle class="w-8 h-8 text-error opacity-80" />
        </div>
      </div>
    </div>

    <!-- Filters and Search -->
    <div class="bg-accentColor rounded-xl p-6 shadow-sm border">
      <div class="flex flex-col lg:flex-row gap-4">
        <div class="form-control flex-1">
          <div class="input-group">
            <span class="bg-base-200">
              <Search class="w-4 h-4" />
            </span>
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search orders..."
              class="input input-bordered w-full"
            />
          </div>
        </div>

        <div class="form-control">
          <select v-model="statusFilter" class="select select-bordered">
            <option value="">All Statuses</option>
            <option value="Draft">Draft</option>
            <option value="Scheduled">Scheduled</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>

        <div class="form-control">
          <select v-model="priorityFilter" class="select select-bordered">
            <option value="">All Priorities</option>
            <option value="Low">Low</option>
            <option value="Normal">Normal</option>
            <option value="High">High</option>
            <option value="Urgent">Urgent</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Production Orders List -->
    <div class="bg-accentColor rounded-xl shadow-sm border">
      <div class="p-6 border-b">
        <h2 class="text-xl font-semibold text-primaryColor">
          Production Schedule
        </h2>
      </div>

      <div v-if="loading" class="flex justify-center py-12">
        <span
          class="loading loading-spinner loading-lg text-primaryColor"
        ></span>
      </div>

      <div v-else-if="filteredOrders.length === 0" class="text-center py-12">
        <Package class="w-16 h-16 text-base-content/30 mx-auto mb-4" />
        <p class="text-lg font-medium text-base-content/70">
          No production orders found
        </p>
        <p class="text-base-content/50">
          Create your first production order to get started
        </p>
      </div>

      <div v-else class="divide-y divide-base-200">
        <div
          v-for="order in filteredOrders"
          :key="order.id"
          class="p-6 hover:bg-base-50 transition-colors"
        >
          <div class="flex items-center justify-between">
            <div class="flex-1">
              <div class="flex items-center gap-3 mb-2">
                <h3 class="text-lg font-semibold text-primaryColor">
                  {{ order.product_name }}
                </h3>
                <div class="badge" :class="getStatusBadgeClass(order.status)">
                  {{ order.status }}
                </div>
                <div
                  class="badge"
                  :class="getPriorityBadgeClass(order.priority)"
                >
                  {{ order.priority }}
                </div>
              </div>

              <div class="flex items-center gap-6 text-sm text-base-content/70">
                <span>Order #{{ order.order_number }}</span>
                <span
                  >{{ order.quantity_planned }}
                  {{ order.unit_of_measure }}</span
                >
                <span
                  >{{ formatDate(order.planned_start_date) }} -
                  {{ formatDate(order.planned_end_date) }}</span
                >
                <span v-if="order.assigned_to_name"
                  >Assigned to: {{ order.assigned_to_name }}</span
                >
              </div>

              <div
                v-if="order.recipe_name"
                class="text-sm text-base-content/60 mt-1"
              >
                Recipe: {{ order.recipe_name }}
              </div>
            </div>

            <div class="flex items-center gap-2">
              <div class="text-right mr-4">
                <p class="text-sm font-medium text-primaryColor">
                  {{ order.quantity_produced || 0 }} /
                  {{ order.quantity_planned }}
                </p>
                <p class="text-xs text-base-content/60">
                  {{
                    Math.round(
                      ((order.quantity_produced || 0) /
                        order.quantity_planned) *
                        100
                    )
                  }}% Complete
                </p>
              </div>

              <div class="dropdown dropdown-end">
                <label tabindex="0" class="btn btn-ghost btn-sm">
                  <ChevronDown class="w-4 h-4" />
                </label>
                <ul
                  tabindex="0"
                  class="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52"
                >
                  <li>
                    <a @click="openDetailsModal(order)"
                      ><Eye class="w-4 h-4" />View Details</a
                    >
                  </li>
                  <li v-if="order.status === 'Draft'">
                    <a @click="updateOrderStatus(order.id, 'Scheduled')">
                      <Play class="w-4 h-4" />Schedule
                    </a>
                  </li>
                  <li v-if="order.status === 'Scheduled'">
                    <a @click="updateOrderStatus(order.id, 'In Progress')">
                      <Play class="w-4 h-4" />Start Production
                    </a>
                  </li>
                  <li v-if="order.status === 'In Progress'">
                    <a @click="updateOrderStatus(order.id, 'Completed')">
                      <CheckCircle class="w-4 h-4" />Mark Complete
                    </a>
                  </li>
                  <li>
                    <a><Edit class="w-4 h-4" />Edit</a>
                  </li>
                  <li>
                    <a @click="deleteOrder(order.id)" class="text-error"
                      ><Trash2 class="w-4 h-4" />Delete</a
                    >
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Create Order Modal -->
    <dialog :class="{ 'modal modal-open': showCreateModal }" class="modal">
      <div class="modal-box max-w-2xl">
        <h3 class="font-bold text-lg mb-4 text-primaryColor">
          Create Production Order
        </h3>

        <form @submit.prevent="createProductionOrder" class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="form-control">
              <label class="label">
                <span class="label-text font-medium">Product Name</span>
                <span class="label-text-alt text-error">*</span>
              </label>
              <input
                v-model="orderForm.product_name"
                type="text"
                class="input input-bordered"
                required
              />
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text font-medium">Recipe</span>
              </label>
              <select
                v-model="orderForm.recipe_id"
                class="select select-bordered"
              >
                <option value="">Select Recipe (Optional)</option>
                <option
                  v-for="recipe in recipes"
                  :key="recipe.id"
                  :value="recipe.id"
                >
                  {{ recipe.recipe_name }}
                </option>
              </select>
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text font-medium">Quantity Planned</span>
                <span class="label-text-alt text-error">*</span>
              </label>
              <input
                v-model="orderForm.quantity_planned"
                type="number"
                min="1"
                class="input input-bordered"
                required
              />
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text font-medium">Unit of Measure</span>
              </label>
              <select
                v-model="orderForm.unit_of_measure"
                class="select select-bordered"
              >
                <option value="servings">Servings</option>
                <option value="pieces">Pieces</option>
                <option value="kg">Kilograms</option>
                <option value="liters">Liters</option>
                <option value="batches">Batches</option>
              </select>
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text font-medium">Priority</span>
              </label>
              <select
                v-model="orderForm.priority"
                class="select select-bordered"
              >
                <option value="Low">Low</option>
                <option value="Normal">Normal</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent</option>
              </select>
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text font-medium">Estimated Cost</span>
              </label>
              <input
                v-model="orderForm.estimated_cost"
                type="number"
                step="0.01"
                min="0"
                class="input input-bordered"
              />
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text font-medium">Planned Start Date</span>
                <span class="label-text-alt text-error">*</span>
              </label>
              <input
                v-model="orderForm.planned_start_date"
                type="date"
                class="input input-bordered"
                required
              />
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text font-medium">Planned End Date</span>
                <span class="label-text-alt text-error">*</span>
              </label>
              <input
                v-model="orderForm.planned_end_date"
                type="date"
                class="input input-bordered"
                required
              />
            </div>
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium">Notes</span>
            </label>
            <textarea
              v-model="orderForm.notes"
              class="textarea textarea-bordered"
              rows="3"
            ></textarea>
          </div>

          <div class="modal-action">
            <button
              type="button"
              @click="closeCreateModal"
              class="btn bg-gray-200 text-black/50 font-thin border-none hover:bg-gray-300 shadow-none"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="btn bg-primaryColor text-white font-thin border-none hover:bg-primaryColor/80"
              :disabled="loading"
            >
              <span
                v-if="loading"
                class="loading loading-spinner loading-sm"
              ></span>
              Create Order
            </button>
          </div>
        </form>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button @click="closeCreateModal">close</button>
      </form>
    </dialog>

    <!-- Order Details Modal -->
    <dialog :class="{ 'modal modal-open': showDetailsModal }" class="modal">
      <div class="modal-box max-w-4xl" v-if="selectedOrder">
        <h3 class="font-bold text-lg mb-4 text-primaryColor">
          Production Order Details
        </h3>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div class="space-y-4">
            <div>
              <h4 class="font-semibold text-primaryColor mb-2">
                Order Information
              </h4>
              <div class="bg-base-100 p-4 rounded-lg space-y-2">
                <div class="flex justify-between">
                  <span class="text-base-content/70">Order Number:</span>
                  <span class="font-medium">{{
                    selectedOrder.order_number
                  }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-base-content/70">Product:</span>
                  <span class="font-medium">{{
                    selectedOrder.product_name
                  }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-base-content/70">Quantity:</span>
                  <span class="font-medium"
                    >{{ selectedOrder.quantity_planned }}
                    {{ selectedOrder.unit_of_measure }}</span
                  >
                </div>
                <div class="flex justify-between">
                  <span class="text-base-content/70">Status:</span>
                  <div
                    class="badge"
                    :class="getStatusBadgeClass(selectedOrder.status)"
                  >
                    {{ selectedOrder.status }}
                  </div>
                </div>
                <div class="flex justify-between">
                  <span class="text-base-content/70">Priority:</span>
                  <div
                    class="badge"
                    :class="getPriorityBadgeClass(selectedOrder.priority)"
                  >
                    {{ selectedOrder.priority }}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h4 class="font-semibold text-primaryColor mb-2">Schedule</h4>
              <div class="bg-base-100 p-4 rounded-lg space-y-2">
                <div class="flex justify-between">
                  <span class="text-base-content/70">Start Date:</span>
                  <span class="font-medium">{{
                    formatDate(selectedOrder.planned_start_date)
                  }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-base-content/70">End Date:</span>
                  <span class="font-medium">{{
                    formatDate(selectedOrder.planned_end_date)
                  }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-base-content/70">Assigned To:</span>
                  <span class="font-medium">{{
                    selectedOrder.assigned_to_name || 'Unassigned'
                  }}</span>
                </div>
              </div>
            </div>
          </div>

          <div class="space-y-4">
            <div>
              <h4 class="font-semibold text-primaryColor mb-2">
                Production Progress
              </h4>
              <div class="bg-base-100 p-4 rounded-lg">
                <div class="flex justify-between items-center mb-2">
                  <span class="text-base-content/70">Progress:</span>
                  <span class="font-medium">
                    {{
                      Math.round(
                        ((selectedOrder.quantity_produced || 0) /
                          selectedOrder.quantity_planned) *
                          100
                      )
                    }}%
                  </span>
                </div>
                <progress
                  class="progress progress-primary w-full"
                  :value="selectedOrder.quantity_produced || 0"
                  :max="selectedOrder.quantity_planned"
                ></progress>
                <div class="text-sm text-base-content/60 mt-1">
                  {{ selectedOrder.quantity_produced || 0 }} of
                  {{ selectedOrder.quantity_planned }}
                  {{ selectedOrder.unit_of_measure }} completed
                </div>
              </div>
            </div>

            <div v-if="selectedOrder.notes">
              <h4 class="font-semibold text-primaryColor mb-2">Notes</h4>
              <div class="bg-base-100 p-4 rounded-lg">
                <p class="text-sm">{{ selectedOrder.notes }}</p>
              </div>
            </div>

            <div v-if="selectedOrder.recipe_name">
              <h4 class="font-semibold text-primaryColor mb-2">
                Recipe Information
              </h4>
              <div class="bg-base-100 p-4 rounded-lg space-y-2">
                <div class="flex justify-between">
                  <span class="text-base-content/70">Recipe:</span>
                  <span class="font-medium">{{
                    selectedOrder.recipe_name
                  }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-base-content/70">Category:</span>
                  <span class="font-medium">{{
                    selectedOrder.recipe_category || 'N/A'
                  }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-action">
          <button
            @click="closeDetailsModal"
            class="btn bg-primaryColor text-white"
          >
            Close
          </button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button @click="closeDetailsModal">close</button>
      </form>
    </dialog>

    <!-- Error Display -->
    <div v-if="error" class="alert alert-error">
      <AlertTriangle class="w-5 h-5" />
      <span>{{ error }}</span>
    </div>
  </div>
</template>
