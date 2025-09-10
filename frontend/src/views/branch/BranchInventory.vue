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
  } from 'lucide-vue-next';
  import { useBranchContextStore } from '../../stores/branchContextStore';

  const branchContextStore = useBranchContextStore();

  // Local state following MainInventory pattern
  const activeTab = ref('inventory');
  const searchQuery = ref('');
  const categoryFilter = ref('');
  const statusFilter = ref('');
  const currentPage = ref(1);
  const itemsPerPage = ref(12);
  const loading = ref(false);

  // Mock data following MainInventory structure
  const branchInventory = ref([]);
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

  const lowStockItems = ref([]);
  const recentActivity = ref([]);

  // Computed
  const currentBranch = computed(() => branchContextStore.currentBranch);
  const userRole = computed(() => branchContextStore.userRole);
  const canEdit = computed(() => branchContextStore.canAccessInventory);

  const filteredInventory = computed(() => {
    let items = branchInventory.value;

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

      // Mock data
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

      // Calculate stats
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

      // Low stock items
      lowStockItems.value = branchInventory.value.filter(
        (item) => item.quantity <= item.minimum_stock
      );

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
    } catch (error) {
      console.error('Error loading branch inventory:', error);
    } finally {
      loading.value = false;
    }
  };

  const refreshInventory = () => {
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

    <!-- Stats Cards -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
      <div class="card bg-white shadow-lg">
        <div class="card-body">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-600">Total Items</p>
              <p class="text-2xl font-bold text-primaryColor">
                {{ inventoryStats.totalItems }}
              </p>
            </div>
            <div class="p-3 bg-blue-100 rounded-full">
              <Package class="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      <div class="card bg-white shadow-lg">
        <div class="card-body">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-600">Low Stock</p>
              <p class="text-2xl font-bold text-orange-600">
                {{ inventoryStats.lowStockItems }}
              </p>
            </div>
            <div class="p-3 bg-orange-100 rounded-full">
              <AlertTriangle class="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      <div class="card bg-white shadow-lg">
        <div class="card-body">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-600">Out of Stock</p>
              <p class="text-2xl font-bold text-red-600">
                {{ inventoryStats.outOfStockItems }}
              </p>
            </div>
            <div class="p-3 bg-red-100 rounded-full">
              <TrendingDown class="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      <div class="card bg-white shadow-lg">
        <div class="card-body">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-600">Total Value</p>
              <p class="text-2xl font-bold text-green-600">
                ₱{{ inventoryStats.totalValue.toLocaleString() }}
              </p>
            </div>
            <div class="p-3 bg-green-100 rounded-full">
              <BarChart3 class="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Search and Filters -->
    <div class="card bg-white shadow-lg">
      <div class="card-body">
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
        <h2 class="card-title text-primaryColor mb-4">
          <Package class="w-5 h-5" />
          Inventory Items
        </h2>

        <!-- Loading State -->
        <div v-if="loading" class="flex justify-center items-center py-12">
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
                    </div>
                  </td>
                  <td>
                    <div class="badge badge-outline">{{ item.category }}</div>
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
                      {{ new Date(item.last_updated).toLocaleDateString() }}
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
          <h3 class="text-lg font-medium text-gray-900 mb-2">No items found</h3>
          <p class="text-gray-600">Try adjusting your search or filters</p>
        </div>
      </div>
    </div>

    <!-- Low Stock Alerts -->
    <div v-if="lowStockItems.length > 0" class="card bg-white shadow-lg">
      <div class="card-body">
        <h2 class="card-title text-orange-600 mb-4">
          <AlertTriangle class="w-5 h-5" />
          Low Stock Alerts
        </h2>

        <div class="space-y-2">
          <div
            v-for="item in lowStockItems.slice(0, 5)"
            :key="item.id"
            class="flex items-center justify-between p-3 bg-orange-50 rounded-lg"
          >
            <div>
              <p class="font-medium text-gray-900">{{ item.name }}</p>
              <p class="text-sm text-gray-600">
                {{ item.quantity }} {{ item.unit }} remaining
              </p>
            </div>
            <div class="badge badge-warning">Low Stock</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
  /* Following MainInventory.vue patterns */
  /* .table th {
    @apply bg-gray-50 text-gray-700 font-medium;
  }

  .table tr:hover {
    @apply bg-gray-50;
  }

  .badge {
    @apply text-xs;
  }

  .card {
    @apply transition-shadow duration-200;
  }

  .card:hover {
    @apply shadow-xl;
  } */
</style>
