<template>
  <div class="container mx-auto p-2 sm:p-4 lg:p-6 max-w-6xl">
    <!-- Header -->
    <div class="text-center mb-4 sm:mb-6 lg:mb-8">
      <h1
        class="text-2xl sm:text-3xl lg:text-4xl font-bold text-primaryColor mb-2 text-shadow-xs"
      >
        Main Branch Inventory Management
      </h1>
      <p class="text-sm sm:text-base text-black/50 px-2">
        Track and manage inventory levels, consumption, and stock valuation for
        Countryside Steakhouse.
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
          {{ stats.total_item_types || 0 }}
        </div>
        <div class="stat-desc text-black/50 !text-xs sm:text-sm">
          Unique item types
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
        <div class="stat-title text-black/50 text-xs sm:text-sm">Available</div>
        <div
          class="stat-value text-success text-lg sm:text-xl lg:text-2xl xl:text-3xl"
        >
          {{ stats.total_inventory_entries || 0 }}
        </div>
        <div class="stat-desc text-black/50 !text-xs sm:text-sm">
          Stock entries
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
          Expiring Soon
        </div>
        <div
          class="stat-value text-warning text-lg sm:text-xl lg:text-2xl xl:text-3xl"
        >
          {{ stats.expiring_soon_count || 0 }}
        </div>
        <div class="stat-desc text-black/50 !text-xs sm:text-sm">
          Within 7 days
        </div>
      </div>

      <div
        class="stat sm:!border sm:!border-l-0 sm:!border-r-2 sm:!border-t-0 sm:!border-b-0 sm:!border-black/10 sm:border-dashed hover:bg-secondaryColor/10"
      >
        <div class="stat-figure">
          <XCircle class="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-error" />
        </div>
        <div class="stat-title text-black/50 !text-xs sm:text-sm">Expired</div>
        <div
          class="stat-value text-error text-lg sm:text-xl lg:text-2xl xl:text-3xl"
        >
          {{ stats.expired_count || 0 }}
        </div>
        <div class="stat-desc text-black/50 !text-xs sm:text-sm">
          Items expired
        </div>
      </div>

      <div
        class="stat sm:!border sm:!border-l-0 sm:!border-t-0 sm:!border-b-0 sm:!border-black/10 sm:border-dashed hover:bg-secondaryColor/10"
      >
        <div class="stat-figure">
          <PhilippinePeso
            class="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-black/80"
          />
        </div>
        <div class="stat-title text-black/50 !text-xs sm:text-sm">
          Total Value
        </div>
        <div
          class="stat-value text-black/80 text-lg sm:text-xl lg:text-2xl xl:text-3xl"
        >
          ₱{{ (stats.total_available_value || 0).toLocaleString() }}
        </div>
        <div class="stat-desc text-black/50 !text-xs sm:text-sm">
          Available stock
        </div>
      </div>
    </div>

    <!-- Action Buttons -->
    <div
      class="flex flex-wrap gap-2 mb-4 sm:mb-6 justify-center sm:justify-start"
    >
      <button
        @click="openConsumptionModal"
        class="btn btn-outline btn-sm text-primaryColor hover:bg-primaryColor/10 font-thin hover:border-none hover:shadow-none"
        :disabled="loading"
      >
        <Minus class="w-4 h-4 mr-1" />
        Record Usage
      </button>
      <button
        @click="openAdjustmentModal"
        class="btn btn-outline btn-sm text-warning hover:bg-warning/10 font-thin hover:border-none hover:shadow-none"
        :disabled="loading"
      >
        <RefreshCcw class="w-4 h-4 mr-1" />
        Stock Adjustment
      </button>
      <button
        @click="refreshData"
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
        @click="activeTab = 'overview'"
        class="tab"
        :class="{ 'tab-active': activeTab === 'overview' }"
      >
        <BarChart3 class="w-4 h-4 mr-1" />
        Overview
      </button>
      <button
        @click="activeTab = 'inventory'"
        class="tab"
        :class="{ 'tab-active': activeTab === 'inventory' }"
      >
        <Package class="w-4 h-4 mr-1" />
        Inventory List
      </button>
      <button
        @click="activeTab = 'alerts'"
        class="tab"
        :class="{ 'tab-active': activeTab === 'alerts' }"
      >
        <Bell class="w-4 h-4 mr-1" />
        Alerts
        <span v-if="alertsCount > 0" class="badge badge-error badge-sm ml-1">
          {{ alertsCount }}
        </span>
      </button>
      <button
        @click="activeTab = 'reports'"
        class="tab"
        :class="{ 'tab-active': activeTab === 'reports' }"
      >
        <TrendingDown class="w-4 h-4 mr-1" />
        Reports
      </button>
    </div>

    <!-- Tab Content -->
    <div
      class="card bg-accentColor shadow-xl mb-4 sm:mb-6 border border-black/10"
    >
      <div class="card-body p-3 sm:p-4 lg:p-6">
        <!-- Overview Tab -->
        <div v-if="activeTab === 'overview'" class="space-y-6">
          <h2
            class="card-title text-primaryColor text-lg sm:text-xl lg:text-2xl mb-4"
          >
            Inventory Overview
          </h2>

          <!-- Category Summary -->
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div
              v-for="summary in inventorySummary"
              :key="summary.category_id"
              class="card bg-base-100 border border-gray-200 hover:shadow-md transition-shadow"
            >
              <div class="card-body p-4">
                <h3 class="card-title text-sm font-semibold text-primaryColor">
                  {{ summary.category_name }}
                </h3>
                <div class="space-y-2 text-sm">
                  <p><strong>Items:</strong> {{ summary.unique_items }}</p>
                  <p>
                    <strong>Quantity:</strong>
                    {{
                      parseFloat(summary.total_quantity || 0).toLocaleString()
                    }}
                  </p>
                  <p>
                    <strong>Value:</strong> ₱{{
                      parseFloat(summary.total_value || 0).toLocaleString()
                    }}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <!-- Recent Activity Placeholder -->
          <div class="card bg-base-100 border border-gray-200">
            <div class="card-body p-4">
              <h3
                class="card-title text-sm font-semibold text-primaryColor mb-4"
              >
                Recent Activity
              </h3>
              <p class="text-center text-gray-500 py-8">
                Recent inventory transactions will appear here...
              </p>
            </div>
          </div>
        </div>

        <!-- Inventory List Tab -->
        <div v-if="activeTab === 'inventory'" class="space-y-6">
          <div
            class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4"
          >
            <h2
              class="card-title text-primaryColor text-lg sm:text-xl lg:text-2xl"
            >
              Current Inventory
            </h2>

            <!-- Search and Filters -->
            <div class="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <div class="join w-full">
                <input
                  v-model="searchQuery"
                  type="text"
                  placeholder="Search items..."
                  class="input input-bordered input-sm join-item"
                />
                <button class="btn btn-sm join-item">
                  <Search class="w-4 h-4" />
                </button>
              </div>

              <select
                v-model="categoryFilter"
                class="select select-bordered select-sm"
              >
                <option value="">All Categories</option>
                <option
                  v-for="category in categories"
                  :key="category.id"
                  :value="category.id"
                >
                  {{ category.name }}
                </option>
              </select>
            </div>
          </div>

          <!-- Grouped Inventory Display -->
          <div class="space-y-4">
            <div
              v-for="item in groupedInventory"
              :key="item.id"
              class="inventory-group border border-gray-200 rounded-lg overflow-hidden"
            >
              <!-- Item Header (Collapsible) -->
              <div
                class="item-header cursor-pointer hover:bg-base-200 transition-colors"
                @click="toggleItem(item.id)"
              >
                <div class="flex justify-between items-center p-4 bg-base-100">
                  <div class="flex-1">
                    <h3 class="font-semibold text-primaryColor text-lg">
                      {{ item.item_type_name }}
                    </h3>
                    <p class="text-sm text-gray-600">
                      {{ item.category_name }} • {{ item.unit_of_measure }}
                    </p>
                  </div>
                  <div class="text-right mr-4">
                    <div class="text-xl font-bold text-primaryColor">
                      {{ parseFloat(item.total_quantity).toLocaleString() }}
                    </div>
                    <div class="text-sm text-gray-600">Total Stock</div>
                  </div>
                  <div class="flex items-center gap-2">
                    <span
                      v-if="item.expiring_soon_count > 0"
                      class="badge badge-warning badge-sm"
                    >
                      {{ item.expiring_soon_count }} expiring
                    </span>
                    <ChevronDown
                      v-if="!item.expanded"
                      class="w-5 h-5 text-gray-500"
                    />
                    <ChevronUp v-else class="w-5 h-5 text-gray-500" />
                  </div>
                </div>
              </div>

              <!-- Batch Details (Expandable) -->
              <div v-if="item.expanded" class="batch-details bg-base-50">
                <div class="overflow-x-auto">
                  <table class="table table-zebra w-full table-xs">
                    <thead>
                      <tr class="bg-base-200">
                        <th>Batch/Lot #</th>
                        <th>Item Name</th>
                        <th>Quantity</th>
                        <th>Expiry Date</th>
                        <th>Received Date</th>
                        <th>Supplier</th>
                        <th>Unit Cost</th>
                        <th>Total Value</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr
                        v-for="batch in item.batches"
                        :key="batch.id"
                        :class="getBatchRowClass(batch)"
                        class="hover:bg-base-100"
                      >
                        <td>
                          <span class="font-mono text-sm">{{
                            batch.batch_number || 'N/A'
                          }}</span>
                        </td>
                        <td>
                          <span class="font-medium">
                            {{ batch.item_name || 'N/A' }}
                          </span>
                        </td>
                        <td>
                          <span class="font-medium">
                            {{ parseFloat(batch.quantity).toLocaleString() }}
                          </span>
                        </td>
                        <td>
                          <span
                            :class="getExpiryColor(batch.expiry_date)"
                            class="font-medium"
                          >
                            {{ formatDate(batch.expiry_date) }}
                          </span>
                        </td>
                        <td>
                          <span class="text-sm text-gray-600">
                            {{ formatDate(batch.received_date) }}
                          </span>
                        </td>
                        <td>
                          <span class="text-sm">{{
                            batch.supplier_name || 'N/A'
                          }}</span>
                        </td>
                        <td>
                          <span class="text-sm"
                            >₱{{
                              parseFloat(batch.unit_cost || 0).toLocaleString()
                            }}</span
                          >
                        </td>
                        <td>
                          <span class="font-medium"
                            >₱{{
                              parseFloat(
                                batch.total_value || 0
                              ).toLocaleString()
                            }}</span
                          >
                        </td>
                        <td>
                          <span
                            :class="getStatusColor(batch.status)"
                            class="badge badge-xs"
                          >
                            {{ batch.status }}
                          </span>
                        </td>
                        <td>
                          <div class="dropdown dropdown-end">
                            <button class="btn btn-ghost btn-xs">
                              <EllipsisVertical class="w-3 h-3" />
                            </button>
                            <ul
                              class="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-40 z-50"
                            >
                              <li>
                                <button
                                  @click="consumeBatch(batch)"
                                  class="text-sm"
                                >
                                  <Minus class="w-3 h-3 mr-1" />
                                  Consume
                                </button>
                              </li>
                              <li>
                                <button
                                  @click="adjustBatch(batch)"
                                  class="text-sm"
                                >
                                  <RefreshCcw class="w-3 h-3 mr-1" />
                                  Adjust
                                </button>
                              </li>
                              <li>
                                <button
                                  @click="viewBatchDetails(batch)"
                                  class="text-sm"
                                >
                                  <MessageSquare class="w-3 h-3 mr-1" />
                                  Details
                                </button>
                              </li>
                            </ul>
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <!-- Empty State -->
            <div v-if="groupedInventory.length === 0" class="text-center py-12">
              <Package class="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h3 class="text-lg font-medium text-gray-600 mb-2">
                No inventory found
              </h3>
              <p class="text-gray-500">Try adjusting your search or filters</p>
            </div>
          </div>

          <!-- Pagination -->
          <div v-if="totalPages > 1" class="flex justify-center">
            <div class="join">
              <button
                @click="currentPage = Math.max(1, currentPage - 1)"
                class="join-item btn btn-sm"
                :disabled="currentPage === 1"
              >
                «
              </button>
              <button
                v-for="page in totalPages"
                :key="page"
                @click="currentPage = page"
                class="join-item btn btn-sm"
                :class="{ 'btn-active': currentPage === page }"
              >
                {{ page }}
              </button>
              <button
                @click="currentPage = Math.min(totalPages, currentPage + 1)"
                class="join-item btn btn-sm"
                :disabled="currentPage === totalPages"
              >
                »
              </button>
            </div>
          </div>
        </div>

        <!-- Alerts Tab -->
        <div v-if="activeTab === 'alerts'" class="space-y-6">
          <div
            class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4"
          >
            <h2
              class="card-title text-primaryColor text-lg sm:text-xl lg:text-2xl"
            >
              Inventory Alerts
            </h2>

            <div class="tabs tabs-boxed">
              <button
                @click="alertTab = 'expiring'"
                class="tab tab-sm"
                :class="{ 'tab-active': alertTab === 'expiring' }"
              >
                Expiring Soon
              </button>
              <button
                @click="alertTab = 'lowstock'"
                class="tab tab-sm"
                :class="{ 'tab-active': alertTab === 'lowstock' }"
              >
                Low Stock
              </button>
            </div>
          </div>

          <!-- Expiring Items -->
          <div v-if="alertTab === 'expiring'" class="space-y-4">
            <div
              v-for="item in expiringItems"
              :key="item.id"
              class="alert alert-warning"
            >
              <AlertTriangle class="w-6 h-6" />
              <div>
                <h3 class="font-bold">{{ item.item_type_name }}</h3>
                <div class="text-sm">
                  Expires: {{ formatDate(item.expiry_date) }} | Quantity:
                  {{ parseFloat(item.quantity).toLocaleString() }}
                  {{ item.unit_of_measure }}
                </div>
              </div>
            </div>

            <div v-if="expiringItems.length === 0" class="text-center py-8">
              <CheckCircle class="w-12 h-12 mx-auto text-success mb-2" />
              <p class="text-gray-500">No items expiring soon!</p>
            </div>
          </div>

          <!-- Low Stock Items -->
          <div v-if="alertTab === 'lowstock'" class="space-y-4">
            <div
              v-for="item in lowStockItems"
              :key="item.item_type_id"
              class="alert alert-error"
            >
              <XCircle class="w-6 h-6" />
              <div>
                <h3 class="font-bold">{{ item.item_type_name }}</h3>
                <div class="text-sm">
                  Current:
                  {{ parseFloat(item.current_stock).toLocaleString() }} | Min
                  Level: {{ parseFloat(item.min_stock_level).toLocaleString() }}
                </div>
              </div>
            </div>

            <div v-if="lowStockItems.length === 0" class="text-center py-8">
              <CheckCircle class="w-12 h-12 mx-auto text-success mb-2" />
              <p class="text-gray-500">No low stock alerts!</p>
            </div>
          </div>
        </div>

        <!-- Reports Tab -->
        <div v-if="activeTab === 'reports'" class="space-y-6">
          <h2
            class="card-title text-primaryColor text-lg sm:text-xl lg:text-2xl mb-4"
          >
            Inventory Reports
          </h2>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Category Value Report -->
            <div class="card bg-base-100 border border-gray-200">
              <div class="card-body p-4">
                <h3
                  class="card-title text-sm font-semibold text-primaryColor mb-4"
                >
                  Category Value Summary
                </h3>
                <div class="space-y-2">
                  <div
                    v-for="summary in inventorySummary"
                    :key="summary.category_id"
                    class="flex justify-between items-center p-2 bg-gray-50 rounded"
                  >
                    <span class="text-sm font-medium">{{
                      summary.category_name
                    }}</span>
                    <span class="text-sm font-bold"
                      >₱{{
                        parseFloat(summary.total_value || 0).toLocaleString()
                      }}</span
                    >
                  </div>
                </div>
              </div>
            </div>

            <!-- Quick Stats -->
            <div class="card bg-base-100 border border-gray-200">
              <div class="card-body p-4">
                <h3
                  class="card-title text-sm font-semibold text-primaryColor mb-4"
                >
                  Quick Statistics
                </h3>
                <div class="space-y-3">
                  <div class="flex justify-between">
                    <span class="text-sm">Total Categories:</span>
                    <span class="text-sm font-bold">{{
                      categories.length
                    }}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-sm">Total Item Types:</span>
                    <span class="text-sm font-bold">{{
                      itemTypes.length
                    }}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-sm">Active Items:</span>
                    <span class="text-sm font-bold">{{
                      currentInventory.length
                    }}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-sm">Total Value:</span>
                    <span class="text-sm font-bold"
                      >₱{{
                        (stats.total_available_value || 0).toLocaleString()
                      }}</span
                    >
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Export Options -->
          <div class="card bg-base-100 border border-gray-200">
            <div class="card-body p-4">
              <h3
                class="card-title text-sm font-semibold text-primaryColor mb-4"
              >
                Export Reports
              </h3>
              <div class="flex flex-wrap gap-2">
                <button class="btn btn-sm btn-outline">
                  <History class="w-4 h-4 mr-1" />
                  Export Inventory List
                </button>
                <button class="btn btn-sm btn-outline">
                  <BarChart3 class="w-4 h-4 mr-1" />
                  Export Value Report
                </button>
                <button class="btn btn-sm btn-outline">
                  <TrendingDown class="w-4 h-4 mr-1" />
                  Export Transaction History
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modals -->
    <InventoryConsumptionModal
      :show="modal.show && modal.type === 'consumption'"
      :categories="categories"
      :item-types="itemTypes"
      :current-inventory="currentInventory"
      :loading="loading"
      @close="closeModal"
      @submit="handleConsumption"
    />

    <InventoryAdjustmentModal
      :show="modal.show && modal.type === 'adjustment'"
      :categories="categories"
      :item-types="itemTypes"
      :current-inventory="currentInventory"
      :loading="loading"
      :preselected-item="modal.item"
      @close="closeModal"
      @submit="handleAdjustment"
    />

    <!-- Toast Notifications -->
    <div
      v-if="toast.show"
      class="toast toast-end"
      :class="
        toast.type === 'error' ? 'alert alert-error' : 'alert alert-success'
      "
    >
      <span>{{ toast.message }}</span>
    </div>
  </div>
