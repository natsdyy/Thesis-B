<script setup>
  import { ref, watch, computed, onMounted } from 'vue';
  import {
    X,
    Search,
    Filter,
    Calendar,
    Download,
    HelpCircle,
    Package,
    Minus,
    Trash,
    ArrowRightLeft,
  } from 'lucide-vue-next';
  import { useBranchInventoryStore } from '../../stores/branchInventoryStore.js';
  import { useBranchContextStore } from '../../stores/branchContextStore.js';

  const props = defineProps({
    show: { type: Boolean, default: false },
    initialFilter: { type: Object, default: () => ({}) },
  });

  const emit = defineEmits(['close']);

  const store = useBranchInventoryStore();
  const context = useBranchContextStore();

  const loading = ref(false);
  const transactions = ref([]);
  const currentPage = ref(1);
  const itemsPerPage = ref(10);
  const totalPages = ref(1);
  const totalTransactions = ref(0);

  const filters = ref({
    search: '',
    transaction_type: '', // distribution | consumption | adjustment
    date_from: '',
    date_to: '',
    date_range: 'this_week',
  });

  const transactionTypes = [
    { value: '', label: 'All Types' },
    { value: 'distribution', label: 'Distribution' },
    { value: 'consumption', label: 'Consumption' },
    { value: 'adjustment', label: 'Adjustment' },
    { value: 'disposal', label: 'Disposal' },
  ];

  const typeInfo = (type) => {
    const map = {
      distribution: {
        icon: ArrowRightLeft,
        label: 'Distribution',
        badge: 'bg-primary/20 text-primary',
      },
      consumption: {
        icon: Minus,
        label: 'Consumption',
        badge: 'bg-warning/20 text-warning',
      },
      adjustment: {
        icon: Package,
        label: 'Adjustment',
        badge: 'bg-info/20 text-info',
      },
      disposal: {
        icon: Trash,
        label: 'Disposal',
        badge: 'bg-error/20 text-error ',
      },
    };
    return (
      map[type] || {
        icon: HelpCircle,
        label: type,
        badge: 'bg-gray-100 text-gray-600',
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
    const dlg = document.getElementById('branch_transaction_modal');
    if (dlg?.close) dlg.close();
    emit('close');
  };

  const fetchTransactions = async () => {
    if (!context.currentBranch?.id) return;
    loading.value = true;
    try {
      const {
        data,
        total,
        totalPages: pages,
      } = await store.fetchAllTransactions(context.currentBranch.id, {
        ...filters.value,
        page: currentPage.value,
        limit: itemsPerPage.value,
      });
      transactions.value = data;
      totalTransactions.value = total;
      totalPages.value = pages || 1;
    } catch (e) {
      console.error('Failed to load branch transactions', e);
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
      transaction_type: '',
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
      const dlg = document.getElementById('branch_transaction_modal');
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

  // Date range helpers similar to RequestSupply quick ranges
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
</script>

<template>
  <dialog id="branch_transaction_modal" class="modal">
    <div class="modal-box max-w-6xl">
      <div class="flex items-center justify-between mb-4">
        <h3 class="card-title text-primaryColor">
          Branch Inventory Transactions
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
            placeholder="Search item or notes"
          />
        </label>

        <select
          v-model="filters.transaction_type"
          class="select select-bordered select-sm sm:select-md"
        >
          <option v-for="t in transactionTypes" :key="t.value" :value="t.value">
            {{ t.label }}
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
                <th>Date</th>
                <th>Type</th>
                <th>Item</th>
                <th class="text-right">Qty</th>
                <th>UOM</th>
                <th>Performed by</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="tx in transactions" :key="tx.id">
                <td class="whitespace-nowrap">
                  {{ formatTransactionDate(tx.created_at || tx.date) }}
                </td>
                <td>
                  <span
                    :class="`badge badge-sm ${typeInfo(tx.transaction_type).badge}`"
                  >
                    {{ typeInfo(tx.transaction_type).label }}
                  </span>
                </td>
                <td>{{ tx.item_name || tx.item_type_name || tx.name }}</td>
                <td class="text-right">
                  {{ parseFloat(tx.quantity).toLocaleString() }}
                </td>
                <td>{{ tx.uom || tx.unit || tx.unit_of_measure }}</td>
                <td>{{ tx.performed_by_name || tx.performed_by || '—' }}</td>
                <td
                  class="max-w-[320px] truncate"
                  :title="tx.notes || tx.description"
                >
                  {{ tx.notes || tx.description }}
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
