<script setup>
  import { ref, watch, computed, onMounted } from 'vue';
  import {
    X,
    Calendar,
    TrendingUp,
    TrendingDown,
    DollarSign,
    ShoppingCart,
    BarChart3,
    Clock,
    Download,
    RefreshCcw,
    Eye,
    CheckCircle,
    AlertCircle,
    PhilippinePeso,
    Package,
    Target,
    Star,
  } from 'lucide-vue-next';
  import { usePOSStore } from '../../stores/posStore.js';
  import { useBranchContextStore } from '../../stores/branchContextStore.js';

  const props = defineProps({
    show: { type: Boolean, default: false },
  });

  const emit = defineEmits(['close']);

  const posStore = usePOSStore();
  const context = useBranchContextStore();

  const activeTab = ref('today');

  // Simple cache to avoid refetching data
  const dataCache = ref({});
  const cacheExpiry = 5 * 60 * 1000; // 5 minutes

  // Pagination for orders table
  const currentPage = ref(1);
  const itemsPerPage = ref(10);
  const remitData = ref({
    today: {
      totalSales: 0,
      totalTransactions: 0,
      averageTransaction: 0,
      mostSelling: [],
      leastSelling: [],
      ordersDetails: [],
    },
    thisWeek: {
      totalSales: 0,
      totalTransactions: 0,
      averageTransaction: 0,
      mostSelling: [],
      leastSelling: [],
      ordersDetails: [],
    },
    thisMonth: {
      totalSales: 0,
      totalTransactions: 0,
      averageTransaction: 0,
      mostSelling: [],
      leastSelling: [],
      ordersDetails: [],
    },
  });

  const tabs = [
    { id: 'today', label: 'Today', icon: Clock },
    { id: 'thisWeek', label: 'This Week', icon: Calendar },
    { id: 'thisMonth', label: 'This Month', icon: BarChart3 },
  ];

  const getDateRange = (period) => {
    const now = new Date();
    let dateFrom, dateTo;

    // Get current date in local timezone
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (period) {
      case 'today':
        // Today: start and end of current day
        dateFrom = new Date(today);
        dateFrom.setUTCHours(0, 0, 0, 0);

        dateTo = new Date(today);
        dateTo.setUTCHours(23, 59, 59, 999);
        break;
      case 'thisWeek':
        // This week: start of week to end of today
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        startOfWeek.setUTCHours(0, 0, 0, 0);
        dateFrom = startOfWeek;

        dateTo = new Date(today);
        dateTo.setUTCHours(23, 59, 59, 999);
        break;
      case 'thisMonth':
        // This month: start of month to end of today
        dateFrom = new Date(today.getFullYear(), today.getMonth(), 1);
        dateFrom.setUTCHours(0, 0, 0, 0);

        dateTo = new Date(today);
        dateTo.setUTCHours(23, 59, 59, 999);
        break;
      default:
        dateFrom = new Date(today);
        dateFrom.setUTCHours(0, 0, 0, 0);
        dateTo = new Date(today);
        dateTo.setUTCHours(23, 59, 59, 999);
    }

    const result = {
      dateFrom: dateFrom.toISOString(),
      dateTo: dateTo.toISOString(),
    };

    // Debug: Log date ranges with local time for verification
    console.log(`${period} date range:`, {
      ...result,
      localDate: today.toDateString(),
      localTime: now.toLocaleTimeString(),
    });

    return result;
  };

  const fetchRemitData = async (period) => {
    if (!context.currentBranch?.id) return;

    console.log(`Fetching data for period: ${period}`);

    // Check cache first (but always fetch fresh data for active tab)
    const cacheKey = `${context.currentBranch.id}_${period}`;
    const cachedData = dataCache.value[cacheKey];
    const now = Date.now();
    const isActiveTab = activeTab.value === period;

    // Only use cache for non-active tabs
    if (
      cachedData &&
      !isActiveTab &&
      now - cachedData.timestamp < cacheExpiry
    ) {
      console.log(`Using cached data for ${period}`);
      remitData.value[period] = cachedData.data;
      return;
    }

    // For active tab, always fetch fresh data
    if (isActiveTab) {
      console.log(`Fetching fresh data for active tab: ${period}`);
    }

    // Use store's loading state
    posStore.loading = true;
    try {
      const { dateFrom, dateTo } = getDateRange(period);

      console.log(`Fetching orders for ${period}:`, { dateFrom, dateTo });

      // Use store methods for data fetching
      const [stats, response] = await Promise.all([
        posStore.fetchSalesStats(context.currentBranch.id, dateFrom, dateTo),
        posStore.fetchOrderHistory({
          branch_id: context.currentBranch.id,
          date_from: dateFrom,
          date_to: dateTo,
          limit: 100, // Reduced from 1000 to improve performance
        }),
      ]);

      // Debug: Log sales stats
      console.log(`Sales stats for ${period}:`, stats);

      const orders = response.data || [];
      console.log(`Orders returned for ${period}:`, orders.length, 'orders');

      // Calculate most and least selling items
      const itemAnalysis = analyzeSellingItems(orders);

      // Prepare data
      const data = {
        totalSales: stats?.total_sales || 0, // Use sales stats total
        totalTransactions: stats?.total_orders || 0,
        averageTransaction: stats?.average_order_value || 0,
        mostSelling: itemAnalysis.mostSelling,
        leastSelling: itemAnalysis.leastSelling,
        ordersDetails: orders, // Store all orders for the table
      };

      // Update remit data
      remitData.value[period] = data;

      // Cache the data
      dataCache.value[cacheKey] = {
        data,
        timestamp: now,
      };
    } catch (error) {
      console.error(`Error fetching ${period} remit data:`, error);
      // Set fallback data
      remitData.value[period] = {
        totalSales: 0,
        totalTransactions: 0,
        averageTransaction: 0,
        mostSelling: [],
        leastSelling: [],
        ordersDetails: [],
      };
    } finally {
      posStore.loading = false;
    }
  };

  const analyzeSellingItems = (orders) => {
    const itemCounts = {};

    // Count items from all orders (handle refunded orders properly)
    orders.forEach((order) => {
      // Skip voided orders that are refunds (not losses)
      if (order.status === 'void') {
        const refundReasons = [
          'customer_cancelled',
          'wrong_order',
          'duplicate_order',
          'payment_issue',
          'system_error',
          'Customer Cancelled',
          'Wrong Order',
          'Duplicate Order',
          'Payment Issue',
          'System Error',
        ];

        // Skip refunded orders (they shouldn't count toward sales)
        if (refundReasons.includes(order.void_reason)) {
          return;
        }
      }

      if (order.items && Array.isArray(order.items)) {
        order.items.forEach((item) => {
          const itemName = item.menu_item_name || item.item_name || item.name;
          const quantity = parseInt(item.quantity) || 0;
          // Try multiple price fields that might exist in the order items
          const price =
            parseFloat(
              item.price ||
                item.selling_price ||
                item.unit_price ||
                item.menu_selling_price
            ) || 0;

          if (itemName) {
            if (!itemCounts[itemName]) {
              itemCounts[itemName] = {
                name: itemName,
                quantity: 0,
                revenue: 0,
                orders: 0,
              };
            }
            itemCounts[itemName].quantity += quantity;
            itemCounts[itemName].revenue += quantity * price;
            itemCounts[itemName].orders += 1;
          }
        });
      }
    });

    // Convert to array and sort
    const itemsArray = Object.values(itemCounts);

    // Most selling (by quantity)
    const mostSelling = [...itemsArray]
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    // Least selling (by quantity)
    const leastSelling = [...itemsArray]
      .sort((a, b) => a.quantity - b.quantity)
      .slice(0, 5);

    return { mostSelling, leastSelling };
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatItems = (order) => {
    if (!order.items || !Array.isArray(order.items)) {
      return '0 items';
    }

    if (order.items.length === 0) {
      return '0 items';
    }

    if (order.items.length === 1) {
      const item = order.items[0];
      const quantity = item.quantity || 1;
      const itemName = item.item_name || item.menu_item_name || 'Unknown Item';
      return `${quantity}x ${itemName}`;
    }

    // For multiple items, show each item on a separate line with quantity
    const itemLines = order.items.map((item) => {
      const quantity = item.quantity || 1;
      const itemName = item.item_name || item.menu_item_name || 'Unknown Item';
      return `${quantity}x ${itemName}`;
    });

    return itemLines.join('\n');
  };

  const closeModal = () => {
    const dlg = document.getElementById('branch_remit_sales_modal');
    if (dlg?.close) dlg.close();
    emit('close');
  };

  const refreshData = async () => {
    await fetchRemitData(activeTab.value);
  };

  // Pagination methods
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

  // Reset pagination when tab changes
  watch(activeTab, () => {
    currentPage.value = 1;
  });

  const exportRemitData = () => {
    // TODO: Implement export functionality
    console.log('Export remit sales data');
  };

  const currentData = computed(() => {
    return (
      remitData.value[activeTab.value] || {
        totalSales: 0,
        totalTransactions: 0,
        averageTransaction: 0,
        mostSelling: [],
        leastSelling: [],
        ordersDetails: [],
      }
    );
  });

  // Pagination computed properties
  const paginatedOrders = computed(() => {
    const orders = currentData.value.ordersDetails || [];
    const start = (currentPage.value - 1) * itemsPerPage.value;
    const end = start + itemsPerPage.value;
    return orders.slice(start, end);
  });

  const totalPages = computed(() => {
    const orders = currentData.value.ordersDetails || [];
    return Math.ceil(orders.length / itemsPerPage.value);
  });

  const totalOrders = computed(() => {
    return currentData.value.ordersDetails?.length || 0;
  });

  watch(
    () => props.show,
    async (val) => {
      const dlg = document.getElementById('branch_remit_sales_modal');
      if (val) {
        // Show modal immediately for better UX
        if (dlg?.showModal) dlg.showModal();

        // Load data for all periods in background
        // Start with today's data first for immediate display
        await fetchRemitData('today');

        // Load other periods in parallel
        Promise.all([
          fetchRemitData('thisWeek'),
          fetchRemitData('thisMonth'),
        ]).catch((error) => {
          console.error('Error loading additional period data:', error);
        });
      } else if (dlg?.close) {
        dlg.close();
      }
    }
  );

  watch(activeTab, async (newTab) => {
    if (props.show) {
      // Always fetch data for the selected tab to ensure correct period filtering
      await fetchRemitData(newTab);
    }
  });

  onMounted(() => {
    if (props.show) {
      fetchRemitData('today');
    }
  });
</script>

<template>
  <dialog id="branch_remit_sales_modal" class="modal">
    <div class="modal-box max-w-6xl">
      <div class="flex items-center justify-between mb-4">
        <h3 class="card-title text-primaryColor">
          <font-awesome-icon icon="fa-solid fa-receipt" class="!w-5 !h-5" />
          Remit Sales Report
        </h3>
        <button class="btn btn-ghost btn-sm" @click="closeModal">
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- Tabs -->
      <div class="tabs tabs-boxed mb-6">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          @click="activeTab = tab.id"
          class="tab"
          :class="{ 'tab-active': activeTab === tab.id }"
        >
          <component :is="tab.icon" class="w-4 h-4 mr-2" />
          {{ tab.label }}
        </button>
      </div>

      <div v-if="posStore.loading" class="py-8 flex justify-center">
        <div class="text-center">
          <span class="loading loading-spinner loading-lg text-primaryColor" />
          <p class="mt-2 text-gray-600">Loading sales data...</p>
        </div>
      </div>

      <div v-else class="space-y-6">
        <!-- Sales Summary Stats -->
        <div
          class="stats shadow w-full bg-accentColor border border-black/10 stats-vertical lg:stats-horizontal rounded-lg"
        >
          <div class="stat">
            <div class="stat-figure">
              <PhilippinePeso
                class="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-primaryColor"
              />
            </div>
            <div class="stat-title text-black/50 !text-xs sm:text-sm">
              Total Sales
            </div>
            <div
              class="stat-value text-primaryColor text-lg sm:text-xl lg:text-2xl xl:text-3xl"
            >
              {{ currentData.totalSales.toLocaleString() }}
            </div>
            <div class="stat-desc text-black/50 !text-xs sm:text-sm">
              {{
                activeTab === 'today'
                  ? 'Today'
                  : activeTab === 'thisWeek'
                    ? 'This Week'
                    : 'This Month'
              }}
            </div>
          </div>

          <div class="stat">
            <div class="stat-figure">
              <ShoppingCart
                class="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-warning"
              />
            </div>
            <div class="stat-title text-black/50 !text-xs sm:text-sm">
              Transactions
            </div>
            <div
              class="stat-value text-warning text-lg sm:text-xl lg:text-2xl xl:text-3xl"
            >
              {{ currentData.totalTransactions }}
            </div>
            <div class="stat-desc text-black/50 !text-xs sm:text-sm">
              Total orders
            </div>
          </div>

          <div class="stat">
            <div class="stat-figure">
              <BarChart3
                class="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-gray-600"
              />
            </div>
            <div class="stat-title text-black/50 !text-xs sm:text-sm">
              Average Sale
            </div>
            <div
              class="stat-value text-gray-600 text-lg sm:text-xl lg:text-2xl xl:text-3xl"
            >
              {{ currentData.averageTransaction.toFixed(2) }}
            </div>
            <div class="stat-desc text-black/50 !text-xs sm:text-sm">
              Per transaction
            </div>
          </div>
        </div>

        <!-- Most and Least Selling Items -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- Most Selling Items -->
          <div class="card bg-white shadow-lg">
            <div class="card-body">
              <div class="flex items-center justify-between mb-4">
                <h3 class="card-title text-primaryColor">
                  <TrendingUp class="w-5 h-5" />
                  Most Selling Items
                </h3>
                <div class="badge bg-success/20 text-success badge-sm">
                  Top 5
                </div>
              </div>

              <div v-if="currentData.mostSelling.length > 0" class="space-y-3">
                <div
                  v-for="(item, index) in currentData.mostSelling"
                  :key="item.name"
                  class="flex items-center justify-between p-3 bg-primaryColor/10 rounded-lg border border-primaryColor/20"
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
                        {{ item.quantity }} sold • {{ item.orders }} orders
                      </p>
                    </div>
                  </div>
                  <div class="text-right">
                    <p class="font-semibold text-primaryColor">
                      <font-awesome-icon icon="fa-solid fa-peso-sign" />
                      {{ parseFloat(item.revenue).toFixed(2) }}
                    </p>
                    <p class="text-xs text-gray-500">Revenue</p>
                  </div>
                </div>
              </div>
              <div v-else class="text-center py-8">
                <TrendingUp class="w-12 h-12 mx-auto text-gray-400 mb-3" />
                <p class="text-gray-500">No sales data available</p>
              </div>
            </div>
          </div>

          <!-- Least Selling Items -->
          <div class="card bg-white shadow-lg">
            <div class="card-body">
              <div class="flex items-center justify-between mb-4">
                <h3 class="card-title text-warning">
                  <TrendingDown class="w-5 h-5" />
                  Least Selling Items
                </h3>
                <div class="badge bg-warning/20 text-warning badge-sm">
                  Bottom 5
                </div>
              </div>

              <div v-if="currentData.leastSelling.length > 0" class="space-y-3">
                <div
                  v-for="(item, index) in currentData.leastSelling"
                  :key="item.name"
                  class="flex items-center justify-between p-3 bg-warning/10 rounded-lg border border-warning/20"
                >
                  <div class="flex items-center">
                    <div
                      class="w-8 h-8 bg-warning text-white rounded-full flex items-center justify-center text-sm font-bold mr-3"
                    >
                      {{ index + 1 }}
                    </div>
                    <div>
                      <p class="font-medium text-gray-900">{{ item.name }}</p>
                      <p class="text-sm text-gray-600">
                        {{ item.quantity }} sold • {{ item.orders }} orders
                      </p>
                    </div>
                  </div>
                  <div class="text-right">
                    <p class="font-semibold text-warning">
                      <font-awesome-icon icon="fa-solid fa-peso-sign" />
                      {{ parseFloat(item.revenue).toFixed(2) }}
                    </p>
                    <p class="text-xs text-gray-500">Revenue</p>
                  </div>
                </div>
              </div>
              <div v-else class="text-center py-8">
                <TrendingDown class="w-12 h-12 mx-auto text-gray-400 mb-3" />
                <p class="text-gray-500">No sales data available</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Orders Details Table -->
        <div class="card bg-white shadow-lg">
          <div class="card-body">
            <div class="flex items-center justify-between mb-4">
              <h3 class="card-title text-gray-700">
                <ShoppingCart class="w-5 h-5" />
                Order Details
              </h3>
              <div class="flex items-center gap-2">
                <div class="badge bg-info/20 text-info badge-sm">
                  {{ totalOrders }} Orders
                </div>
                <div class="text-sm text-gray-500">
                  Page {{ currentPage }} of {{ totalPages }}
                </div>
              </div>
            </div>

            <div
              v-if="
                currentData.ordersDetails &&
                currentData.ordersDetails.length > 0
              "
              class="overflow-x-auto"
            >
              <table class="table table-zebra w-full">
                <thead>
                  <tr>
                    <th class="text-xs">Order #</th>
                    <th class="text-xs">Date</th>
                    <th class="text-xs">Type</th>
                    <th class="text-xs">Status</th>
                    <th class="text-xs">Items</th>
                    <th class="text-xs">Total</th>
                    <th class="text-xs">Cashier</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="order in paginatedOrders"
                    :key="order.id"
                    class="hover:bg-gray-50"
                  >
                    <td class="font-mono text-xs">
                      {{ order.order_number }}
                    </td>
                    <td class="text-xs">
                      {{ formatDate(order.created_at) }}
                    </td>
                    <td class="text-xs">
                      <span class="">
                        {{ order.order_type }}
                      </span>
                    </td>
                    <td class="text-xs">
                      <span
                        :class="[
                          'badge badge-sm font-medium',
                          order.status === 'completed'
                            ? 'bg-success/10 text-success border '
                            : order.status === 'void'
                              ? 'bg-error/10 text-error border '
                              : 'bg-warning/10 text-warning border ',
                        ]"
                      >
                        {{ order.status }}
                      </span>
                    </td>
                    <td class="text-xs">
                      <div
                        class="max-w-xs whitespace-pre-line"
                        :title="formatItems(order)"
                      >
                        {{ formatItems(order) }}
                      </div>
                    </td>
                    <td class="text-xs font-semibold">
                      ₱{{ parseFloat(order.total_amount || 0).toFixed(2) }}
                    </td>
                    <td class="text-xs">
                      {{ order.cashier_first_name }}
                      {{ order.cashier_last_name }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div v-else class="text-center py-8">
              <ShoppingCart class="w-12 h-12 mx-auto text-gray-400 mb-3" />
              <p class="text-gray-500">No orders found for this period</p>
            </div>

            <!-- Pagination Controls -->
            <div
              v-if="totalPages > 1"
              class="flex items-center justify-between mt-4 pt-4 border-t border-gray-200"
            >
              <div class="text-sm text-gray-500">
                Showing {{ (currentPage - 1) * itemsPerPage + 1 }} to
                {{ Math.min(currentPage * itemsPerPage, totalOrders) }} of
                {{ totalOrders }} orders
              </div>

              <div class="flex items-center gap-2">
                <!-- Previous Button -->
                <button
                  @click="prevPage"
                  :disabled="currentPage === 1"
                  class="btn btn-sm btn-outline"
                  :class="{ 'btn-disabled': currentPage === 1 }"
                >
                  Previous
                </button>

                <!-- Page Numbers -->
                <div class="flex items-center gap-1">
                  <button
                    v-for="page in Math.min(5, totalPages)"
                    :key="page"
                    @click="goToPage(page)"
                    class="btn btn-sm"
                    :class="[
                      currentPage === page
                        ? 'bg-primaryColor text-white border-primaryColor'
                        : 'btn-outline border-none',
                    ]"
                  >
                    {{ page }}
                  </button>

                  <span v-if="totalPages > 5" class="text-gray-500">...</span>

                  <button
                    v-if="totalPages > 5 && currentPage < totalPages - 2"
                    @click="goToPage(totalPages)"
                    class="btn btn-sm btn-outline"
                  >
                    {{ totalPages }}
                  </button>
                </div>

                <!-- Next Button -->
                <button
                  @click="nextPage"
                  :disabled="currentPage === totalPages"
                  class="btn btn-sm btn-outline"
                  :class="{ 'btn-disabled': currentPage === totalPages }"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex justify-end gap-2">
          <button
            class="btn btn-outline btn-sm font-thin"
            @click="refreshData"
            :disabled="posStore.loading"
          >
            <RefreshCcw class="w-4 h-4 mr-1" />
            Refresh
          </button>
          <button
            class="btn btn-outline btn-sm font-thin"
            @click="exportRemitData"
          >
            <Download class="w-4 h-4 mr-1" />
            Export
          </button>
        </div>
      </div>

      <div class="modal-action">
        <button class="btn" @click="closeModal">Close</button>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop"><button>close</button></form>
  </dialog>
</template>

<style scoped></style>
