<script setup>
  import { ref, computed, onMounted } from 'vue';
  import {
    Package,
    Search,
    Filter,
    RefreshCcw,
    Plus,
    Minus,
    AlertTriangle,
    CheckCircle,
    Eye,
    Edit,
    TrendingDown,
    BarChart3,
    Clock,
    ArrowRightLeft,
    Bell,
    TrendingUp,
    Truck,
    Handshake,
    FileText,
    Activity,
    AlertCircle,
    Target,
    Star,
    X,
    ChevronDown,
    ChevronUp,
    Settings,
    History,
    PhilippinePeso,
  } from 'lucide-vue-next';
  import { useBranchContextStore } from '../../stores/branchContextStore';
  import BranchRequestSupply from '../../components/branch/BranchRequestSupply.vue';

  const branchContextStore = useBranchContextStore();

  // Local state following MainInventory pattern
  const activeTab = ref('overview');
  const inventoryType = ref('scm'); // 'scm' or 'production'
  const searchQuery = ref('');
  const categoryFilter = ref('');
  const statusFilter = ref('');
  const currentPage = ref(1);
  const itemsPerPage = ref(12);
  const loading = ref(false);

  // Mock data following MainInventory structure
  const branchInventory = ref([]);
  const productionInventory = ref([]);
  const categories = ref([
    'Meat',
    'Vegetables',
    'Beverages',
    'Condiments',
    'Dairy',
  ]);
  const inventoryStats = ref({
    totalItems: 0,
    lowStockItems: 0,
    outOfStockItems: 0,
    totalValue: 0,
  });

  const productionStats = ref({
    totalItems: 0,
    lowStockItems: 0,
    outOfStockItems: 0,
    totalValue: 0,
  });

  const lowStockItems = ref([]);
  const recentActivity = ref([]);
  const alerts = ref([]);
  const reports = ref([]);

  // Computed
  const currentBranch = computed(() => branchContextStore.currentBranch);
  const userRole = computed(() => branchContextStore.userRole);
  const canEdit = computed(() => branchContextStore.canAccessInventory);

  const currentInventoryData = computed(() => {
    return inventoryType.value === 'scm'
      ? branchInventory.value
      : productionInventory.value;
  });

  const currentStats = computed(() => {
    return inventoryType.value === 'scm'
      ? inventoryStats.value
      : productionStats.value;
  });

  const filteredInventory = computed(() => {
    let items = currentInventoryData.value;

    // Filter by search query
    if (searchQuery.value.trim()) {
      const query = searchQuery.value.toLowerCase();
      items = items.filter(
        (item) =>
          item.name.toLowerCase().includes(query) ||
          item.category.toLowerCase().includes(query)
      );
    }

    // Filter by category
    if (categoryFilter.value) {
      items = items.filter((item) => item.category === categoryFilter.value);
    }

    // Filter by status
    if (statusFilter.value === 'low_stock') {
      items = items.filter((item) => item.quantity <= item.minimum_stock);
    } else if (statusFilter.value === 'out_of_stock') {
      items = items.filter((item) => item.quantity === 0);
    }

    return items;
  });

  const paginatedInventory = computed(() => {
    const start = (currentPage.value - 1) * itemsPerPage.value;
    const end = start + itemsPerPage.value;
    return filteredInventory.value.slice(start, end);
  });

  const totalPages = computed(() => {
    return Math.ceil(filteredInventory.value.length / itemsPerPage.value);
  });

  // Methods
  const getStockStatus = (item) => {
    if (item.quantity === 0)
      return { status: 'out', class: 'badge-error', text: 'Out of Stock' };
    if (item.quantity <= item.minimum_stock)
      return { status: 'low', class: 'badge-warning', text: 'Low Stock' };
    return { status: 'good', class: 'badge-success', text: 'In Stock' };
  };

  const loadBranchInventory = async () => {
    loading.value = true;

    try {
      // TODO: Fetch real branch inventory data from API
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Mock SCM inventory data
      branchInventory.value = [
        {
          id: 1,
          name: 'Beef Steak',
          category: 'Meat',
          quantity: 15,
          unit: 'kg',
          minimum_stock: 20,
          cost_price: 450.0,
          last_updated: '2024-01-15T10:30:00Z',
        },
        {
          id: 2,
          name: 'Chicken Breast',
          category: 'Meat',
          quantity: 25,
          unit: 'kg',
          minimum_stock: 15,
          cost_price: 280.0,
          last_updated: '2024-01-15T09:15:00Z',
        },
        {
          id: 3,
          name: 'French Fries',
          category: 'Vegetables',
          quantity: 0,
          unit: 'kg',
          minimum_stock: 10,
          cost_price: 120.0,
          last_updated: '2024-01-14T16:45:00Z',
        },
        {
          id: 4,
          name: 'Coca Cola',
          category: 'Beverages',
          quantity: 48,
          unit: 'bottles',
          minimum_stock: 30,
          cost_price: 35.0,
          last_updated: '2024-01-15T11:00:00Z',
        },
      ];

      // Mock Production inventory data
      productionInventory.value = [
        {
          id: 1,
          name: 'Prepared Burger Patty',
          category: 'Meat',
          quantity: 50,
          unit: 'pieces',
          minimum_stock: 30,
          cost_price: 85.0,
          selling_price: 120.0,
          last_updated: '2024-01-15T10:30:00Z',
        },
        {
          id: 2,
          name: 'Cooked Fries',
          category: 'Vegetables',
          quantity: 25,
          unit: 'servings',
          minimum_stock: 20,
          cost_price: 45.0,
          selling_price: 65.0,
          last_updated: '2024-01-15T09:15:00Z',
        },
        {
          id: 3,
          name: 'Fresh Salad Mix',
          category: 'Vegetables',
          quantity: 0,
          unit: 'bowls',
          minimum_stock: 15,
          cost_price: 35.0,
          selling_price: 50.0,
          last_updated: '2024-01-14T16:45:00Z',
        },
      ];

      // Calculate SCM stats
      inventoryStats.value = {
        totalItems: branchInventory.value.length,
        lowStockItems: branchInventory.value.filter(
          (item) => item.quantity <= item.minimum_stock && item.quantity > 0
        ).length,
        outOfStockItems: branchInventory.value.filter(
          (item) => item.quantity === 0
        ).length,
        totalValue: branchInventory.value.reduce(
          (total, item) => total + item.quantity * item.cost_price,
          0
        ),
      };

      // Calculate Production stats
      productionStats.value = {
        totalItems: productionInventory.value.length,
        lowStockItems: productionInventory.value.filter(
          (item) => item.quantity <= item.minimum_stock && item.quantity > 0
        ).length,
        outOfStockItems: productionInventory.value.filter(
          (item) => item.quantity === 0
        ).length,
        totalValue: productionInventory.value.reduce(
          (total, item) => total + item.quantity * item.cost_price,
          0
        ),
      };

      // Low stock items
      lowStockItems.value = [
        ...branchInventory.value,
        ...productionInventory.value,
      ].filter((item) => item.quantity <= item.minimum_stock);

      // Recent activity
      recentActivity.value = [
        {
          id: 1,
          action: 'Stock Updated',
          item: 'Beef Steak',
          quantity: -5,
          time: '2 hours ago',
        },
        {
          id: 2,
          action: 'New Delivery',
          item: 'Chicken Breast',
          quantity: +10,
          time: '4 hours ago',
        },
      ];

      // Mock alerts
      alerts.value = [
        {
          id: 1,
          type: 'low_stock',
          message: 'French Fries is running low on stock',
          item: 'French Fries',
          severity: 'warning',
          time: '1 hour ago',
        },
        {
          id: 2,
          type: 'out_of_stock',
          message: 'Fresh Salad Mix is out of stock',
          item: 'Fresh Salad Mix',
          severity: 'error',
          time: '3 hours ago',
        },
      ];

      // Mock reports
      reports.value = [
        {
          id: 1,
          title: 'Monthly Inventory Report',
          type: 'monthly',
          date: '2024-01-01',
          status: 'completed',
        },
        {
          id: 2,
          title: 'Stock Movement Analysis',
          type: 'analysis',
          date: '2024-01-10',
          status: 'pending',
        },
      ];
    } catch (error) {
      console.error('Error loading branch inventory:', error);
    } finally {
      loading.value = false;
    }
  };

  const refreshInventory = () => {
    loadBranchInventory();
  };

  const switchInventoryType = (type) => {
    inventoryType.value = type;
    currentPage.value = 1; // Reset pagination
  };

  const handleRequestCreated = (request) => {
    console.log('Request created:', request);
    // Refresh inventory data if needed
    loadBranchInventory();
  };

  const handleRequestUpdated = (request) => {
    console.log('Request updated:', request);
    // Refresh inventory data if needed
    loadBranchInventory();
  };

  // Initialize
  onMounted(() => {
    loadBranchInventory();
  });
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold text-primaryColor">Branch Inventory</h1>
        <p class="text-gray-600 mt-1">
          {{ currentBranch?.name }} - Stock Management
        </p>
      </div>
      <div class="flex items-center space-x-2">
        <button
          @click="refreshInventory"
          :disabled="loading"
          class="btn btn-outline text-primaryColor border-primaryColor hover:bg-primaryColor hover:text-white"
        >
          <RefreshCcw :class="['w-4 h-4 mr-2', { 'animate-spin': loading }]" />
          Refresh
        </button>
      </div>
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
        <span v-if="alerts.length > 0" class="badge badge-error badge-sm ml-1">
          {{ alerts.length }}
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
      <button
        @click="activeTab = 'request_supply'"
        class="tab"
        :class="{ 'tab-active': activeTab === 'request_supply' }"
      >
        <Handshake class="w-4 h-4 mr-1" />
        Request Supply
      </button>
    </div>

    <!-- Main Content Card -->
    <div
      class="card bg-accentColor shadow-xl mb-4 sm:mb-6 border border-black/10"
    >
      <div class="card-body p-3 sm:p-4 lg:p-6">
        <!-- Overview Tab -->
        <div v-if="activeTab === 'overview'" class="space-y-6">
          <div
            class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6"
          >
            <div>
              <h2
                class="card-title text-primaryColor text-lg sm:text-xl lg:text-2xl"
              >
                <BarChart3 class="w-5 h-5 sm:w-6 sm:h-6" />
                Inventory Overview
              </h2>
              <p class="text-gray-600 text-sm sm:text-base">
                Real-time inventory status and key metrics
              </p>
            </div>
          </div>

          <!-- Stats Cards -->
          <div class="grid grid-cols-1 md:grid-cols-4 gap-4 sm:gap-6">
            <div class="card bg-white shadow-lg">
              <div class="card-body p-4">
                <div class="flex items-center justify-between">
                  <div>
                    <p class="text-sm text-gray-600">Total Items</p>
                    <p class="text-2xl font-bold text-primaryColor">
                      {{
                        inventoryStats.totalItems + productionStats.totalItems
                      }}
                    </p>
                  </div>
                  <div class="p-3 bg-blue-100 rounded-full">
                    <Package class="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </div>
            </div>

            <div class="card bg-white shadow-lg">
              <div class="card-body p-4">
                <div class="flex items-center justify-between">
                  <div>
                    <p class="text-sm text-gray-600">Low Stock</p>
                    <p class="text-2xl font-bold text-orange-600">
                      {{
                        inventoryStats.lowStockItems +
                        productionStats.lowStockItems
                      }}
                    </p>
                  </div>
                  <div class="p-3 bg-orange-100 rounded-full">
                    <AlertTriangle class="w-6 h-6 text-orange-600" />
                  </div>
                </div>
              </div>
            </div>

            <div class="card bg-white shadow-lg">
              <div class="card-body p-4">
                <div class="flex items-center justify-between">
                  <div>
                    <p class="text-sm text-gray-600">Out of Stock</p>
                    <p class="text-2xl font-bold text-red-600">
                      {{
                        inventoryStats.outOfStockItems +
                        productionStats.outOfStockItems
                      }}
                    </p>
                  </div>
                  <div class="p-3 bg-red-100 rounded-full">
                    <TrendingDown class="w-6 h-6 text-red-600" />
                  </div>
                </div>
              </div>
            </div>

            <div class="card bg-white shadow-lg">
              <div class="card-body p-4">
                <div class="flex items-center justify-between">
                  <div>
                    <p class="text-sm text-gray-600">Total Value</p>
                    <p class="text-2xl font-bold text-green-600">
                      ₱{{
                        (
                          inventoryStats.totalValue + productionStats.totalValue
                        ).toLocaleString()
                      }}
                    </p>
                  </div>
                  <div class="p-3 bg-green-100 rounded-full">
                    <BarChart3 class="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Recent Activity -->
          <div class="card bg-white shadow-lg">
            <div class="card-body">
              <h3 class="card-title text-primaryColor mb-4">
                <Activity class="w-5 h-5" />
                Recent Activity
              </h3>
              <div class="space-y-3">
                <div
                  v-for="activity in recentActivity"
                  :key="activity.id"
                  class="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div class="flex items-center space-x-3">
                    <div class="p-2 bg-blue-100 rounded-full">
                      <Package class="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p class="font-medium text-gray-900">
                        {{ activity.action }}
                      </p>
                      <p class="text-sm text-gray-600">{{ activity.item }}</p>
                    </div>
                  </div>
                  <div class="text-right">
                    <p
                      class="font-medium"
                      :class="
                        activity.quantity > 0
                          ? 'text-green-600'
                          : 'text-red-600'
                      "
                    >
                      {{ activity.quantity > 0 ? '+' : ''
                      }}{{ activity.quantity }}
                    </p>
                    <p class="text-sm text-gray-500">{{ activity.time }}</p>
                  </div>
                </div>
              </div>
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
              <Package class="w-5 h-5 sm:w-6 sm:h-6" />
              Inventory List
            </h2>
          </div>

          <!-- Inventory Type Toggle -->
          <div class="flex justify-center mb-6">
            <div class="join">
              <button
                @click="switchInventoryType('scm')"
                class="join-item btn"
                :class="{ 'btn-active': inventoryType === 'scm' }"
              >
                <Package class="w-4 h-4 mr-2" />
                SCM Inventory
              </button>
              <button
                @click="switchInventoryType('production')"
                class="join-item btn"
                :class="{ 'btn-active': inventoryType === 'production' }"
              >
                <Settings class="w-4 h-4 mr-2" />
                Production Inventory
              </button>
            </div>
          </div>

          <!-- Search and Filters -->
          <div class="card bg-white shadow-lg">
            <div class="card-body p-4">
              <div class="flex flex-col md:flex-row gap-4">
                <!-- Search -->
                <div class="flex-1">
                  <div class="relative">
                    <Search
                      class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4"
                    />
                    <input
                      v-model="searchQuery"
                      type="text"
                      placeholder="Search items..."
                      class="input input-bordered w-full pl-10"
                    />
                  </div>
                </div>

                <!-- Category Filter -->
                <select v-model="categoryFilter" class="select select-bordered">
                  <option value="">All Categories</option>
                  <option
                    v-for="category in categories"
                    :key="category"
                    :value="category"
                  >
                    {{ category }}
                  </option>
                </select>

                <!-- Status Filter -->
                <select v-model="statusFilter" class="select select-bordered">
                  <option value="">All Status</option>
                  <option value="low_stock">Low Stock</option>
                  <option value="out_of_stock">Out of Stock</option>
                </select>
              </div>
            </div>
          </div>

          <!-- Inventory Items -->
          <div class="card bg-white shadow-lg">
            <div class="card-body">
              <h3 class="card-title text-primaryColor mb-4">
                <Package class="w-5 h-5" />
                {{ inventoryType === 'scm' ? 'SCM' : 'Production' }} Inventory
                Items
              </h3>

              <!-- Loading State -->
              <div
                v-if="loading"
                class="flex justify-center items-center py-12"
              >
                <div
                  class="loading loading-spinner loading-lg text-primaryColor"
                ></div>
              </div>

              <!-- Items Grid -->
              <div v-else-if="paginatedInventory.length > 0" class="space-y-4">
                <div class="overflow-x-auto">
                  <table class="table w-full">
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th>Category</th>
                        <th>Quantity</th>
                        <th>Status</th>
                        <th>Last Updated</th>
                        <th v-if="canEdit">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="item in paginatedInventory" :key="item.id">
                        <td>
                          <div class="font-semibold">{{ item.name }}</div>
                          <div class="text-sm text-gray-500">
                            ₱{{ item.cost_price }} per {{ item.unit }}
                            <span v-if="item.selling_price" class="ml-2">
                              (Sell: ₱{{ item.selling_price }})
                            </span>
                          </div>
                        </td>
                        <td>
                          <div class="badge badge-outline">
                            {{ item.category }}
                          </div>
                        </td>
                        <td>
                          <div class="font-medium">
                            {{ item.quantity }} {{ item.unit }}
                          </div>
                          <div class="text-sm text-gray-500">
                            Min: {{ item.minimum_stock }}
                          </div>
                        </td>
                        <td>
                          <div :class="['badge', getStockStatus(item).class]">
                            {{ getStockStatus(item).text }}
                          </div>
                        </td>
                        <td>
                          <div class="text-sm">
                            {{
                              new Date(item.last_updated).toLocaleDateString()
                            }}
                          </div>
                        </td>
                        <td v-if="canEdit">
                          <div class="flex items-center space-x-2">
                            <button class="btn btn-sm btn-ghost">
                              <Eye class="w-4 h-4" />
                            </button>
                            <button class="btn btn-sm btn-ghost">
                              <Edit class="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <!-- Pagination -->
                <div class="flex justify-center mt-6">
                  <div class="join">
                    <button
                      :disabled="currentPage === 1"
                      @click="currentPage--"
                      class="join-item btn"
                    >
                      «
                    </button>
                    <button class="join-item btn">
                      Page {{ currentPage }} of {{ totalPages }}
                    </button>
                    <button
                      :disabled="currentPage === totalPages"
                      @click="currentPage++"
                      class="join-item btn"
                    >
                      »
                    </button>
                  </div>
                </div>
              </div>

              <!-- Empty State -->
              <div v-else class="text-center py-12">
                <Package class="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <h3 class="text-lg font-medium text-gray-900 mb-2">
                  No items found
                </h3>
                <p class="text-gray-600">
                  Try adjusting your search or filters
                </p>
              </div>
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
              <Bell class="w-5 h-5 sm:w-6 sm:h-6" />
              Inventory Alerts
            </h2>
          </div>

          <!-- Alerts List -->
          <div class="space-y-4">
            <div
              v-for="alert in alerts"
              :key="alert.id"
              class="card bg-white shadow-lg"
            >
              <div class="card-body">
                <div class="flex items-start justify-between">
                  <div class="flex items-start space-x-3">
                    <div
                      class="p-2 rounded-full"
                      :class="
                        alert.severity === 'error'
                          ? 'bg-red-100'
                          : 'bg-orange-100'
                      "
                    >
                      <AlertTriangle
                        class="w-5 h-5"
                        :class="
                          alert.severity === 'error'
                            ? 'text-red-600'
                            : 'text-orange-600'
                        "
                      />
                    </div>
                    <div>
                      <h3 class="font-semibold text-gray-900">
                        {{ alert.message }}
                      </h3>
                      <p class="text-sm text-gray-600 mt-1">
                        Item: {{ alert.item }} • {{ alert.time }}
                      </p>
                    </div>
                  </div>
                  <div
                    class="badge"
                    :class="
                      alert.severity === 'error'
                        ? 'badge-error'
                        : 'badge-warning'
                    "
                  >
                    {{ alert.severity === 'error' ? 'Critical' : 'Warning' }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Reports Tab -->
        <div v-if="activeTab === 'reports'" class="space-y-6">
          <div
            class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4"
          >
            <h2
              class="card-title text-primaryColor text-lg sm:text-xl lg:text-2xl"
            >
              <FileText class="w-5 h-5 sm:w-6 sm:h-6" />
              Inventory Reports
            </h2>
          </div>

          <!-- Reports List -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div
              v-for="report in reports"
              :key="report.id"
              class="card bg-white shadow-lg"
            >
              <div class="card-body">
                <div class="flex items-start justify-between mb-4">
                  <div>
                    <h3 class="font-semibold text-gray-900">
                      {{ report.title }}
                    </h3>
                    <p class="text-sm text-gray-600">{{ report.date }}</p>
                  </div>
                  <div
                    class="badge"
                    :class="
                      report.status === 'completed'
                        ? 'badge-success'
                        : 'badge-warning'
                    "
                  >
                    {{ report.status }}
                  </div>
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-sm text-gray-500">{{ report.type }}</span>
                  <button class="btn btn-sm btn-outline">
                    <Eye class="w-4 h-4 mr-1" />
                    View
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Request Supply Tab -->
        <div v-if="activeTab === 'request_supply'" class="space-y-6">
          <BranchRequestSupply
            :inventory-type="inventoryType"
            @request-created="handleRequestCreated"
            @request-updated="handleRequestUpdated"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
  /* Following MainInventory.vue patterns */
</style>
