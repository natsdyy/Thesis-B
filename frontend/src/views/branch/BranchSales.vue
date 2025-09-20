<script setup>
  import { ref, computed, onMounted, watch } from 'vue';
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
    AlertCircle,
  } from 'lucide-vue-next';
  import { useBranchContextStore } from '../../stores/branchContextStore';
  import { usePOSStore } from '../../stores/posStore';

  const branchContextStore = useBranchContextStore();
  const posStore = usePOSStore();

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
  const showVoidModal = ref(false);
  const selectedOrder = ref(null);
  const voidReason = ref('');

  // Computed
  const currentBranch = computed(() => branchContextStore.currentBranch);
  const userRole = computed(() => branchContextStore.userRole);
  const canViewSales = computed(() => branchContextStore.canAccessSales);

  // Methods
  const loadSalesData = async () => {
    loading.value = true;

    try {
      const branchId = currentBranch.value?.id;
      if (!branchId) {
        console.error('No branch ID available');
        return;
      }

      // Get date range based on selected period
      const { dateFrom, dateTo } = getDateRange(selectedPeriod.value);

      // Fetch sales statistics
      const stats = await posStore.fetchSalesStats(branchId, dateFrom, dateTo);

      if (stats) {
        salesData.value = {
          totalSales: stats.total_sales || 0,
          totalTransactions: stats.total_orders || 0,
          averageTransaction: stats.average_order_value || 0,
          totalCustomers: stats.total_orders || 0, // Using orders as customer proxy
          growthRate: calculateGrowthRate(stats),
        };
      }

      // Fetch recent transactions
      await loadRecentTransactions(branchId);

      // Fetch top selling items
      await loadTopSellingItems(branchId, dateFrom, dateTo);
    } catch (error) {
      console.error('Error loading sales data:', error);
      // Fallback to empty data on error
      salesData.value = {
        totalSales: 0,
        totalTransactions: 0,
        averageTransaction: 0,
        totalCustomers: 0,
        growthRate: 0,
      };
    } finally {
      loading.value = false;
    }
  };

  // Helper functions
  const getDateRange = (period) => {
    const now = new Date();
    let dateFrom, dateTo;

    switch (period) {
      case 'today':
        dateFrom = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        dateTo = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          23,
          59,
          59
        );
        break;
      case 'week':
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        dateFrom = startOfWeek;
        dateTo = now;
        break;
      case 'month':
        dateFrom = new Date(now.getFullYear(), now.getMonth(), 1);
        dateTo = now;
        break;
      case 'year':
        dateFrom = new Date(now.getFullYear(), 0, 1);
        dateTo = now;
        break;
      default:
        dateFrom = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        dateTo = now;
    }

    return {
      dateFrom: dateFrom.toISOString().split('T')[0],
      dateTo: dateTo.toISOString().split('T')[0],
    };
  };

  const calculateGrowthRate = (currentStats) => {
    // This would need historical data to calculate properly
    // For now, return a placeholder
    return 0;
  };

  const loadRecentTransactions = async (branchId) => {
    try {
      // Fetch recent orders from POS system (all statuses)
      const response = await posStore.fetchOrderHistory({
        branch_id: branchId,
        limit: 10,
      });

      if (response && response.length > 0) {
        recentTransactions.value = response.map((order) => ({
          id: order.id,
          order_number: order.order_number,
          time: new Date(order.created_at).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
          }),
          amount: parseFloat(order.total_amount),
          items: order.items || [],
          itemsDisplay: order.items
            ? order.items
                .map((item) => `${item.menu_item_name || item.item_name}`)
                .join(', ')
            : 'No items',
          itemsCount: order.items?.length || 0,
          cashier:
            order.cashier_first_name && order.cashier_last_name
              ? `${order.cashier_first_name} ${order.cashier_last_name}`
              : 'Unknown',
          status: order.status,
          order_type: order.order_type,
          created_at: order.created_at,
          canVoid: order.status === 'pending' || order.status === 'processing',
        }));
      } else {
        recentTransactions.value = [];
      }
    } catch (error) {
      console.error('Error loading recent transactions:', error);
      recentTransactions.value = [];
    }
  };

  const loadTopSellingItems = async (branchId, dateFrom, dateTo) => {
    try {
      const items = await posStore.fetchTopSellingItems(
        branchId,
        dateFrom,
        dateTo
      );
      topSellingItems.value = items || [];
    } catch (error) {
      console.error('Error loading top selling items:', error);
      topSellingItems.value = [];
    }
  };

  const refreshData = () => {
    loadSalesData();
  };

  const exportReport = () => {
    // TODO: Implement export functionality
    console.log('Exporting sales report...');
  };

  // Void order functionality
  const showVoidOrder = (order) => {
    selectedOrder.value = order;
    voidReason.value = '';
    showVoidModal.value = true;
  };

  const confirmVoidOrder = async () => {
    if (!voidReason.value.trim()) {
      alert('Please provide a reason for voiding the order');
      return;
    }

    try {
      await posStore.voidOrder(selectedOrder.value.id, voidReason.value);
      showVoidModal.value = false;
      selectedOrder.value = null;
      voidReason.value = '';

      // Refresh data after voiding
      await loadSalesData();

      alert('Order voided successfully');
    } catch (error) {
      console.error('Error voiding order:', error);
      alert('Failed to void order. Please try again.');
    }
  };

  const closeVoidModal = () => {
    showVoidModal.value = false;
    selectedOrder.value = null;
    voidReason.value = '';
  };

  // Complete order functionality
  const completeOrder = async (order) => {
    if (
      !confirm(`Are you sure you want to complete order ${order.order_number}?`)
    ) {
      return;
    }

    try {
      await posStore.completeOrder(order.id);

      // Refresh data after completing
      await loadSalesData();

      alert('Order completed successfully');
    } catch (error) {
      console.error('Error completing order:', error);
      alert('Failed to complete order. Please try again.');
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-success/20 text-success';
      case 'processing':
        return 'bg-warning/20 text-warning';
      case 'pending':
        return 'bg-info/20 text-info';
      case 'void':
        return 'bg-error/20 text-error';
      default:
        return 'bg-neutral/20 text-neutral';
    }
  };

  // Watch for period changes
  watch(selectedPeriod, () => {
    loadSalesData();
  });

  // Initialize
  onMounted(() => {
    loadSalesData();
  });
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div
      class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
    >
      <div class="flex-1 min-w-0">
        <h1 class="text-2xl sm:text-3xl font-bold text-primaryColor">
          Sales Management
        </h1>
        <p class="text-sm sm:text-base text-gray-600 mt-1">
          {{ currentBranch?.name }} - Sales Analytics
        </p>
      </div>
      <div
        class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3"
      >
        <select
          v-model="selectedPeriod"
          class="select select-bordered select-sm w-full sm:w-auto"
        >
          <option value="today">Today</option>
          <option value="week">This Week</option>
          <option value="month">This Month</option>
          <option value="year">This Year</option>
        </select>
        <div class="flex gap-2">
          <button
            @click="refreshData"
            :disabled="loading"
            class="btn btn-sm font-thin text-primaryColor border-primaryColor hover:bg-primaryColor hover:text-white flex-1 sm:flex-none"
          >
            <RefreshCcw
              :class="['w-4 h-4 mr-1 sm:mr-2', { 'animate-spin': loading }]"
            />
            <span class="hidden sm:inline">Refresh</span>
          </button>
          <button
            @click="showRemitSales"
            :disabled="remitLoading"
            class="btn btn-sm font-thin bg-primaryColor text-white hover:bg-primaryColor/80 flex-1 sm:flex-none"
            :class="{ 'btn-disabled': remitLoading }"
          >
            <div
              v-if="remitLoading"
              class="loading loading-spinner loading-sm mr-1 sm:mr-2"
            ></div>
            <font-awesome-icon
              icon="fa-solid fa-receipt"
              class="mr-1 sm:mr-0"
            />
            <span class="hidden sm:inline">{{
              remitLoading ? 'Loading...' : 'Remit Sales'
            }}</span>
            <span class="sm:hidden">{{
              remitLoading ? 'Loading...' : 'Remit'
            }}</span>
          </button>
        </div>
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
        <!-- Tabs -->
        <div
          class="tabs tabs-boxed mb-4 sm:mb-6 justify-center sm:justify-start w-full"
        >
          <button
            @click="activeTab = 'overview'"
            class="tab flex-1 sm:flex-none"
            :class="{ 'tab-active': activeTab === 'overview' }"
          >
            <BarChart3 class="w-4 h-4 mr-1 sm:mr-2" />
            <span class="hidden xs:inline">Overview</span>
            <span class="xs:hidden">Overview</span>
          </button>
          <button
            @click="activeTab = 'transactions'"
            class="tab flex-1 sm:flex-none"
            :class="{ 'tab-active': activeTab === 'transactions' }"
          >
            <ShoppingCart class="w-4 h-4 mr-1 sm:mr-2" />
            <span class="hidden xs:inline">Transactions</span>
            <span class="xs:hidden">Transactions</span>
          </button>
        </div>

        <!-- Overview Tab -->
        <div v-if="activeTab === 'overview'" class="space-y-6">
          <!-- Main Content Card for Overview -->
          <div
            class="card bg-accentColor shadow-xl mb-4 sm:mb-6 border border-black/10"
          >
            <div class="card-body p-3 sm:p-4 lg:p-6">
              <!-- Sales Stats -->
              <div
                class="stats shadow w-full mb-4 sm:mb-6 bg-accentColor border border-black/10 stats-vertical sm:stats-horizontal lg:stats-horizontal xl:stats-horizontal rounded-lg"
              >
                <!-- Total Sales -->
                <div
                  class="stat sm:!border sm:!border-l-0 sm:!border-r-2 sm:!border-t-0 sm:!border-b-0 sm:!border-black/10 sm:border-dashed hover:bg-secondaryColor/10"
                >
                  <div class="stat-figure">
                    <PhilippinePeso
                      class="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-primaryColor"
                    />
                  </div>
                  <div class="stat-title text-black/50 !text-xs sm:text-sm">
                    Total Sales
                  </div>
                  <div
                    class="stat-value text-primaryColor text-xl sm:text-2xl lg:text-3xl xl:text-4xl"
                  >
                    {{ salesData.totalSales.toLocaleString() }}
                  </div>
                  <div class="stat-desc text-black/50 !text-xs sm:text-sm">
                    <div class="flex items-center justify-start">
                      <TrendingUp
                        v-if="salesData.growthRate >= 0"
                        class="w-3 h-3 sm:w-4 sm:h-4 text-primaryColor mr-1"
                      />
                      <TrendingDown
                        v-else
                        class="w-3 h-3 sm:w-4 sm:h-4 text-error mr-1"
                      />
                      <span
                        :class="[
                          'text-xs sm:text-sm',
                          salesData.growthRate >= 0
                            ? 'text-primaryColor'
                            : 'text-error',
                        ]"
                      >
                        {{ salesData.growthRate >= 0 ? '+' : ''
                        }}{{ salesData.growthRate }}%
                      </span>
                    </div>
                  </div>
                </div>
                <div class="p-3 bg-green-100 rounded-full">
                  <DollarSign class="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>
          </div>

                <!-- Total Transactions -->
                <div
                  class="stat sm:!border sm:!border-l-0 sm:!border-r-2 sm:!border-t-0 sm:!border-b-0 sm:!border-black/10 sm:border-dashed hover:bg-secondaryColor/10"
                >
                  <div class="stat-figure">
                    <ShoppingCart
                      class="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-warning"
                    />
                  </div>
                  <div class="stat-title text-black/50 !text-xs sm:text-sm">
                    Transactions
                  </div>
                  <div
                    class="stat-value text-warning text-xl sm:text-2xl lg:text-3xl xl:text-4xl"
                  ><p>
                    {{ salesData.totalTransactions }}
                  </p>
                  <div class="flex items-center mt-1">
                    <ShoppingCart class="w-4 h-4 text-blue-500 mr-1" />
                    <span class="text-sm text-blue-600">{{
                      selectedPeriod
                    }}</span>
                  </div>
                </div>

                <!-- Average Transaction -->
                <div
                  class="stat sm:!border sm:!border-l-0 sm:!border-r-2 sm:!border-t-0 sm:!border-b-0 sm:!border-black/10 sm:border-dashed hover:bg-secondaryColor/10"
                >
                  <div class="stat-figure">
                    <BarChart3
                      class="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-gray-600"
                    />
                  </div>
                  <div class="stat-title text-black/50 !text-xs sm:text-sm">
                    Average Sale
                  </div>
                  <div
                    class="stat-value text-gray-600 text-xl sm:text-2xl lg:text-3xl xl:text-4xl"
                  >
                    {{ salesData.averageTransaction.toFixed(2) }}
                  </div>
                  <div class="stat-desc text-black/50 !text-xs sm:text-sm">
                    Per transaction
                  </div>
                </div>

                <!-- Disposed Items -->
                <div
                  class="stat sm:!border sm:!border-l-0 sm:!border-r-2 sm:!border-t-0 sm:!border-b-0 sm:!border-black/10 sm:border-dashed hover:bg-secondaryColor/10"
                >
                  <div class="stat-figure">
                    <Trash2
                      class="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-orange-600"
                    />
                  </div>
                  <div class="stat-title text-black/50 !text-xs sm:text-sm">
                    Disposed Items
                  </div>
                  <div
                    class="stat-value text-orange-600 text-xl sm:text-2xl lg:text-3xl xl:text-4xl"
                  >
                    {{ salesData.totalDisposed }}
                  </div>
                  <div class="stat-desc text-black/50 !text-xs sm:text-sm">
                    Items disposed
                  </div>
                </div>

                <!-- Loss Profit -->
                <div
                  class="stat sm:!border sm:!border-l-0 sm:!border-r-2 sm:!border-t-0 sm:!border-b-0 sm:!border-black/10 sm:border-dashed hover:bg-secondaryColor/10"
                >
                  <div class="stat-figure">
                    <AlertCircle
                      class="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-red-600"
                    />
                  </div>
                  <div class="stat-title text-black/50 !text-xs sm:text-sm">
                    Loss Profit
                  </div>
                  <div
                    class="stat-value text-red-600 text-xl sm:text-2xl lg:text-3xl xl:text-4xl"
                  >
                    {{ salesData.lossProfit.toFixed(2) }}
                  </div>
                  <div class="stat-desc text-black/50 !text-xs sm:text-sm">
                    Business Losses
                  </div>
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
                    <font-awesome-icon icon="fa-solid fa-peso-sign" />{{
                      salesData.averageTransaction.toFixed(2)
                    }}
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
                      <font-awesome-icon icon="fa-solid fa-peso-sign" />{{
                        item.revenue.toLocaleString()
                      }}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Transactions Tab -->
        <div v-if="activeTab === 'transactions'" class="space-y-6">
          <div
            class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6"
          >
            <div class="flex-1 min-w-0">
              <h2
                class="card-title text-primaryColor text-lg sm:text-xl lg:text-2xl mb-2"
              >
                <ShoppingCart class="w-5 h-5 sm:w-6 sm:h-6" />
                Recent Transactions
              </h2>
              <p class="text-sm text-gray-600">
                View and manage recent sales transactions
              </p>
            </div>
            <div class="flex gap-2">
              <button
                @click="refreshData"
                class="btn btn-outline btn-sm text-primaryColor hover:bg-primaryColor/10"
                :disabled="loading"
              >
                <RefreshCcw class="w-4 h-4 mr-1" />
                <span class="hidden sm:inline">Refresh</span>
              </button>
            </div>
          </div>

          <div class="overflow-x-auto -mx-4 sm:mx-0">
            <div class="min-w-full px-4 sm:px-0">
              <table class="table w-full table-zebra">
                <thead>
                  <tr>
                    <th class="text-xs sm:text-sm">Order #</th>
                    <th class="text-xs sm:text-sm hidden sm:table-cell">
                      Items
                    </th>
                    <th class="text-xs sm:text-sm">Time</th>
                    <th class="text-xs sm:text-sm">Amount</th>
                    <th class="text-xs sm:text-sm hidden md:table-cell">
                      Paid
                    </th>
                    <th class="text-xs sm:text-sm hidden md:table-cell">
                      Change
                    </th>
                    <th class="text-xs sm:text-sm hidden lg:table-cell">
                      Cashier
                    </th>
                    <th class="text-xs sm:text-sm hidden lg:table-cell">
                      Type
                    </th>
                    <th class="text-xs sm:text-sm">Status</th>
                    <th class="text-xs sm:text-sm">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="transaction in recentTransactions"
                    :key="transaction.id"
                  >
                    <td>
                      <div class="font-mono text-xs sm:text-sm">
                        {{ transaction.order_number }}
                      </div>
                    </td>
                    <td class="hidden sm:table-cell">
                      <div class="text-xs sm:text-sm max-w-sm">
                        <div
                          v-if="
                            transaction.items && transaction.items.length > 0
                          "
                          class="space-y-1"
                        >
                          <div
                            v-for="item in transaction.items.slice(0, 2)"
                            :key="item.id || item.menu_item_id"
                            class="flex items-center justify-between"
                          >
                            <span class="font-medium text-xs">{{
                              item.menu_item_name || item.item_name
                            }}</span>
                            <span class="text-gray-500 ml-2 text-xs"
                              >{{ item.quantity }}x</span
                            >
                          </div>
                          <div
                            v-if="transaction.items.length > 2"
                            class="text-xs text-gray-500"
                          >
                            +{{ transaction.items.length - 2 }} more
                          </div>
                        </div>
                        <div v-else class="text-gray-400 text-xs">No items</div>
                      </div>
                    </td>
                    <td>
                      <div class="text-xs sm:text-sm">
                        {{ transaction.time }}
                      </div>
                    </td>
                    <td>
                      <div
                        class="font-semibold text-primaryColor text-xs sm:text-sm"
                      >
                        <font-awesome-icon icon="fa-solid fa-peso-sign" />{{
                          isNaN(transaction.amount)
                            ? '0.00'
                            : transaction.amount.toFixed(2)
                        }}
                      </div>
                    </td>
                    <td class="hidden md:table-cell">
                      <div class="font-thin text-gray-600 text-xs sm:text-sm">
                        <font-awesome-icon icon="fa-solid fa-peso-sign" />{{
                          isNaN(transaction.amount_paid)
                            ? '0.00'
                            : transaction.amount_paid.toFixed(2)
                        }}
                      </div>
                    </td>
                    <td class="hidden md:table-cell">
                      <div class="font-thin text-gray-600 text-xs sm:text-sm">
                        <font-awesome-icon icon="fa-solid fa-peso-sign" />{{
                          isNaN(transaction.change_amount)
                            ? '0.00'
                            : transaction.change_amount.toFixed(2)
                        }}
                      </div>
                    </td>
                    <td class="hidden lg:table-cell">
                      <div class="text-xs sm:text-sm">
                        {{ transaction.cashier }}
                      </div>
                    </td>
                    <td class="hidden lg:table-cell">
                      <div class="text-xs sm:text-sm">
                        {{ transaction.order_type }}
                      </div>
                    </td>
                    <td>
                      <div
                        v-if="transaction.status === 'void'"
                        class="cursor-pointer"
                      >
                        <div
                          :class="[
                            'badge badge-xs sm:badge-sm mb-1 flex items-center gap-1 font-thin',
                            transaction.isRefunded
                              ? 'bg-success/10 text-success border border-success/20'
                              : 'bg-error/10 text-error border border-error/20',
                          ]"
                          :title="transaction.void_reason"
                        >
                          <font-awesome-icon
                            :icon="
                              transaction.isRefunded
                                ? 'fa-solid fa-undo'
                                : 'fa-solid fa-exclamation-triangle'
                            "
                            class="w-2 h-2 sm:w-3 sm:h-3"
                          />
                          <span class="hidden sm:inline">{{
                            transaction.isRefunded ? 'Refunded' : 'Loss'
                          }}</span>
                          <span class="sm:hidden">{{
                            transaction.isRefunded ? 'R' : 'L'
                          }}</span>
                        </div>
                      </div>
                      <div v-else>
                        <div
                          :class="[
                            'badge badge-xs sm:badge-sm font-thin',
                            getStatusBadgeClass(transaction.status),
                          ]"
                        >
                          <span class="hidden sm:inline">{{
                            transaction.status
                          }}</span>
                          <span class="sm:hidden">{{
                            transaction.status.charAt(0).toUpperCase()
                          }}</span>
                        </div>
                      </div>
                    </td>

                    <td>
                      <div class="flex space-x-1">
                        <button
                          v-if="transaction.status === 'processing'"
                          @click="showCompleteOrder(transaction)"
                          class="btn btn-xs sm:btn-sm btn-success text-success font-thin bg-success/20 shadow-none border-none"
                          title="Complete Order"
                        >
                          <font-awesome-icon
                            icon="fa-solid fa-check"
                            class="w-3 h-3"
                          />
                        </button>
                        <button
                          v-if="transaction.canVoid"
                          @click="showVoidOrder(transaction)"
                          class="btn btn-xs sm:btn-sm btn-error text-error font-thin bg-error/20 shadow-none border-none"
                          :title="
                            transaction.status === 'completed'
                              ? 'Refund Order'
                              : 'Void Order'
                          "
                        >
                          <font-awesome-icon
                            :icon="
                              transaction.status === 'completed'
                                ? 'fa-solid fa-undo'
                                : 'fa-solid fa-trash'
                            "
                            class="w-3 h-3"
                          />
                        </button>
                        <span
                          v-if="
                            !transaction.canVoid &&
                            transaction.status !== 'processing'
                          "
                          class="text-gray-400 text-xs"
                          >-</span
                        >
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
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

    <!-- Void Order Modal -->
    <div
      v-if="showVoidModal"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4 backdrop-blur-sm"
    >
      <div
        class="bg-white rounded-lg p-3 sm:p-4 lg:p-6 max-w-md w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto"
      >
        <div class="text-center mb-6">
          <AlertCircle
            class="w-12 h-12 sm:w-16 sm:h-16 text-red-500 mx-auto mb-3 sm:mb-4"
          />
          <h3 class="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
            Void Order
          </h3>
          <p class="text-sm sm:text-base text-gray-600">
            Are you sure you want to void this order? This action cannot be
            undone.
          </p>
        </div>

        <!-- Order Details -->
        <div class="space-y-4 mb-6">
          <div class="bg-gray-50 rounded-lg p-4">
            <div class="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span class="font-medium text-gray-600">Order Number:</span>
                <p class="font-semibold">{{ selectedOrder?.order_number }}</p>
              </div>
              <div>
                <span class="font-medium text-gray-600">Total Amount:</span>
                <p class="font-semibold">
                  <font-awesome-icon icon="fa-solid fa-peso-sign" />
                  {{ selectedOrder?.amount?.toFixed(2) }}
                </p>
              </div>
              <div>
                <span class="font-medium text-gray-600">Cashier:</span>
                <p class="font-semibold">{{ selectedOrder?.cashier }}</p>
              </div>
              <div>
                <span class="font-medium text-gray-600">Status:</span>
                <p class="font-semibold">{{ selectedOrder?.status }}</p>
              </div>
            </div>
          </div>

          <!-- Void Reason -->
          <div class="space-y-2">
            <label class="text-sm font-medium text-gray-700">
              Reason for voiding:
            </label>
            <textarea
              v-model="voidReason"
              placeholder="Enter reason for voiding this order..."
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
              rows="3"
              required
            ></textarea>
          </div>
        </div>

        <!-- Action Buttons -->
        <div
          class="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3"
        >
          <button
            @click="closeVoidModal"
            class="flex-1 btn btn-outline btn-sm sm:btn-md touch-manipulation font-thin"
          >
            Cancel
          </button>
          <button
            @click="confirmVoidOrder"
            class="flex-1 btn bg-red-600 text-white btn-sm sm:btn-md touch-manipulation font-thin hover:bg-red-700"
          >
            Void Order
          </button>
        </div>
      </div>
    </div>

    <!-- Complete Order Modal -->
    <div
      v-if="showCompleteModal"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4 backdrop-blur-sm"
    >
      <div
        class="bg-white rounded-lg shadow-xl w-full max-w-md mx-auto transform transition-all p-3 sm:p-4 lg:p-6"
      >
        <div class="text-center mb-6 flex flex-col gap-2 items-center">
          <div class="flex items-center justify-center gap-2 flex-row">
            <h3 class="text-lg sm:text-xl font-semibold text-gray-900">
              Complete Order
            </h3>
            <font-awesome-icon
              icon="fa-solid fa-check-circle"
              class="!w-6 !h-6 text-primaryColor"
            />
          </div>
          <p class="text-sm sm:text-base text-gray-600">
            Are you sure you want to complete order
            {{ selectedOrder?.order_number }}? This will mark the order as
            completed and process the payment.
          </p>
        </div>

        <!-- Order Details -->
        <div class="space-y-4 mb-6">
          <div class="bg-gray-50 rounded-lg p-4">
            <div class="flex items-center justify-between mb-2">
              <span class="text-sm font-medium text-gray-600"
                >Order Number:</span
              >
              <span class="text-sm font-mono text-gray-900">{{
                selectedOrder?.order_number
              }}</span>
            </div>
            <div class="flex items-center justify-between mb-2">
              <span class="text-sm font-medium text-gray-600">Items:</span>
              <span class="text-sm text-gray-900">{{
                selectedOrder?.itemsDisplay
              }}</span>
            </div>
            <div class="flex items-center justify-between mb-2">
              <span class="text-sm font-medium text-gray-600">Amount:</span>
              <span class="text-sm text-primaryColor">
                <font-awesome-icon icon="fa-solid fa-peso-sign" />
                {{ selectedOrder?.amount.toFixed(2) }}
              </span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-sm font-medium text-gray-600">Status:</span>
              <span class="text-sm text-warning">{{
                selectedOrder?.status
              }}</span>
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div
          class="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3"
        >
          <button
            @click="closeCompleteModal"
            :disabled="completeLoading"
            class="flex-1 btn btn-outline btn-sm sm:btn-md touch-manipulation font-thin disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            @click="completeOrder"
            :disabled="completeLoading"
            class="flex-1 btn bg-primaryColor text-white btn-sm sm:btn-md touch-manipulation font-thin hover:bg-primaryColor/80 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span
              v-if="completeLoading"
              class="loading loading-spinner loading-sm mr-2"
            ></span>
            {{ completeLoading ? 'Completing...' : 'Complete Order' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Sales Transactions Modal -->
    <BranchSalesTransactionsModal
      :show="showTransactionsModal"
      @close="closeTransactionsModal"
    />

    <!-- Remit Sales Modal -->
    <BranchRemitSalesModal :show="showRemitModal" @close="closeRemitModal" />
  
</template>

<style scoped></style>
