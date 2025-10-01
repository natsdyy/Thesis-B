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
  import { apiConfig, getApiUrl } from '../../config/api.js';
  import { useCustomToast } from '../../composables/useCustomToast.js';
  import {
    getCurrentPhilippineTime,
    createPhilippineDate,
    formatForAPI,
    formatForDisplay,
  } from '../../utils/timezoneUtils.js';

  const props = defineProps({
    show: { type: Boolean, default: false },
  });

  const emit = defineEmits(['close']);

  const posStore = usePOSStore();
  const context = useBranchContextStore();
  const {
    showLoading,
    showSuccess,
    showError,
    showWarning,
    dismiss,
    dismissAll,
  } = useCustomToast();

  const activeTab = ref('today');

  // Simple cache to avoid refetching data
  const dataCache = ref({});
  const cacheExpiry = 5 * 60 * 1000; // 5 minutes

  // Pagination for orders table (server-side)
  const currentPage = ref(1);
  const itemsPerPage = ref(10);
  const totalServerOrders = ref(0);
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
    // Use shared timezone utils for Manila-day boundaries
    const nowPH = getCurrentPhilippineTime();
    const y = nowPH.getFullYear();
    const m = nowPH.getMonth() + 1; // createPhilippineDate expects 1-12
    const d = nowPH.getDate();

    let startPH;
    let endPH;

    if (period === 'thisWeek') {
      const dayOfWeek = nowPH.getDay(); // 0 (Sun) - 6 (Sat)
      // Start from today (PH), set to midnight, then go back by dayOfWeek days
      startPH = new Date(nowPH);
      startPH.setHours(0, 0, 0, 0);
      startPH.setDate(startPH.getDate() - dayOfWeek);
      endPH = createPhilippineDate(y, m, d, 23, 59, 59);
    } else if (period === 'thisMonth') {
      startPH = createPhilippineDate(y, m, 1, 0, 0, 0);
      endPH = createPhilippineDate(y, m, d, 23, 59, 59);
    } else {
      startPH = createPhilippineDate(y, m, d, 0, 0, 0);
      endPH = createPhilippineDate(y, m, d, 23, 59, 59);
    }

    const result = {
      dateFrom: formatForAPI(startPH),
      dateTo: formatForAPI(endPH),
    };

    console.log(`${period} date range (PH):`, result);
    return result;
  };

  // Adjust date range to exclude already approved remittances
  const getAdjustedDateRange = async (period) => {
    const base = getDateRange(period);
    try {
      if (!context.currentBranch?.id) return base;
      const { data = [] } = await posStore.fetchRemittances({
        branchId: context.currentBranch.id,
        status: 'approved',
        dateTo: base.dateTo,
        limit: 1,
      });
      const last = Array.isArray(data) && data.length > 0 ? data[0] : null;
      if (last?.date_to) {
        const lastTo = new Date(last.date_to);
        const baseFrom = new Date(base.dateFrom);
        const baseTo = new Date(base.dateTo);

        // If the last approved period already reaches/passes our base end,
        // do NOT shift the from-date, otherwise we'd create an empty/invalid window
        if (lastTo >= baseTo) {
          return base;
        }

        // If the last approved period overlaps our base window, start just after it
        if (lastTo >= baseFrom) {
          const adjustedFrom = new Date(lastTo.getTime() + 1);
          return { dateFrom: adjustedFrom.toISOString(), dateTo: base.dateTo };
        }
      }
    } catch (e) {
      console.warn('Failed to adjust date range based on last remittance:', e);
    }
    return base;
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
      const { dateFrom, dateTo } = await getAdjustedDateRange(period);

      console.log(`Fetching orders for ${period}:`, { dateFrom, dateTo });

      // Use store methods for data fetching
      const [stats, response] = await Promise.all([
        posStore.fetchSalesStats(context.currentBranch.id, dateFrom, dateTo),
        posStore.fetchOrderHistory({
          branch_id: context.currentBranch.id,
          date_from: dateFrom,
          date_to: dateTo,
          limit: itemsPerPage.value,
          offset: (currentPage.value - 1) * itemsPerPage.value,
        }),
      ]);

      // Debug: Log sales stats
      console.log(`Sales stats for ${period}:`, stats);

      // Show all orders in the table (both remitted and unremitted)
      const orders = response.data || [];
      totalServerOrders.value = response.pagination?.total || orders.length;
      console.log(`Orders returned for ${period}:`, orders.length, 'orders');

      // Prepare data
      const data = {
        totalSales: stats?.total_sales || 0, // Use sales stats total
        totalTransactions: stats?.total_orders || 0,
        averageTransaction: stats?.average_order_value || 0,
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

  // Selling analysis removed for performance; this modal doesn't need it.

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return formatForDisplay(dateString, 'en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDateRange = (period) => {
    const { dateFrom, dateTo } = getDateRange(period);
    const fromDate = new Date(dateFrom);
    const toDate = new Date(dateTo);

    const formatDateOnly = (date) =>
      formatForDisplay(date, 'en-PH', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });

    if (period === 'today') {
      return formatDateOnly(fromDate);
    } else {
      return `${formatDateOnly(fromDate)} - ${formatDateOnly(toDate)}`;
    }
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
      fetchRemitData(activeTab.value);
    }
  };

  const nextPage = () => {
    if (currentPage.value < totalPages.value) {
      currentPage.value++;
      fetchRemitData(activeTab.value);
    }
  };

  const prevPage = () => {
    if (currentPage.value > 1) {
      currentPage.value--;
      fetchRemitData(activeTab.value);
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

  // Normalize remittance badge (Yes/Pending/No)
  const getRemittedInfo = (order) => {
    if (!order || !order.remittance_id) {
      return { label: 'No', cls: 'bg-gray-100 text-gray-600' };
    }
    const status = String(order.remittance_status || '')
      .trim()
      .toLowerCase();
    if (status === 'approved') {
      return { label: 'Yes', cls: 'bg-success/10 text-success' };
    }
    return { label: 'Pending', cls: 'bg-warning/10 text-warning' };
  };

  // Confirmation modal + submit state
  const showConfirmRemit = ref(false);
  const submitting = ref(false);

  // Ensure confirm dialog overlays the parent modal using native dialog.showModal()
  watch(
    showConfirmRemit,
    (val) => {
      const dlg = document.getElementById('confirm_remit_modal');
      if (val) {
        if (dlg?.showModal) dlg.showModal();
      } else if (dlg?.close) {
        dlg.close();
      }
    },
    { flush: 'post' }
  );

  // Summary used by confirmation modal (aligns with what we submit)
  const confirmSummary = computed(() => {
    const orders = unremittedOrders.value;
    const completed = orders.filter((o) => o.status === 'completed');
    const voided = orders.filter((o) => o.status === 'void');

    const gross =
      completed.reduce((s, o) => s + (Number(o.total_amount) || 0), 0) +
      voided.reduce((s, o) => s + (Number(o.total_amount) || 0), 0);
    const refunds = 0; // No actual refunds in current system
    const voidedAmount = voided.reduce(
      (s, o) => s + (Number(o.total_amount) || 0),
      0
    );
    const net = gross; // Gross includes both completed and voided
    const remitted = Math.max(0, gross - refunds - voidedAmount);
    return { gross, refunds, voidedAmount, net, remitted };
  });

  const remitToFinance = async () => {
    try {
      if (submitting.value) return;
      const periodMap = {
        today: 'today',
        thisWeek: 'week',
        thisMonth: 'month',
      };
      const periodType = periodMap[activeTab.value] || 'today';
      const { dateFrom, dateTo } = await getAdjustedDateRange(activeTab.value);

      // Prevent duplicate pending remittance for same branch + adjusted period range
      try {
        const pending = await posStore.hasPendingRemittance(
          context.currentBranch.id,
          dateFrom,
          dateTo
        );
        if (pending) {
          showWarning(
            'A remittance for this period is already pending approval.'
          );
          showConfirmRemit.value = false;
          return;
        }
      } catch (dupErr) {
        console.warn('Failed to check existing remittance:', dupErr);
      }

      const totals = {
        gross: 0,
        net: 0,
        refunds: 0,
        disposed: 0,
        voidedAmount: 0,
      };

      unremittedOrders.value.forEach((o) => {
        if (o.status === 'completed') {
          totals.gross += Number(o.total_amount) || 0;
          totals.net += Number(o.total_amount) || 0; // VAT excluded per POS store
        }
        if (o.status === 'void') {
          // Include voided orders in gross sales (they were actual sales before being voided)
          totals.gross += Number(o.total_amount) || 0;
          // Track voided amounts separately from refunds
          totals.voidedAmount += Number(o.total_amount) || 0;
          totals.disposed += 1;
        }
      });

      // Net sales = Gross sales - Refunds - Voided amounts
      // Remitted amount = Net sales
      const remitted = Math.max(
        0,
        totals.gross - totals.refunds - totals.voidedAmount
      );

      submitting.value = true;
      await posStore.submitRemittance({
        branchId: context.currentBranch.id,
        periodType,
        dateFrom,
        dateTo,
        grossSales: totals.gross,
        netSales: totals.net,
        refundedAmount: totals.refunds,
        voidedAmount: totals.voidedAmount,
        disposed: totals.disposed,
        remittedAmount: remitted,
        notes: null,
      });
      showSuccess('Remittance submitted to Finance');
      showConfirmRemit.value = false;
    } catch (e) {
      showError(e?.response?.data?.message || 'Failed to submit remittance');
    } finally {
      submitting.value = false;
    }
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

  // Only unremitted orders are used for summaries and submission
  const unremittedOrders = computed(() => {
    const all = currentData.value?.ordersDetails || [];
    return all.filter((o) => !o.remittance_id);
  });

  // For server-side pagination, table simply shows current page orders
  const paginatedOrders = computed(() => currentData.value.ordersDetails || []);

  const totalPages = computed(() => {
    return Math.max(1, Math.ceil(totalServerOrders.value / itemsPerPage.value));
  });

  const totalOrders = computed(() => totalServerOrders.value);

  watch(
    () => props.show,
    async (val) => {
      const dlg = document.getElementById('branch_remit_sales_modal');
      if (val) {
        // Show modal immediately for better UX; guard against double-open error
        try {
          if (dlg?.showModal && !dlg.open) dlg.showModal();
          else if (dlg && dlg.open) dlg.focus();
        } catch (e) {
          console.warn(
            'Failed to open remit modal; attempting fallback focus:',
            e
          );
          try {
            if (dlg) dlg.setAttribute('open', '');
          } catch {}
        }

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
        try {
          if (dlg.open) dlg.close();
        } catch (e) {
          console.warn('Failed to close remit modal:', e);
        }
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
                    <th class="text-xs">Items</th>
                    <th class="text-xs">Total</th>
                    <th class="text-xs">Cashier</th>
                    <th class="text-xs">Remitted</th>
                    <th class="text-xs">Status</th>
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
                      <div
                        class="max-w-xs whitespace-pre-line"
                        :title="formatItems(order)"
                      >
                        {{ formatItems(order) }}
                      </div>
                    </td>
                    <td class="text-xs font-semibold">
                      ₱{{
                        parseFloat(order.total_amount || 0).toLocaleString(
                          'en-US',
                          { minimumFractionDigits: 2, maximumFractionDigits: 2 }
                        )
                      }}
                    </td>
                    <td class="text-xs">
                      {{ order.cashier_first_name }}
                      {{ order.cashier_last_name }}
                    </td>
                    <td class="text-xs">
                      <span
                        :class="[
                          'badge badge-sm font-medium',
                          getRemittedInfo(order).cls,
                        ]"
                      >
                        {{ getRemittedInfo(order).label }}
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
                  </tr>
                </tbody>
              </table>
            </div>
            <div v-else class="text-center py-8">
              <ShoppingCart class="w-12 h-12 mx-auto text-gray-400 mb-3" />
              <div class="space-y-2">
                <p class="text-gray-700 font-medium">
                  No orders found for
                  {{
                    activeTab === 'today'
                      ? 'today'
                      : activeTab === 'thisWeek'
                        ? 'this week'
                        : 'this month'
                  }}
                </p>
                <p class="text-sm text-gray-500">
                  Period: {{ formatDateRange(activeTab) }}
                </p>
                <div class="text-xs text-gray-400 space-y-1">
                  <p>• Check if orders were placed during this time</p>
                  <p>• Try selecting a different period above</p>
                  <p>• Ensure the branch has active POS transactions</p>
                </div>
              </div>
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
          <button
            class="btn bg-primaryColor text-white hover:bg-primaryColor/80 btn-sm font-thin"
            @click="showConfirmRemit = true"
            :disabled="posStore.loading || !unremittedOrders.length"
          >
            <CheckCircle class="w-4 h-4 mr-1" />
            Remit to Finance
          </button>
        </div>
      </div>

      <div class="modal-action">
        <button class="btn" @click="closeModal">Close</button>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop"><button>close</button></form>
  </dialog>

  <!-- Confirm Remit Modal -->
  <dialog id="confirm_remit_modal" class="modal">
    <div class="modal-box">
      <h3 class="font-bold text-lg">Confirm Remittance</h3>
      <p class="py-2 text-sm text-gray-600">
        This will submit the
        {{
          activeTab === 'today'
            ? 'Today'
            : activeTab === 'thisWeek'
              ? 'This Week'
              : 'This Month'
        }}
        totals to Finance.
      </p>
      <div class="mt-2 text-sm">
        <div class="flex justify-between">
          <span>Gross Sales:</span>
          <span>₱{{ confirmSummary.gross.toLocaleString() }}</span>
        </div>
        <div class="flex justify-between">
          <span>Refunds:</span>
          <span>₱{{ confirmSummary.refunds.toLocaleString() }}</span>
        </div>
        <div class="flex justify-between">
          <span>Voided Amount:</span>
          <span>₱{{ confirmSummary.voidedAmount.toLocaleString() }}</span>
        </div>
        <div class="flex justify-between">
          <span>Net Sales:</span>
          <span>₱{{ confirmSummary.net.toLocaleString() }}</span>
        </div>
        <div class="flex justify-between font-semibold border-t pt-2">
          <span>Remitted Amount:</span>
          <span>₱{{ confirmSummary.remitted.toLocaleString() }}</span>
        </div>
      </div>
      <div class="modal-action">
        <button
          class="btn bg-gray-200 text-black/50 font-thin border-none hover:bg-gray-300 shadow-none btn-sm"
          @click="showConfirmRemit = false"
          :disabled="submitting"
        >
          Cancel
        </button>
        <button
          class="btn bg-primaryColor text-white hover:bg-primaryColor/80 font-thin btn-sm"
          @click="remitToFinance"
          :disabled="submitting"
        >
          <span
            v-if="submitting"
            class="loading loading-spinner loading-xs mr-2"
          ></span>
          <span>{{ submitting ? 'Confirming…' : 'Confirm' }}</span>
        </button>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop">
      <button @click="showConfirmRemit = false">close</button>
    </form>
  </dialog>
</template>

<style scoped></style>
