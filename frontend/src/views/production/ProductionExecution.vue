<script setup>
  import { ref, computed, onMounted, watch } from 'vue';
  import {
    Factory,
    Plus,
    Search,
    Filter,
    RefreshCcw,
    Eye,
    Edit,
    Play,
    Pause,
    CheckCircle,
    Clock,
    AlertTriangle,
    Package,
    Users,
    Calendar,
    PhilippinePeso,
    Activity,
    Target,
    TrendingUp,
    X,
    ChevronDown,
    ChevronUp,
    Settings,
    Zap,
    Star,
    AlertCircle,
    BarChart3,
  } from 'lucide-vue-next';
  import { useProductionStore } from '../../stores/productionStore.js';
  import { useAuthStore } from '../../stores/authStore.js';
  import { useUserStore } from '../../stores/userStore.js';
  import { useInventoryStore } from '../../stores/inventoryStore.js';
  import { useRouter } from 'vue-router';
  import ProductionTransactionModal from '../../components/production/ProductionTransactionModal.vue';

  const productionStore = useProductionStore();
  const authStore = useAuthStore();
  const userStore = useUserStore();
  const inventoryStore = useInventoryStore();
  const router = useRouter();

  // Reactive state
  const activeTab = ref('ready');
  const searchQuery = ref('');
  const categoryFilter = ref('');
  const statusFilter = ref('');
  const showExecutionModal = ref(false);
  const showBatchModal = ref(false);
  const showDetailsModal = ref(false);
  const selectedItem = ref(null);
  const selectedBatch = ref(null);
  const selectedBatchForDetails = ref(null);
  const currentPage = ref(1);
  const itemsPerPage = ref(12);
  const expandedItems = ref(new Set());

  // Production data
  const readyForProduction = ref([]);
  const activeBatches = ref([]);
  const productionHistory = ref([]);
  const productionStaff = ref([]);
  const loading = ref(false);
  const error = ref(null);

  // Production execution form
  const executionForm = ref({
    batch_size: 1,
    production_date: new Date().toISOString().split('T')[0],
    assigned_to: '',
    notes: '',
  });

  // Batch status update form
  const batchStatusForm = ref({
    status: '',
    notes: '',
    quantity_produced: 0,
  });

  // Ingredient requirements
  const ingredientRequirements = ref([]);
  const ingredientLoading = ref(false);

  // Toast state - Enhanced version from SampleProductionPlanning.vue
  const toast = ref({ show: false, type: '', message: '' });
  const showToast = (type, message) => {
    toast.value = { show: true, type, message };
    setTimeout(() => {
      toast.value.show = false;
    }, 3000);
  };

  // Transaction modal state
  const showTransactionModal = ref(false);

  // Computed properties
  const isUserAuthenticated = computed(() => authStore.isAuthenticated);
  const currentUser = computed(() => authStore.user);

  const filteredReadyItems = computed(() => {
    let filtered = readyForProduction.value;

    // Search filter
    if (searchQuery.value) {
      const query = searchQuery.value.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.menu_item_name?.toLowerCase().includes(query) ||
          item.recipe_name?.toLowerCase().includes(query) ||
          item.item_code?.toLowerCase().includes(query)
      );
    }

    // Category filter
    if (categoryFilter.value) {
      filtered = filtered.filter(
        (item) => item.category === categoryFilter.value
      );
    }

    // Status filter
    if (statusFilter.value) {
      filtered = filtered.filter(
        (item) => item.quality_status === statusFilter.value
      );
    }

    return filtered;
  });

  const paginatedReadyItems = computed(() => {
    const start = (currentPage.value - 1) * itemsPerPage.value;
    return filteredReadyItems.value.slice(start, start + itemsPerPage.value);
  });

  const totalPages = computed(() => {
    return Math.ceil(filteredReadyItems.value.length / itemsPerPage.value);
  });

  const totalItems = computed(() => filteredReadyItems.value.length);

  const maxBatchSize = computed(() => {
    if (!selectedItem.value) return 1;
    return selectedItem.value.batch_size || 10;
  });

  const canExecuteProduction = computed(() => {
    return (
      executionForm.value.batch_size > 0 &&
      executionForm.value.assigned_to &&
      allIngredientsAvailable.value
    );
  });

  const allIngredientsAvailable = computed(() => {
    return ingredientRequirements.value.every(
      (ingredient) => ingredient.is_available
    );
  });

  const availableCategories = computed(() => {
    const categories = new Set();
    readyForProduction.value.forEach((item) => {
      if (item.category) categories.add(item.category);
    });
    return Array.from(categories).sort();
  });

  // Pagination methods (consistent with TransactionModal pattern)
  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages.value) {
      currentPage.value = page;
    }
  };

  const nextPage = () => {
    if (currentPage.value < totalPages.value) {
      currentPage.value++;
    }
  };

  const prevPage = () => {
    if (currentPage.value > 1) {
      currentPage.value--;
    }
  };

  const getPageRange = () => {
    const current = currentPage.value;
    const total = totalPages.value;
    const range = [];

    const start = Math.max(2, current - 1);
    const end = Math.min(total - 1, current + 1);

    for (let i = start; i <= end; i++) {
      range.push(i);
    }
    return range;
  };

  // Helper functions
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status) => {
    const colors = {
      Approved:
        'badge badge-sm border-none font-medium bg-success/20 text-success',
      'In Progress':
        'badge badge-sm border-none font-medium bg-warning/20 text-warning',
      Completed:
        'badge badge-sm border-none font-medium bg-success/20 text-success',
      Failed: 'badge badge-sm border-none font-medium bg-error/20 text-error',
    };
    return (
      colors[status] ||
      'badge badge-sm border-none font-medium bg-base-200 text-base-content'
    );
  };

  // Production methods
  const startProduction = async (item) => {
    selectedItem.value = item;
    executionForm.value.batch_size = item.batch_size || 1;
    showExecutionModal.value = true;

    // Load ingredient requirements
    await loadIngredientRequirements(item.menu_item_id);

    // Open modal
    document.getElementById('execution_modal').showModal();
  };

  const loadIngredientRequirements = async (menuItemId) => {
    ingredientLoading.value = true;
    try {
      const response = await productionStore.getIngredientRequirements(
        menuItemId,
        executionForm.value.batch_size
      );
      ingredientRequirements.value = response;
    } catch (err) {
      error.value = 'Failed to load ingredient requirements';
      console.error('Error loading ingredients:', err);
      showToast('error', 'Failed to load ingredient requirements');
    } finally {
      ingredientLoading.value = false;
    }
  };

  const executeProduction = async () => {
    if (!canExecuteProduction.value) return;

    // Validate required fields
    if (
      !executionForm.value.batch_size ||
      executionForm.value.batch_size <= 0
    ) {
      showToast('error', 'Please enter a valid batch size');
      return;
    }

    if (!executionForm.value.production_date) {
      showToast('error', 'Please select a production date');
      return;
    }

    if (!executionForm.value.assigned_to) {
      showToast('error', 'Please assign the production to a staff member');
      return;
    }

    if (!allIngredientsAvailable.value) {
      showToast(
        'error',
        'Cannot execute production: insufficient ingredients available'
      );
      return;
    }

    loading.value = true;
    try {
      const productionData = {
        menu_item_id: selectedItem.value.menu_item_id,
        recipe_id: selectedItem.value.recipe_id,
        batch_size: executionForm.value.batch_size,
        production_date: executionForm.value.production_date,
        assigned_to: executionForm.value.assigned_to,
        notes: executionForm.value.notes,
      };

      await productionStore.executeProduction(productionData);

      // Refresh data
      await loadReadyForProduction();
      await loadActiveBatches();

      // Close modal and reset form
      closeExecutionModal();

      // Show success message
      showToast('success', 'Production started successfully!');
    } catch (err) {
      error.value = err.message || 'Failed to execute production';
      showToast('error', 'Failed to start production: ' + err.message);
    } finally {
      loading.value = false;
    }
  };

  const updateBatchStatus = async (batch) => {
    selectedBatch.value = batch;
    batchStatusForm.value.status = batch.status;
    batchStatusForm.value.quantity_produced =
      batch.quantity_produced || batch.batch_size;
    showBatchModal.value = true;

    document.getElementById('batch_modal').showModal();
  };

  const saveBatchStatus = async () => {
    // Validate required fields
    if (!batchStatusForm.value.status) {
      showToast('error', 'Please select a status');
      return;
    }

    if (batchStatusForm.value.quantity_produced < 0) {
      showToast('error', 'Quantity produced cannot be negative');
      return;
    }

    loading.value = true;
    try {
      await productionStore.updateBatchStatus(
        selectedBatch.value.id,
        batchStatusForm.value.status,
        batchStatusForm.value.notes,
        batchStatusForm.value.quantity_produced
      );

      // Refresh data
      await loadActiveBatches();
      await loadReadyForProduction();

      // Close modal
      closeBatchModal();

      showToast('success', 'Batch status updated successfully!');
    } catch (err) {
      error.value = err.message || 'Failed to update batch status';
      showToast('error', 'Failed to update batch: ' + err.message);
    } finally {
      loading.value = false;
    }
  };

  const closeExecutionModal = () => {
    showExecutionModal.value = false;
    document.getElementById('execution_modal').close();
    resetExecutionForm();
  };

  const closeBatchModal = () => {
    showBatchModal.value = false;
    document.getElementById('batch_modal').close();
    resetBatchForm();
  };

  const resetExecutionForm = () => {
    executionForm.value = {
      batch_size: 1,
      production_date: new Date().toISOString().split('T')[0],
      assigned_to: '',
      notes: '',
    };
    ingredientRequirements.value = [];
    selectedItem.value = null;
  };

  const resetBatchForm = () => {
    batchStatusForm.value = {
      status: '',
      notes: '',
      quantity_produced: 0,
    };
    selectedBatch.value = null;
  };

  const clearFilters = () => {
    searchQuery.value = '';
    categoryFilter.value = '';
    statusFilter.value = '';
    currentPage.value = 1;
  };

  const refreshData = async () => {
    try {
      await loadReadyForProduction();
      await loadActiveBatches();
      await loadProductionHistory();
      showToast('success', 'Data refreshed successfully');
    } catch (err) {
      showToast('error', 'Failed to refresh data');
    }
  };

  // Data loading methods
  const loadReadyForProduction = async () => {
    loading.value = true;
    try {
      const response = await productionStore.getProductionInventory();
      // Show items that need restocking: zero stock OR below reorder point
      readyForProduction.value = response.filter((item) => {
        const currentStock = item.available_quantity || 0;
        const reorderPoint = item.reorder_point || 0;

        // Show if: zero stock OR below reorder point OR no reorder point set (default to show all)
        return (
          currentStock === 0 ||
          currentStock <= reorderPoint ||
          reorderPoint === 0
        );
      });
    } catch (err) {
      error.value = 'Failed to load production inventory';
      console.error('Error loading ready items:', err);
      showToast('error', 'Failed to load production inventory');
    } finally {
      loading.value = false;
    }
  };

  const loadActiveBatches = async () => {
    try {
      const response = await productionStore.getActiveBatches();
      activeBatches.value = response;
    } catch (err) {
      console.error('Error loading active batches:', err);
      showToast('error', 'Failed to load active batches');
    }
  };

  const loadProductionHistory = async () => {
    try {
      const response = await productionStore.getProductionHistory();
      productionHistory.value = response.slice(0, 10); // Latest 10 records
    } catch (err) {
      console.error('Error loading production history:', err);
      showToast('error', 'Failed to load production history');
    }
  };

  const loadProductionStaff = async () => {
    try {
      console.log('Loading production staff...');
      const response = await userStore.getProductionStaff();
      productionStaff.value = response;
    } catch (err) {
      console.error('Error loading production staff:', err);
      showToast('error', 'Failed to load production staff');
    }
  };

  // View details methods
  const viewDetails = (item, type = 'ready') => {
    if (type === 'ready') {
      // For ready items, show item details
      selectedBatchForDetails.value = {
        ...item,
        type: 'ready',
        batch_number: 'N/A',
        status: 'Ready for Production',
        progress: 0,
        assigned_to_name: 'Not Assigned',
        start_time: null,
        end_time: null,
      };
    } else if (type === 'batch') {
      // For active batches, show batch details
      selectedBatchForDetails.value = {
        ...item,
        type: 'active',
      };
    } else if (type === 'history') {
      // For history items, show completed batch details
      selectedBatchForDetails.value = {
        ...item,
        type: 'completed',
      };
    }

    showDetailsModal.value = true;
    document.getElementById('details_modal').showModal();
  };

  const closeDetailsModal = () => {
    showDetailsModal.value = false;
    document.getElementById('details_modal').close();
    selectedBatchForDetails.value = null;
  };

  // Navigation methods
  const openTransactionModal = () => {
    showTransactionModal.value = true;
  };

  const closeTransactionModal = () => {
    showTransactionModal.value = false;
  };

  const viewProductionTransactions = () => {
    // Navigate to SCM Main Inventory with production transactions filter (fallback option)
    router.push({
      path: '/scm/main-inventory',
      query: {
        filter: 'production',
        transaction_type: 'production_consumption,production_output',
      },
    });
  };

  // Watch for batch size changes to reload ingredient requirements
  watch(
    () => executionForm.value.batch_size,
    async (newSize) => {
      if (selectedItem.value && newSize > 0) {
        await loadIngredientRequirements(selectedItem.value.menu_item_id);
      }
    }
  );

  // Auto-reset pagination when filters change
  watch(
    [searchQuery, categoryFilter, statusFilter],
    () => {
      currentPage.value = 1;
    },
    { deep: true }
  );

  // Lifecycle
  onMounted(async () => {
    await loadReadyForProduction();
    await loadActiveBatches();
    await loadProductionHistory();
    await loadProductionStaff();
  });
