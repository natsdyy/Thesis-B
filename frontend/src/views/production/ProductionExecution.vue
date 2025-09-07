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
  const selectedItem = ref(null);
  const selectedBatch = ref(null);
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
      readyForProduction.value = response.filter(
        (item) => item.available_quantity === 0
      );
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

  // Navigation methods
  const viewProductionTransactions = () => {
    // Navigate to SCM Main Inventory with production transactions filter
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
  <div class="production-execution-container">
    <!-- Header -->
    <div
      class="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6"
    >
      <div>
        <h1 class="text-2xl font-bold text-primaryColor mb-2">
          Production Execution
        </h1>
        <p class="text-black/60">
          Execute production batches and track progress
        </p>
      </div>

      <!-- Stats Overview -->
      <div class="grid grid-cols-3 gap-4 mt-4 lg:mt-0">
        <div
          class="stat-card bg-white rounded-lg border border-black/10 p-4 text-center"
        >
          <div class="stat-number text-2xl font-bold text-primaryColor">
            {{ readyForProduction.length }}
          </div>
          <div class="stat-label text-sm text-black/60">
            Ready for Production
          </div>
        </div>
        <div
          class="stat-card bg-white rounded-lg border border-black/10 p-4 text-center"
        >
          <div class="stat-number text-2xl font-bold text-warning">
            {{ activeBatches.length }}
          </div>
          <div class="stat-label text-sm text-black/60">In Progress</div>
        </div>
        <div
          class="stat-card bg-white rounded-lg border border-black/10 p-4 text-center"
        >
          <div class="stat-number text-2xl font-bold text-success">
            {{ productionHistory.length }}
          </div>
          <div class="stat-label text-sm text-black/60">Completed Today</div>
        </div>
      </div>
    </div>

    <!-- Tab Navigation -->
    <div class="tabs tabs-boxed bg-white border border-black/10 mb-6">
      <a
        class="tab"
        :class="{ 'tab-active': activeTab === 'ready' }"
        @click="activeTab = 'ready'"
      >
        <Package class="w-4 h-4 mr-2" />
        Ready for Production
      </a>
      <a
        class="tab"
        :class="{ 'tab-active': activeTab === 'batches' }"
        @click="activeTab = 'batches'"
      >
        <Activity class="w-4 h-4 mr-2" />
        Active Batches
      </a>
      <a
        class="tab"
        :class="{ 'tab-active': activeTab === 'history' }"
        @click="activeTab = 'history'"
      >
        <Clock class="w-4 h-4 mr-2" />
        Production History
      </a>
    </div>

    <!-- Ready for Production Tab -->
    <div v-if="activeTab === 'ready'" class="ready-production-section">
      <!-- Controls -->
      <div class="flex flex-col lg:flex-row gap-4 mb-6">
        <!-- Search -->
        <div class="relative flex-1">
          <Search
            class="absolute left-3 top-1/2 transform -translate-y-1/2 text-primaryColor w-4 h-4"
          />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search menu items, recipes..."
            class="input input-sm sm:input-md input-bordered bg-white border-primaryColor/30 text-black/70 pl-10 w-full shadow-none text-sm sm:text-base"
            :disabled="loading"
          />
        </div>

        <!-- Filters -->
        <select
          v-model="categoryFilter"
          class="select select-sm sm:select-md select-bordered bg-white border-primaryColor/30 text-black/70 shadow-none"
          :disabled="loading"
        >
          <option value="">All Categories</option>
          <option
            v-for="category in availableCategories"
            :key="category"
            :value="category"
          >
            {{ category }}
          </option>
        </select>

        <select
          v-model="statusFilter"
          class="select select-sm sm:select-md select-bordered bg-white border-primaryColor/30 text-black/70 shadow-none"
          :disabled="loading"
        >
          <option value="">All Status</option>
          <option value="Approved">Approved</option>
          <option value="Under Review">Under Review</option>
        </select>

        <!-- Action Buttons -->
        <button
          class="btn btn-outline btn-xs sm:btn-sm text-primaryColor hover:bg-primaryColor/10 font-thin hover:border-none hover:shadow-none"
          @click="clearFilters"
          :disabled="loading"
        >
          <X class="w-4 h-4 mr-1" />
          Clear
        </button>

        <button
          class="btn btn-outline btn-xs sm:btn-sm text-primaryColor hover:bg-primaryColor/10 font-thin hover:border-none hover:shadow-none"
          @click="refreshData"
          :disabled="loading"
        >
          <RefreshCcw class="w-4 h-4 mr-1" />
          Refresh
        </button>

        <button
          class="btn btn-outline btn-xs sm:btn-sm text-primaryColor hover:bg-primaryColor/10 font-thin hover:border-none hover:shadow-none"
          @click="viewProductionTransactions"
        >
          <BarChart3 class="w-4 h-4 mr-1" />
          View Transactions
        </button>
      </div>

      <!-- Loading State -->
      <div
        v-if="loading"
        class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        <div
          v-for="n in 6"
          :key="`skeleton-${n}`"
          class="card bg-white border border-black/10 animate-pulse"
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

      <!-- Empty State -->
      <div
        v-else-if="!loading && paginatedReadyItems.length === 0"
        class="text-center py-12"
      >
        <Package class="w-16 h-16 mx-auto text-black/30 mb-4" />
        <h3 class="text-lg font-semibold text-black/70 mb-2">
          {{
            filteredReadyItems.length === 0
              ? 'No Items Ready for Production'
              : 'No Results Found'
          }}
        </h3>
        <p class="text-black/50 mb-4">
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

      <!-- Items Grid -->
      <div
        v-else
        class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6"
      >
        <div
          v-for="item in paginatedReadyItems"
          :key="item.id"
          class="card bg-white border border-black/10 hover:shadow-lg transition-all duration-200"
        >
          <div class="card-body p-6">
            <div class="flex justify-between items-start mb-4">
              <div class="flex-1">
                <h3 class="font-semibold text-lg text-black/80 mb-1">
                  {{ item.menu_item_name }}
                </h3>
                <p class="text-sm text-black/60">{{ item.recipe_name }}</p>
                <p class="text-xs text-black/50 mt-1">{{ item.item_code }}</p>
              </div>
              <div class="flex flex-col items-end gap-2">
                <span :class="getStatusColor(item.quality_status)">
                  {{ item.quality_status }}
                </span>
                <span class="text-xs text-black/50"
                  >Stock: {{ item.available_quantity }}</span
                >
              </div>
            </div>

            <div
              class="flex justify-between items-center text-sm text-black/60 mb-4"
            >
              <span
                >Batch Size: {{ item.recipe_batch_size || 'N/A' }}
                {{ item.recipe_batch_unit || 'servings' }}</span
              >
              <span>₱{{ item.selling_price || 0 }}</span>
            </div>

            <div class="flex gap-2">
              <button
                @click="startProduction(item)"
                class="btn btn-sm font-thin border border-none shadow-none text-white flex-1 bg-primaryColor hover:bg-primaryColor/90"
                :disabled="!isUserAuthenticated || loading"
              >
                <Play class="w-4 h-4 mr-1" />
                Start Production
              </button>
              <button
                class="btn btn-sm btn-outline text-primaryColor hover:bg-primaryColor/10 font-thin border border-none shadow-none"
              >
                <Eye class="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Pagination -->
      <div
        class="flex flex-col sm:flex-row justify-between items-center mt-6"
        v-if="!loading && totalPages > 1"
      >
        <div class="text-sm text-black/60 mb-2 sm:mb-0">
          Showing {{ (currentPage - 1) * itemsPerPage + 1 }} to
          {{ Math.min(currentPage * itemsPerPage, totalItems) }}
          of {{ totalItems }} items
        </div>

        <div class="join space-x-1">
          <button
            class="join-item btn font-thin !bg-gray-200 text-black/50 btn-sm border border-none hover:bg-gray-300"
            :disabled="currentPage <= 1"
            @click="prevPage"
          >
            « Prev
          </button>

          <!-- First page -->
          <button
            v-if="totalPages > 1"
            class="join-item btn font-thin !bg-gray-200 text-black/50 border border-none btn-sm shadow-none"
            :class="{
              'btn-active': currentPage === 1,
              '!bg-primaryColor text-white': currentPage === 1,
            }"
            @click="goToPage(1)"
          >
            1
          </button>

          <!-- Ellipsis before current page group -->
          <button
            v-if="currentPage > 4"
            class="join-item btn font-thin btn-sm !bg-gray-200 text-black/50 border border-none"
            disabled
          >
            ...
          </button>

          <!-- Current page group -->
          <button
            v-for="page in getPageRange()"
            :key="page"
            class="join-item btn font-thin !bg-gray-200 text-black/50 border border-none btn-sm shadow-none"
            :class="{
              'btn-active': currentPage === page,
              '!bg-primaryColor text-white': currentPage === page,
            }"
            @click="goToPage(page)"
          >
            {{ page }}
          </button>

          <!-- Ellipsis after current page group -->
          <button
            v-if="currentPage < totalPages - 3"
            class="join-item btn font-thin btn-sm !bg-gray-200 text-black/50 border border-none"
            disabled
          >
            ...
          </button>

          <!-- Last page -->
          <button
            v-if="totalPages > 1 && currentPage < totalPages"
            class="join-item btn font-thin !bg-gray-200 text-black/50 border border-none btn-sm shadow-none"
            :class="{
              'btn-active': currentPage === totalPages,
              '!bg-primaryColor text-white': currentPage === totalPages,
            }"
            @click="goToPage(totalPages)"
          >
            {{ totalPages }}
          </button>

          <button
            class="join-item btn font-thin btn-sm !bg-gray-200 text-black/50 border border-none"
            :disabled="currentPage >= totalPages"
            @click="nextPage"
          >
            Next »
          </button>
        </div>
      </div>
    </div>

    <!-- Active Batches Tab -->
    <div v-if="activeTab === 'batches'" class="active-batches-section">
      <div v-if="activeBatches.length === 0" class="text-center py-12">
        <Activity class="w-16 h-16 mx-auto text-black/30 mb-4" />
        <h3 class="text-lg font-semibold text-black/70 mb-2">
          No Active Batches
        </h3>
        <p class="text-black/50">
          Start production to see active batches here.
        </p>
      </div>

      <div v-else class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div
          v-for="batch in activeBatches"
          :key="batch.id"
          class="card bg-white border border-black/10"
        >
          <div class="card-body p-6">
            <div class="flex justify-between items-start mb-4">
              <div>
                <h3 class="font-semibold text-lg text-black/80">
                  {{ batch.menu_item_name }}
                </h3>
                <p class="text-sm text-black/60">
                  Batch #{{ batch.batch_number }}
                </p>
                <p class="text-xs text-black/50">{{ batch.recipe_name }}</p>
              </div>
              <span :class="getStatusColor(batch.status)">{{
                batch.status
              }}</span>
            </div>

            <div class="mb-4">
              <div class="flex justify-between text-sm text-black/60 mb-2">
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

            <div class="grid grid-cols-2 gap-4 text-sm text-black/60 mb-4">
              <div>
                <span class="block">Batch Size:</span>
                <span class="font-medium text-black/80">{{
                  batch.batch_size
                }}</span>
              </div>
              <div>
                <span class="block">Assigned To:</span>
                <span class="font-medium text-black/80">{{
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
              >
                <Eye class="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Production History Tab -->
    <div v-if="activeTab === 'history'" class="production-history-section">
      <div v-if="productionHistory.length === 0" class="text-center py-12">
        <Clock class="w-16 h-16 mx-auto text-black/30 mb-4" />
        <h3 class="text-lg font-semibold text-black/70 mb-2">
          No Production History
        </h3>
        <p class="text-black/50">
          Complete production batches to see history here.
        </p>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="table table-zebra w-full">
          <thead>
            <tr class="text-black/70">
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
                  <div class="font-medium">{{ history.menu_item_name }}</div>
                  <div class="text-sm text-black/60">
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
                  class="btn btn-xs btn-outline text-primaryColor hover:bg-primaryColor/10"
                >
                  <Eye class="w-3 h-3" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
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
                  {{ staff.name }}
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
                    {{ ingredient.is_available ? 'Available' : 'Insufficient' }}
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
                <option value="Quality Check">Quality Check</option>
                <option value="Completed">Completed</option>
                <option value="Failed">Failed</option>
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
                v-model="batchStatusForm.quantity_produced"
                type="number"
                :min="0"
                class="input input-sm sm:input-md input-bordered w-full bg-white border-primaryColor/30 text-black/70 focus:border-primaryColor"
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
              type="submit"
              class="btn btn-sm font-thin border border-none shadow-none text-white"
              :disabled="!batchStatusForm.status || loading"
            >
              {{ loading ? 'Updating...' : 'Update Status' }}
            </button>
            <button
              type="button"
              @click="closeBatchModal"
              class="btn btn-sm font-thin border border-none shadow-none text-black/70"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button @click="closeBatchModal">close</button>
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
  </div>
</template>

<style scoped></style>
