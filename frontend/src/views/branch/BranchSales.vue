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
                    <font-awesome-icon icon="fa-solid fa-peso-sign" />{{
                      salesData.totalSales.toLocaleString()
                    }}
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
                    <th>Order Number</th>
                    <th>Time</th>
                    <th>Amount</th>
                    <th>Items</th>
                    <th>Cashier</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="transaction in recentTransactions"
                    :key="transaction.id"
                  >
                    <td>
                      <div class="font-mono text-sm">
                        {{ transaction.order_number }}
                      </div>
                    </td>
                    <td>
                      <div class="text-sm">{{ transaction.time }}</div>
                    </td>
                    <td>
                      <div class="font-semibold text-primaryColor">
                        <font-awesome-icon icon="fa-solid fa-peso-sign" />{{
                          transaction.amount.toLocaleString()
                        }}
                      </div>
                    </td>
                    <td>
                      <div class="text-sm max-w-sm">
                        <div
                          v-if="
                            transaction.items && transaction.items.length > 0
                          "
                          class="space-y-1"
                        >
                          <div
                            v-for="item in transaction.items"
                            :key="item.id || item.menu_item_id"
                            class="flex items-center justify-between"
                          >
                            <span class="font-medium">{{
                              item.menu_item_name || item.item_name
                            }}</span>
                            <span class="text-gray-500 ml-2"
                              >{{ item.quantity }}x</span
                            >
                          </div>
                        </div>
                        <div v-else class="text-gray-400">No items</div>
                      </div>
                    </td>
                    <td>
                      <div class="text-sm">{{ transaction.cashier }}</div>
                    </td>
                    <td>
                      <div class="text-sm">{{ transaction.order_type }}</div>
                    </td>
                    <td>
                      <div
                        :class="[
                          'badge badge-sm ',
                          getStatusBadgeClass(transaction.status),
                        ]"
                      >
                        {{ transaction.status }}
                      </div>
                    </td>
                    <td>
                      <div class="flex space-x-1">
                        <button
                          v-if="transaction.status === 'processing'"
                          @click="completeOrder(transaction)"
                          class="btn btn-sm btn-success text-success font-thin bg-success/20 shadow-none border-none"
                          tooltip="Complete Order"
                        >
                          <font-awesome-icon icon="fa-solid fa-check" />
                        </button>
                        <button
                          v-if="transaction.canVoid"
                          @click="showVoidOrder(transaction)"
                          class="btn btn-sm btn-error text-error font-thin bg-error/20 shadow-none border-none"
                          tooltip="Void Order"
                        >
                          <font-awesome-icon icon="fa-solid fa-trash" />
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

    <!-- Void Order Modal -->
    <div
      v-if="showVoidModal"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm"
    >
      <div
        class="bg-white rounded-lg p-4 sm:p-6 max-w-md w-full max-h-[90vh] overflow-y-auto"
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
  </div>
</template>

<style scoped></style>