</script>

<template>
  <div class="container mx-auto p-2 sm:p-4 lg:p-6 max-w-6xl">
    <!-- Header -->
    <div class="text-center mb-4 sm:mb-6 lg:mb-8">
      <h1
        class="text-2xl sm:text-3xl lg:text-4xl font-bold text-primaryColor mb-2 text-shadow-xs"
      >
        Production Execution
      </h1>
      <p class="text-sm sm:text-base text-black/50 px-2">
        Execute production batches and track progress
      </p>
    </div>

    <!-- Stats Overview -->
    <div
      class="stats shadow w-full mb-4 sm:mb-6 bg-accentColor border border-black/10 stats-vertical lg:stats-horizontal xl:stats-horizontal rounded-lg"
    >
      <div
        class="stat sm:!border sm:!border-l-0 sm:!border-r-2 sm:!border-t-0 sm:!border-b-0 sm:!border-black/10 sm:border-dashed hover:bg-secondaryColor/10"
      >
        <div class="stat-figure">
          <Package
            class="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-primaryColor"
          />
        </div>
        <div class="stat-title text-black/50 !text-xs sm:text-sm">
          Ready for Production
        </div>
        <div
          class="stat-value text-primaryColor text-lg sm:text-xl lg:text-2xl xl:text-3xl"
        >
          {{ readyForProduction.length }}
        </div>
        <div class="stat-desc text-black/50 !text-xs sm:text-sm">
          Items ready to start
        </div>
      </div>

      <div
        class="stat sm:!border sm:!border-l-0 sm:!border-r-2 sm:!border-t-0 sm:!border-b-0 sm:!border-black/10 sm:border-dashed hover:bg-secondaryColor/10"
      >
        <div class="stat-figure">
          <Activity class="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-warning" />
        </div>
        <div class="stat-title text-black/50 text-xs sm:text-sm">
          In Progress
        </div>
        <div
          class="stat-value text-warning text-lg sm:text-xl lg:text-2xl xl:text-3xl"
        >
          {{ activeBatches.length }}
        </div>
        <div class="stat-desc text-black/50 !text-xs sm:text-sm">
          Active production batches
        </div>
      </div>


    </div>

    <!-- Action Buttons -->
    <div
      class="flex flex-wrap gap-2 mb-4 sm:mb-6 justify-center sm:justify-start"
    >
      <button
        @click="refreshData"
        class="btn btn-sm bg-primaryColor text-white font-thin hover:bg-primaryColor/80 hover:border-none hover:shadow-none"
        :disabled="loading"
      >
        <RefreshCcw class="w-4 h-4 mr-1" />
        Refresh
      </button>
      <button
        @click="openTransactionModal"
        class="btn btn-outline btn-sm text-primaryColor hover:bg-primaryColor/10 font-thin hover:border-none hover:shadow-none"
      >
        <BarChart3 class="w-4 h-4 mr-1" />
        View Transactions
      </button>
    </div>

    <!-- Tab Navigation -->
    <div class="tabs tabs-boxed mb-4 sm:mb-6 justify-center sm:justify-start">
      <button
        @click="activeTab = 'ready'"
        class="tab"
        :class="{ 'tab-active': activeTab === 'ready' }"
      >
        <Package class="w-4 h-4 mr-1" />
        Ready for Production
      </button>
      <button
        @click="activeTab = 'batches'"
        class="tab"
        :class="{ 'tab-active': activeTab === 'batches' }"
      >
        <Activity class="w-4 h-4 mr-1" />
        Active Batches
      </button>
      <button
        @click="activeTab = 'history'"
        class="tab"
        :class="{ 'tab-active': activeTab === 'history' }"
      >
        <Clock class="w-4 h-4 mr-1" />
        Production History
      </button>
    </div>

    <!-- Tab Content -->
    <div
      class="card bg-accentColor shadow-xl mb-4 sm:mb-6 border border-black/10"
    >
      <div class="card-body p-3 sm:p-4 lg:p-6">
        <!-- Ready for Production Tab -->
        <div v-if="activeTab === 'ready'" class="space-y-6">
          <div
            class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6"
          >
            <div>
              <h2
                class="card-title text-primaryColor text-lg sm:text-xl lg:text-2xl mb-2"
              >
                Ready for Production
              </h2>
              <p class="text-sm text-gray-600">
                Items that are ready to start production based on inventory
                levels.
              </p>
            </div>
            <div class="flex gap-2">
              <button
                @click="refreshData"
                class="btn btn-outline btn-sm text-primaryColor hover:bg-primaryColor/10"
                :disabled="loading"
              >
                <RefreshCcw class="w-4 h-4 mr-1" />
                Refresh
              </button>
            </div>
          </div>

          <!-- Search and Filters -->
          <div class="flex flex-col sm:flex-row gap-4 mb-6">
            <div class="flex-1">
              <div class="relative">
                <Search
                  class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4"
                />
                <input
                  v-model="searchQuery"
                  type="text"
                  placeholder="Search menu items, recipes..."
                  class="input input-bordered w-full pl-10"
                />
              </div>
            </div>
            <div class="flex gap-2">
              <select v-model="categoryFilter" class="select select-bordered">
                <option value="">All Categories</option>
                <option
                  v-for="category in availableCategories"
                  :key="category"
                  :value="category"
                >
                  {{ category }}
                </option>
              </select>
              <select v-model="statusFilter" class="select select-bordered">
                <option value="">All Status</option>
                <option value="Approved">Approved</option>
                <option value="Under Review">Under Review</option>
              </select>
              <button
                class="btn btn-outline btn-sm text-primaryColor hover:bg-primaryColor/10"
                @click="clearFilters"
                :disabled="loading"
              >
                <X class="w-4 h-4 mr-1" />
                Clear
              </button>
              <button
                class="btn btn-outline btn-sm text-primaryColor hover:bg-primaryColor/10"
                @click="openTransactionModal"
              >
                <BarChart3 class="w-4 h-4 mr-1" />
                View Transactions
              </button>
            </div>
          </div>

          <!-- Loading State -->
          <div
            v-if="loading"
            class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            <div
              v-for="n in 6"
              :key="`skeleton-${n}`"
              class="card bg-white border border-gray-200 animate-pulse"
            >
              <div class="card-body p-6">
                <div class="h-6 bg-gray-200 rounded mb-2 w-3/4"></div>
                <div class="h-4 bg-gray-200 rounded mb-4 w-1/2"></div>
                <div class="flex justify-between items-center">
                  <div class="h-5 bg-gray-200 rounded w-16"></div>
                  <div class="h-8 bg-gray-200 rounded w-20"></div>
                </div>
              </div>
            </div>
          </div>

          <!-- Items Grid -->
          <div
            v-else
            class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            <div
              v-for="item in paginatedReadyItems"
              :key="item.id"
              class="card bg-white border border-gray-200 hover:shadow-xl duration-300 cursor-pointer"
              @click="viewDetails(item, 'ready')"
            >
              <div class="card-body p-6">
                <div class="flex items-start justify-between mb-4">
                  <div class="flex-1">
                    <h3
                      class="card-title text-lg font-bold text-primaryColor mb-2"
                    >
                      {{ item.menu_item_name }}
                    </h3>

                    <div
                      class="flex items-center justify-start gap-2 text-sm text-gray-600 mb-1"
                    >
                      <span :class="getStatusColor(item.quality_status)">
                        {{ item.quality_status }}
                      </span>
                      <span class="badge badge-sm bg-gray-100 text-gray-600">
                        Stock: {{ item.available_quantity }}
                      </span>
                    </div>
                  </div>
                  <div class="text-right">
                    <div class="text-lg font-bold text-primaryColor">
                      ₱{{ item.selling_price || 0 }}
                    </div>
                  </div>
                </div>

                <div class="flex gap-2">
                  <button
                    @click.stop="startProduction(item)"
                    class="btn btn-sm bg-primaryColor text-white font-thin hover:bg-primaryColor/80 hover:border-none hover:shadow-none flex-1"
                    :disabled="!isUserAuthenticated || loading"
                  >
                    <Play class="w-4 h-4 mr-1" />
                    Start Production
                  </button>
                  <button
                    class="btn btn-sm btn-outline text-primaryColor hover:bg-primaryColor/10 font-thin border border-none shadow-none"
                    @click.stop="viewDetails(item, 'ready')"
                  >
                    <Eye class="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            <!-- Empty State -->
            <div
              v-if="paginatedReadyItems.length === 0"
              class="col-span-full flex flex-col items-center justify-center py-12"
            >
              <Package class="w-16 h-16 text-gray-300 mb-4" />
              <h3 class="text-lg font-medium text-gray-600 mb-2">
                No items ready for production
              </h3>
              <p class="text-sm text-gray-500 text-center mb-4">
                {{
                  filteredReadyItems.length === 0
                    ? 'Complete quality inspections to add items to production inventory.'
                    : 'Try adjusting your search criteria or clearing filters.'
                }}
              </p>
              <div class="flex justify-center gap-2">
                <button
                  v-if="filteredReadyItems.length === 0"
                  @click="refreshData"
                  class="btn btn-sm btn-outline text-primaryColor"
                >
                  <RefreshCcw class="w-4 h-4 mr-1" />
                  Refresh
                </button>
                <button
                  v-else
                  @click="clearFilters"
                  class="btn btn-sm btn-outline text-primaryColor"
                >
                  <X class="w-4 h-4 mr-1" />
                  Clear Filters
                </button>
              </div>
            </div>
          </div>

          <!-- Pagination -->
          <div v-if="totalPages > 1" class="flex justify-center mt-8">
            <div class="btn-group">
              <button
                @click="currentPage--"
                :disabled="currentPage === 1"
                class="btn btn-sm"
              >
                Previous
              </button>
              <button class="btn btn-sm">{{ currentPage }}</button>
              <button
                @click="currentPage++"
                :disabled="currentPage === totalPages"
                class="btn btn-sm"
              >
                Next
              </button>
            </div>
          </div>
        </div>

        <!-- Active Batches Tab -->
        <div v-if="activeTab === 'batches'" class="space-y-6">
          <div
            class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6"
          >
            <div>
              <h2
                class="card-title text-primaryColor text-lg sm:text-xl lg:text-2xl mb-2"
              >
                Active Batches
              </h2>
              <p class="text-sm text-gray-600">
                Currently running production batches and their progress.
              </p>
            </div>
            <div class="flex gap-2">
              <button
                @click="refreshData"
                class="btn btn-outline btn-sm text-primaryColor hover:bg-primaryColor/10"
                :disabled="loading"
              >
                <RefreshCcw class="w-4 h-4 mr-1" />
                Refresh
              </button>
            </div>
          </div>

          <div v-if="activeBatches.length === 0" class="text-center py-12">
            <Activity class="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h3 class="text-lg font-medium text-gray-600 mb-2">
              No Active Batches
            </h3>
            <p class="text-sm text-gray-500">
              Start production to see active batches here.
            </p>
          </div>

          <div v-else class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div
              v-for="batch in activeBatches"
              :key="batch.id"
              class="card bg-white border border-gray-200 hover:shadow-xl duration-300"
            >
              <div class="card-body p-6">
                <div class="flex justify-between items-start mb-4">
                  <div>
                    <h3 class="font-semibold text-lg text-primaryColor">
                      {{ batch.menu_item_name }}
                    </h3>
                    <p class="text-sm text-gray-600">
                      Batch #{{ batch.batch_number }}
                    </p>
                    <p class="text-xs text-gray-500">{{ batch.recipe_name }}</p>
                  </div>
                  <span :class="getStatusColor(batch.status)">{{
                    batch.status
                  }}</span>
                </div>

                <div class="mb-4">
                  <div class="flex justify-between text-sm text-gray-600 mb-2">
                    <span>Progress</span>
                    <span>{{ batch.progress }}%</span>
                  </div>
                  <div class="w-full bg-gray-200 rounded-full h-2">
                    <div
                      class="bg-primaryColor h-2 rounded-full transition-all duration-300"
                      :style="{ width: batch.progress + '%' }"
                    ></div>
                  </div>
                </div>

                <div class="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-4">
                  <div>
                    <span class="block">Batch Size:</span>
                    <span class="font-medium text-gray-800">{{
                      batch.batch_size
                    }}</span>
                  </div>
                  <div>
                    <span class="block">Assigned To:</span>
                    <span class="font-medium text-gray-800">{{
                      batch.assigned_to_name
                    }}</span>
                  </div>
                </div>

                <div class="flex gap-2">
                  <button
                    @click="updateBatchStatus(batch)"
                    class="btn btn-sm btn-outline text-primaryColor hover:bg-primaryColor/10 flex-1 font-thin border border-none shadow-none"
                  >
                    <Settings class="w-4 h-4 mr-1" />
                    Update Status
                  </button>
                  <button
                    class="btn btn-sm btn-outline text-primaryColor hover:bg-primaryColor/10 font-thin border border-none shadow-none"
                    @click="viewDetails(batch, 'batch')"
                  >
                    <Eye class="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Production History Tab -->
        <div v-if="activeTab === 'history'" class="space-y-6">
          <div
            class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6"
          >
            <div>
              <h2
                class="card-title text-primaryColor text-lg sm:text-xl lg:text-2xl mb-2"
              >
                Production History
              </h2>
              <p class="text-sm text-gray-600">
                Completed production batches and their outcomes.
              </p>
            </div>
            <div class="flex gap-2">
              <button
                @click="refreshData"
                class="btn btn-outline btn-sm text-primaryColor hover:bg-primaryColor/10"
                :disabled="loading"
              >
                <RefreshCcw class="w-4 h-4 mr-1" />
                Refresh
              </button>
            </div>
          </div>

          <div v-if="productionHistory.length === 0" class="text-center py-12">
            <Clock class="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h3 class="text-lg font-medium text-gray-600 mb-2">
              No Production History
            </h3>
            <p class="text-sm text-gray-500">
              Complete production batches to see history here.
            </p>
          </div>

          <div v-else class="overflow-x-auto">
            <table class="table table-zebra w-full">
              <thead>
                <tr class="text-gray-700">
                  <th>Item</th>
                  <th>Batch #</th>
                  <th>Quantity</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="history in productionHistory" :key="history.id">
                  <td>
                    <div>
                      <div class="font-medium">
                        {{ history.menu_item_name }}
                      </div>
                      <div class="text-sm text-gray-600">
                        {{ history.item_code }}
                      </div>
                    </div>
                  </td>
                  <td>{{ history.batch_number }}</td>
                  <td>{{ history.quantity_produced }} {{ history.unit }}</td>
                  <td>{{ formatDate(history.production_date) }}</td>
                  <td>
                    <span :class="getStatusColor(history.status)">{{
                      history.status
                    }}</span>
                  </td>
                  <td>
                    <button
                      class="cursor-pointer font-thin btn btn-sm btn-outline text-black/80 hover:bg-primaryColor/10 border border-none shadow-none"
                      @click="viewDetails(history, 'history')"
                    >
                      <Eye class="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Production Execution Modal -->
      <dialog id="execution_modal" class="modal">
        <div
          class="modal-box max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl border border-black/10 bg-white/95 shadow-lg"
        >
          <h3
            class="font-bold text-xl text-primaryColor mb-4 border-b border-black/10 pb-3"
          >
            Execute Production: {{ selectedItem?.menu_item_name }}
          </h3>

          <form @submit.prevent="executeProduction" class="space-y-6">
            <!-- Production Details Form -->
            <div
              class="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 bg-white border border-black/10 p-4 rounded-xl"
            >
              <div class="form-control">
                <label class="label mb-1">
                  <span
                    class="label-text text-black/70 font-medium text-sm sm:text-base"
                    >Batch Size</span
                  >
                </label>
                <div class="flex items-center gap-2">
                  <input
                    v-model="executionForm.batch_size"
                    type="number"
                    :max="maxBatchSize"
                    :min="1"
                    class="input input-sm sm:input-md input-bordered w-full bg-white border-primaryColor/30 text-black/70 focus:border-primaryColor flex-1"
                  />
                  <span class="text-sm text-black/60">{{
                    selectedItem?.batch_unit || 'servings'
                  }}</span>
                </div>
                <label class="label">
                  <span class="label-text-alt text-black/50"
                    >Max: {{ maxBatchSize }}</span
                  >
                </label>
              </div>

              <div class="form-control">
                <label class="label mb-1">
                  <span
                    class="label-text text-black/70 font-medium text-sm sm:text-base"
                    >Production Date</span
                  >
                </label>
                <input
                  v-model="executionForm.production_date"
                  type="date"
                  class="input input-sm sm:input-md input-bordered w-full bg-white border-primaryColor/30 text-black/70 focus:border-primaryColor"
                />
              </div>

              <div class="form-control">
                <label class="label mb-1">
                  <span
                    class="label-text text-black/70 font-medium text-sm sm:text-base"
                    >Assigned To</span
                  >
                </label>
                <select
                  v-model="executionForm.assigned_to"
                  class="select select-sm sm:select-md select-bordered w-full bg-white border-primaryColor/30 text-black/70 focus:border-primaryColor"
                >
                  <option value="">Select Staff</option>
                  <option
                    v-for="staff in productionStaff"
                    :key="staff.id"
                    :value="staff.id"
                  >
                    {{ staff.first_name }} {{ staff.last_name }}
                  </option>
                </select>
              </div>

              <div class="form-control">
                <label class="label mb-1">
                  <span
                    class="label-text text-black/70 font-medium text-sm sm:text-base"
                    >Notes (Optional)</span
                  >
                </label>
                <textarea
                  v-model="executionForm.notes"
                  class="textarea textarea-sm sm:textarea-md textarea-bordered w-full bg-white border-primaryColor/30 text-black/70 focus:border-primaryColor"
                  placeholder="Production notes..."
                  rows="3"
                ></textarea>
              </div>
            </div>

            <!-- Ingredient Requirements -->
            <div class="bg-white border border-black/10 p-4 rounded-xl">
              <h4 class="font-semibold text-lg text-black/80 mb-4">
                Ingredient Requirements
              </h4>

              <div v-if="ingredientLoading" class="space-y-3">
                <div
                  v-for="n in 3"
                  :key="n"
                  class="flex items-center justify-between p-3 bg-gray-100 rounded animate-pulse"
                >
                  <div class="h-4 bg-gray-200 rounded w-1/3"></div>
                  <div class="h-4 bg-gray-200 rounded w-1/4"></div>
                </div>
              </div>

              <div
                v-else-if="ingredientRequirements.length === 0"
                class="text-center py-6 text-black/50"
              >
                No ingredient requirements loaded
              </div>

              <div v-else class="space-y-3">
                <div
                  v-for="ingredient in ingredientRequirements"
                  :key="ingredient.id"
                  class="flex items-center justify-between p-3 rounded border"
                  :class="
                    ingredient.is_available
                      ? 'bg-success/10 border-success/30'
                      : 'bg-error/10 border-error/30'
                  "
                >
                  <div class="flex-1">
                    <span class="font-medium text-black/80">{{
                      ingredient.ingredient_name
                    }}</span>
                    <div class="text-sm text-black/60">
                      Required: {{ ingredient.required_quantity }}
                      {{ ingredient.unit }}
                    </div>
                  </div>
                  <div class="text-right">
                    <div
                      :class="
                        ingredient.is_available ? 'text-success' : 'text-error'
                      "
                      class="font-medium"
                    >
                      {{
                        ingredient.is_available ? 'Available' : 'Insufficient'
                      }}
                    </div>
                    <div class="text-sm text-black/60">
                      Stock: {{ ingredient.available_quantity }}
                      {{ ingredient.unit }}
                    </div>
                  </div>
                </div>
              </div>

              <!-- Availability Warning -->
              <div
                v-if="
                  !allIngredientsAvailable && ingredientRequirements.length > 0
                "
                class="alert alert-warning mt-4"
              >
                <AlertTriangle class="w-5 h-5" />
                <span
                  >Some ingredients are insufficient. Production cannot
                  proceed.</span
                >
              </div>
            </div>

            <!-- Modal Actions -->
            <div class="modal-action border-t border-black/10 pt-4 mt-6">
              <button
                type="submit"
                class="btn btn-sm font-thin border border-none shadow-none text-white bg-primaryColor hover:bg-primaryColor/90"
                :disabled="!canExecuteProduction || loading"
              >
                <Play class="w-4 h-4 mr-2" />
                {{ loading ? 'Starting...' : 'Execute Production' }}
              </button>
              <button
                type="button"
                @click="closeExecutionModal"
                class="btn btn-sm font-thin border border-none shadow-none text-black/70"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
        <form method="dialog" class="modal-backdrop">
          <button @click="closeExecutionModal">close</button>
        </form>
      </dialog>

      <!-- Batch Status Update Modal -->
      <dialog id="batch_modal" class="modal">
        <div
          class="modal-box max-w-md rounded-2xl border border-black/10 bg-white/95 shadow-lg"
        >
          <h3
            class="font-bold text-xl text-primaryColor mb-4 border-b border-black/10 pb-3"
          >
            Update Batch Status
          </h3>

          <form @submit.prevent="saveBatchStatus" class="space-y-4">
            <div class="bg-white border border-black/10 p-4 rounded-xl">
              <div class="form-control">
                <label class="label mb-1">
                  <span
                    class="label-text text-black/70 font-medium text-sm sm:text-base"
                    >Status</span
                  >
                </label>
                <select
                  v-model="batchStatusForm.status"
                  class="select select-sm sm:select-md select-bordered w-full bg-white border-primaryColor/30 text-black/70 focus:border-primaryColor"
                >
                  <option value="In Progress">In Progress</option>

                  <option value="Completed">Completed</option>
                </select>
              </div>

              <div
                v-if="batchStatusForm.status === 'Completed'"
                class="form-control"
              >
                <label class="label mb-1">
                  <span
                    class="label-text text-black/70 font-medium text-sm sm:text-base"
                    >Quantity Produced</span
                  >
                </label>
                <input
                disabled
                  v-model="batchStatusForm.quantity_produced"
                  type="number"
                  :min="0"
                  class="input input-sm sm:input-md input-bordered w-full bg-white border-primaryColor/30 text-black/70 focus:border-primaryColor "
                />
              </div>

              <div class="form-control">
                <label class="label mb-1">
                  <span
                    class="label-text text-black/70 font-medium text-sm sm:text-base"
                    >Notes (Optional)</span
                  >
                </label>
                <textarea
                  v-model="batchStatusForm.notes"
                  class="textarea textarea-sm sm:textarea-md textarea-bordered w-full bg-white border-primaryColor/30 text-black/70 focus:border-primaryColor"
                  placeholder="Status update notes..."
                  rows="3"
                ></textarea>
              </div>
            </div>

            <!-- Modal Actions -->
            <div class="modal-action border-t border-black/10 pt-4 mt-6">
              <button
                type="button"
                @click="closeBatchModal"
                class="btn btn-sm font-thin border border-none shadow-none text-black/70"
              >
                Cancel
              </button>
              <button
                type="submit"
                class="btn btn-sm font-thin border border-none shadow-none text-white bg-primaryColor hover:bg-primaryColor/90"
                :disabled="!batchStatusForm.status || loading"
              >
                {{ loading ? 'Updating...' : 'Update Status' }}
              </button>

            </div>
          </form>
        </div>
        <form method="dialog" class="modal-backdrop">
          <button @click="closeBatchModal">close</button>
        </form>
      </dialog>

      <!-- Batch Details Modal -->
      <dialog id="details_modal" class="modal">
        <div
          class="modal-box max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-black/10 bg-white/95 shadow-lg"
        >
          <h3
            class="font-bold text-xl text-primaryColor mb-4 border-b border-black/10 pb-3"
          >
            Batch Details
          </h3>

          <div v-if="selectedBatchForDetails" class="space-y-6">
            <!-- Basic Information -->
            <div class="bg-white border border-black/10 p-4 rounded-xl">
              <h4 class="font-semibold text-lg text-black/80 mb-3">
                Basic Information
              </h4>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="text-sm text-black/60">Product Name</label>
                  <p class="font-medium text-black/80">
                    {{ selectedBatchForDetails.menu_item_name }}
                  </p>
                </div>
                <div>
                  <label class="text-sm text-black/60">Batch Number</label>
                  <p class="font-medium text-black/80">
                    {{ selectedBatchForDetails.batch_number }}
                  </p>
                </div>
                <div>
                  <label class="text-sm text-black/60">Recipe</label>
                  <p class="font-medium text-black/80">
                    {{ selectedBatchForDetails.recipe_name }}
                  </p>
                </div>
                <div>
                  <label class="text-sm text-black/60">Status</label>
                  <span :class="getStatusColor(selectedBatchForDetails.status)">
                    {{ selectedBatchForDetails.status }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Production Details -->
            <div class="bg-white border border-black/10 p-4 rounded-xl">
              <h4 class="font-semibold text-lg text-black/80 mb-3">
                Production Details
              </h4>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="text-sm text-black/60">Batch Size</label>
                  <p class="font-medium text-black/80">
                    {{ selectedBatchForDetails.batch_size }}
                    {{ selectedBatchForDetails.unit || 'servings' }}
                  </p>
                </div>
                <div v-if="selectedBatchForDetails.quantity_produced">
                  <label class="text-sm text-black/60">Quantity Produced</label>
                  <p class="font-medium text-black/80">
                    {{ selectedBatchForDetails.quantity_produced }}
                    {{ selectedBatchForDetails.unit || 'servings' }}
                  </p>
                </div>
                <div>
                  <label class="text-sm text-black/60">Assigned To</label>
                  <p class="font-medium text-black/80">
                    {{
                      selectedBatchForDetails.assigned_to_name || 'Not Assigned'
                    }}
                  </p>
                </div>
                <div v-if="selectedBatchForDetails.production_date">
                  <label class="text-sm text-black/60">Production Date</label>
                  <p class="font-medium text-black/80">
                    {{ formatDate(selectedBatchForDetails.production_date) }}
                  </p>
                </div>
              </div>
            </div>

            <!-- Progress Information -->
            <div
              v-if="selectedBatchForDetails.type !== 'ready'"
              class="bg-white border border-black/10 p-4 rounded-xl"
            >
              <h4 class="font-semibold text-lg text-black/80 mb-3">
                Progress Information
              </h4>
              <div class="space-y-4">
                <div>
                  <div class="flex justify-between text-sm text-black/60 mb-2">
                    <span>Progress</span>
                    <span>{{ selectedBatchForDetails.progress }}%</span>
                  </div>
                  <div class="w-full bg-gray-200 rounded-full h-2">
                    <div
                      class="bg-primaryColor h-2 rounded-full transition-all duration-300"
                      :style="{ width: selectedBatchForDetails.progress + '%' }"
                    ></div>
                  </div>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div v-if="selectedBatchForDetails.start_time">
                    <label class="text-sm text-black/60">Start Time</label>
                    <p class="font-medium text-black/80">
                      {{
                        selectedBatchForDetails.formatted_start_time ||
                        formatDateTime(selectedBatchForDetails.start_time)
                      }}
                    </p>
                  </div>
                  <div v-if="selectedBatchForDetails.end_time">
                    <label class="text-sm text-black/60">End Time</label>
                    <p class="font-medium text-black/80">
                      {{
                        selectedBatchForDetails.formatted_end_time ||
                        formatDateTime(selectedBatchForDetails.end_time)
                      }}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Notes -->
            <div
              v-if="selectedBatchForDetails.notes"
              class="bg-white border border-black/10 p-4 rounded-xl"
            >
              <h4 class="font-semibold text-lg text-black/80 mb-3">Notes</h4>
              <p class="text-black/70">{{ selectedBatchForDetails.notes }}</p>
            </div>
          </div>

          <!-- Modal Actions -->
          <div class="modal-action border-t border-black/10 pt-4 mt-6">
            <button
              type="button"
              @click="closeDetailsModal"
              class="btn btn-sm font-thin border border-none shadow-none text-white bg-primaryColor hover:bg-primaryColor/90"
            >
              Close
            </button>
          </div>
        </div>
        <form method="dialog" class="modal-backdrop">
          <button @click="closeDetailsModal">close</button>
        </form>
      </dialog>

      <!-- Toast Notification - Consistent with SampleProductionPlanning.vue -->
      <transition
        enter-active-class="transform transition ease-out duration-300"
        enter-from-class="translate-x-full opacity-0"
        enter-to-class="translate-x-0 opacity-100"
        leave-active-class="transform transition ease-in duration-300"
        leave-from-class="translate-x-0 opacity-100"
        leave-to-class="translate-x-full opacity-0"
      >
        <div class="toast toast-end sm:toast-end z-[100000]" v-if="toast.show">
          <div
            v-if="toast.type === 'success'"
            class="alert alert-success shadow-lg max-w-xs sm:max-w-sm"
          >
            <span class="text-xs sm:text-sm">{{ toast.message }}</span>
          </div>
          <div
            v-else-if="toast.type === 'error'"
            class="alert alert-error shadow-lg max-w-xs sm:max-w-sm"
          >
            <span class="text-xs sm:text-sm">{{ toast.message }}</span>
          </div>
          <div
            v-else-if="toast.type === 'warning'"
            class="alert alert-warning shadow-lg max-w-xs sm:max-w-sm"
          >
            <span class="text-xs sm:text-sm">{{ toast.message }}</span>
          </div>
          <div
            v-else-if="toast.type === 'info'"
            class="alert alert-info shadow-lg max-w-xs sm:max-w-sm"
          >
            <span class="text-xs sm:text-sm">{{ toast.message }}</span>
          </div>
        </div>
      </transition>

      <!-- Production Transaction Modal -->
      <ProductionTransactionModal
        :show="showTransactionModal"
        @close="closeTransactionModal"
      />
    </div>
  </div>
</template>

<style scoped>
  .text-shadow-xs {
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  }
</style>
