<script setup>
  import { ref, watch, computed, onMounted } from 'vue';
  import {
    X,
    Search,
    Filter,
    Calendar,
    Download,
    HelpCircle,
    ShoppingCart,
    TrendingUp,
    TrendingDown,
    AlertCircle,
    RefreshCcw,
    Eye,
    CheckCircle,
    XCircle,
    Clock,
  } from 'lucide-vue-next';
  import { usePOSStore } from '../../stores/posStore.js';
  import { useBranchContextStore } from '../../stores/branchContextStore.js';
  import { useAuthStore } from '../../stores/authStore.js';
  import { useCustomToast } from '../../composables/useCustomToast.js';
  import axios from 'axios';
  import { apiConfig } from '../../config/api.js';

  const props = defineProps({
    show: { type: Boolean, default: false },
    initialFilter: { type: Object, default: () => ({}) },
  });

  const emit = defineEmits(['close', 'reopen', 'refresh']);

  const posStore = usePOSStore();
  const context = useBranchContextStore();
  const authStore = useAuthStore();
  const { showSuccess, showError, showWarning, showInfo } = useCustomToast();

  const loading = ref(false);
  const transactions = ref([]);
  const currentPage = ref(1);
  const itemsPerPage = ref(10);
  const totalPages = ref(1);
  const totalTransactions = ref(0);

  // Manager PIN verification
  const showManagerPinModal = ref(false);
  const managerPinForm = ref({
    employeeId: '',
  });
  const managerPinError = ref('');
  const showEmployeeId = ref(false);
  const isVerifyingPin = ref(false);

  // Void modal state
  const showVoidModal = ref(false);
  const voidReason = ref('');
  const selectedVoidReason = ref('');
  const customReason = ref('');
  const calculatedLoss = ref(0);
  const voidLoading = ref(false);

  // Complete order modal state
  const showCompleteModal = ref(false);
  const completeLoading = ref(false);

  // Predefined void reasons (same as BranchSales)
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

  const filters = ref({
    search: '',
    status: '', // pending | processing | completed | void
    order_type: '', // dine_in | take_out
    date_from: '',
    date_to: '',
    date_range: 'today',
  });

  const statusOptions = [
    { value: '', label: 'All Status' },
    { value: 'pending', label: 'Pending' },
    { value: 'processing', label: 'Processing' },
    { value: 'completed', label: 'Completed' },
    { value: 'void', label: 'Void/Refunded' },
  ];

  const orderTypeOptions = [
    { value: '', label: 'All Types' },
    { value: 'dine_in', label: 'Dine In' },
    { value: 'take_out', label: 'Take Out' },
  ];

  const getStatusInfo = (status, voidReason) => {
    if (status === 'void') {
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

      const isRefund = refundReasons.includes(voidReason);

      return {
        icon: isRefund ? RefreshCcw : AlertCircle,
        label: isRefund ? 'Refunded' : 'Loss',
        badge: isRefund
          ? 'bg-green-100 text-green-800 border border-green-200'
          : 'bg-red-100 text-red-800 border border-red-200',
        color: isRefund ? 'text-green-600' : 'text-red-600',
      };
    }

    const statusMap = {
      pending: {
        icon: Clock,
        label: 'Pending',
        badge: 'bg-info/20 text-info',
        color: 'text-info',
      },
      processing: {
        icon: RefreshCcw,
        label: 'Processing',
        badge: 'bg-warning/20 text-warning',
        color: 'text-warning',
      },
      completed: {
        icon: CheckCircle,
        label: 'Completed',
        badge: 'bg-success/20 text-success',
        color: 'text-success',
      },
    };

    return (
      statusMap[status] || {
        icon: HelpCircle,
        label: status,
        badge: 'bg-gray-100 text-gray-600',
        color: 'text-gray-600',
      }
    );
  };

  const formatTransactionDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getPageRange = () => {
    const current = currentPage.value;
    const total = totalPages.value;
    const range = [];
    const start = Math.max(2, current - 1);
    const end = Math.min(total - 1, current + 1);
    for (let i = start; i <= end; i++) {
      if (i !== 1 && i !== total) range.push(i);
    }
    return range;
  };

  const showLeftEllipsis = () => currentPage.value > 3;
  const showRightEllipsis = () => currentPage.value < totalPages.value - 2;

  const closeModal = () => {
    const dlg = document.getElementById('pos_transaction_modal');
    if (dlg?.close) dlg.close();
    emit('close');
  };

  const fetchTransactions = async () => {
    if (!context.currentBranch?.id) return;
    loading.value = true;
    try {
      // Calculate offset for pagination
      const offset = (currentPage.value - 1) * itemsPerPage.value;

      const response = await posStore.fetchOrderHistory({
        branch_id: context.currentBranch.id,
        limit: itemsPerPage.value,
        offset: offset,
        status: filters.value.status,
        date_from: filters.value.date_from,
        date_to: filters.value.date_to,
      });

      if (response && response.data && Array.isArray(response.data)) {
        transactions.value = response.data.map((order) => {
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

          return {
            id: order.id,
            order_number: order.order_number,
            time: formatTime(order.created_at),
            date: formatTransactionDate(order.created_at),
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
            isRefunded: isRefunded,
            isLoss: isLoss,
            void_reason: order.void_reason,
            voided_at: order.voided_at,
            remittance_id: order.remittance_id || null,
          };
        });

        // Use actual pagination data from API
        if (response.pagination) {
          totalTransactions.value = response.pagination.total;
          totalPages.value = Math.max(
            1,
            Math.ceil(response.pagination.total / itemsPerPage.value)
          );
        } else {
          // Fallback if pagination data is not available
          totalTransactions.value = response.data.length;
          totalPages.value = Math.max(
            1,
            Math.ceil(response.data.length / itemsPerPage.value)
          );
        }
      } else {
        transactions.value = [];
        totalTransactions.value = 0;
        totalPages.value = 1;
      }
    } catch (e) {
      console.error('Failed to load POS transactions', e);
      transactions.value = [];
      totalTransactions.value = 0;
      totalPages.value = 1;
    } finally {
      loading.value = false;
    }
  };

  const clearFilters = () => {
    filters.value = {
      search: '',
      status: '',
      order_type: '',
      date_from: '',
      date_to: '',
      date_range: 'today',
    };
    currentPage.value = 1;
    fetchTransactions();
  };

  const nextPage = () => {
    if (currentPage.value < totalPages.value) {
      currentPage.value++;
      fetchTransactions();
    }
  };

  const prevPage = () => {
    if (currentPage.value > 1) {
      currentPage.value--;
      fetchTransactions();
    }
  };

  watch(
    () => props.show,
    (val) => {
      const dlg = document.getElementById('pos_transaction_modal');
      if (val) {
        Object.assign(filters.value, props.initialFilter || {});
        currentPage.value = 1;
        fetchTransactions();
        if (dlg?.showModal) dlg.showModal();
      } else if (dlg?.close) {
        dlg.close();
      }
    }
  );

  onMounted(() => {
    if (props.show) fetchTransactions();
  });

  // Date range helpers
  const toYmd = (d) => {
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };

  const applyDateRange = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (filters.value.date_range === 'today') {
      filters.value.date_from = toYmd(today);
      filters.value.date_to = toYmd(today);
    } else if (filters.value.date_range === 'this_week') {
      const day = today.getDay();
      const mondayOffset = day === 0 ? -6 : 1 - day;
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() + mondayOffset);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      filters.value.date_from = toYmd(weekStart);
      filters.value.date_to = toYmd(weekEnd);
    } else if (filters.value.date_range === 'this_month') {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      filters.value.date_from = toYmd(start);
      filters.value.date_to = toYmd(end);
    } else if (filters.value.date_range === 'custom_month') {
      const base = filters.value.date_from
        ? new Date(filters.value.date_from)
        : new Date(today.getFullYear(), today.getMonth(), 1);
      const start = new Date(base.getFullYear(), base.getMonth(), 1);
      const end = new Date(base.getFullYear(), base.getMonth() + 1, 0);
      filters.value.date_from = toYmd(start);
      filters.value.date_to = toYmd(end);
    } else {
      // custom: keep inputs
    }
  };

  const exportTransactions = () => {
    // TODO: Implement export functionality
    console.log('Export POS transactions');
  };

  // Manager PIN verification functions
  const handleManagerPinVerification = async () => {
    managerPinError.value = '';
    isVerifyingPin.value = true;

    const employeeId = managerPinForm.value.employeeId?.trim();

    if (!employeeId) {
      managerPinError.value = 'Employee ID is required';
      isVerifyingPin.value = false;
      return;
    }

    try {
      // Fetch employee by employee_id
      const res = await axios.get(
        `${apiConfig.baseURL}/employees/employee-id/${encodeURIComponent(employeeId)}`
      );
      const employee = res.data?.data;

      if (!employee) {
        managerPinError.value = 'Employee not found';
        isVerifyingPin.value = false;
        return;
      }

      // Role and status checks
      if (employee.role !== 'Manager') {
        managerPinError.value = 'Only a Manager can perform this action';
        isVerifyingPin.value = false;
        return;
      }

      if (
        !employee.branch_id ||
        employee.branch_id !== context.currentBranch?.id
      ) {
        managerPinError.value = 'Manager must belong to this branch';
        isVerifyingPin.value = false;
        return;
      }

      // PIN verification successful - proceed with action
      await executePendingAction();

      // Close PIN modal
      showManagerPinModal.value = false;
      managerPinForm.value = { employeeId: '' };
      selectedTransaction.value = null;
      pendingAction.value = null;
    } catch (err) {
      console.error('Manager PIN verification failed:', err);
      managerPinError.value =
        err.response?.data?.message || 'Unable to verify manager';
    } finally {
      isVerifyingPin.value = false;
    }
  };

  const executePendingAction = async () => {
    if (!posStore.selectedTransaction || !posStore.pendingAction) return;

    try {
      if (posStore.pendingAction === 'void') {
        // Close PIN modal and show void modal
        showManagerPinModal.value = false;
        showVoidModal.value = true;

        // Calculate potential loss
        console.log(
          'Selected transaction in void modal:',
          posStore.selectedTransaction
        );
        calculatedLoss.value = posStore.selectedTransaction.amount || 0;

        // Reset void form
        voidReason.value = '';
        selectedVoidReason.value = '';
        customReason.value = '';
      } else if (posStore.pendingAction === 'refund') {
        // For refund action, show refund modal
        console.log('Refund transaction:', posStore.selectedTransaction);
        showManagerPinModal.value = false;
        showVoidModal.value = true;

        // Calculate potential loss
        calculatedLoss.value = posStore.selectedTransaction.amount || 0;

        // Reset void form
        voidReason.value = '';
        selectedVoidReason.value = '';
        customReason.value = '';
      }
    } catch (error) {
      console.error('Error executing action:', error);
    }
  };

  const showManagerPinModalForAction = (transaction, action) => {
    console.log('Transaction data being passed:', transaction);
    // Store the transaction data in the store
    posStore.setSelectedTransaction(transaction, action);
    managerPinForm.value = { employeeId: '' };
    managerPinError.value = '';

    // Close the main transaction modal temporarily
    closeModal();

    // Show PIN verification modal after a short delay
    setTimeout(() => {
      showManagerPinModal.value = true;
    }, 100);
  };

  const closeManagerPinModal = () => {
    showManagerPinModal.value = false;
    managerPinForm.value = { employeeId: '' };
    managerPinError.value = '';

    // Only emit reopen if we're not going to show void modal
    if (posStore.pendingAction !== 'void') {
      emit('reopen');
    }
  };

  // Action handlers
  const handleCompleteOrder = (transaction) => {
    // Store the transaction data in the store
    posStore.setSelectedTransaction(transaction, 'complete');

    // Close the main transaction modal temporarily
    closeModal();

    // Show complete modal after a short delay
    setTimeout(() => {
      showCompleteModal.value = true;
    }, 100);
  };

  const confirmCompleteOrder = async () => {
    if (!posStore.selectedTransaction) return;

    completeLoading.value = true;

    try {
      await posStore.completeOrder(posStore.selectedTransaction.id);
      await fetchTransactions(); // Refresh the list

      // Close modal and clear store
      showCompleteModal.value = false;
      posStore.clearSelectedTransaction();

      // Refresh POS data only; do not reopen the transactions modal
      emit('refresh');

      showSuccess('Order completed successfully');
    } catch (error) {
      console.error('Error completing order:', error);
      showError('Failed to complete order. Please try again.');
    } finally {
      completeLoading.value = false;
    }
  };

  const closeCompleteModal = () => {
    showCompleteModal.value = false;
    posStore.clearSelectedTransaction();
  };

  const handleVoidOrder = (transaction) => {
    showManagerPinModalForAction(transaction, 'void');
  };

  const handleRefundOrder = (transaction) => {
    showManagerPinModalForAction(transaction, 'refund');
  };

  // Void modal functions
  const confirmVoidOrder = async () => {
    // Validate reason selection
    if (!selectedVoidReason.value) {
      showWarning(
        posStore.pendingAction === 'refund'
          ? 'Please select a reason for refunding the order'
          : 'Please select a reason for voiding the order'
      );
      return;
    }

    // If custom reason is selected, validate custom reason
    if (selectedVoidReason.value === 'custom' && !customReason.value.trim()) {
      showWarning(
        posStore.pendingAction === 'refund'
          ? 'Please provide a custom reason for refunding the order'
          : 'Please provide a custom reason for voiding the order'
      );
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
    // Business rule:
    // - If order is Pending/Processing and reason is Refund → NO deduction, NO loss
    // - If order is Completed and reason is Refund → behave like Loss (deduct & record loss)
    // - Loss reasons always deduct & record loss
    const orderStatus = posStore.selectedTransaction?.status || '';
    const isOrderCompleted = orderStatus === 'completed';

    let lossAmount = 0;
    if (isLossReason) {
      lossAmount = calculatedLoss.value;
    } else if (isRefundReason) {
      lossAmount = isOrderCompleted ? calculatedLoss.value : 0;
    } else {
      // Fallback to safe behavior
      lossAmount = calculatedLoss.value;
    }

    voidLoading.value = true;

    try {
      await posStore.voidOrder(
        posStore.selectedTransaction.id,
        finalReason,
        lossAmount,
        { refund_on_completed: isRefundReason && isOrderCompleted }
      );

      // Close void modal and reopen transaction modal
      closeVoidModal();
      emit('reopen');
      emit('refresh');

      showSuccess(
        posStore.pendingAction === 'refund'
          ? 'Order refunded successfully'
          : 'Order voided successfully'
      );
    } catch (error) {
      console.error('Error voiding order:', error);
      showError(
        posStore.pendingAction === 'refund'
          ? 'Failed to refund order. Please try again.'
          : 'Failed to void order. Please try again.'
      );
    } finally {
      voidLoading.value = false;
    }
  };

  const closeVoidModal = () => {
    showVoidModal.value = false;
    posStore.clearSelectedTransaction();
    voidReason.value = '';
    selectedVoidReason.value = '';
    customReason.value = '';
    calculatedLoss.value = 0;
    voidLoading.value = false;
  };

  // Watch for selectedTransaction changes
  watch(
    () => posStore.selectedTransaction,
    (newVal) => {
      console.log('selectedTransaction changed:', newVal);
    },
    { deep: true }
  );
</script>

<template>
  <dialog id="pos_transaction_modal" class="modal">
    <div class="modal-box max-w-7xl max-h-[80vh] overflow-y-auto">
      <div class="flex items-center justify-between mb-4">
        <h3 class="card-title text-primaryColor">
          <ShoppingCart class="w-5 h-5 mr-2" />
          Recent Transactions
        </h3>
        <button class="btn btn-ghost btn-sm" @click="closeModal">
          <X class="w-4 h-4" />
        </button>
      </div>

      <div
        class="mb-3 flex flex-col sm:flex-row items-center justify-between gap-2"
      >
        <!-- Search -->
        <div class="w-full sm:w-1/3">
          <label class="input input-bordered flex items-center gap-2 w-full">
            <Search class="w-4 h-4" />
            <input
              v-model="filters.search"
              @keyup.enter="fetchTransactions"
              type="text"
              class="grow"
              placeholder="Search order number or items"
            />
          </label>
        </div>

        <!-- Filters -->
        <div class="flex flex-wrap sm:flex-nowrap items-center gap-2">
          <select
            v-model="filters.status"
            class="select select-bordered select-sm sm:select-md"
          >
            <option
              v-for="status in statusOptions"
              :key="status.value"
              :value="status.value"
            >
              {{ status.label }}
            </option>
          </select>

          <select
            v-model="filters.order_type"
            class="select select-bordered select-sm sm:select-md"
          >
            <option
              v-for="type in orderTypeOptions"
              :key="type.value"
              :value="type.value"
            >
              {{ type.label }}
            </option>
          </select>

          <select
            v-model="filters.date_range"
            @change="
              applyDateRange();
              fetchTransactions();
            "
            class="select select-bordered select-sm sm:select-md"
          >
            <option value="today">Today</option>
            <option value="this_week">This Week</option>
            <option value="this_month">This Month</option>
            <option value="custom_month">Custom Month</option>
            <option value="custom">Custom Range</option>
          </select>

          <label
            v-if="filters.date_range === 'custom'"
            class="input input-bordered flex items-center gap-2"
          >
            <Calendar class="w-4 h-4" />
            <input
              v-model="filters.date_from"
              type="date"
              class="grow"
              placeholder="From"
            />
          </label>
          <label
            v-if="filters.date_range === 'custom'"
            class="input input-bordered flex items-center gap-2"
          >
            <Calendar class="w-4 h-4" />
            <input
              v-model="filters.date_to"
              type="date"
              class="grow"
              placeholder="To"
            />
          </label>
        </div>
      </div>

      <div class="flex justify-end gap-2 mb-3">
        <button
          class="btn btn-ghost btn-sm font-thin hover:bg-gray-100"
          @click="clearFilters"
        >
          Clear
        </button>
        <button
          class="btn bg-primaryColor text-white btn-sm font-thin hover:bg-primaryColor/80"
          :disabled="loading"
          @click="fetchTransactions"
        >
          <Filter class="w-4 h-4 mr-1" />
          Apply
        </button>
      </div>

      <div v-if="loading" class="py-8 flex justify-center">
        <span class="loading loading-spinner" />
      </div>

      <div v-else>
        <div v-if="transactions.length === 0" class="py-10">
          <div class="text-center text-gray-500">No transactions found</div>
        </div>

        <div v-else class="overflow-x-auto">
          <table class="table table-zebra">
            <thead>
              <tr>
                <th>Order Number</th>
                <th>Items</th>
                <th>Date</th>
                <th>Time</th>
                <th>Amount</th>
                <th>Paid Amount</th>
                <th>Change</th>
                <th>Cashier</th>
                <th>Type</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="transaction in transactions" :key="transaction.id">
                <td>
                  <div class="font-mono text-sm">
                    {{ transaction.order_number }}
                  </div>
                </td>
                <td>
                  <div class="text-sm max-w-sm">
                    <div
                      v-if="transaction.items && transaction.items.length > 0"
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
                <td class="whitespace-nowrap">
                  {{ transaction.date }}
                </td>
                <td class="whitespace-nowrap">
                  {{ transaction.time }}
                </td>
                <td>
                  <div class="font-semibold text-primaryColor">
                    <font-awesome-icon icon="fa-solid fa-peso-sign" />{{
                      isNaN(transaction.amount)
                        ? '0.00'
                        : transaction.amount.toFixed(2)
                    }}
                  </div>
                </td>
                <td>
                  <div class="font-thin text-gray-600">
                    <font-awesome-icon icon="fa-solid fa-peso-sign" />{{
                      isNaN(transaction.amount_paid)
                        ? '0.00'
                        : transaction.amount_paid.toFixed(2)
                    }}
                  </div>
                </td>
                <td>
                  <div class="font-thin text-gray-600">
                    <font-awesome-icon icon="fa-solid fa-peso-sign" />{{
                      isNaN(transaction.change_amount)
                        ? '0.00'
                        : transaction.change_amount.toFixed(2)
                    }}
                  </div>
                </td>
                <td>
                  <div class="text-sm">{{ transaction.cashier }}</div>
                </td>
                <td>
                  <div class="text-sm">{{ transaction.order_type }}</div>
                </td>
                <td>
                  <div v-if="transaction.status === 'void'">
                    <div
                      :class="[
                        'badge badge-sm mb-1 flex items-center gap-1 cursor-pointer',
                        transaction.isRefunded
                          ? 'bg-green-100 text-green-800 border border-green-200'
                          : 'bg-red-100 text-red-800 border border-red-200',
                      ]"
                      :title="transaction.void_reason"
                    >
                      <font-awesome-icon
                        :icon="
                          transaction.isRefunded
                            ? 'fa-solid fa-undo'
                            : 'fa-solid fa-exclamation-triangle'
                        "
                        class="w-3 h-3"
                      />
                      {{ transaction.isRefunded ? 'Refunded' : 'Loss' }}
                    </div>
                  </div>
                  <div v-else>
                    <div
                      :class="[
                        'badge badge-sm',
                        getStatusInfo(transaction.status).badge,
                      ]"
                    >
                      {{ getStatusInfo(transaction.status).label }}
                    </div>
                  </div>
                </td>
                <td>
                  <div class="flex space-x-1">
                    <!-- Complete Order Button (for processing orders) -->
                    <button
                      v-if="transaction.status === 'processing'"
                      @click="handleCompleteOrder(transaction)"
                      class="btn btn-xs btn-success text-success font-thin bg-success/20 shadow-none border-none"
                      title="Complete Order"
                    >
                      <CheckCircle class="w-3 h-3" />
                    </button>

                    <!-- Void Order Button (requires manager PIN) -->
                    <button
                      v-if="
                        (transaction.status === 'pending' ||
                          transaction.status === 'processing') &&
                        !transaction.remittance_id
                      "
                      @click="handleVoidOrder(transaction)"
                      class="btn btn-xs btn-error text-error font-thin bg-error/20 shadow-none border-none"
                      title="Void Order (Manager Required)"
                    >
                      <XCircle class="w-3 h-3" />
                    </button>

                    <!-- Refund Order Button (requires manager PIN) -->
                    <button
                      v-if="
                        transaction.status === 'completed' &&
                        !transaction.remittance_id
                      "
                      @click="handleRefundOrder(transaction)"
                      class="btn btn-xs btn-warning text-warning font-thin bg-warning/20 shadow-none border-none"
                      title="Refund Order (Manager Required)"
                    >
                      <RefreshCcw class="w-3 h-3" />
                    </button>

                    <!-- No actions available -->
                    <span
                      v-if="
                        transaction.status === 'void' ||
                        (transaction.status !== 'processing' &&
                          transaction.status !== 'pending' &&
                          transaction.status !== 'completed')
                      "
                      class="text-gray-400 text-xs"
                    >
                      -
                    </span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          <div class="flex items-center justify-between mt-3">
            <div class="text-sm text-gray-500">
              Showing {{ (currentPage - 1) * itemsPerPage + 1 }} -
              {{ Math.min(currentPage * itemsPerPage, totalTransactions) }} of
              {{ totalTransactions }}
            </div>
            <div class="join">
              <button
                class="btn btn-sm join-item"
                :disabled="currentPage === 1"
                @click="prevPage"
              >
                «
              </button>
              <button
                class="btn btn-sm join-item"
                :class="{ 'btn-active': currentPage === 1 }"
                @click="
                  () => {
                    currentPage = 1;
                    fetchTransactions();
                  }
                "
              >
                1
              </button>
              <button
                v-if="showLeftEllipsis()"
                class="btn btn-sm join-item"
                disabled
              >
                …
              </button>
              <button
                v-for="p in getPageRange()"
                :key="p"
                class="btn btn-sm join-item"
                :class="{ 'btn-active': currentPage === p }"
                @click="
                  () => {
                    currentPage = p;
                    fetchTransactions();
                  }
                "
              >
                {{ p }}
              </button>
              <button
                v-if="showRightEllipsis()"
                class="btn btn-sm join-item"
                disabled
              >
                …
              </button>
              <button
                v-if="totalPages > 1"
                class="btn btn-sm join-item"
                :class="{ 'btn-active': currentPage === totalPages }"
                @click="
                  () => {
                    currentPage = totalPages;
                    fetchTransactions();
                  }
                "
              >
                {{ totalPages }}
              </button>
              <button
                class="btn btn-sm join-item"
                :disabled="currentPage === totalPages"
                @click="nextPage"
              >
                »
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="modal-action">
        <button class="btn" @click="closeModal">Close</button>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop"><button>close</button></form>
  </dialog>

  <!-- Manager PIN Verification Modal -->
  <div
    v-if="showManagerPinModal"
    class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm"
  >
    <div
      class="bg-white rounded-lg p-4 sm:p-6 max-w-md w-full max-h-[90vh] overflow-y-auto"
    >
      <div class="text-center mb-6">
        <AlertCircle
          class="w-12 h-12 sm:w-16 sm:h-16 text-primaryColor mx-auto mb-3 sm:mb-4"
        />
        <h3 class="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
          Manager Verification Required
        </h3>
        <p class="text-sm sm:text-base text-gray-600">
          A manager must verify their identity to perform this action.
        </p>
      </div>

      <!-- Transaction Details -->
      <div class="space-y-4 mb-6">
 

        <!-- Manager PIN Input -->
        <div class="space-y-2">
          <label class="text-sm font-medium text-gray-700">
            Manager PIN:
          </label>
          <div class="relative">
            <input
              v-model="managerPinForm.employeeId"
              :type="showEmployeeId ? 'text' : 'password'"
              placeholder="Enter your PIN"
              class="input input-bordered w-full input-sm sm:input-md pr-10"
              @keyup.enter="handleManagerPinVerification"
            />
            <button
              type="button"
              class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 cursor-pointer"
              @click="showEmployeeId = !showEmployeeId"
            >
              <font-awesome-icon
                :icon="
                  showEmployeeId ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye'
                "
              />
            </button>
          </div>
        </div>

        <!-- Error Message -->
        <div v-if="managerPinError" class="alert alert-error">
          <AlertCircle class="w-4 h-4" />
          <span>{{ managerPinError }}</span>
        </div>
      </div>

      <!-- Action Buttons -->
      <div
        class="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3"
      >
        <button
          @click="closeManagerPinModal"
          :disabled="isVerifyingPin"
          class="flex-1 btn btn-outline btn-sm sm:btn-md touch-manipulation font-thin disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancel
        </button>
        <button
          @click="handleManagerPinVerification"
          :disabled="isVerifyingPin || !managerPinForm.employeeId"
          class="flex-1 btn bg-primaryColor text-white btn-sm sm:btn-md touch-manipulation font-thin hover:bg-primaryColor/80 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span
            v-if="isVerifyingPin"
            class="loading loading-spinner loading-sm mr-2"
          ></span>
          {{ isVerifyingPin ? 'Verifying...' : 'Verify & Proceed' }}
        </button>
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
          {{
            posStore.pendingAction === 'refund' ? 'Refund Order' : 'Void Order'
          }}
        </h3>
        <p class="text-sm sm:text-base text-gray-600">
          {{
            posStore.pendingAction === 'refund'
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
              <p class="font-semibold">
                {{ posStore.selectedTransaction?.order_number }}
              </p>
            </div>
            <div>
              <span class="font-medium text-gray-600">Total Amount:</span>
              <p class="font-semibold">
                <font-awesome-icon icon="fa-solid fa-peso-sign" />
                {{ posStore.selectedTransaction?.amount?.toFixed(2) }}
              </p>
            </div>
            <div>
              <span class="font-medium text-gray-600">Cashier:</span>
              <p class="font-semibold">
                {{ posStore.selectedTransaction?.cashier }}
              </p>
            </div>
            <div>
              <span class="font-medium text-gray-600">Status:</span>
              <p class="font-semibold">
                {{ posStore.selectedTransaction?.status }}
              </p>
            </div>
            <div>
              <span class="font-medium text-gray-600">Order Type:</span>
              <p class="font-semibold">
                {{ posStore.selectedTransaction?.order_type }}
              </p>
            </div>
            <div>
              <span class="font-medium text-gray-600">Amount Paid:</span>
              <p class="font-semibold">
                <font-awesome-icon icon="fa-solid fa-peso-sign" />
                {{ posStore.selectedTransaction?.amount_paid?.toFixed(2) }}
              </p>
            </div>
          </div>
        </div>

        <!-- Void Reason Selection -->
        <div class="space-y-4">
          <div>
            <label class="text-sm font-medium text-gray-700">
              Reason for
              {{
                posStore.pendingAction === 'refund' ? 'refunding' : 'voiding'
              }}:
            </label>
            <select
              v-model="selectedVoidReason"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm mt-1"
              required
            >
              <option value="">Select a reason...</option>
              <optgroup label="Refund Reasons">
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
                v-if="posStore.selectedTransaction?.status !== 'processing'"
                label="Loss Reasons "
              >
                <option
                  v-for="reason in voidReasons.filter((r) => r.type === 'loss')"
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
                  voidReasons.find((r) => r.value === selectedVoidReason)?.color
                "
              >
                {{
                  voidReasons.find((r) => r.value === selectedVoidReason)
                    ?.type === 'refund'
                    ? posStore.selectedTransaction?.status === 'completed'
                      ? 'Inventory stays deducted • Loss profit will be recorded'
                      : ' No inventory deduction • No loss profit recorded'
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
              :placeholder="
                posStore.pendingAction === 'refund'
                  ? 'Please specify the reason for refunding this order...'
                  : 'Please specify the reason for voiding this order...'
              "
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
              rows="3"
              required
            ></textarea>
          </div>

          <!-- Loss Profit Display - Only show for loss reasons -->
          <div
            v-if="
              selectedVoidReason &&
              voidReasons.find((r) => r.value === selectedVoidReason)?.type ===
                'loss'
            "
            class="bg-red-50 border border-red-200 rounded-lg p-4"
          >
            <div class="flex items-center justify-between">
              <div>
                <h4 class="text-sm font-medium text-red-800">Potential Loss</h4>
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
              voidReasons.find((r) => r.value === selectedVoidReason)?.type ===
                'refund'
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
                    posStore.selectedTransaction?.status === 'completed'
                      ? 'Inventory will be deducted • Loss profit will be recorded'
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
              ? posStore.pendingAction === 'refund'
                ? 'Processing Refund...'
                : 'Voiding...'
              : posStore.pendingAction === 'refund'
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
    class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm"
  >
    <div
      class="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
    >
      <div class="p-6">
        <div class="text-center mb-6">
          <div
            class="w-12 h-12 sm:w-16 sm:h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4"
          >
            <CheckCircle class="w-6 h-6 sm:w-8 sm:h-8 text-green-600" />
          </div>
          <h3 class="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
            Complete Order
          </h3>
          <p class="text-sm sm:text-base text-gray-600">
            Are you sure you want to complete this order? This will mark the
            order as completed.
          </p>
        </div>

        <!-- Order Details -->
        <div class="space-y-4 mb-6">
          <div class="bg-gray-50 rounded-lg p-4">
            <div class="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span class="font-medium text-gray-600">Order Number:</span>
                <p class="font-semibold">
                  {{ posStore.selectedTransaction?.order_number }}
                </p>
              </div>
              <div>
                <span class="font-medium text-gray-600">Total Amount:</span>
                <p class="font-semibold">
                  <font-awesome-icon icon="fa-solid fa-peso-sign" />
                  {{ posStore.selectedTransaction?.amount?.toFixed(2) }}
                </p>
              </div>
              <div>
                <span class="font-medium text-gray-600">Cashier:</span>
                <p class="font-semibold">
                  {{ posStore.selectedTransaction?.cashier }}
                </p>
              </div>
              <div>
                <span class="font-medium text-gray-600">Status:</span>
                <p class="font-semibold">
                  {{ posStore.selectedTransaction?.status }}
                </p>
              </div>
              <div>
                <span class="font-medium text-gray-600">Order Type:</span>
                <p class="font-semibold">
                  {{ posStore.selectedTransaction?.order_type }}
                </p>
              </div>
              <div>
                <span class="font-medium text-gray-600">Amount Paid:</span>
                <p class="font-semibold">
                  <font-awesome-icon icon="fa-solid fa-peso-sign" />
                  {{ posStore.selectedTransaction?.amount_paid?.toFixed(2) }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex gap-3 justify-end">
          <button
            @click="closeCompleteModal"
            class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 cursor-pointer"
            :disabled="completeLoading"
          >
            Cancel
          </button>
          <button
            @click="confirmCompleteOrder"
            class="px-4 py-2 text-sm font-medium text-white bg-primaryColor border border-transparent rounded-lg hover:bg-primaryColor/80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primaryColor disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            :disabled="completeLoading"
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
  </div>
</template>

<style scoped></style>
