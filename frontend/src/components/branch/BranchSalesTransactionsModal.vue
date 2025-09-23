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

  const props = defineProps({
    show: { type: Boolean, default: false },
    initialFilter: { type: Object, default: () => ({}) },
  });

  const emit = defineEmits(['close']);

  const posStore = usePOSStore();
  const context = useBranchContextStore();

  const loading = ref(false);
  const transactions = ref([]);
  const currentPage = ref(1);
  const itemsPerPage = ref(10);
  const totalPages = ref(1);
  const totalTransactions = ref(0);

  const filters = ref({
    search: '',
    status: '', // pending | processing | completed | void
    order_type: '', // dine_in | take_out
    date_from: '',
    date_to: '',
    date_range: 'this_week',
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
    const dlg = document.getElementById('branch_sales_transaction_modal');
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
            processed_at: order.processed_at,
            completed_at: order.completed_at,
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
      console.error('Failed to load sales transactions', e);
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
      date_range: 'this_week',
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
      const dlg = document.getElementById('branch_sales_transaction_modal');
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
    console.log('Export sales transactions');
  };
</script>

<template>
  <dialog id="branch_sales_transaction_modal" class="modal">
    <div class="modal-box max-w-7xl max-h-[90vh] overflow-y-auto">
      <div class="flex items-center justify-between mb-4">
        <h3 class="card-title text-primaryColor">
          <ShoppingCart class="w-5 h-5 mr-2" />
          Sales Transactions
        </h3>
        <button class="btn btn-ghost btn-sm" @click="closeModal">
          <X class="w-4 h-4" />
        </button>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-6 gap-2 mb-3">
        <label class="input input-bordered flex items-center gap-2 col-span-2">
          <Search class="w-4 h-4" />
          <input
            v-model="filters.search"
            @keyup.enter="fetchTransactions"
            type="text"
            class="grow"
            placeholder="Search order number or items"
          />
        </label>

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

        <label class="input input-bordered flex items-center gap-2">
          <Calendar class="w-4 h-4" />
          <input v-model="filters.date_from" type="date" class="grow" />
        </label>
        <label class="input input-bordered flex items-center gap-2">
          <Calendar class="w-4 h-4" />
          <input v-model="filters.date_to" type="date" class="grow" />
        </label>
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
        <button
          class="btn btn-outline btn-sm font-thin"
          @click="exportTransactions"
        >
          <Download class="w-4 h-4 mr-1" />
          Export
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
                      :title="
                        transaction.isRefunded
                          ? transaction.completed_at
                            ? 'Refunded (Inventory deducted • Loss recorded)'
                            : 'Refunded (No inventory deduction • No loss)'
                          : transaction.void_reason
                      "
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
</template>

<style scoped></style>
