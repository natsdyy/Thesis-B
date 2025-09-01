<script setup>
  import { ref, computed, onMounted } from 'vue';
  import {
    Trash2,
    Plus,
    Search,
    TrendingDown,
    AlertTriangle,
    DollarSign,
    RefreshCcw,
    Eye,
    BarChart3,
    Calendar,
    Package,
    Scale,
    Target,
    Leaf,
    X,
  } from 'lucide-vue-next';
  import { useProductionStore } from '../../stores/productionStore.js';
  import { useInventoryStore } from '../../stores/inventoryStore.js';

  const productionStore = useProductionStore();
  const inventoryStore = useInventoryStore();

  // Reactive state
  const activeTab = ref('waste');
  const searchQuery = ref('');
  const wasteTypeFilter = ref('');
  const dateFromFilter = ref('');
  const dateToFilter = ref('');
  const preventableFilter = ref('');
  const showCreateModal = ref(false);
  const showDetailsModal = ref(false);
  const selectedWaste = ref(null);
  const showAnalyticsModal = ref(false);

  // Form data
  const wasteForm = ref({
    production_batch_id: '',
    inventory_item_type_id: '',
    waste_type: 'Spoilage',
    quantity_wasted: '',
    unit: '',
    estimated_cost: '',
    reason: '',
    prevention_notes: '',
    waste_date: new Date().toISOString().split('T')[0],
    reported_by: '',
    is_preventable: true,
  });

  // Access store data
  const loading = computed(() => productionStore.loading);
  const error = computed(() => productionStore.error);
  const productionWaste = computed(() => productionStore.productionWaste);
  const itemTypes = computed(() => inventoryStore.itemTypes);
  const categories = computed(() => inventoryStore.categories);

  // Computed properties
  const filteredWaste = computed(() => {
    let filtered = productionWaste.value;

    if (searchQuery.value) {
      const query = searchQuery.value.toLowerCase();
      filtered = filtered.filter(
        (waste) =>
          waste.waste_record_number.toLowerCase().includes(query) ||
          waste.reason?.toLowerCase().includes(query) ||
          waste.item_type_name?.toLowerCase().includes(query)
      );
    }

    if (wasteTypeFilter.value) {
      filtered = filtered.filter(
        (waste) => waste.waste_type === wasteTypeFilter.value
      );
    }

    if (dateFromFilter.value) {
      filtered = filtered.filter(
        (waste) => waste.waste_date >= dateFromFilter.value
      );
    }

    if (dateToFilter.value) {
      filtered = filtered.filter(
        (waste) => waste.waste_date <= dateToFilter.value
      );
    }

    if (preventableFilter.value) {
      const isPreventable = preventableFilter.value === 'preventable';
      filtered = filtered.filter(
        (waste) => waste.is_preventable === isPreventable
      );
    }

    return filtered.sort(
      (a, b) => new Date(b.waste_date) - new Date(a.waste_date)
    );
  });

  const wasteStats = computed(() => {
    const total = productionWaste.value.length;
    const totalCost = productionWaste.value.reduce(
      (sum, waste) => sum + parseFloat(waste.estimated_cost || 0),
      0
    );
    const totalQuantity = productionWaste.value.reduce(
      (sum, waste) => sum + parseFloat(waste.quantity_wasted || 0),
      0
    );
    const preventableWaste = productionWaste.value.filter(
      (w) => w.is_preventable
    ).length;
    const preventableRate =
      total > 0 ? Math.round((preventableWaste / total) * 100) : 0;

    // This month stats
    const thisMonth = new Date().toISOString().slice(0, 7);
    const thisMonthWaste = productionWaste.value.filter((waste) =>
      waste.waste_date.startsWith(thisMonth)
    );
    const thisMonthCost = thisMonthWaste.reduce(
      (sum, waste) => sum + parseFloat(waste.estimated_cost || 0),
      0
    );
    const thisMonthQuantity = thisMonthWaste.reduce(
      (sum, waste) => sum + parseFloat(waste.quantity_wasted || 0),
      0
    );

    return {
      total,
      totalCost,
      totalQuantity,
      preventableRate,
      thisMonthCost,
      thisMonthQuantity,
      thisMonthCount: thisMonthWaste.length,
    };
  });

  const wasteByType = computed(() => {
    const types = {};
    productionWaste.value.forEach((waste) => {
      if (!types[waste.waste_type]) {
        types[waste.waste_type] = {
          count: 0,
          quantity: 0,
          cost: 0,
        };
      }
      types[waste.waste_type].count++;
      types[waste.waste_type].quantity += parseFloat(
        waste.quantity_wasted || 0
      );
      types[waste.waste_type].cost += parseFloat(waste.estimated_cost || 0);
    });
    return types;
  });

  const topWasteCategories = computed(() => {
    return Object.entries(wasteByType.value)
      .sort((a, b) => b[1].cost - a[1].cost)
      .slice(0, 5);
  });

  // Methods
  const getWasteTypeClass = (type) => {
    switch (type) {
      case 'Spoilage':
        return 'badge-error';
      case 'Overproduction':
        return 'badge-warning';
      case 'Trimming':
        return 'badge-info';
      case 'Contamination':
        return 'badge-error';
      case 'Equipment Failure':
        return 'badge-warning';
      default:
        return 'badge-neutral';
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatQuantity = (quantity, unit) => {
    return `${parseFloat(quantity || 0).toFixed(2)} ${unit}`;
  };

  const openCreateModal = () => {
    resetForm();
    showCreateModal.value = true;
  };

  const closeCreateModal = () => {
    showCreateModal.value = false;
    resetForm();
  };

  const openDetailsModal = (waste) => {
    selectedWaste.value = waste;
    showDetailsModal.value = true;
  };

  const closeDetailsModal = () => {
    showDetailsModal.value = false;
    selectedWaste.value = null;
  };

  const resetForm = () => {
    wasteForm.value = {
      production_batch_id: '',
      inventory_item_type_id: '',
      waste_type: 'Spoilage',
      quantity_wasted: '',
      unit: '',
      estimated_cost: '',
      reason: '',
      prevention_notes: '',
      waste_date: new Date().toISOString().split('T')[0],
      reported_by: '',
      is_preventable: true,
    };
  };

  const createWasteRecord = async () => {
    try {
      await productionStore.recordWaste({
        ...wasteForm.value,
        reported_by: 1, // TODO: Get from auth store
      });
      closeCreateModal();
      showToast('Waste record created successfully!', 'success');
    } catch (error) {
      showToast(error.message || 'Failed to create waste record', 'error');
    }
  };

  const refreshData = async () => {
    try {
      await Promise.all([
        productionStore.fetchProductionWaste(),
        inventoryStore.fetchItemTypes(),
        inventoryStore.fetchCategories(),
      ]);
    } catch (error) {
      console.error('Error refreshing data:', error);
    }
  };

  const showToast = (message, type) => {
    // TODO: Implement toast notification
    console.log(`${type}: ${message}`);
  };

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
          <Trash2 class="w-8 h-8" />
          Waste Management
        </h1>
        <p class="text-base-content/70 mt-1">
          Track and minimize production waste for sustainability
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
          Record Waste
        </button>
      </div>
    </div>

    <!-- Waste Stats Cards -->
    <div class="grid grid-cols-1 md:grid-cols-5 gap-6">
      <div class="bg-accentColor rounded-xl p-6 shadow-sm border">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-base-content/70">
              Total Records
            </p>
            <p class="text-2xl font-bold text-primaryColor">
              {{ wasteStats.total }}
            </p>
          </div>
          <Trash2 class="w-8 h-8 text-primaryColor opacity-80" />
        </div>
      </div>

      <div class="bg-accentColor rounded-xl p-6 shadow-sm border">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-base-content/70">Total Cost</p>
            <p class="text-2xl font-bold text-primaryColor">
              {{ formatCurrency(wasteStats.totalCost) }}
            </p>
          </div>
          <DollarSign class="w-8 h-8 text-error opacity-80" />
        </div>
      </div>

      <div class="bg-accentColor rounded-xl p-6 shadow-sm border">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-base-content/70">This Month</p>
            <p class="text-2xl font-bold text-primaryColor">
              {{ formatCurrency(wasteStats.thisMonthCost) }}
            </p>
          </div>
          <Calendar class="w-8 h-8 text-warning opacity-80" />
        </div>
      </div>

      <div class="bg-accentColor rounded-xl p-6 shadow-sm border">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-base-content/70">Preventable</p>
            <p class="text-2xl font-bold text-primaryColor">
              {{ wasteStats.preventableRate }}%
            </p>
          </div>
          <Target class="w-8 h-8 text-info opacity-80" />
        </div>
      </div>

      <div class="bg-accentColor rounded-xl p-6 shadow-sm border">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-base-content/70">
              Reduction Goal
            </p>
            <p class="text-2xl font-bold text-primaryColor">-15%</p>
          </div>
          <TrendingDown class="w-8 h-8 text-success opacity-80" />
        </div>
      </div>
    </div>

    <!-- Tabs -->
    <div class="tabs tabs-boxed bg-accentColor w-fit">
      <a
        class="tab"
        :class="{ 'tab-active': activeTab === 'waste' }"
        @click="activeTab = 'waste'"
      >
        Waste Records
      </a>
      <a
        class="tab"
        :class="{ 'tab-active': activeTab === 'analytics' }"
        @click="activeTab = 'analytics'"
      >
        Analytics
      </a>
      <a
        class="tab"
        :class="{ 'tab-active': activeTab === 'reduction' }"
        @click="activeTab = 'reduction'"
      >
        Reduction Plans
      </a>
    </div>

    <!-- Waste Records Tab -->
    <div v-if="activeTab === 'waste'">
      <!-- Filters -->
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
                placeholder="Search waste records..."
                class="input input-bordered w-full"
              />
            </div>
          </div>

          <div class="form-control">
            <select v-model="wasteTypeFilter" class="select select-bordered">
              <option value="">All Types</option>
              <option value="Spoilage">Spoilage</option>
              <option value="Overproduction">Overproduction</option>
              <option value="Trimming">Trimming</option>
              <option value="Contamination">Contamination</option>
              <option value="Equipment Failure">Equipment Failure</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div class="form-control">
            <select v-model="preventableFilter" class="select select-bordered">
              <option value="">All Waste</option>
              <option value="preventable">Preventable</option>
              <option value="non-preventable">Non-preventable</option>
            </select>
          </div>

          <div class="form-control">
            <input
              v-model="dateFromFilter"
              type="date"
              class="input input-bordered"
              placeholder="From date"
            />
          </div>

          <div class="form-control">
            <input
              v-model="dateToFilter"
              type="date"
              class="input input-bordered"
              placeholder="To date"
            />
          </div>
        </div>
      </div>

      <!-- Waste Records List -->
      <div v-if="loading" class="flex justify-center py-12">
        <span
          class="loading loading-spinner loading-lg text-primaryColor"
        ></span>
      </div>

      <div
        v-else-if="filteredWaste.length === 0"
        class="text-center py-12 bg-accentColor rounded-xl"
      >
        <Leaf class="w-16 h-16 text-success mx-auto mb-4" />
        <p class="text-lg font-medium text-success">No waste records found</p>
        <p class="text-base-content/50">Great job on minimizing waste!</p>
      </div>

      <div v-else class="bg-accentColor rounded-xl shadow-sm border">
        <div class="p-6 border-b">
          <h2 class="text-xl font-semibold text-primaryColor">Waste Records</h2>
        </div>

        <div class="divide-y divide-base-200">
          <div
            v-for="waste in filteredWaste"
            :key="waste.id"
            class="p-6 hover:bg-base-50 transition-colors cursor-pointer"
            @click="openDetailsModal(waste)"
          >
            <div class="flex items-center justify-between">
              <div class="flex-1">
                <div class="flex items-center gap-3 mb-2">
                  <h3 class="text-lg font-semibold text-primaryColor">
                    {{ waste.waste_record_number }}
                  </h3>
                  <div
                    class="badge"
                    :class="getWasteTypeClass(waste.waste_type)"
                  >
                    {{ waste.waste_type }}
                  </div>
                  <div v-if="waste.is_preventable" class="badge badge-warning">
                    Preventable
                  </div>
                </div>

                <div
                  class="flex items-center gap-6 text-sm text-base-content/70 mb-2"
                >
                  <span v-if="waste.item_type_name">{{
                    waste.item_type_name
                  }}</span>
                  <span>{{
                    formatQuantity(waste.quantity_wasted, waste.unit)
                  }}</span>
                  <span>{{ formatCurrency(waste.estimated_cost) }}</span>
                  <span>{{ formatDate(waste.waste_date) }}</span>
                  <span v-if="waste.reported_by_name"
                    >Reported by: {{ waste.reported_by_name }}</span
                  >
                </div>

                <div v-if="waste.reason" class="text-sm text-base-content/60">
                  Reason: {{ waste.reason }}
                </div>
              </div>

              <div class="flex items-center gap-2">
                <button
                  @click.stop="openDetailsModal(waste)"
                  class="btn btn-ghost btn-sm"
                >
                  <Eye class="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Analytics Tab -->
    <div v-else-if="activeTab === 'analytics'">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Waste by Type -->
        <div class="bg-accentColor rounded-xl p-6 shadow-sm border">
          <h3 class="text-lg font-semibold text-primaryColor mb-4">
            Waste by Type
          </h3>
          <div class="space-y-3">
            <div
              v-for="[type, data] in topWasteCategories"
              :key="type"
              class="flex items-center justify-between"
            >
              <div class="flex items-center gap-3">
                <div class="badge" :class="getWasteTypeClass(type)">
                  {{ type }}
                </div>
                <span class="text-sm">{{ data.count }} records</span>
              </div>
              <div class="text-right">
                <p class="text-sm font-medium text-primaryColor">
                  {{ formatCurrency(data.cost) }}
                </p>
                <p class="text-xs text-base-content/60">
                  {{ data.quantity.toFixed(2) }} units
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Monthly Trend -->
        <div class="bg-accentColor rounded-xl p-6 shadow-sm border">
          <h3 class="text-lg font-semibold text-primaryColor mb-4">
            Monthly Trend
          </h3>
          <div class="text-center py-8">
            <BarChart3 class="w-16 h-16 text-base-content/30 mx-auto mb-4" />
            <p class="text-base-content/70">
              Waste trend chart will be implemented here
            </p>
          </div>
        </div>
      </div>

      <!-- Waste Reduction Opportunities -->
      <div class="bg-accentColor rounded-xl p-6 shadow-sm border">
        <h3
          class="text-lg font-semibold text-primaryColor mb-4 flex items-center gap-2"
        >
          <Target class="w-5 h-5" />
          Reduction Opportunities
        </h3>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div class="bg-warning/10 border border-warning/20 rounded-lg p-4">
            <h4 class="font-medium text-warning mb-2">Spoilage Reduction</h4>
            <p class="text-sm text-base-content/70 mb-3">
              Improve inventory rotation and storage conditions
            </p>
            <div class="text-xs text-base-content/60">
              Potential savings:
              {{ formatCurrency(wasteByType.value.Spoilage?.cost * 0.3 || 0) }}
            </div>
          </div>

          <div class="bg-info/10 border border-info/20 rounded-lg p-4">
            <h4 class="font-medium text-info mb-2">Portion Control</h4>
            <p class="text-sm text-base-content/70 mb-3">
              Optimize recipe portions and batch sizes
            </p>
            <div class="text-xs text-base-content/60">
              Potential savings:
              {{
                formatCurrency(
                  wasteByType.value.Overproduction?.cost * 0.5 || 0
                )
              }}
            </div>
          </div>

          <div class="bg-success/10 border border-success/20 rounded-lg p-4">
            <h4 class="font-medium text-success mb-2">Equipment Maintenance</h4>
            <p class="text-sm text-base-content/70 mb-3">
              Regular maintenance to prevent failures
            </p>
            <div class="text-xs text-base-content/60">
              Potential savings:
              {{
                formatCurrency(
                  (wasteByType.value['Equipment Failure']?.cost || 0) * 0.8
                )
              }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Reduction Plans Tab -->
    <div v-else-if="activeTab === 'reduction'">
      <div class="bg-accentColor rounded-xl p-6 shadow-sm border">
        <h3 class="text-lg font-semibold text-primaryColor mb-4">
          Waste Reduction Plans
        </h3>

        <div class="text-center py-12">
          <Leaf class="w-16 h-16 text-success mx-auto mb-4" />
          <p class="text-lg font-medium text-base-content/70">
            Reduction Plans
          </p>
          <p class="text-base-content/50">
            Waste reduction strategies and plans will be managed here
          </p>
        </div>
      </div>
    </div>

    <!-- Create Waste Record Modal -->
    <dialog :class="{ 'modal modal-open': showCreateModal }" class="modal">
      <div class="modal-box max-w-2xl">
        <h3 class="font-bold text-lg mb-4 text-primaryColor">Record Waste</h3>

        <form @submit.prevent="createWasteRecord" class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="form-control">
              <label class="label">
                <span class="label-text font-medium">Waste Type</span>
                <span class="label-text-alt text-error">*</span>
              </label>
              <select
                v-model="wasteForm.waste_type"
                class="select select-bordered"
                required
              >
                <option value="Spoilage">Spoilage</option>
                <option value="Overproduction">Overproduction</option>
                <option value="Trimming">Trimming</option>
                <option value="Contamination">Contamination</option>
                <option value="Equipment Failure">Equipment Failure</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text font-medium">Item Type</span>
              </label>
              <select
                v-model="wasteForm.inventory_item_type_id"
                class="select select-bordered"
              >
                <option value="">Select Item Type (Optional)</option>
                <optgroup
                  v-for="category in categories"
                  :key="category.id"
                  :label="category.name"
                >
                  <option
                    v-for="itemType in itemTypes.filter(
                      (item) => item.category_id === category.id
                    )"
                    :key="itemType.id"
                    :value="itemType.id"
                  >
                    {{ itemType.name }}
                  </option>
                </optgroup>
              </select>
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text font-medium">Quantity Wasted</span>
                <span class="label-text-alt text-error">*</span>
              </label>
              <input
                v-model="wasteForm.quantity_wasted"
                type="number"
                step="0.001"
                min="0.001"
                class="input input-bordered"
                required
              />
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text font-medium">Unit</span>
                <span class="label-text-alt text-error">*</span>
              </label>
              <input
                v-model="wasteForm.unit"
                type="text"
                class="input input-bordered"
                placeholder="kg, liters, pieces"
                required
              />
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text font-medium">Estimated Cost</span>
              </label>
              <input
                v-model="wasteForm.estimated_cost"
                type="number"
                step="0.01"
                min="0"
                class="input input-bordered"
              />
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text font-medium">Waste Date</span>
                <span class="label-text-alt text-error">*</span>
              </label>
              <input
                v-model="wasteForm.waste_date"
                type="date"
                class="input input-bordered"
                required
              />
            </div>
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium">Reason</span>
            </label>
            <textarea
              v-model="wasteForm.reason"
              class="textarea textarea-bordered"
              rows="3"
              placeholder="Describe the cause of waste..."
            ></textarea>
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium">Prevention Notes</span>
            </label>
            <textarea
              v-model="wasteForm.prevention_notes"
              class="textarea textarea-bordered"
              rows="2"
              placeholder="How can this waste be prevented in the future?"
            ></textarea>
          </div>

          <div class="form-control">
            <label class="cursor-pointer label">
              <input
                v-model="wasteForm.is_preventable"
                type="checkbox"
                class="checkbox checkbox-primary"
              />
              <span class="label-text ml-2">This waste was preventable</span>
            </label>
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
              Record Waste
            </button>
          </div>
        </form>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button @click="closeCreateModal">close</button>
      </form>
    </dialog>

    <!-- Waste Details Modal -->
    <dialog :class="{ 'modal modal-open': showDetailsModal }" class="modal">
      <div class="modal-box max-w-3xl" v-if="selectedWaste">
        <h3 class="font-bold text-lg mb-4 text-primaryColor">
          Waste Record Details
        </h3>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div class="space-y-4">
            <div>
              <h4 class="font-semibold text-primaryColor mb-2">
                Waste Information
              </h4>
              <div class="bg-base-100 p-4 rounded-lg space-y-2">
                <div class="flex justify-between">
                  <span class="text-base-content/70">Record #:</span>
                  <span class="font-medium">{{
                    selectedWaste.waste_record_number
                  }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-base-content/70">Waste Type:</span>
                  <div
                    class="badge"
                    :class="getWasteTypeClass(selectedWaste.waste_type)"
                  >
                    {{ selectedWaste.waste_type }}
                  </div>
                </div>
                <div class="flex justify-between">
                  <span class="text-base-content/70">Item:</span>
                  <span class="font-medium">{{
                    selectedWaste.item_type_name || 'N/A'
                  }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-base-content/70">Quantity:</span>
                  <span class="font-medium">{{
                    formatQuantity(
                      selectedWaste.quantity_wasted,
                      selectedWaste.unit
                    )
                  }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-base-content/70">Cost:</span>
                  <span class="font-medium">{{
                    formatCurrency(selectedWaste.estimated_cost)
                  }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-base-content/70">Date:</span>
                  <span class="font-medium">{{
                    formatDate(selectedWaste.waste_date)
                  }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-base-content/70">Preventable:</span>
                  <span
                    class="font-medium"
                    :class="
                      selectedWaste.is_preventable
                        ? 'text-warning'
                        : 'text-success'
                    "
                  >
                    {{ selectedWaste.is_preventable ? 'Yes' : 'No' }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div class="space-y-4">
            <div v-if="selectedWaste.reason">
              <h4 class="font-semibold text-primaryColor mb-2">Reason</h4>
              <div class="bg-base-100 p-4 rounded-lg">
                <p class="text-sm">{{ selectedWaste.reason }}</p>
              </div>
            </div>

            <div v-if="selectedWaste.prevention_notes">
              <h4 class="font-semibold text-primaryColor mb-2">
                Prevention Notes
              </h4>
              <div class="bg-base-100 p-4 rounded-lg">
                <p class="text-sm">{{ selectedWaste.prevention_notes }}</p>
              </div>
            </div>

            <div>
              <h4 class="font-semibold text-primaryColor mb-2">Reporter</h4>
              <div class="bg-base-100 p-4 rounded-lg">
                <p class="text-sm">
                  {{ selectedWaste.reported_by_name || 'Unknown' }}
                </p>
                <p class="text-xs text-base-content/60">
                  Reported on {{ formatDate(selectedWaste.created_at) }}
                </p>
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
