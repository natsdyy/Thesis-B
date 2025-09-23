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
    PhilippinePeso,
    Trash2,
  } from 'lucide-vue-next';
  import { useBranchContextStore } from '../../stores/branchContextStore';
  import { usePOSStore } from '../../stores/posStore';
  // Use store helper for menu items; avoid direct API calls
  import { useCustomToast } from '../../composables/useCustomToast';
  import BranchSalesTransactionsModal from '../../components/branch/BranchSalesTransactionsModal.vue';
  import BranchRemitSalesModal from '../../components/branch/BranchRemitSalesModal.vue';

  const branchContextStore = useBranchContextStore();
  const posStore = usePOSStore();
  const { showSuccess, showError, showWarning, showInfo } = useCustomToast();

  // Local state
  const loading = ref(false);
  const selectedPeriod = ref('today');
  const activeTab = ref('overview');
  const salesData = ref({
    totalSales: 0,
    totalTransactions: 0,
    averageTransaction: 0,
    totalDisposed: 0,
    lossProfit: 0,
    refundedAmount: 0,
    growthRate: 0,
  });

  const recentTransactions = ref([]);
  const topSellingItems = ref([]);
  const hourlyData = ref([]);
  const showVoidModal = ref(false);
  const showCompleteModal = ref(false);
  const showTransactionsModal = ref(false);
  const showRemitModal = ref(false);
  const selectedOrder = ref(null);
  const voidReason = ref('');
  const selectedVoidReason = ref('');
  const customReason = ref('');
  const calculatedLoss = ref(0);
  const showLeastSelling = ref(false);
  const voidLoading = ref(false);
  const completeLoading = ref(false);
  const remitLoading = ref(false);

  // Predefined void reasons
  const voidReasons = ref([
    // REFUND REASONS - No inventory deduction, no loss profit
    {
      value: 'customer_cancelled',
      label: 'Customer Cancelled',
      description: 'Customer requested to cancel the order',
      type: 'refund',
      icon: 'fa-undo',
      color: 'text-primaryColor',
    },
    {
      value: 'wrong_order',
      label: 'Wrong Order',
      description: 'Order was placed incorrectly',
      type: 'refund',
      icon: 'fa-times-circle',
      color: 'text-primaryColor',
    },
    {
      value: 'duplicate_order',
      label: 'Duplicate Order',
      description: 'Order was placed multiple times',
      type: 'refund',
      icon: 'fa-copy',
      color: 'text-primaryColor',
    },
    {
      value: 'payment_issue',
      label: 'Payment Issue',
      description: 'Payment processing failed or declined',
      type: 'refund',
      icon: 'fa-credit-card',
      color: 'text-primaryColor',
    },
    {
      value: 'system_error',
      label: 'System Error',
      description: 'Technical issue with POS system',
      type: 'refund',
      icon: 'fa-exclamation-triangle',
      color: 'text-primaryColor',
    },
    // LOSS REASONS - Inventory deduction, loss profit recorded
    {
      value: 'staff_error',
      label: 'Staff Error',
      description: 'Mistake made by staff member',
      type: 'loss',
      icon: 'fa-user-times',
      color: 'text-red-600',
    },
    {
      value: 'item_damaged',
      label: 'Item Damaged',
      description: 'Product was damaged during preparation',
      type: 'loss',
      icon: 'fa-ban',
      color: 'text-red-600',
    },
    {
      value: 'expired_item',
      label: 'Expired Item',
      description: 'Product has expired and cannot be served',
      type: 'loss',
      icon: 'fa-clock',
      color: 'text-red-600',
    },
    {
      value: 'quality_issue',
      label: 'Quality Issue',
      description: 'Product does not meet quality standards',
      type: 'loss',
      icon: 'fa-exclamation-circle',
      color: 'text-red-600',
    },
    {
      value: 'preparation_error',
      label: 'Preparation Error',
      description: 'Error in food preparation process',
      type: 'loss',
      icon: 'fa-utensils',
      color: 'text-red-600',
    },
    {
      value: 'custom',
      label: 'Other',
      description: 'Specify custom reason',
      type: 'loss',
      icon: 'fa-edit',
      color: 'text-gray-600',
    },
  ]);

  // Computed
  const currentBranch = computed(() => branchContextStore.currentBranch);
  const userRole = computed(() => branchContextStore.userRole);
  const canViewSales = computed(() => branchContextStore.canAccessSales);

  // Computed property for displaying items based on toggle
  const displayedItems = computed(() => {
    if (!topSellingItems.value || topSellingItems.value.length === 0) {
      return [];
    }

    if (showLeastSelling.value) {
      // Return items sorted by quantity ascending (least selling first)
      return [...topSellingItems.value]
        .sort((a, b) => a.quantity - b.quantity)
        .slice(0, 10);
    } else {
      // Return items sorted by quantity descending (top selling first)
      return [...topSellingItems.value]
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 10);
    }
  });

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
        // Calculate growth rate
        const growthRate = await calculateGrowthRate(
          stats,
          branchId,
          dateFrom,
          dateTo
        );

        salesData.value = {
          totalSales: stats.total_sales || 0,
          totalTransactions: stats.total_orders || 0,
          averageTransaction: stats.average_order_value || 0,
          totalDisposed: stats.total_disposed || 0,
          lossProfit: stats.loss_profit || 0,
          refundedAmount: stats.refunded_amount || 0,
          growthRate: growthRate,
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
        totalDisposed: 0,
        lossProfit: 0,
        refundedAmount: 0,
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
        // Local day boundaries, then convert to ISO (UTC) when sending
        const todayLocal = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate()
        );
        dateFrom = new Date(todayLocal);
        dateFrom.setHours(0, 0, 0, 0);

        dateTo = new Date(todayLocal);
        dateTo.setHours(23, 59, 59, 999);
        break;
      case 'week':
        // Start of week (Sunday = 0, Monday = 1, etc.) in local time
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        dateFrom = startOfWeek;

        // End of current day in local time
        const endOfToday = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate()
        );
        dateTo = new Date(endOfToday);
        dateTo.setHours(23, 59, 59, 999);
        break;
      case 'month':
        // Start of current month in local time
        dateFrom = new Date(now.getFullYear(), now.getMonth(), 1);
        dateFrom.setHours(0, 0, 0, 0);

        // End of current day in local time
        const endOfTodayMonth = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate()
        );
        dateTo = new Date(endOfTodayMonth);
        dateTo.setHours(23, 59, 59, 999);
        break;
      case 'year':
        // Start of current year in local time
        dateFrom = new Date(now.getFullYear(), 0, 1);
        dateFrom.setHours(0, 0, 0, 0);

        // End of current day in local time
        const endOfTodayYear = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate()
        );
        dateTo = new Date(endOfTodayYear);
        dateTo.setHours(23, 59, 59, 999);
        break;
      default:
        const todayDefault = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate()
        );
        dateFrom = new Date(todayDefault);
        dateFrom.setHours(0, 0, 0, 0);

        dateTo = new Date(todayDefault);
        dateTo.setHours(23, 59, 59, 999);
    }

    return {
      dateFrom: dateFrom.toISOString(),
      dateTo: dateTo.toISOString(),
    };
  };

  const calculateGrowthRate = async (
    currentStats,
    branchId,
    dateFrom,
    dateTo
  ) => {
    try {
      // Calculate previous period dates
      const currentPeriodDays = Math.ceil(
        (new Date(dateTo) - new Date(dateFrom)) / (1000 * 60 * 60 * 24)
      );
      const previousDateFrom = new Date(dateFrom);
      previousDateFrom.setDate(previousDateFrom.getDate() - currentPeriodDays);
      const previousDateTo = new Date(dateFrom);
      previousDateTo.setDate(previousDateTo.getDate() - 1);

      // Fetch previous period stats
      const previousStats = await posStore.fetchSalesStats(
        branchId,
        previousDateFrom.toISOString(),
        previousDateTo.toISOString()
      );

      if (!previousStats || previousStats.total_sales === 0) {
        return currentStats.total_sales > 0 ? 100 : 0; // 100% growth if no previous data
      }

      const currentSales = currentStats.total_sales || 0;
      const previousSales = previousStats.total_sales || 0;

      if (previousSales === 0) {
        return currentSales > 0 ? 100 : 0;
      }

      const growthRate = ((currentSales - previousSales) / previousSales) * 100;
      return Math.round(growthRate * 100) / 100; // Round to 2 decimal places
    } catch (error) {
      console.error('Error calculating growth rate:', error);
      return 0;
    }
  };

  const loadRecentTransactions = async (branchId) => {
    try {
      // Fetch recent orders from POS system (all statuses)
      const response = await posStore.fetchOrderHistory({
        branch_id: branchId,
        limit: 10,
      });

      if (response && response.data && response.data.length > 0) {
        recentTransactions.value = response.data.map((order) => {
          const isRefunded =
            order.status === 'void' &&
            [
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
            ].includes(order.void_reason);

          const isLoss =
            order.status === 'void' &&
            [
              'staff_error',
              'item_damaged',
              'expired_item',
              'quality_issue',
              'preparation_error',
              'Staff Error',
              'Item Damaged',
              'Expired Item',
              'Quality Issue',
              'Preparation Error',
            ].includes(order.void_reason);

          // Debug logging
          if (order.status === 'void') {
            console.log(`Order ${order.order_number}:`, {
              status: order.status,
              void_reason: order.void_reason,
              isRefunded,
              isLoss,
            });
          }

          // Fallback: if neither isRefunded nor isLoss is true, default to loss for safety
          const finalIsRefunded = isRefunded;
          const finalIsLoss =
            isLoss || (order.status === 'void' && !isRefunded);

          return {
            id: order.id,
            order_number: order.order_number,
            time: new Date(order.created_at).toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
            }),
            amount: parseFloat(order.total_amount) || 0,
            amount_paid: parseFloat(order.amount_paid) || 0,
            change_amount: parseFloat(order.change_amount) || 0,
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
            canVoid:
              order.status === 'pending' ||
              order.status === 'processing' ||
              order.status === 'completed',
            isRefunded: finalIsRefunded,
            isLoss: finalIsLoss,
            void_reason: order.void_reason,
            voided_at: order.voided_at,
          };
        });
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

      // Fallback to empty array
      const soldItems = Array.isArray(items) ? items : [];

      // Fetch all available branch menu items to include zero-sales
      const allMenu = await posStore.fetchBranchMenuItems(branchId);

      // Merge zero-sale items
      const existing = new Map(soldItems.map((it) => [it.name, it]));
      const merged = [...soldItems];
      allMenu.forEach((mi) => {
        const name = mi.name;
        if (name && !existing.has(name)) {
          merged.push({ name, quantity: 0, revenue: 0 });
        }
      });

      topSellingItems.value = merged;
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

  const showAllTransactions = () => {
    showTransactionsModal.value = true;
  };

  const closeTransactionsModal = () => {
    showTransactionsModal.value = false;
  };

  const showRemitSales = async () => {
    remitLoading.value = true;
    try {
      // Add a small delay to show loading state
      await new Promise((resolve) => setTimeout(resolve, 500));
      showRemitModal.value = true;
    } catch (error) {
      console.error('Error opening remit sales modal:', error);
      showError('Failed to open remit sales report');
    } finally {
      remitLoading.value = false;
    }
  };

  const closeRemitModal = () => {
    showRemitModal.value = false;
  };

  // Void order functionality
  const showVoidOrder = (order) => {
    selectedOrder.value = order;
    voidReason.value = '';
    selectedVoidReason.value = '';
    customReason.value = '';
    calculatedLoss.value = 0;

    // Calculate potential loss (total amount of the order)
    calculatedLoss.value = order.amount || 0;

    showVoidModal.value = true;
  };

  const confirmVoidOrder = async () => {
    // Validate reason selection
    if (!selectedVoidReason.value) {
      showWarning('Please select a reason for voiding the order');
      return;
    }

    // If custom reason is selected, validate custom reason
    if (selectedVoidReason.value === 'custom' && !customReason.value.trim()) {
      showWarning('Please provide a custom reason for voiding the order');
      return;
    }

    // Prepare the final reason
    const finalReason =
      selectedVoidReason.value === 'custom'
        ? customReason.value.trim()
        : voidReasons.value.find((r) => r.value === selectedVoidReason.value)
            ?.value;

    // Get the selected reason type
    const selectedReason = voidReasons.value.find(
      (r) => r.value === selectedVoidReason.value
    );
    const isLossReason = selectedReason?.type === 'loss';
    const isRefundReason = selectedReason?.type === 'refund';

    // Calculate loss amount based on order status + reason type
    // If order is completed and refund reason → treat as loss (deduct inventory)
    const orderStatus = selectedOrder.value?.status || '';
    const isOrderCompleted = orderStatus === 'completed';

    let lossAmount = 0;
    if (isLossReason) {
      lossAmount = calculatedLoss.value;
    } else if (isRefundReason) {
      lossAmount = isOrderCompleted ? calculatedLoss.value : 0;
    } else {
      lossAmount = calculatedLoss.value;
    }

    voidLoading.value = true;

    try {
      await posStore.voidOrder(
        selectedOrder.value.id,
        finalReason,
        lossAmount,
        { refund_on_completed: isRefundReason && isOrderCompleted }
      );

      showVoidModal.value = false;
      selectedOrder.value = null;
      voidReason.value = '';
      selectedVoidReason.value = '';
      customReason.value = '';
      calculatedLoss.value = 0;

      // Refresh data after voiding
      await loadSalesData();

      showSuccess('Order voided successfully');
    } catch (error) {
      console.error('Error voiding order:', error);
      showError('Failed to void order. Please try again.');
    } finally {
      voidLoading.value = false;
    }
  };

  const closeVoidModal = () => {
    if (voidLoading.value) return; // Prevent closing during loading

    showVoidModal.value = false;
    selectedOrder.value = null;
    voidReason.value = '';
    selectedVoidReason.value = '';
    customReason.value = '';
    calculatedLoss.value = 0;
    voidLoading.value = false;
  };

  // Toggle between top and least selling items
  const toggleSellingItems = () => {
    showLeastSelling.value = !showLeastSelling.value;
  };

  // Complete order functionality
  const showCompleteOrder = (order) => {
    selectedOrder.value = order;
    showCompleteModal.value = true;
  };

  const completeOrder = async () => {
    if (!selectedOrder.value) return;

    completeLoading.value = true;

    try {
      await posStore.completeOrder(selectedOrder.value.id);

      // Close modal and reset state
      showCompleteModal.value = false;
      selectedOrder.value = null;

      // Refresh data after completing
      await loadSalesData();

      showSuccess('Order completed successfully');
    } catch (error) {
      console.error('Error completing order:', error);
      showError('Failed to complete order. Please try again.');
    } finally {
      completeLoading.value = false;
    }
  };

  const closeCompleteModal = () => {
    if (completeLoading.value) return; // Prevent closing during loading
    showCompleteModal.value = false;
    selectedOrder.value = null;
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
                  >
                    {{ salesData.totalTransactions }}
                  </div>
                  <div class="stat-desc text-black/50 !text-xs sm:text-sm">
                    {{ selectedPeriod }}
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

                <!-- Top/Least Selling Items -->
                <div class="card bg-white shadow-lg">
                  <div class="card-body">
                    <div class="flex items-center justify-between mb-4">
                      <h2 class="card-title text-primaryColor">
                        <TrendingDown class="w-5 h-5" v-if="showLeastSelling" />
                        <TrendingUp class="w-5 h-5" v-else />

                        {{
                          showLeastSelling
                            ? 'Least Selling Items'
                            : 'Top Selling Items'
                        }}
                      </h2>
                      <button
                        @click="toggleSellingItems"
                        class="btn btn-sm font-thin text-primaryColor border-primaryColor hover:bg-primaryColor hover:text-white"
                        :class="{
                          'bg-primaryColor text-white': showLeastSelling,
                        }"
                      >
                        <TrendingDown
                          v-if="!showLeastSelling"
                          class="w-4 h-4 mr-1"
                        />
                        <TrendingUp v-else class="w-4 h-4 mr-1" />
                        {{ showLeastSelling ? 'Show Top' : 'Show Least' }}
                      </button>
                    </div>

                    <div v-if="displayedItems.length > 0" class="space-y-3">
                      <div
                        v-for="(item, index) in displayedItems"
                        :key="item.name"
                        class="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div class="flex items-center">
                          <div
                            :class="{
                              'bg-warning/80 text-white': showLeastSelling,
                            }"
                            class="w-8 h-8 bg-primaryColor text-white rounded-full flex items-center justify-center text-sm font-bold mr-3"
                          >
                            {{ index + 1 }}
                          </div>
                          <div>
                            <p class="font-medium text-gray-900">
                              {{ item.name }}
                            </p>
                            <p class="text-sm text-gray-600">
                              {{ item.quantity }} sold
                            </p>
                          </div>
                        </div>
                        <div class="text-right">
                          <p
                            class="font-thin text-primaryColor"
                            :class="{
                              'text-warning': showLeastSelling,
                            }"
                          >
                            <font-awesome-icon icon="fa-solid fa-peso-sign" />{{
                              parseFloat(item.revenue).toFixed(2)
                            }}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div v-else class="text-center py-8">
                      <TrendingUp
                        class="w-12 h-12 mx-auto text-gray-400 mb-3"
                      />
                      <p class="text-gray-500">No sales data available</p>
                      <p class="text-sm text-gray-400">
                        {{
                          showLeastSelling
                            ? 'Least selling items'
                            : 'Top selling items'
                        }}
                        will appear here
                      </p>
                    </div>
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
              @click="showAllTransactions"
              class="btn btn-outline btn-sm text-primaryColor border-primaryColor hover:bg-primaryColor hover:text-white"
            >
              <Eye class="w-4 h-4 mr-1" />
              View All Transactions
            </button>
          </div>
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
            {{
              selectedOrder?.status === 'completed'
                ? 'Refund Order'
                : 'Void Order'
            }}
          </h3>
          <p class="text-sm sm:text-base text-gray-600">
            {{
              selectedOrder?.status === 'completed'
                ? 'Are you sure you want to refund this order? This will process a refund to the customer.'
                : 'Are you sure you want to void this order? This action cannot be undone.'
            }}
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

          <!-- Void Reason Selection -->
          <div class="space-y-4">
            <div>
              <label class="text-sm font-medium text-gray-700">
                Reason for voiding:
              </label>
              <select
                v-model="selectedVoidReason"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm mt-1"
                required
              >
                <option value="">Select a reason...</option>
                <optgroup label="Refund Reasons (No inventory deduction)">
                  <option
                    v-for="reason in voidReasons.filter(
                      (r) => r.type === 'refund'
                    )"
                    :key="reason.value"
                    :value="reason.value"
                  >
                    {{ reason.label }}
                  </option>
                </optgroup>
                <optgroup
                  label="Loss Reasons (Inventory deduction + Loss profit)"
                >
                  <option
                    v-for="reason in voidReasons.filter(
                      (r) => r.type === 'loss'
                    )"
                    :key="reason.value"
                    :value="reason.value"
                  >
                    {{ reason.label }}
                  </option>
                </optgroup>
              </select>

              <!-- Reason Description with Visual Indicator -->
              <div
                v-if="
                  selectedVoidReason &&
                  voidReasons.find((r) => r.value === selectedVoidReason)
                "
                class="mt-2 p-3 rounded-lg border"
                :class="{
                  'bg-primaryColor/10 border-primaryColor/20':
                    voidReasons.find((r) => r.value === selectedVoidReason)
                      ?.type === 'refund',
                  'bg-error/10 border-error/20':
                    voidReasons.find((r) => r.value === selectedVoidReason)
                      ?.type === 'loss',
                }"
              >
                <div class="flex items-center space-x-2">
                  <font-awesome-icon
                    :icon="
                      voidReasons.find((r) => r.value === selectedVoidReason)
                        ?.icon
                    "
                    :class="
                      voidReasons.find((r) => r.value === selectedVoidReason)
                        ?.color
                    "
                    class="w-4 h-4"
                  />
                  <span
                    class="text-sm font-medium"
                    :class="
                      voidReasons.find((r) => r.value === selectedVoidReason)
                        ?.color
                    "
                  >
                    {{
                      voidReasons.find((r) => r.value === selectedVoidReason)
                        ?.type === 'refund'
                        ? 'Refund'
                        : 'Loss'
                    }}
                  </span>
                </div>
                <p class="text-xs text-gray-600 mt-1">
                  {{
                    voidReasons.find((r) => r.value === selectedVoidReason)
                      ?.description
                  }}
                </p>
                <p
                  class="text-xs mt-1"
                  :class="
                    voidReasons.find((r) => r.value === selectedVoidReason)
                      ?.color
                  "
                >
                  {{
                    voidReasons.find((r) => r.value === selectedVoidReason)
                      ?.type === 'refund'
                      ? ' No inventory deduction • No loss profit recorded'
                      : 'Inventory will be deducted • Loss profit will be recorded'
                  }}
                </p>
              </div>
            </div>

            <!-- Custom Reason Input -->
            <div v-if="selectedVoidReason === 'custom'" class="space-y-2">
              <label class="text-sm font-medium text-gray-700">
                Custom Reason:
              </label>
              <textarea
                v-model="customReason"
                placeholder="Please specify the reason for voiding this order..."
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                rows="3"
                required
              ></textarea>
            </div>

            <!-- Loss Profit Display - Only show for loss reasons -->
            <div
              v-if="
                selectedVoidReason &&
                voidReasons.find((r) => r.value === selectedVoidReason)
                  ?.type === 'loss'
              "
              class="bg-red-50 border border-red-200 rounded-lg p-4"
            >
              <div class="flex items-center justify-between">
                <div>
                  <h4 class="text-sm font-medium text-red-800">
                    Potential Loss
                  </h4>
                  <p class="text-xs text-red-600 mt-1">
                    This amount will be recorded as loss profit
                  </p>
                </div>
                <div class="text-right">
                  <p class="text-lg font-bold text-red-600">
                    <font-awesome-icon icon="fa-solid fa-peso-sign" />
                    {{ calculatedLoss.toFixed(2) }}
                  </p>
                </div>
              </div>
            </div>

            <!-- Refund Notice - Only show for refund reasons -->
            <div
              v-if="
                selectedVoidReason &&
                voidReasons.find((r) => r.value === selectedVoidReason)
                  ?.type === 'refund'
              "
              class="bg-primaryColor/10 border border-primaryColor/20 rounded-lg p-4"
            >
              <div class="flex items-center justify-between">
                <div>
                  <h4 class="text-sm font-medium text-primaryColor">
                    Refund Processing
                  </h4>
                  <p class="text-xs text-primaryColor mt-1">
                    {{
                      selectedOrder?.status === 'completed'
                        ? 'Inventory stays deducted • Loss profit will be recorded'
                        : 'No inventory deduction • No loss profit recorded'
                    }}
                  </p>
                </div>
                <div class="text-right">
                  <p class="text-lg font-bold text-primaryColor">
                    <font-awesome-icon icon="fa-solid fa-peso-sign" />
                    {{ calculatedLoss.toFixed(2) }}
                  </p>
                  <p class="text-xs text-primaryColor mt-1">Refund Amount</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div
          class="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3"
        >
          <button
            @click="closeVoidModal"
            :disabled="voidLoading"
            class="flex-1 btn btn-outline btn-sm sm:btn-md touch-manipulation font-thin disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            @click="confirmVoidOrder"
            :disabled="voidLoading"
            class="flex-1 btn bg-red-600 text-white btn-sm sm:btn-md touch-manipulation font-thin hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span
              v-if="voidLoading"
              class="loading loading-spinner loading-sm mr-2"
            ></span>
            {{
              voidLoading
                ? selectedOrder?.status === 'completed'
                  ? 'Processing Refund...'
                  : 'Voiding...'
                : selectedOrder?.status === 'completed'
                  ? 'Process Refund'
                  : 'Void Order'
            }}
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
  </div>
</template>

<style scoped></style>
