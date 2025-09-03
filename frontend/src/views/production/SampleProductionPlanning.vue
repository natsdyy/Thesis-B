<script setup>
  import { ref, computed, onMounted, watch } from 'vue';
  import {
    FlaskConical,
    Plus,
    Search,
    Filter,
    RefreshCcw,
    Eye,
    Edit,
    Trash2,
    CheckCircle,
    AlertTriangle,
    Clock,
    Package,
    Users,
    Calendar,
    BarChart3,
    Play,
    Pause,
    X,
    ChevronDown,
    ChevronUp,
    User,
    AlertCircle,
    TrendingUp,
    Target,
  } from 'lucide-vue-next';
  import { useProductionStore } from '../../stores/productionStore.js';
  import { useAuthStore } from '../../stores/authStore.js';

  const productionStore = useProductionStore();
  const authStore = useAuthStore();

  // Reactive state
  const activeTab = ref('planning');
  const searchQuery = ref('');
  const statusFilter = ref('');
  const dateFilter = ref('');
  const showCreateModal = ref(false);
  const showDetailsModal = ref(false);
  const selectedSample = ref(null);
  const currentPage = ref(1);
  const itemsPerPage = ref(12);
  const expandedItems = ref(new Set());

  // Form data
  const sampleForm = ref({
    menu_item_id: '',
    batch_size: 10, // Small batch size for testing
    batch_unit: 'servings',
    scheduled_date: new Date().toISOString().split('T')[0],
    scheduled_time: '',
    assigned_to: '',
    production_notes: '',
  });

  // Access store data
  const loading = computed(() => productionStore.loading);
  const error = computed(() => productionStore.error);
  const sampleProductions = computed(() => productionStore.sampleProductions);
  const menuItems = computed(() =>
    productionStore.menuItems.filter((item) => item.is_available)
  );
  const sampleProductionStats = computed(
    () => productionStore.sampleProductionStats
  );

  // Inventory availability state
  const checkingAvailability = ref(false);
  const ingredientAvailability = ref(null);

  // Get users for staff assignment (assuming we have a users store or can fetch from auth)
  const staffMembers = computed(() => {
    // This would normally come from a users store or API call
    return [
      { id: 1, name: 'John Doe', department: 'Production' },
      { id: 2, name: 'Jane Smith', department: 'Production' },
      { id: 3, name: 'Mike Johnson', department: 'Production' },
    ];
  });

  const filteredSampleProductions = computed(() => {
    let filtered = sampleProductions.value;

    if (searchQuery.value) {
      const query = searchQuery.value.toLowerCase();
      filtered = filtered.filter(
        (sample) =>
          sample.item_name.toLowerCase().includes(query) ||
          sample.sample_batch_number.toLowerCase().includes(query) ||
          sample.recipe_name?.toLowerCase().includes(query)
      );
    }

    if (statusFilter.value) {
      filtered = filtered.filter(
        (sample) => sample.status === statusFilter.value
      );
    }

    if (dateFilter.value) {
      filtered = filtered.filter(
        (sample) => sample.scheduled_date === dateFilter.value
      );
    }

    return filtered.sort((a, b) => {
      // Sort by scheduled date, then status priority
      const dateCompare =
        new Date(a.scheduled_date + ' ' + (a.scheduled_time || '00:00')) -
        new Date(b.scheduled_date + ' ' + (b.scheduled_time || '00:00'));

      if (dateCompare === 0) {
        const statusOrder = {
          'In Progress': 0,
          Planned: 1,
          Completed: 2,
          Failed: 3,
          Cancelled: 4,
        };
        return statusOrder[a.status] - statusOrder[b.status];
      }

      return dateCompare;
    });
  });

  const paginatedSampleProductions = computed(() => {
    const start = (currentPage.value - 1) * itemsPerPage.value;
    return filteredSampleProductions.value.slice(
      start,
      start + itemsPerPage.value
    );
  });

  const totalPages = computed(() => {
    return Math.ceil(
      filteredSampleProductions.value.length / itemsPerPage.value
    );
  });

  // Computed properties for available menu items
  const availableMenuItems = computed(() => {
    return menuItems.value.filter((item) => {
      // Only show items that don't have pending or in-progress samples
      const existingSamples = sampleProductions.value.filter(
        (sample) =>
          sample.menu_item_id === item.id &&
          (sample.status === 'Planned' || sample.status === 'In Progress')
      );
      return existingSamples.length === 0;
    });
  });

  // Helper functions
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (timeString) => {
    if (!timeString) return '';
    return new Date(`1970-01-01T${timeString}`).toLocaleTimeString('en-PH', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadgeClass = (status) => {
    const classes = {
      Planned: 'badge-sm border-none font-medium bg-info/20 text-info',
      'In Progress':
        'badge-sm border-none font-medium bg-warning/20 text-warning',
      Completed: 'badge-sm border-none font-medium bg-success/20 text-success',
      Failed: 'badge-sm border-none font-medium bg-error/20 text-error',
      Cancelled: 'badge-sm border-none font-medium bg-neutral/20 text-neutral',
    };
    return (
      classes[status] ||
      'badge-sm border-none font-medium bg-neutral/20 text-neutral'
    );
  };

  const getStatusIcon = (status) => {
    const icons = {
      Planned: Calendar,
      'In Progress': Play,
      Completed: CheckCircle,
      Failed: AlertTriangle,
      Cancelled: X,
    };
    return icons[status] || Clock;
  };

  const isOverdue = (scheduledDate, scheduledTime) => {
    const scheduled = new Date(`${scheduledDate} ${scheduledTime || '00:00'}`);
    const now = new Date();
    return scheduled < now;
  };

  const getIngredientAvailabilityStatus = (sample) => {
    // This would normally check against inventory
    // For now, return mock data
    return {
      total_ingredients: sample.recipe_ingredients?.length || 0,
      available_ingredients: Math.floor(
        (sample.recipe_ingredients?.length || 0) * 0.8
      ),
      sufficient_for_production: Math.random() > 0.3, // Mock availability
    };
  };

  const canStartProduction = (sample) => {
    if (sample.status !== 'Planned') return false;
    const availability = getIngredientAvailabilityStatus(sample);
    return availability.sufficient_for_production;
  };

  const resetForm = () => {
    sampleForm.value = {
      menu_item_id: '',
      batch_size: 10,
      batch_unit: 'servings',
      scheduled_date: new Date().toISOString().split('T')[0],
      scheduled_time: '',
      assigned_to: '',
      production_notes: '',
    };
  };

  // Methods
  const fetchData = async () => {
    try {
      await Promise.all([
        productionStore.fetchSampleProductions(),
        productionStore.fetchMenuItems(),
        productionStore.fetchSampleProductionStats(),
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
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

  const openDetailsModal = (sample) => {
    selectedSample.value = sample;
    showDetailsModal.value = true;
  };

  const closeDetailsModal = () => {
    showDetailsModal.value = false;
    selectedSample.value = null;
  };

  const createSampleProduction = async () => {
    try {
      const formData = { ...sampleForm.value };
      await productionStore.createSampleProduction(formData);
      closeCreateModal();
      showToast('success', 'Sample production planned successfully');
    } catch (error) {
      showToast('error', error.message || 'Failed to plan sample production');
    }
  };

  const startSampleProduction = async (sampleId) => {
    try {
      await productionStore.startSampleProduction(sampleId);
      showToast('success', 'Sample production started');
    } catch (error) {
      showToast('error', error.message || 'Failed to start sample production');
    }
  };

  const completeSampleProduction = async (
    sampleId,
    quantityProduced,
    productionCost,
    notes
  ) => {
    try {
      await productionStore.completeSampleProduction(
        sampleId,
        quantityProduced,
        productionCost,
        notes
      );
      showToast('success', 'Sample production completed successfully');
    } catch (error) {
      showToast(
        'error',
        error.message || 'Failed to complete sample production'
      );
    }
  };

  const cancelSampleProduction = async (sampleId) => {
    if (!confirm('Are you sure you want to cancel this sample production?')) {
      return;
    }

    try {
      await productionStore.cancelSampleProduction(sampleId);
      showToast('success', 'Sample production cancelled');
    } catch (error) {
      showToast('error', error.message || 'Failed to cancel sample production');
    }
  };

  const handleMenuItemSelection = async (menuItemId) => {
    const selectedItem = menuItems.value.find((item) => item.id == menuItemId);
    if (selectedItem) {
      sampleForm.value.batch_unit = selectedItem.serving_unit;

      // Check ingredient availability for the selected recipe
      if (selectedItem.recipe_id) {
        await checkIngredientAvailability(
          selectedItem.recipe_id,
          sampleForm.value.batch_size
        );
      }
    }
  };

  // Check ingredient availability for a recipe
  const checkIngredientAvailability = async (recipeId, batchSize) => {
    try {
      checkingAvailability.value = true;
      ingredientAvailability.value =
        await productionStore.checkRecipeAvailability(recipeId, batchSize);
    } catch (error) {
      console.error('Error checking ingredient availability:', error);
      ingredientAvailability.value = null;
    } finally {
      checkingAvailability.value = false;
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
  watch([searchQuery, statusFilter, dateFilter], () => {
    currentPage.value = 1;
  });
</script>

<template>
  <div class="container mx-auto p-2 sm:p-4 lg:p-6 max-w-6xl">
    <!-- Header -->
    <div class="text-center mb-4 sm:mb-6 lg:mb-8">
      <h1
        class="text-2xl sm:text-3xl lg:text-4xl font-bold text-primaryColor mb-2 text-shadow-xs"
      >
        Sample Production Planning
      </h1>
      <p class="text-sm sm:text-base text-black/50 px-2">
        Plan and manage small-batch sample productions for menu items before
        full production.
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
          <FlaskConical
            class="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-primaryColor"
          />
        </div>
        <div class="stat-title text-black/50 !text-xs sm:text-sm">
          Total Samples
        </div>
        <div
          class="stat-value text-primaryColor text-lg sm:text-xl lg:text-2xl xl:text-3xl"
        >
          {{ sampleProductionStats.total_samples || 0 }}
        </div>
        <div class="stat-desc text-black/50 !text-xs sm:text-sm">
          Sample productions planned
        </div>
      </div>

      <div
        class="stat sm:!border sm:!border-l-0 sm:!border-r-2 sm:!border-t-0 sm:!border-b-0 sm:!border-black/10 sm:border-dashed hover:bg-secondaryColor/10"
      >
        <div class="stat-figure">
          <Play class="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-warning" />
        </div>
        <div class="stat-title text-black/50 text-xs sm:text-sm">
          In Progress
        </div>
        <div
          class="stat-value text-warning text-lg sm:text-xl lg:text-2xl xl:text-3xl"
        >
          {{ sampleProductionStats.in_progress_samples || 0 }}
        </div>
        <div class="stat-desc text-black/50 !text-xs sm:text-sm">
          Currently being produced
        </div>
      </div>

      <div
        class="stat sm:!border sm:!border-l-0 sm:!border-r-2 sm:!border-t-0 sm:!border-b-0 sm:!border-black/10 sm:border-dashed hover:bg-secondaryColor/10"
      >
        <div class="stat-figure">
          <CheckCircle
            class="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-success"
          />
        </div>
        <div class="stat-title text-black/50 !text-xs sm:text-sm">
          Completed
        </div>
        <div
          class="stat-value text-success text-lg sm:text-xl lg:text-2xl xl:text-3xl"
        >
          {{ sampleProductionStats.completed_samples || 0 }}
        </div>
        <div class="stat-desc text-black/50 !text-xs sm:text-sm">
          Ready for quality inspection
        </div>
      </div>

      <div
        class="stat sm:!border sm:!border-l-0 sm:!border-r-2 sm:!border-t-0 sm:!border-b-0 sm:!border-black/10 sm:border-dashed hover:bg-secondaryColor/10"
      >
        <div class="stat-figure">
          <AlertTriangle
            class="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-error"
          />
        </div>
        <div class="stat-title text-black/50 !text-xs sm:text-sm">Failed</div>
        <div
          class="stat-value text-error text-lg sm:text-xl lg:text-2xl xl:text-3xl"
        >
          {{ sampleProductionStats.failed_samples || 0 }}
        </div>
        <div class="stat-desc text-black/50 !text-xs sm:text-sm">
          Samples that failed
        </div>
      </div>
    </div>

    <!-- Action Buttons -->
    <div
      class="flex flex-wrap gap-2 mb-4 sm:mb-6 justify-center sm:justify-start"
    >
      <button
        @click="openCreateModal"
        class="btn btn-outline btn-sm text-primaryColor hover:bg-primaryColor/10 font-thin hover:border-none hover:shadow-none"
        :disabled="loading"
      >
        <Plus class="w-4 h-4 mr-1" />
        Plan Sample Production
      </button>
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
        @click="activeTab = 'planning'"
        class="tab"
        :class="{ 'tab-active': activeTab === 'planning' }"
      >
        <Calendar class="w-4 h-4 mr-1" />
        Production Planning
      </button>
      <button
        @click="activeTab = 'monitoring'"
        class="tab"
        :class="{ 'tab-active': activeTab === 'monitoring' }"
      >
        <BarChart3 class="w-4 h-4 mr-1" />
        Production Monitoring
      </button>
    </div>

    <!-- Tab Content -->
    <div
      class="card bg-accentColor shadow-xl mb-4 sm:mb-6 border border-black/10"
    >
      <div class="card-body p-3 sm:p-4 lg:p-6">
        <!-- Planning Tab -->
        <div v-if="activeTab === 'planning'" class="space-y-6">
          <div
            class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6"
          >
            <div>
              <h2
                class="card-title text-primaryColor text-lg sm:text-xl lg:text-2xl mb-2"
              >
                Sample Production Planning
              </h2>
              <p class="text-sm text-gray-600">
                Plan small-batch productions for menu items to test recipes
                before full production.
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
                  placeholder="Search sample productions..."
                  class="input input-bordered w-full pl-10"
                />
              </div>
            </div>
            <div class="flex gap-2">
              <select v-model="statusFilter" class="select select-bordered">
                <option value="">All Status</option>
                <option value="Planned">Planned</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
                <option value="Failed">Failed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
              <input
                v-model="dateFilter"
                type="date"
                class="input input-bordered"
                placeholder="Filter by date"
              />
            </div>
          </div>

          <!-- Sample Productions Grid -->
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div
              v-for="sample in paginatedSampleProductions"
              :key="sample.id"
              class="card bg-white border border-gray-200 hover:shadow-xl duration-300 cursor-pointer"
              @click="openDetailsModal(sample)"
            >
              <div class="card-body p-6">
                <div class="flex items-start justify-between mb-4">
                  <div class="flex-1">
                    <h3
                      class="card-title text-lg font-bold text-primaryColor mb-2"
                    >
                      {{ sample.item_name }}
                    </h3>
                    <p class="text-sm text-gray-600 mb-2">
                      Batch #{{ sample.sample_batch_number }}
                    </p>
                    <div class="flex items-center gap-2 mb-3">
                      <component
                        :is="getStatusIcon(sample.status)"
                        class="w-4 h-4"
                        :class="
                          getStatusBadgeClass(sample.status).includes(
                            'text-success'
                          )
                            ? 'text-success'
                            : getStatusBadgeClass(sample.status).includes(
                                  'text-warning'
                                )
                              ? 'text-warning'
                              : getStatusBadgeClass(sample.status).includes(
                                    'text-error'
                                  )
                                ? 'text-error'
                                : getStatusBadgeClass(sample.status).includes(
                                      'text-info'
                                    )
                                  ? 'text-info'
                                  : 'text-gray-500'
                        "
                      />
                      <span
                        class="badge"
                        :class="getStatusBadgeClass(sample.status)"
                      >
                        {{ sample.status }}
                      </span>
                      <span
                        v-if="
                          isOverdue(
                            sample.scheduled_date,
                            sample.scheduled_time
                          )
                        "
                        class="badge badge-error"
                      >
                        Overdue
                      </span>
                    </div>
                  </div>
                  <div class="text-right">
                    <div class="text-sm font-medium text-primaryColor">
                      {{ sample.batch_size }} {{ sample.batch_unit }}
                    </div>
                    <div class="text-xs text-gray-500">
                      {{ formatDate(sample.scheduled_date) }}
                    </div>
                    <div
                      v-if="sample.scheduled_time"
                      class="text-xs text-gray-500"
                    >
                      {{ formatTime(sample.scheduled_time) }}
                    </div>
                  </div>
                </div>

                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-4 text-sm text-gray-600">
                    <div class="flex items-center gap-1">
                      <User class="w-4 h-4" />
                      <span class="truncate max-w-20">{{
                        sample.assigned_to_name || 'Unassigned'
                      }}</span>
                    </div>
                  </div>
                  <div class="flex gap-1">
                    <button
                      @click.stop="startSampleProduction(sample.id)"
                      v-if="canStartProduction(sample)"
                      class="btn btn-ghost btn-xs text-success hover:bg-success/10"
                      title="Start Production"
                    >
                      <Play class="w-4 h-4" />
                    </button>
                    <button
                      @click.stop="cancelSampleProduction(sample.id)"
                      v-if="sample.status === 'Planned'"
                      class="btn btn-ghost btn-xs text-error hover:bg-error/10"
                      title="Cancel Production"
                    >
                      <X class="w-4 h-4" />
                    </button>
                    <button
                      @click.stop="openDetailsModal(sample)"
                      class="btn btn-ghost btn-xs text-primaryColor hover:bg-primaryColor/10"
                      title="View Details"
                    >
                      <Eye class="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <!-- Ingredient Availability Status -->
                <div class="mt-4 pt-4 border-t border-gray-100">
                  <div class="flex items-center justify-between text-sm">
                    <span class="text-gray-600">Ingredients:</span>
                    <span
                      class="font-medium"
                      :class="
                        getIngredientAvailabilityStatus(sample)
                          .sufficient_for_production
                          ? 'text-success'
                          : 'text-error'
                      "
                    >
                      {{
                        getIngredientAvailabilityStatus(sample)
                          .available_ingredients
                      }}/{{
                        getIngredientAvailabilityStatus(sample)
                          .total_ingredients
                      }}
                      available
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Empty State -->
            <div
              v-if="paginatedSampleProductions.length === 0"
              class="col-span-full flex flex-col items-center justify-center py-12"
            >
              <FlaskConical class="w-16 h-16 text-gray-300 mb-4" />
              <h3 class="text-lg font-medium text-gray-600 mb-2">
                No sample productions found
              </h3>
              <p class="text-sm text-gray-500 text-center mb-4">
                {{
                  searchQuery || statusFilter || dateFilter
                    ? 'Try adjusting your filters'
                    : 'Plan your first sample production to get started'
                }}
              </p>
              <button
                v-if="!searchQuery && !statusFilter && !dateFilter"
                @click="openCreateModal"
                class="btn btn-primary"
              >
                <Plus class="w-4 h-4 mr-2" />
                Plan Sample Production
              </button>
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

        <!-- Monitoring Tab -->
        <div v-if="activeTab === 'monitoring'" class="space-y-6">
          <div
            class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6"
          >
            <div>
              <h2
                class="card-title text-primaryColor text-lg sm:text-xl lg:text-2xl mb-2"
              >
                Production Monitoring
              </h2>
              <p class="text-sm text-gray-600">
                Monitor ongoing sample productions and track progress in
                real-time.
              </p>
            </div>
          </div>

          <!-- Active Productions -->
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div class="card bg-white shadow-lg">
              <div class="card-body">
                <h3 class="card-title text-lg font-bold text-primaryColor mb-4">
                  Active Productions
                </h3>
                <div class="space-y-4">
                  <div
                    v-for="sample in sampleProductions.filter(
                      (s) => s.status === 'In Progress'
                    )"
                    :key="sample.id"
                    class="flex items-center justify-between p-4 bg-blue-50 rounded-lg"
                  >
                    <div>
                      <div class="font-medium text-primaryColor">
                        {{ sample.item_name }}
                      </div>
                      <div class="text-sm text-gray-600">
                        Batch #{{ sample.sample_batch_number }}
                      </div>
                      <div class="text-sm text-gray-500">
                        Started: {{ formatDate(sample.actual_start_date) }}
                      </div>
                    </div>
                    <div class="text-right">
                      <div class="text-sm font-medium">
                        {{ sample.assigned_to_name || 'Unassigned' }}
                      </div>
                      <div class="badge badge-info mt-1">In Progress</div>
                    </div>
                  </div>
                  <div
                    v-if="
                      sampleProductions.filter(
                        (s) => s.status === 'In Progress'
                      ).length === 0
                    "
                    class="text-center py-8 text-gray-500"
                  >
                    No active productions at the moment
                  </div>
                </div>
              </div>
            </div>

            <div class="card bg-white shadow-lg">
              <div class="card-body">
                <h3 class="card-title text-lg font-bold text-primaryColor mb-4">
                  Today's Schedule
                </h3>
                <div class="space-y-4">
                  <div
                    v-for="sample in sampleProductions.filter(
                      (s) =>
                        s.scheduled_date ===
                          new Date().toISOString().split('T')[0] &&
                        s.status === 'Planned'
                    )"
                    :key="sample.id"
                    class="flex items-center justify-between p-4 bg-yellow-50 rounded-lg"
                  >
                    <div>
                      <div class="font-medium text-primaryColor">
                        {{ sample.item_name }}
                      </div>
                      <div class="text-sm text-gray-600">
                        {{ sample.scheduled_time || 'Time not set' }}
                      </div>
                      <div class="text-sm text-gray-500">
                        {{ sample.batch_size }} {{ sample.batch_unit }}
                      </div>
                    </div>
                    <div class="text-right">
                      <div class="text-sm font-medium">
                        {{ sample.assigned_to_name || 'Unassigned' }}
                      </div>
                      <div class="badge badge-warning mt-1">Scheduled</div>
                    </div>
                  </div>
                  <div
                    v-if="
                      sampleProductions.filter(
                        (s) =>
                          s.scheduled_date ===
                            new Date().toISOString().split('T')[0] &&
                          s.status === 'Planned'
                      ).length === 0
                    "
                    class="text-center py-8 text-gray-500"
                  >
                    No productions scheduled for today
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Create Sample Production Modal -->
    <div v-if="showCreateModal" class="modal modal-open">
      <div class="modal-box max-w-2xl">
        <h3 class="font-bold text-lg text-primaryColor mb-4">
          Plan Sample Production
        </h3>

        <form @submit.prevent="createSampleProduction" class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="form-control">
              <label class="label">
                <span class="label-text font-medium">Menu Item *</span>
              </label>
              <select
                v-model="sampleForm.menu_item_id"
                @change="handleMenuItemSelection(sampleForm.menu_item_id)"
                class="select select-bordered"
                required
              >
                <option value="">Select Menu Item</option>
                <option
                  v-for="item in availableMenuItems"
                  :key="item.id"
                  :value="item.id"
                >
                  {{ item.item_name }} ({{ item.category }})
                </option>
              </select>
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text font-medium">Assigned To</span>
              </label>
              <select
                v-model="sampleForm.assigned_to"
                class="select select-bordered"
              >
                <option value="">Select Staff Member</option>
                <option
                  v-for="staff in staffMembers"
                  :key="staff.id"
                  :value="staff.id"
                >
                  {{ staff.name }}
                </option>
              </select>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="form-control">
              <label class="label">
                <span class="label-text font-medium">Batch Size *</span>
              </label>
              <input
                v-model.number="sampleForm.batch_size"
                type="number"
                min="1"
                max="50"
                class="input input-bordered"
                placeholder="10"
                required
              />
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text font-medium">Unit</span>
              </label>
              <select
                v-model="sampleForm.batch_unit"
                class="select select-bordered"
              >
                <option value="servings">Servings</option>
                <option value="pieces">Pieces</option>
                <option value="kg">Kilograms</option>
                <option value="liters">Liters</option>
              </select>
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text font-medium">Scheduled Date *</span>
              </label>
              <input
                v-model="sampleForm.scheduled_date"
                type="date"
                class="input input-bordered"
                :min="new Date().toISOString().split('T')[0]"
                required
              />
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="form-control">
              <label class="label">
                <span class="label-text font-medium">Scheduled Time</span>
              </label>
              <input
                v-model="sampleForm.scheduled_time"
                type="time"
                class="input input-bordered"
              />
            </div>
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium">Production Notes</span>
            </label>
            <textarea
              v-model="sampleForm.production_notes"
              class="textarea textarea-bordered"
              rows="3"
              placeholder="Any special instructions or notes for production..."
            ></textarea>
          </div>

          <!-- Ingredient Availability Preview -->
          <div v-if="sampleForm.menu_item_id" class="bg-gray-50 p-4 rounded-lg">
            <div class="flex items-center justify-between mb-3">
              <h4 class="font-semibold text-primaryColor">
                Ingredient Availability
              </h4>
              <div
                v-if="checkingAvailability"
                class="flex items-center text-sm text-gray-500"
              >
                <RefreshCcw class="w-4 h-4 mr-1 animate-spin" />
                Checking...
              </div>
            </div>

            <div v-if="ingredientAvailability" class="space-y-3">
              <!-- Summary -->
              <div class="grid grid-cols-3 gap-4 text-sm">
                <div class="text-center">
                  <div class="text-2xl font-bold text-primaryColor">
                    {{ ingredientAvailability.total_ingredients }}
                  </div>
                  <div class="text-xs text-gray-600">Total Ingredients</div>
                </div>
                <div class="text-center">
                  <div class="text-2xl font-bold text-success">
                    {{ ingredientAvailability.available_ingredients }}
                  </div>
                  <div class="text-xs text-gray-600">Available</div>
                </div>
                <div class="text-center">
                  <div
                    class="text-2xl font-bold"
                    :class="
                      ingredientAvailability.sufficient_for_production
                        ? 'text-success'
                        : 'text-error'
                    "
                  >
                    {{
                      ingredientAvailability.sufficient_for_production
                        ? 'Ready'
                        : 'Issues'
                    }}
                  </div>
                  <div class="text-xs text-gray-600">Status</div>
                </div>
              </div>

              <!-- Insufficient ingredients list -->
              <div
                v-if="
                  !ingredientAvailability.sufficient_for_production &&
                  ingredientAvailability.insufficient_ingredients.length > 0
                "
              >
                <div class="text-sm font-medium text-error mb-2">
                  Insufficient Ingredients:
                </div>
                <div class="space-y-1 max-h-32 overflow-y-auto">
                  <div
                    v-for="ingredient in ingredientAvailability.insufficient_ingredients"
                    :key="ingredient.ingredient_name"
                    class="flex justify-between text-xs bg-red-50 p-2 rounded"
                  >
                    <span>{{ ingredient.ingredient_name }}</span>
                    <span class="text-error">
                      {{ ingredient.available_quantity }}/{{
                        ingredient.required_quantity
                      }}
                      {{ ingredient.unit }}
                    </span>
                  </div>
                </div>
              </div>

              <!-- Production readiness status -->
              <div
                class="flex items-center justify-between pt-2 border-t border-gray-200"
              >
                <span class="text-sm text-gray-600">Production Ready:</span>
                <span
                  class="badge"
                  :class="
                    ingredientAvailability.sufficient_for_production
                      ? 'badge-success'
                      : 'badge-error'
                  "
                >
                  {{
                    ingredientAvailability.sufficient_for_production
                      ? 'Yes'
                      : 'No'
                  }}
                </span>
              </div>
            </div>

            <div
              v-else-if="!checkingAvailability"
              class="text-center text-gray-500 py-4"
            >
              <Package class="w-8 h-8 mx-auto mb-2 opacity-50" />
              <div class="text-sm">
                Select a menu item to check ingredient availability
              </div>
            </div>
          </div>

          <div class="modal-action">
            <button
              type="button"
              @click="closeCreateModal"
              class="btn btn-ghost"
            >
              Cancel
            </button>
            <button type="submit" class="btn btn-primary" :disabled="loading">
              <Plus class="w-4 h-4 mr-2" v-if="!loading" />
              <RefreshCcw class="w-4 h-4 mr-2 animate-spin" v-else />
              Plan Sample Production
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Sample Production Details Modal -->
    <div v-if="showDetailsModal && selectedSample" class="modal modal-open">
      <div class="modal-box max-w-4xl">
        <h3 class="font-bold text-lg text-primaryColor mb-4">
          Sample Production Details
        </h3>

        <div class="space-y-6">
          <!-- Basic Info -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 class="font-semibold text-primaryColor mb-3">
                Production Information
              </h4>
              <div class="space-y-2">
                <div class="flex justify-between">
                  <span class="text-gray-600">Batch Number:</span>
                  <span class="font-medium">{{
                    selectedSample.sample_batch_number
                  }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">Menu Item:</span>
                  <span class="font-medium">{{
                    selectedSample.item_name
                  }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">Recipe:</span>
                  <span class="font-medium">{{
                    selectedSample.recipe_name
                  }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">Batch Size:</span>
                  <span class="font-medium"
                    >{{ selectedSample.batch_size }}
                    {{ selectedSample.batch_unit }}</span
                  >
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">Status:</span>
                  <span
                    class="badge"
                    :class="getStatusBadgeClass(selectedSample.status)"
                  >
                    {{ selectedSample.status }}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h4 class="font-semibold text-primaryColor mb-3">
                Schedule & Assignment
              </h4>
              <div class="space-y-2">
                <div class="flex justify-between">
                  <span class="text-gray-600">Scheduled Date:</span>
                  <span class="font-medium">{{
                    formatDate(selectedSample.scheduled_date)
                  }}</span>
                </div>
                <div
                  v-if="selectedSample.scheduled_time"
                  class="flex justify-between"
                >
                  <span class="text-gray-600">Scheduled Time:</span>
                  <span class="font-medium">{{
                    formatTime(selectedSample.scheduled_time)
                  }}</span>
                </div>
                <div
                  v-if="selectedSample.actual_start_date"
                  class="flex justify-between"
                >
                  <span class="text-gray-600">Started:</span>
                  <span class="font-medium">{{
                    formatDate(selectedSample.actual_start_date)
                  }}</span>
                </div>
                <div
                  v-if="selectedSample.actual_end_date"
                  class="flex justify-between"
                >
                  <span class="text-gray-600">Completed:</span>
                  <span class="font-medium">{{
                    formatDate(selectedSample.actual_end_date)
                  }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">Assigned To:</span>
                  <span class="font-medium">{{
                    selectedSample.assigned_to_name || 'Unassigned'
                  }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Production Notes -->
          <div
            v-if="selectedSample.production_notes"
            class="bg-gray-50 p-4 rounded-lg"
          >
            <h4 class="font-semibold text-primaryColor mb-2">
              Production Notes
            </h4>
            <p class="text-gray-700">{{ selectedSample.production_notes }}</p>
          </div>

          <!-- Ingredient Availability Status -->
          <div class="bg-blue-50 p-4 rounded-lg">
            <h4 class="font-semibold text-primaryColor mb-3">
              Ingredient Availability Status
            </h4>

            <div
              v-if="selectedSample.ingredient_availability"
              class="space-y-3"
            >
              <!-- Real-time availability data -->
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div class="text-center">
                  <div class="text-2xl font-bold text-primaryColor">
                    {{
                      selectedSample.ingredient_availability.total_ingredients
                    }}
                  </div>
                  <div class="text-sm text-gray-600">Total Ingredients</div>
                </div>
                <div class="text-center">
                  <div class="text-2xl font-bold text-success">
                    {{
                      selectedSample.ingredient_availability
                        .available_ingredients
                    }}
                  </div>
                  <div class="text-sm text-gray-600">Available</div>
                </div>
                <div class="text-center">
                  <div
                    class="text-2xl font-bold"
                    :class="
                      selectedSample.ingredient_availability
                        .sufficient_for_production
                        ? 'text-success'
                        : 'text-error'
                    "
                  >
                    {{
                      selectedSample.ingredient_availability
                        .sufficient_for_production
                        ? 'Ready'
                        : 'Issues'
                    }}
                  </div>
                  <div class="text-sm text-gray-600">Status</div>
                </div>
              </div>

              <!-- Show insufficient ingredients if any -->
              <div
                v-if="
                  !selectedSample.ingredient_availability
                    .sufficient_for_production &&
                  selectedSample.ingredient_availability
                    .insufficient_ingredients.length > 0
                "
              >
                <div class="text-sm font-medium text-error mb-2">
                  Issues Found:
                </div>
                <div class="space-y-1">
                  <div
                    v-for="ingredient in selectedSample.ingredient_availability
                      .insufficient_ingredients"
                    :key="ingredient.ingredient_name"
                    class="flex justify-between text-xs bg-red-50 p-2 rounded"
                  >
                    <span>{{ ingredient.ingredient_name }}</span>
                    <span class="text-error">
                      Need {{ ingredient.required_quantity }}
                      {{ ingredient.unit }}, have
                      {{ ingredient.available_quantity }}
                    </span>
                  </div>
                </div>
              </div>

              <!-- Availability details -->
              <div
                v-if="selectedSample.ingredient_availability.ingredients"
                class="mt-3"
              >
                <div class="text-sm font-medium text-gray-700 mb-2">
                  Ingredient Details:
                </div>
                <div class="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto">
                  <div
                    v-for="ingredient in selectedSample.ingredient_availability
                      .ingredients"
                    :key="ingredient.ingredient_name"
                    class="flex justify-between items-center text-xs bg-white p-2 rounded border"
                  >
                    <span class="font-medium">{{
                      ingredient.ingredient_name
                    }}</span>
                    <div class="flex items-center gap-2">
                      <span
                        :class="
                          ingredient.is_available
                            ? 'text-success'
                            : 'text-error'
                        "
                      >
                        {{ ingredient.available_quantity }}/{{
                          ingredient.required_quantity
                        }}
                        {{ ingredient.unit }}
                      </span>
                      <span
                        class="badge badge-xs"
                        :class="
                          ingredient.is_available
                            ? 'badge-success'
                            : 'badge-error'
                        "
                      >
                        {{ ingredient.is_available ? 'OK' : 'Low' }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div v-else class="text-center text-gray-500 py-4">
              <AlertCircle class="w-8 h-8 mx-auto mb-2 opacity-50" />
              <div class="text-sm">Availability data not available</div>
            </div>
          </div>

          <!-- Quality Inspection Status -->
          <div
            v-if="
              selectedSample.quality_inspections &&
              selectedSample.quality_inspections.length > 0
            "
            class="bg-green-50 p-4 rounded-lg"
          >
            <h4 class="font-semibold text-primaryColor mb-3">
              Quality Inspection Results
            </h4>
            <div class="space-y-2">
              <div
                v-for="inspection in selectedSample.quality_inspections"
                :key="inspection.id"
                class="flex items-center justify-between p-3 bg-white rounded"
              >
                <div>
                  <div class="font-medium">
                    {{ inspection.inspection_type }}
                  </div>
                  <div class="text-sm text-gray-600">
                    {{ formatDate(inspection.inspection_date) }} by
                    {{ inspection.inspector_name }}
                  </div>
                </div>
                <div class="text-right">
                  <span
                    class="badge"
                    :class="
                      inspection.result === 'Pass'
                        ? 'badge-success'
                        : inspection.result === 'Fail'
                          ? 'badge-error'
                          : 'badge-warning'
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
            v-if="
              selectedSample.status === 'Planned' &&
              canStartProduction(selectedSample)
            "
            @click="startSampleProduction(selectedSample.id)"
            class="btn btn-success"
          >
            <Play class="w-4 h-4 mr-2" />
            Start Production
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
  .text-shadow-xs {
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  }
</style>
