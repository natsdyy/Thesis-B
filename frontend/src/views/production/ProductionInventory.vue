<script setup>
  import { ref, computed, onMounted, watch } from 'vue';
  import {
    Package,
    Plus,
    Search,
    Filter,
    RefreshCcw,
    Eye,
    Edit,
    Trash2,
    AlertTriangle,
    CheckCircle,
    TrendingUp,
    BarChart3,
    PhilippinePeso,
    Activity,
    AlertCircle,
    Target,
    Clock,
    Star,
    X,
    ChevronDown,
    ChevronUp,
    Truck,
  } from 'lucide-vue-next';
  import { useProductionStore } from '../../stores/productionStore.js';
  import { useAuthStore } from '../../stores/authStore.js';
  import MenuItemApprovalChart from '../../components/production/MenuItemApprovalChart.vue';
  import SampleProductionTrendsChart from '../../components/production/SampleProductionTrendsChart.vue';
  import ProductionMetricsChart from '../../components/production/ProductionMetricsChart.vue';
  import InventoryTrendsChart from '../../components/production/InventoryTrendsChart.vue';

  const productionStore = useProductionStore();
  const authStore = useAuthStore();

  // Reactive state
  const activeTab = ref('inventory');
  const searchQuery = ref('');
  const categoryFilter = ref('');
  const statusFilter = ref('');
  const showUpdateModal = ref(false);
  const showDetailsModal = ref(false);
  const showDistributionModal = ref(false);
  const selectedItem = ref(null);
  const currentPage = ref(1);
  const itemsPerPage = ref(12);
  const expandedItems = ref(new Set());

  // Form data for stock/pricing updates
  const updateForm = ref({
    available_quantity: 0,
    selling_price: 0,
    notes: '',
  });

  // Form data for distribution
  const distributionForm = ref({
    quantity: 0,
    branch_id: '',
    transfer_price: 0,
    notes: '',
  });

  // Branch data
  const branches = ref([]);

  // Distribution data
  const distributions = ref([]);
  const distributionLoading = ref(false);

  // Access store data
  const loading = computed(() => productionStore.loading);
  const error = computed(() => productionStore.error);
  const productionInventory = computed(
    () => productionStore.productionInventory
  );
  const productionInventoryStats = computed(
    () => productionStore.productionInventoryStats
  );

  // Computed properties
  const distributionTotal = computed(() => {
    return (
      (distributionForm.value.quantity || 0) *
      (distributionForm.value.transfer_price || 0)
    );
  });

  const filteredInventory = computed(() => {
    let filtered = productionInventory.value;

    if (searchQuery.value) {
      const query = searchQuery.value.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.item_name.toLowerCase().includes(query) ||
          item.item_code.toLowerCase().includes(query) ||
          item.category?.toLowerCase().includes(query) ||
          item.recipe_name?.toLowerCase().includes(query)
      );
    }

    if (categoryFilter.value) {
      filtered = filtered.filter(
        (item) => item.category === categoryFilter.value
      );
    }

    if (statusFilter.value) {
      if (statusFilter.value === 'low_stock') {
        filtered = filtered.filter(
          (item) => item.available_quantity <= item.reorder_point
        );
      } else if (statusFilter.value === 'featured') {
        filtered = filtered.filter((item) => item.is_featured);
      }
    }

    return filtered.sort((a, b) => a.item_name.localeCompare(b.item_name));
  });

  const paginatedInventory = computed(() => {
    const start = (currentPage.value - 1) * itemsPerPage.value;
    return filteredInventory.value.slice(start, start + itemsPerPage.value);
  });

  const totalPages = computed(() => {
    return Math.ceil(filteredInventory.value.length / itemsPerPage.value);
  });

  // Get unique categories for filter
  const availableCategories = computed(() => {
    const categories = new Set();
    productionInventory.value.forEach((item) => {
      if (item.category) categories.add(item.category);
    });
    return Array.from(categories).sort();
  });

  // Helper functions
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStockLevelBadgeClass = (item) => {
    const current = item.available_quantity || 0;
    const reorderPoint = item.reorder_point || 0;

    if (current <= reorderPoint) {
      return 'badge-sm border-none font-medium bg-error/20 text-error';
    } else if (current <= reorderPoint * 1.5) {
      return 'badge-sm border-none font-medium bg-warning/20 text-warning';
    }
    return 'badge-sm border-none font-medium bg-success/20 text-success';
  };

  const getStockLevelText = (item) => {
    const current = item.available_quantity || 0;
    const reorderPoint = item.reorder_point || 0;

    if (current <= reorderPoint) return 'Low Stock';
    if (current <= reorderPoint * 1.5) return 'Reorder Soon';
    return 'Good Stock';
  };

  const getProfitMarginColor = (margin) => {
    if (margin >= 50) return 'text-success font-bold';
    if (margin >= 30) return 'text-warning font-semibold';
    return 'text-error font-semibold';
  };

  const calculateProfitMargin = (sellingPrice, costPrice) => {
    if (!costPrice || costPrice === 0) return 0;
    return Math.round(((sellingPrice - costPrice) / costPrice) * 100);
  };

  const getProductionCapacity = (item) => {
    // Mock production capacity calculation
    const capacity = item.production_capacity || {};
    return {
      max_batches: capacity.max_batches || 0,
      limiting_factor: capacity.limiting_factor || 'Unknown',
      can_produce: capacity.can_produce || false,
    };
  };

  const resetForm = () => {
    updateForm.value = {
      available_quantity: 0,
      selling_price: 0,
      notes: '',
    };
  };

  // Methods
  const fetchData = async () => {
    try {
      await Promise.all([
        productionStore.fetchProductionInventory(),
        productionStore.fetchProductionInventoryStats(),
        fetchBranches(),
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const fetchBranches = async () => {
    try {
      const branchData = await productionStore.fetchBranches();
      branches.value = branchData;
    } catch (error) {
      console.error('Error fetching branches:', error);
    }
  };

  const fetchDistributions = async () => {
    try {
      distributionLoading.value = true;
      const distributionData = await productionStore.fetchAllDistributions();
      distributions.value = distributionData;
    } catch (error) {
      console.error('Error fetching distributions:', error);
    } finally {
      distributionLoading.value = false;
    }
  };

  const openUpdateModal = (item, type) => {
    selectedItem.value = item;
    if (type === 'stock') {
      updateForm.value.available_quantity = item.available_quantity || 0;
      updateForm.value.selling_price = item.selling_price || 0;
    } else if (type === 'pricing') {
      updateForm.value.available_quantity = item.available_quantity || 0;
      updateForm.value.selling_price = item.selling_price || 0;
    }
    showUpdateModal.value = true;
  };

  const closeUpdateModal = () => {
    showUpdateModal.value = false;
    selectedItem.value = null;
    resetForm();
  };

  const openDetailsModal = (item) => {
    selectedItem.value = item;
    showDetailsModal.value = true;
  };

  const closeDetailsModal = () => {
    showDetailsModal.value = false;
    selectedItem.value = null;
  };

  const openDistributionModal = (item) => {
    selectedItem.value = item;
    distributionForm.value = {
      quantity: 0,
      branch_id: '',
      transfer_price: item.selling_price || 0,
      notes: '',
    };
    showDistributionModal.value = true;
  };

  const closeDistributionModal = () => {
    showDistributionModal.value = false;
    selectedItem.value = null;
    distributionForm.value = {
      quantity: 0,
      branch_id: '',
      transfer_price: 0,
      notes: '',
    };
  };

  const updateStock = async () => {
    try {
      await productionStore.updateInventoryStock(
        selectedItem.value.id,
        updateForm.value.available_quantity,
        updateForm.value.notes
      );
      closeUpdateModal();
      showToast('success', 'Stock updated successfully');
    } catch (error) {
      showToast('error', error.message || 'Failed to update stock');
    }
  };

  const updatePricing = async () => {
    try {
      await productionStore.updateInventoryPricing(
        selectedItem.value.id,
        updateForm.value.selling_price
      );
      closeUpdateModal();
      showToast('success', 'Pricing updated successfully');
    } catch (error) {
      showToast('error', error.message || 'Failed to update pricing');
    }
  };

  const recordDistribution = async () => {
    try {
      if (
        !distributionForm.value.quantity ||
        !distributionForm.value.branch_id
      ) {
        showToast('error', 'Please fill in all required fields');
        return;
      }

      if (
        distributionForm.value.quantity > selectedItem.value.available_quantity
      ) {
        showToast('error', 'Insufficient stock for distribution');
        return;
      }

      await productionStore.recordDistribution(
        selectedItem.value.id,
        distributionForm.value
      );
      closeDistributionModal();
      showToast('success', 'Distribution recorded successfully');

      // Refresh distributions if we're on the distributions tab
      if (activeTab.value === 'distributions') {
        await fetchDistributions();
      }
    } catch (error) {
      showToast('error', error.message || 'Failed to record distribution');
    }
  };

  const updateInitialStock = async (item) => {
    try {
      // Try the new function first, fallback to manual update if not available
      if (typeof productionStore.updateInitialStockFromRecipe === 'function') {
        await productionStore.updateInitialStockFromRecipe(item.id);
        showToast('success', `Initial stock set from recipe batch size`);
      } else {
        // Fallback: Set stock to recipe batch size manually
        const batchSize = item.recipe_batch_size || 100; // Default to 100 if not available
        await productionStore.updateInventoryStock(
          item.id,
          batchSize,
          'Initial stock from recipe'
        );
        showToast(
          'success',
          `Initial stock set to ${batchSize} ${item.unit_of_measure}`
        );
      }
    } catch (error) {
      showToast('error', error.message || 'Failed to update initial stock');
    }
  };

  const showToast = (type, message) => {
    // Simple toast implementation
    console.log(`${type}: ${message}`);
  };

  // Lifecycle
  onMounted(() => {
    fetchData();
  });

  // Watch for data changes
  watch([searchQuery, categoryFilter, statusFilter], () => {
    currentPage.value = 1;
  });

  // Watch for tab changes to fetch distributions
  watch(activeTab, (newTab) => {
    if (newTab === 'distributions' && distributions.value.length === 0) {
      fetchDistributions();
    }
  });
</script>

<template>
  <div class="container mx-auto p-2 sm:p-4 lg:p-6 max-w-6xl">
    <!-- Header -->
    <div class="text-center mb-4 sm:mb-6 lg:mb-8">
      <h1
        class="text-2xl sm:text-3xl lg:text-4xl font-bold text-primaryColor mb-2 text-shadow-xs"
      >
        Production Inventory
      </h1>
      <p class="text-sm sm:text-base text-black/50 px-2">
        Manage approved menu items ready for production and track inventory
        levels.
      </p>
    </div>

    <!-- Stats -->
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
          Total Items
        </div>
        <div
          class="stat-value text-primaryColor text-lg sm:text-xl lg:text-2xl xl:text-3xl"
        >
          {{ productionInventoryStats.total_items || 0 }}
        </div>
        <div class="stat-desc text-black/50 !text-xs sm:text-sm">
          Menu items in inventory
        </div>
      </div>

      <div
        class="stat sm:!border sm:!border-l-0 sm:!border-r-2 sm:!border-t-0 sm:!border-b-0 sm:!border-black/10 sm:border-dashed hover:bg-secondaryColor/10"
      >
        <div class="stat-figure">
          <Target class="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-success" />
        </div>
        <div class="stat-title text-black/50 text-xs sm:text-sm">
          Total Stock
        </div>
        <div
          class="stat-value text-success text-lg sm:text-xl lg:text-2xl xl:text-3xl"
        >
          {{ productionInventoryStats.total_quantity || 0 }}
        </div>
        <div class="stat-desc text-black/50 !text-xs sm:text-sm">
          Units available
        </div>
      </div>

      <div
        class="stat sm:!border sm:!border-l-0 sm:!border-r-2 sm:!border-t-0 sm:!border-b-0 sm:!border-black/10 sm:border-dashed hover:bg-secondaryColor/10"
      >
        <div class="stat-figure">
          <AlertTriangle
            class="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-warning"
          />
        </div>
        <div class="stat-title text-black/50 !text-xs sm:text-sm">
          Low Stock
        </div>
        <div
          class="stat-value text-warning text-lg sm:text-xl lg:text-2xl xl:text-3xl"
        >
          {{ productionInventoryStats.low_stock_items || 0 }}
        </div>
        <div class="stat-desc text-black/50 !text-xs sm:text-sm">
          Items below reorder point
        </div>
      </div>

      <div
        class="stat sm:!border sm:!border-l-0 sm:!border-r-2 sm:!border-t-0 sm:!border-b-0 sm:!border-black/10 sm:border-dashed hover:bg-secondaryColor/10"
      >
        <div class="stat-figure">
          <TrendingUp class="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-info" />
        </div>
        <div class="stat-title text-black/50 !text-xs sm:text-sm">
          Avg. Margin
        </div>
        <div
          class="stat-value text-info text-lg sm:text-xl lg:text-2xl xl:text-3xl"
        >
          {{ Number(productionInventoryStats.average_margin || 0).toFixed(0) }}%
        </div>
        <div class="stat-desc text-black/50 !text-xs sm:text-sm">
          Profit margin
        </div>
      </div>

      <div
        class="stat sm:!border sm:!border-l-0 sm:!border-r-2 sm:!border-t-0 sm:!border-b-0 sm:!border-black/10 sm:border-dashed hover:bg-secondaryColor/10"
      >
        <div class="stat-figure">
          <Truck class="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-warning" />
        </div>
        <div class="stat-title text-black/50 !text-xs sm:text-sm">
          Distributed
        </div>
        <div
          class="stat-value text-warning text-lg sm:text-xl lg:text-2xl xl:text-3xl"
        >
          {{ productionInventoryStats.total_distributed_all_time || 0 }}
        </div>
        <div class="stat-desc text-black/50 !text-xs sm:text-sm">
          Units distributed to branches
        </div>
      </div>
    </div>

    <!-- Action Buttons -->
    <div
      class="flex flex-wrap gap-2 mb-4 sm:mb-6 justify-center sm:justify-start"
    >
      <button
        @click="fetchData"
        class="btn btn-outline btn-sm text-primaryColor hover:bg-primaryColor/10 font-thin hover:border-none hover:shadow-none"
        :disabled="loading"
      >
        <RefreshCcw class="w-4 h-4 mr-1" />
        Refresh
      </button>
    </div>

    <!-- Tabs -->
    <div class="tabs tabs-boxed mb-4 sm:mb-6 justify-center sm:justify-start">
      <button
        @click="activeTab = 'inventory'"
        class="tab"
        :class="{ 'tab-active': activeTab === 'inventory' }"
      >
        <Package class="w-4 h-4 mr-1" />
        Inventory
      </button>
      <button
        @click="activeTab = 'analytics'"
        class="tab"
        :class="{ 'tab-active': activeTab === 'analytics' }"
      >
        <BarChart3 class="w-4 h-4 mr-1" />
        Analytics
      </button>
      <button
        @click="activeTab = 'distributions'"
        class="tab"
        :class="{ 'tab-active': activeTab === 'distributions' }"
      >
        <Truck class="w-4 h-4 mr-1" />
        Distributions
      </button>
      <button
        @click="activeTab = 'alerts'"
        class="tab"
        :class="{ 'tab-active': activeTab === 'alerts' }"
      >
        <AlertCircle class="w-4 h-4 mr-1" />
        Alerts
      </button>
    </div>

    <!-- Tab Content -->
    <div
      class="card bg-accentColor shadow-xl mb-4 sm:mb-6 border border-black/10"
    >
      <div class="card-body p-3 sm:p-4 lg:p-6">
        <!-- Inventory Tab -->
        <div v-if="activeTab === 'inventory'" class="space-y-6">
          <div
            class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6"
          >
            <div>
              <h2
                class="card-title text-primaryColor text-lg sm:text-xl lg:text-2xl mb-2"
              >
                Production Inventory
              </h2>
              <p class="text-sm text-gray-600">
                View and manage your approved menu items ready for production.
              </p>
            </div>
            <div class="flex gap-2">
              <button
                @click="fetchData"
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
                  placeholder="Search inventory items..."
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
                <option value="low_stock">Low Stock</option>
                <option value="featured">Featured</option>
              </select>
            </div>
          </div>

          <!-- Inventory Grid -->
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div
              v-for="item in paginatedInventory"
              :key="item.id"
              class="card bg-white border border-gray-200 hover:shadow-xl duration-300 cursor-pointer"
              @click="openDetailsModal(item)"
            >
              <div class="card-body p-6">
                <div class="flex items-start justify-between mb-4">
                  <div class="flex-1">
                    <h3
                      class="card-title text-lg font-bold text-primaryColor mb-2"
                    >
                      {{ item.item_name }}
                    </h3>
                    <p class="text-sm text-gray-600 mb-2">
                      {{ item.recipe_name }}
                    </p>
                    <div class="flex items-center gap-2 mb-3">
                      <span
                        class="badge"
                        :class="getStockLevelBadgeClass(item)"
                      >
                        {{ getStockLevelText(item) }}
                      </span>
                      <span class="badge badge-sm bg-gray-100 text-gray-600">
                        {{ item.category }}
                      </span>
                      <span
                        v-if="item.is_featured"
                        class="badge badge-sm bg-yellow-100 text-yellow-800"
                      >
                        <Star class="w-3 h-3 mr-1" />
                        Featured
                      </span>
                    </div>
                  </div>
                  <div class="text-right">
                    <div class="text-lg font-bold text-primaryColor">
                      {{ item.available_quantity }}
                    </div>
                    <div class="text-xs text-gray-500">
                      {{ item.unit_of_measure }}
                    </div>
                    <div class="text-xs text-gray-500 mt-1">
                      Reorder: {{ item.reorder_point || 0 }}
                    </div>
                  </div>
                </div>

                <div class="flex items-center justify-between mb-4">
                  <div class="text-sm text-gray-600">
                    <div class="font-medium">
                      {{ formatCurrency(item.selling_price) }}
                    </div>
                    <div
                      :class="
                        getProfitMarginColor(
                          calculateProfitMargin(
                            item.selling_price,
                            item.unit_cost
                          )
                        )
                      "
                    >
                      {{
                        calculateProfitMargin(
                          item.selling_price,
                          item.unit_cost
                        )
                      }}% margin
                    </div>
                  </div>
                  <div class="text-right text-sm text-gray-600">
                    <div>Last produced:</div>
                    <div class="font-medium">
                      {{
                        item.last_produced_date
                          ? formatDate(item.last_produced_date)
                          : 'Never'
                      }}
                    </div>
                  </div>
                </div>

                <!-- Production Capacity -->
                <div class="bg-blue-50 p-3 rounded-lg mb-4">
                  <div class="flex items-center justify-between text-sm">
                    <span class="text-gray-600">Production Capacity:</span>
                    <span
                      class="font-medium"
                      :class="
                        getProductionCapacity(item).can_produce
                          ? 'text-success'
                          : 'text-error'
                      "
                    >
                      {{
                        getProductionCapacity(item).can_produce
                          ? 'Ready'
                          : 'Limited'
                      }}
                    </span>
                  </div>
                  <div class="text-xs text-gray-500 mt-1">
                    {{ getProductionCapacity(item).limiting_factor }}
                  </div>
                </div>

                <div class="flex gap-2">
                  <button
                    @click.stop="openDistributionModal(item)"
                    class="btn btn-ghost btn-xs text-info hover:bg-info/10 flex-1"
                    :disabled="item.available_quantity <= 0"
                  >
                    <Truck class="w-4 h-4 mr-1" />
                    Distribute
                  </button>
                  <button
                    v-if="item.available_quantity === 0"
                    @click.stop="updateInitialStock(item)"
                    class="btn btn-ghost btn-xs text-warning hover:bg-warning/10 flex-1"
                    :disabled="loading"
                  >
                    <RefreshCcw
                      class="w-4 h-4 mr-1"
                      :class="{ 'animate-spin': loading }"
                    />
                    Set Initial Stock
                  </button>
                  <button
                    v-else
                    @click.stop="openUpdateModal(item, 'stock')"
                    class="btn btn-ghost btn-xs text-primaryColor hover:bg-primaryColor/10 flex-1"
                  >
                    <Package class="w-4 h-4 mr-1" />
                    Update Stock
                  </button>
                  <button
                    @click.stop="openDetailsModal(item)"
                    class="btn btn-ghost btn-xs text-gray-600 hover:bg-gray-100"
                  >
                    <Eye class="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            <!-- Empty State -->
            <div
              v-if="paginatedInventory.length === 0"
              class="col-span-full flex flex-col items-center justify-center py-12"
            >
              <Package class="w-16 h-16 text-gray-300 mb-4" />
              <h3 class="text-lg font-medium text-gray-600 mb-2">
                No inventory items found
              </h3>
              <p class="text-sm text-gray-500 text-center mb-4">
                {{
                  searchQuery || categoryFilter || statusFilter
                    ? 'Try adjusting your filters'
                    : 'No approved menu items in inventory yet. Complete quality inspections to add items.'
                }}
              </p>
            </div>
          </div>

          <!-- Pagination -->
          <div v-if="totalPages > 1" class="flex justify-center mt-6">
            <div class="btn-group">
              <button
                @click="currentPage--"
                :disabled="currentPage === 1"
                class="btn btn-outline btn-sm"
              >
                Previous
              </button>
              <button class="btn btn-outline btn-sm btn-active">
                {{ currentPage }} of {{ totalPages }}
              </button>
              <button
                @click="currentPage++"
                :disabled="currentPage === totalPages"
                class="btn btn-outline btn-sm"
              >
                Next
              </button>
            </div>
          </div>
        </div>

        <!-- Analytics Tab -->
        <div v-if="activeTab === 'analytics'" class="space-y-6">
          <div
            class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6"
          >
            <div>
              <h2
                class="card-title text-primaryColor text-lg sm:text-xl lg:text-2xl mb-2"
              >
                Production Analytics Dashboard
              </h2>
              <p class="text-sm text-gray-600">
                Comprehensive analytics for menu management, production
                efficiency, and inventory performance.
              </p>
            </div>
          </div>

          <!-- Analytics Components -->
          <div class="space-y-6">
            <!-- Menu Item Approval Chart -->
            <MenuItemApprovalChart />

            <!-- Sample Production Trends Chart -->
            <SampleProductionTrendsChart />

            <!-- Production Metrics Chart -->
            <ProductionMetricsChart />

            <!-- Inventory Trends Chart -->
            <InventoryTrendsChart />
          </div>
        </div>

        <!-- Distributions Tab -->
        <div v-if="activeTab === 'distributions'" class="space-y-6">
          <div
            class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6"
          >
            <div>
              <h2
                class="card-title text-primaryColor text-lg sm:text-xl lg:text-2xl mb-2"
              >
                Distribution Management
              </h2>
              <p class="text-sm text-gray-600">
                Track and manage distributions to branch restaurants.
              </p>
            </div>
          </div>

          <!-- Distribution Stats -->
          <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div class="card bg-white border border-gray-200">
              <div class="card-body p-4">
                <div class="flex items-center justify-between">
                  <div>
                    <div class="text-2xl font-bold text-primaryColor">
                      {{ productionInventoryStats.total_distributions || 0 }}
                    </div>
                    <div class="text-sm text-gray-600">Total Distributions</div>
                  </div>
                  <Truck class="w-8 h-8 text-primaryColor" />
                </div>
              </div>
            </div>

            <div class="card bg-white border border-gray-200">
              <div class="card-body p-4">
                <div class="flex items-center justify-between">
                  <div>
                    <div class="text-2xl font-bold text-success">
                      {{ productionInventoryStats.branches_served || 0 }}
                    </div>
                    <div class="text-sm text-gray-600">Branches Served</div>
                  </div>
                  <Target class="w-8 h-8 text-success" />
                </div>
              </div>
            </div>

            <div class="card bg-white border border-gray-200">
              <div class="card-body p-4">
                <div class="flex items-center justify-between">
                  <div>
                    <div class="text-2xl font-bold text-info">
                      {{ productionInventoryStats.recent_distributions || 0 }}
                    </div>
                    <div class="text-sm text-gray-600">Recent (30 days)</div>
                  </div>
                  <Activity class="w-8 h-8 text-info" />
                </div>
              </div>
            </div>

            <div class="card bg-white border border-gray-200">
              <div class="card-body p-4">
                <div class="flex items-center justify-between">
                  <div>
                    <div class="text-2xl font-bold text-warning">
                      {{
                        productionInventoryStats.recent_quantity_distributed ||
                        0
                      }}
                    </div>
                    <div class="text-sm text-gray-600">Units (30 days)</div>
                  </div>
                  <TrendingUp class="w-8 h-8 text-warning" />
                </div>
              </div>
            </div>
          </div>

          <!-- Branch Demand Planning -->
          <div class="card bg-white border border-gray-200">
            <div class="card-body p-6">
              <h3 class="text-lg font-semibold text-primaryColor mb-4">
                Branch Demand Planning
              </h3>

              <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <!-- Production Recommendations -->
                <div class="space-y-4">
                  <h4 class="font-medium text-gray-700">
                    Production Recommendations
                  </h4>
                  <div class="space-y-3">
                    <div class="alert alert-info">
                      <div class="flex items-center">
                        <Target class="w-5 h-5 mr-2" />
                        <div>
                          <div class="font-medium">High Demand Items</div>
                          <div class="text-sm">
                            Consider increasing production for frequently
                            distributed items
                          </div>
                        </div>
                      </div>
                    </div>

                    <div class="alert alert-warning">
                      <div class="flex items-center">
                        <AlertTriangle class="w-5 h-5 mr-2" />
                        <div>
                          <div class="font-medium">Low Stock Alert</div>
                          <div class="text-sm">
                            Monitor items with low available quantities
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Branch Performance -->
                <div class="space-y-4">
                  <h4 class="font-medium text-gray-700">Branch Performance</h4>
                  <div class="space-y-3">
                    <div
                      class="flex justify-between items-center p-3 bg-gray-50 rounded"
                    >
                      <div>
                        <div class="font-medium">Top Performing Branch</div>
                        <div class="text-sm text-gray-600">
                          Highest distribution volume
                        </div>
                      </div>
                      <div class="text-right">
                        <div class="font-bold text-success">
                          {{ productionInventoryStats.branches_served || 0 }}
                          branches
                        </div>
                      </div>
                    </div>

                    <div
                      class="flex justify-between items-center p-3 bg-gray-50 rounded"
                    >
                      <div>
                        <div class="font-medium">Distribution Efficiency</div>
                        <div class="text-sm text-gray-600">
                          Average per distribution
                        </div>
                      </div>
                      <div class="text-right">
                        <div class="font-bold text-info">
                          {{
                            productionInventoryStats.total_distributions > 0
                              ? Math.round(
                                  (productionInventoryStats.total_quantity_distributed ||
                                    0) /
                                    productionInventoryStats.total_distributions
                                )
                              : 0
                          }}
                          units
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Distribution History -->
          <div class="card bg-white border border-gray-200">
            <div class="card-body p-6">
              <div class="flex justify-between items-center mb-4">
                <h3 class="text-lg font-semibold text-primaryColor">
                  Distribution History
                </h3>
                <button
                  @click="fetchDistributions"
                  class="btn btn-outline btn-sm"
                  :disabled="distributionLoading"
                >
                  <RefreshCcw
                    class="w-4 h-4 mr-1"
                    :class="{ 'animate-spin': distributionLoading }"
                  />
                  Refresh
                </button>
              </div>

              <!-- Distribution Table -->
              <div v-if="distributionLoading" class="text-center py-8">
                <RefreshCcw
                  class="w-8 h-8 text-gray-400 mx-auto mb-2 animate-spin"
                />
                <p class="text-gray-500">Loading distributions...</p>
              </div>

              <div
                v-else-if="distributions.length === 0"
                class="text-center py-8"
              >
                <Truck class="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 class="text-lg font-medium text-gray-600 mb-2">
                  No Distributions Yet
                </h3>
                <p class="text-sm text-gray-500">
                  Start distributing items to branches to see history here.
                </p>
              </div>

              <div v-else class="overflow-x-auto">
                <table class="table table-zebra w-full">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Branch</th>
                      <th>Quantity</th>
                      <th>Transfer Price</th>
                      <th>Total Cost</th>
                      <th>Date</th>
                      <th>Distributed By</th>
                      <th>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="distribution in distributions"
                      :key="distribution.id"
                    >
                      <td>
                        <div>
                          <div class="font-medium">
                            {{ distribution.menu_item_name }}
                          </div>
                          <div class="text-sm text-gray-500">
                            {{ distribution.item_code }}
                          </div>
                        </div>
                      </td>
                      <td>
                        <div class="font-medium">
                          {{ distribution.branch_name }}
                        </div>
                      </td>
                      <td>
                        <span class="badge badge-info">
                          {{ distribution.quantity_distributed }}
                        </span>
                      </td>
                      <td>
                        <div class="font-medium text-success">
                          ₱{{
                            Number(distribution.transfer_price || 0).toFixed(2)
                          }}
                        </div>
                      </td>
                      <td>
                        <div class="font-medium text-primaryColor">
                          ₱{{
                            Number(
                              (distribution.quantity_distributed || 0) *
                                (distribution.transfer_price || 0)
                            ).toFixed(2)
                          }}
                        </div>
                      </td>
                      <td>
                        <div class="text-sm">
                          {{ formatDate(distribution.distribution_date) }}
                        </div>
                      </td>
                      <td>
                        <div class="text-sm">
                          {{ distribution.distributed_by_name }}
                        </div>
                      </td>
                      <td>
                        <div class="text-sm text-gray-500 max-w-xs truncate">
                          {{ distribution.notes || 'No notes' }}
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <!-- Alerts Tab -->
        <div v-if="activeTab === 'alerts'" class="space-y-6">
          <div
            class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6"
          >
            <div>
              <h2
                class="card-title text-primaryColor text-lg sm:text-xl lg:text-2xl mb-2"
              >
                Inventory Alerts
              </h2>
              <p class="text-sm text-gray-600">
                Monitor low stock items and production capacity issues.
              </p>
            </div>
          </div>

          <!-- Low Stock Alerts -->
          <div class="space-y-4">
            <h3 class="text-lg font-semibold text-primaryColor">
              Low Stock Alerts
            </h3>
            <div class="grid gap-4">
              <div
                v-for="item in productionInventory.filter(
                  (i) => i.available_quantity <= i.reorder_point
                )"
                :key="item.id"
                class="card bg-yellow-50 border border-yellow-200 cursor-pointer hover:shadow-md"
                @click="openDetailsModal(item)"
              >
                <div class="card-body p-4">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-3">
                      <div
                        class="w-10 h-10 rounded-full flex items-center justify-center bg-yellow-100"
                      >
                        <AlertTriangle class="w-5 h-5 text-yellow-600" />
                      </div>
                      <div>
                        <div class="font-medium text-primaryColor">
                          {{ item.item_name }}
                        </div>
                        <div class="text-sm text-gray-600">
                          {{ item.category }}
                        </div>
                      </div>
                    </div>
                    <div class="text-right">
                      <div class="text-lg font-bold text-yellow-600">
                        {{ item.available_quantity }} / {{ item.reorder_point }}
                      </div>
                      <div class="text-sm text-gray-600">
                        Current / Reorder Point
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div
                v-if="
                  productionInventory.filter(
                    (i) => i.available_quantity <= i.reorder_point
                  ).length === 0
                "
                class="text-center py-8 text-gray-500"
              >
                No low stock alerts at this time
              </div>
            </div>
          </div>

          <!-- Production Capacity Issues -->
          <div class="space-y-4">
            <h3 class="text-lg font-semibold text-primaryColor">
              Production Capacity Issues
            </h3>
            <div class="grid gap-4">
              <div
                v-for="item in productionInventory.filter(
                  (i) => !getProductionCapacity(i).can_produce
                )"
                :key="item.id"
                class="card bg-red-50 border border-red-200 cursor-pointer hover:shadow-md"
                @click="openDetailsModal(item)"
              >
                <div class="card-body p-4">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-3">
                      <div
                        class="w-10 h-10 rounded-full flex items-center justify-center bg-red-100"
                      >
                        <X class="w-5 h-5 text-red-600" />
                      </div>
                      <div>
                        <div class="font-medium text-primaryColor">
                          {{ item.item_name }}
                        </div>
                        <div class="text-sm text-gray-600">
                          {{ item.category }}
                        </div>
                      </div>
                    </div>
                    <div class="text-right">
                      <div class="text-sm font-medium text-red-600">
                        {{ getProductionCapacity(item).limiting_factor }}
                      </div>
                      <div class="text-sm text-gray-600">Capacity Issue</div>
                    </div>
                  </div>
                </div>
              </div>
              <div
                v-if="
                  productionInventory.filter(
                    (i) => !getProductionCapacity(i).can_produce
                  ).length === 0
                "
                class="text-center py-8 text-gray-500"
              >
                No production capacity issues detected
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Update Modal -->
    <div v-if="showUpdateModal && selectedItem" class="modal modal-open">
      <div class="modal-box max-w-md">
        <h3 class="font-bold text-lg text-primaryColor mb-4">
          Update {{ selectedItem.item_name }}
        </h3>

        <form @submit.prevent="updateStock" class="space-y-4">
          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium">Current Stock Quantity</span>
            </label>
            <input
              v-model.number="updateForm.available_quantity"
              type="number"
              min="0"
              class="input input-bordered"
              placeholder="Enter new quantity"
              required
            />
            <div class="label">
              <span class="label-text-alt text-gray-500">
                Unit: {{ selectedItem.unit_of_measure }}
              </span>
            </div>
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium">Notes (Optional)</span>
            </label>
            <textarea
              v-model="updateForm.notes"
              class="textarea textarea-bordered"
              rows="3"
              placeholder="Reason for stock update..."
            ></textarea>
          </div>

          <div class="modal-action">
            <button
              type="button"
              @click="closeUpdateModal"
              class="btn btn-ghost"
            >
              Cancel
            </button>
            <button type="submit" class="btn btn-primary" :disabled="loading">
              <Package class="w-4 h-4 mr-2" v-if="!loading" />
              <RefreshCcw class="w-4 h-4 mr-2 animate-spin" v-else />
              Update Stock
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Details Modal -->
    <div v-if="showDetailsModal && selectedItem" class="modal modal-open">
      <div class="modal-box max-w-4xl">
        <h3 class="font-bold text-lg text-primaryColor mb-4">
          {{ selectedItem.item_name }} Details
        </h3>

        <div class="space-y-6">
          <!-- Basic Info -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 class="font-semibold text-primaryColor mb-3">
                Item Information
              </h4>
              <div class="space-y-2">
                <div class="flex justify-between">
                  <span class="text-gray-600">Item Code:</span>
                  <span class="font-medium">{{ selectedItem.item_code }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">Recipe:</span>
                  <span class="font-medium">{{
                    selectedItem.recipe_name
                  }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">Category:</span>
                  <span class="font-medium">{{ selectedItem.category }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">Unit of Measure:</span>
                  <span class="font-medium">{{
                    selectedItem.unit_of_measure
                  }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">Featured:</span>
                  <span
                    class="badge"
                    :class="
                      selectedItem.is_featured
                        ? 'badge-warning'
                        : 'badge-neutral'
                    "
                  >
                    {{ selectedItem.is_featured ? 'Yes' : 'No' }}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h4 class="font-semibold text-primaryColor mb-3">
                Stock & Pricing
              </h4>
              <div class="space-y-2">
                <div class="flex justify-between">
                  <span class="text-gray-600">Available Stock:</span>
                  <span class="font-medium">{{
                    selectedItem.available_quantity
                  }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">Reorder Point:</span>
                  <span class="font-medium">{{
                    selectedItem.reorder_point || 0
                  }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">Selling Price:</span>
                  <span class="font-medium text-success">{{
                    formatCurrency(selectedItem.selling_price)
                  }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">Unit Cost:</span>
                  <span class="font-medium">{{
                    formatCurrency(selectedItem.unit_cost)
                  }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">Profit Margin:</span>
                  <span
                    class="font-medium"
                    :class="
                      getProfitMarginColor(
                        calculateProfitMargin(
                          selectedItem.selling_price,
                          selectedItem.unit_cost
                        )
                      )
                    "
                  >
                    {{
                      calculateProfitMargin(
                        selectedItem.selling_price,
                        selectedItem.unit_cost
                      )
                    }}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Production History -->
          <div class="bg-gray-50 p-4 rounded-lg">
            <h4 class="font-semibold text-primaryColor mb-3">
              Production History
            </h4>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div class="text-center">
                <div class="text-2xl font-bold text-primaryColor">
                  {{ selectedItem.total_produced || 0 }}
                </div>
                <div class="text-sm text-gray-600">Total Produced</div>
              </div>
              <div class="text-center">
                <div class="text-2xl font-bold text-info">
                  {{ selectedItem.last_batch_size || 0 }}
                </div>
                <div class="text-sm text-gray-600">Last Batch Size</div>
              </div>
              <div class="text-center">
                <div class="text-2xl font-bold text-success">
                  {{
                    selectedItem.last_produced_date
                      ? formatDate(selectedItem.last_produced_date)
                      : 'Never'
                  }}
                </div>
                <div class="text-sm text-gray-600">Last Produced</div>
              </div>
            </div>
          </div>

          <!-- Production Capacity -->
          <div class="bg-blue-50 p-4 rounded-lg">
            <h4 class="font-semibold text-primaryColor mb-3">
              Production Capacity
            </h4>
            <div class="space-y-2">
              <div class="flex justify-between">
                <span class="text-gray-600">Current Status:</span>
                <span
                  class="font-medium"
                  :class="
                    getProductionCapacity(selectedItem).can_produce
                      ? 'text-success'
                      : 'text-error'
                  "
                >
                  {{
                    getProductionCapacity(selectedItem).can_produce
                      ? 'Ready for Production'
                      : 'Capacity Limited'
                  }}
                </span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">Limiting Factor:</span>
                <span class="font-medium">{{
                  getProductionCapacity(selectedItem).limiting_factor
                }}</span>
              </div>
            </div>
          </div>

          <!-- Recent Quality Inspections -->
          <div
            v-if="
              selectedItem.recent_inspections &&
              selectedItem.recent_inspections.length > 0
            "
            class="bg-green-50 p-4 rounded-lg"
          >
            <h4 class="font-semibold text-primaryColor mb-3">
              Recent Quality Inspections
            </h4>
            <div class="space-y-2">
              <div
                v-for="inspection in selectedItem.recent_inspections"
                :key="inspection.inspection_date"
                class="flex items-center justify-between p-3 bg-white rounded"
              >
                <div>
                  <div class="font-medium">
                    {{ formatDate(inspection.inspection_date) }}
                  </div>
                  <div class="text-sm text-gray-600">
                    by {{ inspection.inspector_name }}
                  </div>
                </div>
                <div class="text-right">
                  <span
                    class="badge"
                    :class="
                      inspection.result === 'Pass'
                        ? 'badge-success'
                        : 'badge-error'
                    "
                  >
                    {{ inspection.result }}
                  </span>
                  <div
                    v-if="inspection.overall_quality_score"
                    class="text-sm text-gray-600 mt-1"
                  >
                    Score: {{ inspection.overall_quality_score }}/10
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-action">
          <button @click="closeDetailsModal" class="btn btn-ghost">
            Close
          </button>
          <button
            @click="openUpdateModal(selectedItem, 'stock')"
            class="btn btn-primary"
          >
            <Package class="w-4 h-4 mr-2" />
            Update Stock
          </button>
        </div>
      </div>
    </div>

    <!-- Distribution Modal -->
    <div v-if="showDistributionModal && selectedItem" class="modal modal-open">
      <div class="modal-box max-w-md">
        <h3 class="font-bold text-lg text-primaryColor mb-4">
          Distribute {{ selectedItem.item_name }}
        </h3>

        <form @submit.prevent="recordDistribution" class="space-y-4">
          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium">Available Stock</span>
            </label>
            <div class="text-lg font-bold text-primaryColor">
              {{ selectedItem.available_quantity }}
              {{ selectedItem.unit_of_measure }}
            </div>
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium">Quantity to Distribute</span>
            </label>
            <input
              v-model.number="distributionForm.quantity"
              type="number"
              min="1"
              :max="selectedItem.available_quantity"
              class="input input-bordered"
              placeholder="Enter quantity to distribute"
              required
            />
            <div class="label">
              <span class="label-text-alt text-gray-500">
                Unit: {{ selectedItem.unit_of_measure }}
              </span>
            </div>
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium">Branch</span>
            </label>
            <select
              v-model="distributionForm.branch_id"
              class="select select-bordered"
              required
            >
              <option value="">Select branch</option>
              <option
                v-for="branch in branches"
                :key="branch.id"
                :value="branch.id"
              >
                {{ branch.name }} ({{ branch.code }})
              </option>
            </select>
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium">Transfer Price</span>
            </label>
            <div class="relative">
              <span
                class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500"
                >₱</span
              >
              <input
                v-model.number="distributionForm.transfer_price"
                type="number"
                min="0"
                step="0.01"
                class="input input-bordered pl-8"
                placeholder="0.00"
                required
              />
            </div>
            <div class="label">
              <span class="label-text-alt text-gray-500">
                Price per unit for this distribution
              </span>
            </div>
          </div>

          <!-- Total Cost Display -->
          <div
            v-if="
              distributionForm.quantity > 0 &&
              distributionForm.transfer_price > 0
            "
            class="alert alert-info"
          >
            <div class="flex items-center">
              <PhilippinePeso class="w-5 h-5 mr-2" />
              <div>
                <div class="font-medium">Total Distribution Cost</div>
                <div class="text-lg font-bold">
                  ₱{{ Number(distributionTotal).toFixed(2) }}
                </div>
              </div>
            </div>
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium">Notes (Optional)</span>
            </label>
            <textarea
              v-model="distributionForm.notes"
              class="textarea textarea-bordered"
              rows="3"
              placeholder="Distribution notes..."
            ></textarea>
          </div>

          <div class="modal-action">
            <button
              type="button"
              @click="closeDistributionModal"
              class="btn btn-ghost"
            >
              Cancel
            </button>
            <button type="submit" class="btn btn-info" :disabled="loading">
              <Truck class="w-4 h-4 mr-2" v-if="!loading" />
              <RefreshCcw class="w-4 h-4 mr-2 animate-spin" v-else />
              Record Distribution
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
  .text-shadow-xs {
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  }
</style>
