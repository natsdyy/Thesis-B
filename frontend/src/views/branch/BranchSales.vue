<script setup>
  import { ref, computed, onMounted } from 'vue';
  import {
    BarChart3,
    TrendingUp,
    TrendingDown,
    DollarSign,
    ShoppingCart,
    Users,
    Calendar,
    Download,
    Filter,
    RefreshCcw,
    Eye,
  } from 'lucide-vue-next';
  import { useBranchContextStore } from '../../stores/branchContextStore';

  const branchContextStore = useBranchContextStore();

  // Local state
  const loading = ref(false);
  const selectedPeriod = ref('today');
  const salesData = ref({
    totalSales: 0,
    totalTransactions: 0,
    averageTransaction: 0,
    totalCustomers: 0,
    growthRate: 0,
  });

  const recentTransactions = ref([]);
  const topSellingItems = ref([]);
  const hourlyData = ref([]);

  // Computed
  const currentBranch = computed(() => branchContextStore.currentBranch);
  const userRole = computed(() => branchContextStore.userRole);
  const canViewSales = computed(() => branchContextStore.canAccessSales);

  // Methods
  const loadSalesData = async () => {
    loading.value = true;

    try {
      // TODO: Fetch real sales data from API
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Mock data
      salesData.value = {
        totalSales: 45230.75,
        totalTransactions: 187,
        averageTransaction: 241.88,
        totalCustomers: 156,
        growthRate: 12.5,
      };

      recentTransactions.value = [
        {
          id: 'TXN-001',
          time: '14:30',
          amount: 850.0,
          items: 3,
          cashier: 'Maria Santos',
          status: 'completed',
        },
        {
          id: 'TXN-002',
          time: '14:25',
          amount: 425.5,
          items: 2,
          cashier: 'Juan Dela Cruz',
          status: 'completed',
        },
        {
          id: 'TXN-003',
          time: '14:20',
          amount: 1250.0,
          items: 5,
          cashier: 'Maria Santos',
          status: 'completed',
        },
      ];

      topSellingItems.value = [
        { name: 'Beef Steak', quantity: 25, revenue: 11250.0 },
        { name: 'Chicken Teriyaki', quantity: 32, revenue: 8960.0 },
        { name: 'Pork Sisig', quantity: 18, revenue: 5940.0 },
        { name: 'Fish Fillet', quantity: 15, revenue: 4875.0 },
      ];
    } catch (error) {
      console.error('Error loading sales data:', error);
    } finally {
      loading.value = false;
    }
  };

  const refreshData = () => {
    loadSalesData();
  };

  const exportReport = () => {
    // TODO: Implement export functionality
    console.log('Exporting sales report...');
  };

  // Initialize
  onMounted(() => {
    loadSalesData();
  });
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold text-primaryColor">Sales Management</h1>
        <p class="text-gray-600 mt-1">
          {{ currentBranch?.name }} - Sales Analytics
        </p>
      </div>
      <div class="flex items-center space-x-2">
        <select
          v-model="selectedPeriod"
          class="select select-bordered select-sm"
        >
          <option value="today">Today</option>
          <option value="week">This Week</option>
          <option value="month">This Month</option>
          <option value="year">This Year</option>
        </select>
        <button
          @click="refreshData"
          :disabled="loading"
          class="btn btn-outline btn-sm text-primaryColor border-primaryColor hover:bg-primaryColor hover:text-white"
        >
          <RefreshCcw :class="['w-4 h-4 mr-2', { 'animate-spin': loading }]" />
          Refresh
        </button>
        <button
          @click="exportReport"
          class="btn btn-sm bg-primaryColor text-white hover:bg-primaryColor/80"
        >
          <Download class="w-4 h-4 mr-2" />
          Export
        </button>
      </div>
    </div>

    <!-- Access Control Check -->
    <div v-if="!canViewSales" class="alert alert-warning">
      <Eye class="w-5 h-5" />
      <span
        >You don't have permission to view sales data. Contact your manager for
        access.</span
      >
    </div>

    <div v-else class="space-y-6">
      <!-- Loading State -->
      <div v-if="loading" class="flex justify-center items-center py-12">
        <div class="text-center">
          <div
            class="loading loading-spinner loading-lg text-primaryColor"
          ></div>
          <p class="mt-2 text-gray-600">Loading sales data...</p>
        </div>
      </div>

      <div v-else class="space-y-6">
        <!-- Sales Stats -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <!-- Total Sales -->
          <div class="card bg-white shadow-lg">
            <div class="card-body">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm text-gray-600">Total Sales</p>
                  <p class="text-2xl font-bold text-primaryColor">
                    ₱{{ salesData.totalSales.toLocaleString() }}
                  </p>
                  <div class="flex items-center mt-1">
                    <TrendingUp class="w-4 h-4 text-green-500 mr-1" />
                    <span class="text-sm text-green-600"
                      >+{{ salesData.growthRate }}%</span
                    >
                  </div>
                </div>
                <div class="p-3 bg-green-100 rounded-full">
                  <DollarSign class="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>
          </div>

          <!-- Total Transactions -->
          <div class="card bg-white shadow-lg">
            <div class="card-body">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm text-gray-600">Transactions</p>
                  <p class="text-2xl font-bold text-primaryColor">
                    {{ salesData.totalTransactions }}
                  </p>
                  <div class="flex items-center mt-1">
                    <ShoppingCart class="w-4 h-4 text-blue-500 mr-1" />
                    <span class="text-sm text-blue-600">{{
                      selectedPeriod
                    }}</span>
                  </div>
                </div>
                <div class="p-3 bg-blue-100 rounded-full">
                  <ShoppingCart class="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>
          </div>

          <!-- Average Transaction -->
          <div class="card bg-white shadow-lg">
            <div class="card-body">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm text-gray-600">Average Sale</p>
                  <p class="text-2xl font-bold text-primaryColor">
                    ₱{{ salesData.averageTransaction.toFixed(2) }}
                  </p>
                  <div class="flex items-center mt-1">
                    <BarChart3 class="w-4 h-4 text-purple-500 mr-1" />
                    <span class="text-sm text-purple-600">Per transaction</span>
                  </div>
                </div>
                <div class="p-3 bg-purple-100 rounded-full">
                  <BarChart3 class="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </div>
          </div>

          <!-- Total Customers -->
          <div class="card bg-white shadow-lg">
            <div class="card-body">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm text-gray-600">Customers</p>
                  <p class="text-2xl font-bold text-primaryColor">
                    {{ salesData.totalCustomers }}
                  </p>
                  <div class="flex items-center mt-1">
                    <Users class="w-4 h-4 text-orange-500 mr-1" />
                    <span class="text-sm text-orange-600">Served</span>
                  </div>
                </div>
                <div class="p-3 bg-orange-100 rounded-full">
                  <Users class="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Charts Section -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- Sales Chart Placeholder -->
          <div class="card bg-white shadow-lg">
            <div class="card-body">
              <h2 class="card-title text-primaryColor mb-4">
                <BarChart3 class="w-5 h-5" />
                Sales Trends
              </h2>

              <div class="text-center py-12">
                <BarChart3 class="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <h3 class="text-lg font-medium text-gray-900 mb-2">
                  Sales Chart Coming Soon
                </h3>
                <p class="text-gray-600">
                  Interactive sales analytics will be implemented
                </p>
              </div>
            </div>
          </div>

          <!-- Top Selling Items -->
          <div class="card bg-white shadow-lg">
            <div class="card-body">
              <h2 class="card-title text-primaryColor mb-4">
                <TrendingUp class="w-5 h-5" />
                Top Selling Items
              </h2>

              <div class="space-y-3">
                <div
                  v-for="(item, index) in topSellingItems"
                  :key="item.name"
                  class="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div class="flex items-center">
                    <div
                      class="w-8 h-8 bg-primaryColor text-white rounded-full flex items-center justify-center text-sm font-bold mr-3"
                    >
                      {{ index + 1 }}
                    </div>
                    <div>
                      <p class="font-medium text-gray-900">{{ item.name }}</p>
                      <p class="text-sm text-gray-600">
                        {{ item.quantity }} sold
                      </p>
                    </div>
                  </div>
                  <div class="text-right">
                    <p class="font-semibold text-primaryColor">
                      ₱{{ item.revenue.toLocaleString() }}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Recent Transactions -->
        <div class="card bg-white shadow-lg">
          <div class="card-body">
            <h2 class="card-title text-primaryColor mb-4">
              <ShoppingCart class="w-5 h-5" />
              Recent Transactions
            </h2>

            <div class="overflow-x-auto">
              <table class="table w-full">
                <thead>
                  <tr>
                    <th>Transaction ID</th>
                    <th>Time</th>
                    <th>Amount</th>
                    <th>Items</th>
                    <th>Cashier</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="transaction in recentTransactions"
                    :key="transaction.id"
                  >
                    <td>
                      <div class="font-mono text-sm">{{ transaction.id }}</div>
                    </td>
                    <td>
                      <div class="text-sm">{{ transaction.time }}</div>
                    </td>
                    <td>
                      <div class="font-semibold text-primaryColor">
                        ₱{{ transaction.amount.toLocaleString() }}
                      </div>
                    </td>
                    <td>
                      <div class="text-sm">{{ transaction.items }} items</div>
                    </td>
                    <td>
                      <div class="text-sm">{{ transaction.cashier }}</div>
                    </td>
                    <td>
                      <div class="badge badge-success">
                        {{ transaction.status }}
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="text-center mt-4">
              <button
                class="btn btn-outline btn-sm text-primaryColor border-primaryColor hover:bg-primaryColor hover:text-white"
              >
                <Eye class="w-4 h-4 mr-1" />
                View All Transactions
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
  /* Following the same patterns as other components */
  /* .card {
    @apply transition-shadow duration-200;
  }

  .card:hover {
    @apply shadow-xl;
  }

  .table th {
    @apply bg-gray-50 text-gray-700 font-medium;
  }

  .table tr:hover {
    @apply bg-gray-50;
  }

  .badge {
    @apply text-xs;
  } */
</style>