</template>

<script setup>
  import { ref, computed, onMounted, watch } from 'vue';
  import {
    Package,
    Plus,
    Minus,
    Search,
    RefreshCcw,
    Bell,
    AlertTriangle,
    XCircle,
    CheckCircle,
    EllipsisVertical,
    MessageSquare,
    PhilippinePeso,
    BarChart3,
    History,
    TrendingDown,
    ChevronDown,
    ChevronUp,
  } from 'lucide-vue-next';
  import { useInventoryStore } from '../../stores/inventoryStore.js';
  import InventoryConsumptionModal from '../../components/scm/InventoryConsumptionModal.vue';
  import InventoryAdjustmentModal from '../../components/scm/InventoryAdjustmentModal.vue';

  // Store
  const inventoryStore = useInventoryStore();

  // Access store values as computed properties
  const categories = computed(() => inventoryStore.categories);
  const itemTypes = computed(() => inventoryStore.itemTypes);
  const currentInventory = computed(() => inventoryStore.currentInventory);
  const inventorySummary = computed(() => inventoryStore.inventorySummary);
  const stats = computed(() => inventoryStore.stats);
  const expiringItems = computed(() => inventoryStore.expiringItems);
  const lowStockItems = computed(() => inventoryStore.lowStockItems);
  const loading = computed(() => inventoryStore.loading);
  const error = computed(() => inventoryStore.error);
  const alertsCount = computed(() => inventoryStore.alertsCount);

  // Local state
  const activeTab = ref('overview');
  const alertTab = ref('expiring');
  const currentPage = ref(1);
  const itemsPerPage = ref(12);
  const searchQuery = ref('');
  const categoryFilter = ref('');
  const expandedItems = ref(new Set());

  // Modal state
  const modal = ref({
    type: null,
    show: false,
    item: null,
  });

  // Form data
  const stockForm = ref({
    category_id: '',
    item_type_id: '',
    item_name: '',
    quantity: '',
    unit_cost: '',
    batch_number: '',
    expiry_date: '',
    notes: '',
    supplier_id: null,
    received_by: 'SCM User',
  });

  // Toast state
  const toast = ref({ show: false, type: '', message: '' });

  // Computed properties for grouped inventory
  const groupedInventory = computed(() => {
    const grouped = {};

    // Group inventory by item type
    currentInventory.value?.forEach((batch) => {
      const itemKey = batch.item_type_id;
      if (!grouped[itemKey]) {
        grouped[itemKey] = {
          id: batch.item_type_id,
          item_type_name: batch.item_type_name,
          category_name: batch.category_name,
          unit_of_measure: batch.unit_of_measure,
          total_quantity: 0,
          batches: [],
          expanded: expandedItems.value.has(batch.item_type_id),
          expiring_soon_count: 0,
          receipts_count: 0, // Initialize receipts_count
          first_received_at: null, // Initialize first_received_at
          status: 'active', // Default to active
        };
      }

      grouped[itemKey].batches.push(batch);
      grouped[itemKey].total_quantity += parseFloat(batch.quantity || 0);

      // Count expiring soon items
      if (batch.expiry_date) {
        const daysUntilExpiry = getDaysUntilExpiry(batch.expiry_date);
        if (daysUntilExpiry <= 7 && daysUntilExpiry > 0) {
          grouped[itemKey].expiring_soon_count++;
        }
      }

      // Update receipts_count and first_received_at
      const itemType = itemTypes.value.find(
        (type) => type.id === batch.item_type_id
      );
      if (itemType) {
        grouped[itemKey].receipts_count = parseInt(
          itemType.receipts_count || 0,
          10
        );
        grouped[itemKey].first_received_at = itemType.first_received_at;
        grouped[itemKey].status = itemType.status;
      }
    });

    // Sort batches by expiry date (FEFO - First Expired, First Out)
    Object.values(grouped).forEach((item) => {
      item.batches.sort((a, b) => {
        if (!a.expiry_date && !b.expiry_date) return 0;
        if (!a.expiry_date) return 1;
        if (!b.expiry_date) return -1;
        return new Date(a.expiry_date) - new Date(b.expiry_date);
      });
    });

    // Filter based on search and category
    let filtered = Object.values(grouped);

    if (searchQuery.value) {
      const query = searchQuery.value.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.item_type_name?.toLowerCase().includes(query) ||
          item.category_name?.toLowerCase().includes(query) ||
          item.batches.some(
            (batch) =>
              batch.batch_number?.toLowerCase().includes(query) ||
              batch.supplier_name?.toLowerCase().includes(query)
          )
      );
    }

    if (categoryFilter.value) {
      filtered = filtered.filter(
        (item) =>
          item.category_name ===
          categories.value?.find((cat) => cat.id == categoryFilter.value)?.name
      );
    }

    return filtered;
  });

  const paginatedInventory = computed(() => {
    const start = (currentPage.value - 1) * itemsPerPage.value;
    return groupedInventory.value.slice(start, start + itemsPerPage.value);
  });

  const totalPages = computed(() => {
    return Math.ceil(groupedInventory.value.length / itemsPerPage.value);
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

  const getDaysUntilExpiry = (expiryDate) => {
    if (!expiryDate) return Infinity;
    const today = new Date();
    const expiry = new Date(expiryDate);
    return Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
  };

  const getStatusColor = (status) => {
    const colors = {
      available: 'badge-sm border-none font-medium bg-success/20 text-success',
      reserved: 'badge-sm border-none font-medium bg-warning/20 text-warning',
      expired: 'badge-sm border-none font-medium bg-error/20 text-error',
      damaged: 'badge-sm border-none font-medium bg-error/20 text-error',
      consumed: 'badge-sm border-none font-medium bg-neutral/20 text-neutral',
      draft: 'badge-sm border-none font-medium bg-info/20 text-info',
    };
    return (
      colors[status] ||
      'badge-sm border-none font-medium bg-neutral/20 text-neutral'
    );
  };

  const getExpiryColor = (expiryDate) => {
    if (!expiryDate) return 'text-gray-500';

    const daysUntilExpiry = getDaysUntilExpiry(expiryDate);

    if (daysUntilExpiry < 0) return 'text-error font-bold';
    if (daysUntilExpiry <= 3) return 'text-error';
    if (daysUntilExpiry <= 7) return 'text-warning';
    return 'text-success';
  };

  const getBatchRowClass = (batch) => {
    if (!batch.expiry_date) return '';

    const daysUntilExpiry = getDaysUntilExpiry(batch.expiry_date);
    if (daysUntilExpiry < 0) return 'bg-error/10';
    if (daysUntilExpiry <= 3) return 'bg-error/5';
    if (daysUntilExpiry <= 7) return 'bg-warning/5';
    return '';
  };

  // Toggle item expansion
  const toggleItem = (itemId) => {
    if (expandedItems.value.has(itemId)) {
      expandedItems.value.delete(itemId);
    } else {
      expandedItems.value.add(itemId);
    }
  };

  // Show toast helper
  const showToast = (type, message) => {
    toast.value = { show: true, type, message };
    setTimeout(() => {
      toast.value.show = false;
    }, 3000);
  };

  // Modal functions
  const openConsumptionModal = () => {
    modal.value = { type: 'consumption', show: true, item: null };
  };

  const openAdjustmentModal = () => {
    modal.value = { type: 'adjustment', show: true, item: null };
  };

  const closeModal = () => {
    modal.value = { type: null, show: false, item: null };
  };

  // Batch-specific actions
  const consumeBatch = (batch) => {
    modal.value = { type: 'consumption', show: true, item: batch };
  };

  const adjustBatch = (batch) => {
    modal.value = { type: 'adjustment', show: true, item: batch };
  };

  const viewBatchDetails = (batch) => {
    showToast(
      'info',
      `Viewing details for batch ${batch.batch_number || 'N/A'}`
    );
  };

  const viewItemDetails = (item) => {
    showToast('info', `Viewing details for ${item.item_type_name}`);
  };

  const adjustItem = (item) => {
    modal.value = { type: 'adjustment', show: true, item };
  };

  const consumeItem = (item) => {
    modal.value = { type: 'consumption', show: true, item };
  };

  // Handle modal submissions
  const handleConsumption = async (consumptionData) => {
    try {
      // TODO: Implement consumption logic
      console.log('Consumption data:', consumptionData);
      showToast('success', 'Usage recorded successfully');
      closeModal();
      await refreshData();
    } catch (error) {
      showToast('error', 'Failed to record usage');
    }
  };

  const handleAdjustment = async (adjustmentData) => {
    try {
      // TODO: Implement adjustment logic
      console.log('Adjustment data:', adjustmentData);
      showToast('success', 'Stock adjusted successfully');
      closeModal();
      await refreshData();
    } catch (error) {
      showToast('error', 'Failed to adjust stock');
    }
  };

  // Refresh data
  const refreshData = async () => {
    try {
      await Promise.all([
        inventoryStore.fetchCategories(),
        inventoryStore.fetchItemTypes(),
        inventoryStore.fetchCurrentInventory(),
        inventoryStore.fetchInventorySummary(),
        inventoryStore.fetchStats(),
        inventoryStore.fetchExpiringItems(),
        inventoryStore.fetchLowStockItems(),
      ]);
      showToast('success', 'Data refreshed successfully');
    } catch (error) {
      showToast('error', 'Failed to refresh data');
    }
  };

  // Lifecycle
  onMounted(async () => {
    try {
      await Promise.all([
        inventoryStore.fetchCategories(),
        inventoryStore.fetchItemTypes(),
        inventoryStore.fetchCurrentInventory(),
        inventoryStore.fetchInventorySummary(),
        inventoryStore.fetchStats(),
        inventoryStore.fetchExpiringItems(),
        inventoryStore.fetchLowStockItems(),
      ]);

      // Add this debug logging
      console.log('Debug - Categories:', categories.value);
      console.log('Debug - Item Types:', itemTypes.value);
      console.log('Debug - Current Inventory:', currentInventory.value);
      console.log('Debug - Inventory Summary:', inventorySummary.value);
      console.log('Debug - Stats:', stats.value);

      // Add these additional debug logs
      console.log('Debug - Store object:', inventoryStore);
      console.log('Debug - Loading state:', loading.value);
      console.log('Debug - Error state:', error.value);

      // Test individual API calls
      try {
        console.log('Testing individual API calls...');
        const categoriesResponse = await inventoryStore.fetchCategories();
        console.log('Categories API response:', categoriesResponse);

        const inventoryResponse = await inventoryStore.fetchCurrentInventory();
        console.log('Inventory API response:', inventoryResponse);

        console.log('After individual calls - Categories:', categories.value);
        console.log(
          'After individual calls - Inventory:',
          currentInventory.value
        );
      } catch (err) {
        console.error('API call error:', err);
      }
    } catch (error) {
      showToast('error', 'Failed to load inventory data');
    }
  });

  // Watch for search/filter changes to reset pagination
  watch([searchQuery, categoryFilter], () => {
    currentPage.value = 1;
  });
</script>

<style scoped>
  /* Consistent styling with PO component */
  .card:hover {
    transition: background-color 0.2s ease;
  }

  .stat:hover {
    background-color: rgba(var(--secondaryColor-rgb), 0.05);
    transition: background-color 0.2s ease;
  }

  .btn:hover {
    transform: translateY(-1px);
    transition: all 0.2s ease;
  }

  .toast {
    z-index: 9999;
  }

  @media (max-width: 640px) {
    .stats {
      grid-template-columns: 1fr;
    }

    .stat {
      padding: 1rem 0.5rem;
    }

    .stat-value {
      font-size: 1.5rem;
    }

    .tabs {
      flex-wrap: wrap;
    }

    .tab {
      flex: 1;
      min-width: 120px;
    }
  }
</style>
