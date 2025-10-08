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

  // Custom month selection (YYYY-MM format) - default to September 2025 for testing
  const customMonth = ref('2025-09');

  // Validate custom month format
  const isValidCustomMonth = (monthStr) => {
    if (!monthStr || typeof monthStr !== 'string') return false;
    const parts = monthStr.split('-');
    if (parts.length !== 2) return false;
    const year = Number(parts[0]);
    const month = Number(parts[1]);
    return (
      Number.isFinite(year) &&
      Number.isFinite(month) &&
      month >= 1 &&
      month <= 12
    );
  };

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
    customMonth: {
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
    { id: 'customMonth', label: 'Custom Month', icon: Calendar },
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
      // For "This Week", show from Monday of current week to today
      // or from the start of the month if we're in the first week
      const dayOfWeek = nowPH.getDay(); // 0 (Sun) - 6 (Sat)
      const dayOfMonth = d;

      // If we're in the first week of the month (days 1-7), start from the 1st
      // Otherwise, start from Monday of current week
      if (dayOfMonth <= 7) {
        // First week of month - start from 1st
        startPH = createPhilippineDate(y, m, 1, 0, 0, 0);
      } else {
        // Regular week - start from Monday
        const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Handle Sunday as 6 days from Monday
        startPH = new Date(nowPH);
        startPH.setDate(nowPH.getDate() - daysFromMonday);
        startPH.setHours(0, 0, 0, 0);
      }

      endPH = createPhilippineDate(y, m, d, 23, 59, 59);
    } else if (period === 'thisMonth') {
      startPH = createPhilippineDate(y, m, 1, 0, 0, 0);
      endPH = createPhilippineDate(y, m, d, 23, 59, 59);
    } else if (period === 'customMonth') {
      // Parse custom month (YYYY-MM format)
      const ym = String(customMonth.value || '').trim();

      if (isValidCustomMonth(ym)) {
        const [yStr, mStr] = ym.split('-');
        const year = Number(yStr);
        const month = Number(mStr);

        // Start of the selected month
        startPH = createPhilippineDate(year, month, 1, 0, 0, 0);
        // End of the selected month (last day)
        const lastDay = new Date(year, month, 0).getDate();
        endPH = createPhilippineDate(year, month, lastDay, 23, 59, 59);
      } else {
        // Fallback to current month
        startPH = createPhilippineDate(y, m, 1, 0, 0, 0);
        endPH = createPhilippineDate(y, m, d, 23, 59, 59);
      }
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

  // Get date range for remit sales - show all orders in the period
  const getAdjustedDateRange = async (period) => {
    const base = getDateRange(period);

    // For remit sales modal, we want to show ALL orders in the selected period
    // (both remitted and unremitted) so users can see the complete picture.
    // The backend will handle showing the remittance status for each order.
    return base;
  };

  const fetchRemitData = async (period) => {
    if (!context.currentBranch?.id) return;

    // Validate custom month before proceeding
    if (period === 'customMonth' && !isValidCustomMonth(customMonth.value)) {
      console.warn('Invalid custom month format:', customMonth.value);
      return;
    }

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
      const [stats, response, allOrdersResponse] = await Promise.all([
        posStore.fetchSalesStats(context.currentBranch.id, dateFrom, dateTo),
        posStore.fetchOrderHistory({
          branch_id: context.currentBranch.id,
          date_from: dateFrom,
          date_to: dateTo,
          limit: itemsPerPage.value,
          offset: (currentPage.value - 1) * itemsPerPage.value,
        }),
        // Fetch all orders to get accurate unremitted count
        posStore.fetchOrderHistory({
          branch_id: context.currentBranch.id,
          date_from: dateFrom,
          date_to: dateTo,
          limit: 1000, // Get all orders
          offset: 0,
        }),
      ]);

      // Show all orders (both remitted and unremitted) for transparency
      const allOrders = response.data || [];
      const allOrdersInPeriod = allOrdersResponse.data || [];

      // Store all orders for the period for accurate calculations
      allOrdersForPeriod.value = allOrdersInPeriod;

      // Calculate total unremitted orders across entire period
      allUnremittedOrdersCount.value = allOrdersInPeriod.filter(
        (order) => !order.remittance_id
      ).length;

      // Debug: Log sales stats
      console.log(`Sales stats for ${period}:`, stats);
      console.log(
        `Total unremitted orders in period:`,
        allUnremittedOrdersCount.value
      );

      // Use all orders for the table
      totalServerOrders.value = response.pagination?.total || allOrders.length;
      console.log(
        `All orders returned for ${period}:`,
        allOrders.length,
        'orders'
      );

      // Prepare data
      const data = {
        totalSales: stats?.total_sales || 0, // Use sales stats total
        totalTransactions: stats?.total_orders || 0,
        averageTransaction: stats?.average_order_value || 0,
        voidedAmount: stats?.loss_profit || 0, // Voided amount from stats
        refundedAmount: stats?.refunded_amount || 0, // Refunded amount from stats
        totalDisposed: stats?.total_disposed || 0, // Total disposed orders from stats
        ordersDetails: allOrders, // Store all orders for the table (both remitted and unremitted)
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

  const exportRemitData = async () => {
    if (isExporting.value) return;

    isExporting.value = true;
    try {
      // Get current period data
      const currentPeriodData = currentData.value;
      const allOrders = allOrdersForPeriod.value || [];
      const unremittedOrders = allOrders.filter(
        (order) => !order.remittance_id
      );

      // Create CSV content
      const headers = [
        'Order Number',
        'Date',
        'Type',
        'Items',
        'Total Amount',
        'Cashier',
        'Status',
        'Remitted',
      ];

      // Format data for CSV
      const csvData = allOrders.map((order) => {
        const items =
          order.items
            ?.map(
              (item) =>
                `${item.quantity}x ${item.item_name || item.menu_item_name}`
            )
            .join(', ') || 'No items';

        return [
          order.order_number || '',
          order.created_at ? formatDate(order.created_at) : 'N/A',
          order.order_type || '',
          items,
          `P${Number(order.total_amount || 0).toFixed(2)}`,
          `${order.cashier_first_name || ''} ${order.cashier_last_name || ''}`.trim(),
          order.status || '',
          order.remittance_id ? 'Yes' : 'No',
        ];
      });

      // Calculate summary data with proper error handling
      const totalOrdersCount = totalOrders.value || 0;
      const unremittedCount = allUnremittedOrdersCount.value || 0;
      const summary = confirmSummary.value || {
        gross: 0,
        refunds: 0,
        voidedAmount: 0,
        net: 0,
        remitted: 0,
      };

      // Debug logging
      console.log('Export Debug:', {
        totalOrdersCount,
        unremittedCount,
        summary,
        allOrdersLength: allOrders.length,
        currentPeriodData,
      });

      // Add summary rows
      const summaryRows = [
        [],
        ['SUMMARY'],
        ['Total Orders in Period', totalOrdersCount],
        ['Already Remitted', totalOrdersCount - unremittedCount],
        ['To be Remitted', unremittedCount],
        [],
        ['FINANCIAL SUMMARY (UNREMITTER ORDERS ONLY)'],
        ['Gross Sales', `P${Number(summary.gross || 0).toFixed(2)}`],
        ['Refunds', `P${Number(summary.refunds || 0).toFixed(2)}`],
        ['Voided Amount', `P${Number(summary.voidedAmount || 0).toFixed(2)}`],
        ['Net Sales', `P${Number(summary.net || 0).toFixed(2)}`],
        ['Amount to Remit', `P${Number(summary.remitted || 0).toFixed(2)}`],
      ];

      // Combine headers, data, and summary
      const csvContent = [headers, ...csvData, ...summaryRows]
        .map((row) =>
          row.map((field) => `"${String(field).replace(/"/g, '""')}"`).join(',')
        )
        .join('\n');

      // Create and download file
      const periodName =
        activeTab.value === 'today'
          ? 'Today'
          : activeTab.value === 'thisWeek'
            ? 'This Week'
            : activeTab.value === 'thisMonth'
              ? 'This Month'
              : activeTab.value === 'customMonth'
                ? customMonth.value
                : 'Period';

      const filename = `Remit_Sales_${periodName}_${new Date().toISOString().split('T')[0]}.csv`;

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showSuccess(`Remittance data exported as ${filename}`);
    } catch (error) {
      console.error('Error exporting data:', error);
      showError('Failed to export data. Please try again.');
    } finally {
      isExporting.value = false;
    }
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

  // Calculate statistics from unremitted orders only
  // This ensures we only remit amounts from orders that haven't been remitted yet
  const calculateUnremittedStats = (orders) => {
    const unremittedOrders = orders.filter((order) => !order.remittance_id);

    let gross = 0;
    let refunds = 0;
    let voidedAmount = 0;

    unremittedOrders.forEach((order) => {
      if (order.status === 'completed') {
        gross += Number(order.total_amount || 0);
      } else if (order.status === 'void') {
        // Only deduct voided orders that were completed first (refunds)
        // Orders cancelled before completion should not be deducted
        if (order.completed_at) {
          // This was a completed order that was later refunded
          voidedAmount += Number(order.total_amount || 0);
        }
        // If completed_at is null, this was cancelled before completion
        // Do not deduct from remittance amount
      }
      // Note: Refunds are not typically stored in individual orders
      // They would come from a separate refunds table if available
    });

    const net = Math.max(0, gross - refunds - voidedAmount);
    const remitted = net; // Remitted amount equals net sales

    return { gross, refunds, voidedAmount, net, remitted };
  };

  // Store all orders for the period for accurate financial calculation
  const allOrdersForPeriod = ref([]);

  // Summary used by confirmation modal (uses all orders in period, filtered to unremitted)
  const confirmSummary = computed(() => {
    // Use all orders for the period, not just current page
    return calculateUnremittedStats(allOrdersForPeriod.value);
  });

  const remitToFinance = async () => {
    try {
      if (submitting.value) return;

      // Set submitting state immediately for better UX
      submitting.value = true;

      const periodMap = {
        today: 'today',
        thisWeek: 'week',
        thisMonth: 'month',
        customMonth: 'month', // Custom month uses month period type
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
          submitting.value = false;
          return;
        }
      } catch (dupErr) {
        console.warn('Failed to check existing remittance:', dupErr);
        // Continue with submission even if duplicate check fails
      }

      // Get all orders for the period to calculate unremitted totals
      // This replaces the previous approach of using fetchSalesStats which included all orders
      const allOrdersResponse = await posStore.fetchOrderHistory({
        branch_id: context.currentBranch.id,
        date_from: dateFrom,
        date_to: dateTo,
        limit: 1000, // Get all orders, not just paginated ones
        offset: 0,
      });

      const allOrders = allOrdersResponse.data || [];

      // Calculate totals only from unremitted orders
      const unremittedStats = calculateUnremittedStats(allOrders);

      const gross = unremittedStats.gross;
      const refunds = unremittedStats.refunds;
      const voidedAmount = unremittedStats.voidedAmount;
      const net = unremittedStats.net;
      const remitted = unremittedStats.remitted;

      // Count unremitted orders for disposed count
      const unremittedOrders = allOrders.filter(
        (order) => !order.remittance_id
      );
      const disposed = unremittedOrders.filter(
        (order) => order.status === 'void'
      ).length;

      const totals = {
        gross,
        net,
        refunds,
        disposed,
        voidedAmount,
      };
      // Add timeout to prevent hanging
      const submissionPromise = posStore.submitRemittance({
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

      // Add timeout wrapper
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(
          () => reject(new Error('Submission timeout - please try again')),
          10000
        ); // 10 second timeout
      });

      await Promise.race([submissionPromise, timeoutPromise]);

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

  // Store for all unremitted orders count across the entire period
  const allUnremittedOrdersCount = ref(0);
  const isExporting = ref(false);

  // Only unremitted orders from current page are used for display
  const unremittedOrders = computed(() => {
    const all = currentData.value?.ordersDetails || [];
    return all.filter((o) => !o.remittance_id);
  });

  // For server-side pagination, table shows ALL orders (both remitted and unremitted) for transparency
  // But remittance calculation will only use unremitted orders
  const paginatedOrders = computed(() => currentData.value.ordersDetails || []);

  const totalPages = computed(() => {
    return Math.max(1, Math.ceil(totalServerOrders.value / itemsPerPage.value));
  });

  // Total orders should be based on all orders in the period, not just paginated results
  const totalOrders = computed(() => allOrdersForPeriod.value.length);

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
    <div class="modal-box max-w-6xl max-h-[90vh] overflow-y-auto">
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

      <!-- Custom Month Input -->
      <div v-if="activeTab === 'customMonth'" class="mb-4">
        <label class="label">
          <span class="label-text">Select Month</span>
        </label>
        <input
          type="month"
          class="input input-bordered input-sm max-w-xs"
          v-model="customMonth"
          @change="fetchRemitData('customMonth')"
        />
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
                    : activeTab === 'thisMonth'
                      ? 'This Month'
                      : activeTab === 'customMonth'
                        ? customMonth
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
                <div class="flex items-center gap-4 text-xs">
                  <div class="flex items-center gap-1">
                    <div
                      class="w-3 h-3 bg-blue-50 border border-blue-200 rounded"
                    ></div>
                    <span>Unremitted ({{ allUnremittedOrdersCount }})</span>
                  </div>
                  <div class="flex items-center gap-1">
                    <div
                      class="w-3 h-3 bg-gray-50 border border-gray-200 rounded"
                    ></div>
                    <span>Already Remitted</span>
                  </div>
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
                    :class="{
                      'bg-blue-50': !order.remittance_id,
                      'bg-gray-50': order.remittance_id,
                    }"
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
                        : activeTab === 'thisMonth'
                          ? 'this month'
                          : activeTab === 'customMonth'
                            ? customMonth
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
        <div class="flex justify-between items-center">
          <div
            v-if="allUnremittedOrdersCount === 0"
            class="text-sm text-gray-500 flex items-center gap-2"
          >
            <AlertCircle class="w-4 h-4" />
            <span>All orders in this period have already been remitted</span>
          </div>
          <div v-else class="text-sm text-gray-600 flex items-center gap-2">
            <CheckCircle class="w-4 h-4" />
            <span
              >{{ allUnremittedOrdersCount }} unremitted order{{
                allUnremittedOrdersCount !== 1 ? 's' : ''
              }}
              ready for remittance</span
            >
          </div>

          <div class="flex gap-2">
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
              :disabled="isExporting || posStore.loading"
            >
              <span
                v-if="isExporting"
                class="loading loading-spinner loading-xs mr-1"
              ></span>
              <Download v-else class="w-4 h-4 mr-1" />
              {{ isExporting ? 'Exporting...' : 'Export' }}
            </button>
            <button
              class="btn bg-primaryColor text-white hover:bg-primaryColor/80 btn-sm font-thin"
              @click="showConfirmRemit = true"
              :disabled="posStore.loading || allUnremittedOrdersCount === 0"
            >
              <CheckCircle class="w-4 h-4 mr-1" />
              Remit to Finance
              <span
                v-if="allUnremittedOrdersCount > 0"
                class="badge badge-xs ml-1 bg-white/80 text-primaryColor font-thin"
              >
                {{ allUnremittedOrdersCount }}
              </span>
            </button>
          </div>
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
        This will submit the unremitted orders from
        {{
          activeTab === 'today'
            ? 'Today'
            : activeTab === 'thisWeek'
              ? 'This Week'
              : activeTab === 'thisMonth'
                ? 'This Month'
                : activeTab === 'customMonth'
                  ? customMonth
                  : 'This Month'
        }}
        to Finance. Only orders that haven't been remitted yet will be included.
      </p>
      <!-- Order Summary -->
      <div class="mt-3 p-3 bg-gray-50 rounded-lg">
        <div class="text-sm text-gray-600 mb-2">
          <strong>Order Summary:</strong>
        </div>
        <div class="text-sm">
          <div class="flex justify-between">
            <span>Total Orders in Period:</span>
            <span>{{ totalOrders }}</span>
          </div>
          <div class="flex justify-between">
            <span>Already Remitted:</span>
            <span>{{ totalOrders - allUnremittedOrdersCount }}</span>
          </div>
          <div class="flex justify-between font-semibold text-primaryColor">
            <span>To be Remitted:</span>
            <span>{{ allUnremittedOrdersCount }}</span>
          </div>
        </div>
      </div>

      <!-- Financial Summary -->
      <div class="mt-3 text-sm">
        <div class="text-sm text-gray-600 mb-2">
          <strong>Financial Summary (Unremitted Orders Only):</strong>
        </div>
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
        <div
          class="flex justify-between font-semibold border-t pt-2 text-primaryColor"
        >
          <span>Amount to Remit:</span>
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
          :class="{ 'opacity-75 cursor-not-allowed': submitting }"
        >
          <span
            v-if="submitting"
            class="loading loading-spinner loading-xs mr-2"
          ></span>
          <span>{{ submitting ? 'Submitting…' : 'Confirm' }}</span>
        </button>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop">
      <button @click="showConfirmRemit = false">close</button>
    </form>
  </dialog>
</template>

<style scoped></style>
