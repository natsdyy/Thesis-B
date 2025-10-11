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
  const isExporting = ref(false);

  const filters = ref({
    search: '',
    transaction_type: '', // distribution | consumption | adjustment
    date_range: 'this_week',
    custom_month: '', // YYYY-MM format for custom month selection
  });

  // Custom month picker state
  const showCustomMonthPicker = ref(false);
  const customMonthPicker = ref({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
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
      // Apply date range to get date_from and date_to
      applyDateRange();

      // Debug logging for all filters
      console.log('Date filter applied:', {
        date_range: filters.value.date_range,
        date_from: filters.value.date_from,
        date_to: filters.value.date_to,
        filterText: getFilterDisplayText(),
      });

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
      date_range: 'this_week',
      custom_month: '',
    };
    showCustomMonthPicker.value = false;
    currentPage.value = 1;
    fetchTransactions();
  };

  // Custom month picker methods
  const toggleCustomMonthPicker = () => {
    showCustomMonthPicker.value = !showCustomMonthPicker.value;
    if (showCustomMonthPicker.value) {
      filters.value.date_range = 'custom_month';
    }
  };

  const applyCustomMonthFilter = () => {
    const month = String(customMonthPicker.value.month).padStart(2, '0');
    const year = customMonthPicker.value.year;
    filters.value.custom_month = `${year}-${month}`;
    filters.value.date_range = 'custom_month';
    showCustomMonthPicker.value = false;
    currentPage.value = 1;
    fetchTransactions();
  };

  // Get display text for current filter
  const getFilterDisplayText = () => {
    switch (filters.value.date_range) {
      case 'today':
        return 'Today';
      case 'this_week':
        return 'This Week';
      case 'this_month':
        return 'This Month';
      case 'custom_month':
        if (filters.value.custom_month) {
          const [year, month] = filters.value.custom_month.split('-');
          const monthName = new Date(year, month - 1).toLocaleDateString(
            'en-US',
            {
              month: 'long',
              year: 'numeric',
            }
          );
          return monthName;
        }
        return 'Custom Month';
      default:
        return 'Today';
    }
  };

  // Month options for custom picker
  const months = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' },
  ];

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

  // Date range helpers
  const toYmd = (d) => {
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };

  const applyDateRange = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (filters.value.date_range === 'today') {
      // For today, use full day range (00:00:00 to 23:59:59)
      const startOfDay = new Date(today);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(today);
      endOfDay.setHours(23, 59, 59, 999);

      filters.value.date_from = startOfDay.toISOString();
      filters.value.date_to = endOfDay.toISOString();
    } else if (filters.value.date_range === 'this_week') {
      const day = today.getDay();
      const mondayOffset = day === 0 ? -6 : 1 - day;
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() + mondayOffset);
      weekStart.setHours(0, 0, 0, 0);

      const weekEnd = new Date(today);
      weekEnd.setHours(23, 59, 59, 999);

      filters.value.date_from = weekStart.toISOString();
      filters.value.date_to = weekEnd.toISOString();
    } else if (filters.value.date_range === 'this_month') {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      start.setHours(0, 0, 0, 0);

      const end = new Date(today);
      end.setHours(23, 59, 59, 999);

      filters.value.date_from = start.toISOString();
      filters.value.date_to = end.toISOString();
    } else if (filters.value.date_range === 'custom_month') {
      // For custom month, use the selected month or current month as fallback
      let year, month;
      if (filters.value.custom_month) {
        [year, month] = filters.value.custom_month.split('-').map(Number);
        month -= 1; // JavaScript months are 0-indexed
      } else {
        year = today.getFullYear();
        month = today.getMonth();
      }
      const start = new Date(year, month, 1);
      start.setHours(0, 0, 0, 0);

      const end = new Date(year, month + 1, 0);
      end.setHours(23, 59, 59, 999);

      filters.value.date_from = start.toISOString();
      filters.value.date_to = end.toISOString();
    }
  };

  // Export function - exports all transactions based on current filter, not just current page
  const exportTransactions = async () => {
    if (isExporting.value) return;

    isExporting.value = true;
    try {
      if (!context.currentBranch?.id) {
        throw new Error('No branch selected');
      }

      // Apply date range to get proper date filters
      applyDateRange();

      // Fetch ALL transactions for the current filter (not paginated)
      const { data: allTransactions } = await store.fetchAllTransactions(
        context.currentBranch.id,
        {
          ...filters.value,
          limit: 10000, // Large limit to get all transactions
          offset: 0,
        }
      );

      console.log(`Exporting ${allTransactions.length} transactions`);

      // Create CSV content
      const headers = [
        'Date',
        'Type',
        'Item Name',
        'Item Type',
        'Quantity',
        'Unit of Measure',
        'Transaction Type',
        'Reference Number',
        'Notes',
        'Performed By',
        'Unit Cost',
        'Total Value',
        'Reason',
      ];

      // Format data for CSV
      const csvData = allTransactions.map((transaction) => {
        const formatDate = (dateString) => {
          if (!dateString) return 'N/A';
          try {
            return new Date(dateString).toLocaleDateString('en-PH', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
            });
          } catch {
            return dateString;
          }
        };

        return [
          formatDate(transaction.transaction_date || transaction.created_at),
          transaction.transaction_type || '',
          transaction.item_name || '',
          transaction.item_type || '',
          transaction.quantity || '',
          transaction.unit_of_measure || '',
          transaction.transaction_type || '',
          transaction.reference_number || '',
          transaction.notes || '',
          transaction.performed_by_name || '',
          transaction.unit_cost || '',
          transaction.total_value || '',
          transaction.reason || '',
        ];
      });

      // Add summary data
      const summaryRows = [
        [],
        ['SUMMARY'],
        ['Total Transactions', allTransactions.length],
        [
          'Total Items Consumed',
          allTransactions
            .reduce((sum, t) => sum + parseFloat(t.quantity || 0), 0)
            .toFixed(2),
        ],
        [
          'Total Value',
          `P${allTransactions
            .reduce((sum, t) => sum + parseFloat(t.total_value || 0), 0)
            .toFixed(2)}`,
        ],
        [],
        ['BY TRANSACTION TYPE'],
      ];

      // Group by transaction type
      const typeGroups = allTransactions.reduce((acc, t) => {
        const type = t.transaction_type || 'Unknown';
        if (!acc[type]) acc[type] = [];
        acc[type].push(t);
        return acc;
      }, {});

      Object.entries(typeGroups).forEach(([type, transactions]) => {
        const totalQuantity = transactions.reduce(
          (sum, t) => sum + parseFloat(t.quantity || 0),
          0
        );
        const totalValue = transactions.reduce(
          (sum, t) => sum + parseFloat(t.total_value || 0),
          0
        );
        summaryRows.push([
          `${type}`,
          `${transactions.length} transactions`,
          `${totalQuantity.toFixed(2)} qty`,
          `P${totalValue.toFixed(2)}`,
        ]);
      });

      // Combine headers, data, and summary
      const csvContent = [headers, ...csvData, ...summaryRows]
        .map((row) =>
          row.map((field) => `"${String(field).replace(/"/g, '""')}"`).join(',')
        )
        .join('\n');

      // Create filename based on current filter
      const periodName = getFilterDisplayText();
      const filename = `Branch_Inventory_Transactions_${periodName.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;

      // Create and download file with BOM for better Excel compatibility
      const BOM = '\uFEFF';
      const blob = new Blob([BOM + csvContent], {
        type: 'text/csv;charset=utf-8;',
      });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      console.log(
        `Successfully exported ${allTransactions.length} transactions to ${filename}`
      );
    } catch (error) {
      console.error('Error exporting transactions:', error);
      alert('Failed to export transactions. Please try again.');
    } finally {
      isExporting.value = false;
    }
  };
</script>

<template>
  <dialog id="branch_transaction_modal" class="modal">
    <div class="modal-box max-w-6xl max-h-[90vh] overflow-y-auto">
      <div class="flex items-center justify-between mb-4">
        <h3 class="card-title text-primaryColor">
          Branch Inventory Transactions
        </h3>
        <button class="btn btn-ghost btn-sm" @click="closeModal">
          <X class="w-4 h-4" />
        </button>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-4 gap-2 mb-3">
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
            if (filters.date_range !== 'custom_month') {
              applyDateRange();
              fetchTransactions();
            }
          "
          class="select select-bordered select-sm sm:select-md"
        >
          <option value="today">Today</option>
          <option value="this_week">This Week</option>
          <option value="this_month">This Month</option>
          <option value="custom_month">{{ getFilterDisplayText() }}</option>
        </select>
      </div>

      <!-- Custom Month Selection - Only show when Custom Month is selected -->
      <div
        v-if="filters.date_range === 'custom_month'"
        class="flex justify-between items-center gap-2 mb-3"
      >
        <!-- Current Filter Display -->
        <div v-if="filters.custom_month" class="text-sm text-gray-600">
          <span class="font-medium">Selected:</span>
          <span class="text-primaryColor">{{ getFilterDisplayText() }}</span>
        </div>
        <div v-else class="text-sm text-gray-600">
          <span class="font-medium">Select a month:</span>
        </div>

        <div class="relative">
          <button
            class="btn btn-sm btn-outline text-primaryColor hover:bg-primaryColor/10 font-thin"
            :class="{
              'bg-primaryColor/10': filters.date_range === 'custom_month',
            }"
            @click="toggleCustomMonthPicker"
          >
            <Calendar class="w-4 h-4 mr-1" />
            {{ filters.custom_month ? 'Change Month' : 'Select Month' }}
          </button>

          <!-- Custom Month Picker -->
          <div
            v-if="showCustomMonthPicker"
            class="absolute top-full right-0 mt-1 bg-white border border-primaryColor/30 rounded-lg shadow-lg z-10 p-3 min-w-64"
          >
            <div class="flex items-center justify-between mb-3">
              <h4 class="text-sm font-medium text-gray-700">Select Month</h4>
              <button
                @click="showCustomMonthPicker = false"
                class="btn btn-xs btn-ghost"
              >
                <X class="w-3 h-3" />
              </button>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="label label-text-alt text-gray-600">Month</label>
                <select
                  v-model="customMonthPicker.month"
                  class="select select-bordered select-sm w-full"
                >
                  <option
                    v-for="month in months"
                    :key="month.value"
                    :value="month.value"
                  >
                    {{ month.label }}
                  </option>
                </select>
              </div>

              <div>
                <label class="label label-text-alt text-gray-600">Year</label>
                <select
                  v-model="customMonthPicker.year"
                  class="select select-bordered select-sm w-full"
                >
                  <option
                    v-for="year in Array.from(
                      { length: 5 },
                      (_, i) => new Date().getFullYear() - 2 + i
                    )"
                    :key="year"
                    :value="year"
                  >
                    {{ year }}
                  </option>
                </select>
              </div>
            </div>

            <div class="flex justify-end gap-2 mt-3">
              <button
                @click="showCustomMonthPicker = false"
                class="btn btn-sm btn-ghost"
              >
                Cancel
              </button>
              <button
                @click="applyCustomMonthFilter"
                class="btn btn-sm bg-primaryColor text-white"
              >
                Apply
              </button>
            </div>
          </div>
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
          class="btn btn-outline btn-sm font-thin"
          @click="exportTransactions"
          :disabled="isExporting || loading"
        >
          <span
            v-if="isExporting"
            class="loading loading-spinner loading-xs mr-1"
          ></span>
          <Download v-else class="w-4 h-4 mr-1" />
          {{ isExporting ? 'Exporting...' : 'Export' }}
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
